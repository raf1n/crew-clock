import { createHash, randomBytes } from 'node:crypto';

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  canManageRole,
  roleAtLeast,
  type AddMemberInput,
  type CreateInvitationResult,
  type InvitationPreview,
  type InvitationSummary,
  type InviteMemberInput,
  type Member,
  type MemberWithUser,
  type WorkspaceMembership,
} from '@crewclock/shared';
import { DataSource, IsNull, MoreThan, Repository, type EntityManager } from 'typeorm';

import { UsersService } from '../users/users.service';
import { MemberEntity } from './entities/member.entity';
import { WorkspaceInvitationEntity } from './entities/workspace-invitation.entity';
import { WorkspaceEntity } from './entities/workspace.entity';
import { toMember, toMemberWithUser, toWorkspace } from './mappers/workspace.mapper';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaces: Repository<WorkspaceEntity>,
    @InjectRepository(MemberEntity)
    private readonly members: Repository<MemberEntity>,
    @InjectRepository(WorkspaceInvitationEntity)
    private readonly invitations: Repository<WorkspaceInvitationEntity>,
    private readonly users: UsersService,
  ) {}

  async createForUser(
    userId: string,
    name: string,
    manager?: EntityManager,
  ): Promise<WorkspaceEntity> {
    const create = async (entityManager: EntityManager): Promise<WorkspaceEntity> => {
      const workspace = entityManager
        .getRepository(WorkspaceEntity)
        .create({ name, createdById: userId, updatedById: userId });

      await entityManager.getRepository(WorkspaceEntity).save(workspace);

      const membership = entityManager.getRepository(MemberEntity).create({
        workspaceId: workspace.id,
        userId,
        role: 'owner',
        createdById: userId,
        updatedById: userId,
      });

      await entityManager.getRepository(MemberEntity).save(membership);

      return workspace;
    };

    return manager ? create(manager) : this.dataSource.transaction(create);
  }

  async create(userId: string, name: string): Promise<WorkspaceMembership> {
    const workspace = await this.createForUser(userId, name);
    return { ...toWorkspace(workspace), role: 'owner' };
  }

  async listForUser(userId: string): Promise<WorkspaceMembership[]> {
    const memberships = await this.members.find({
      where: { userId },
      relations: { workspace: true },
      order: { createdAt: 'ASC' },
    });

    return memberships.map((membership) => ({
      ...toWorkspace(membership.workspace),
      role: membership.role,
    }));
  }

  async getForUser(userId: string, workspaceId: string): Promise<WorkspaceMembership> {
    const membership = await this.members.findOne({
      where: { workspaceId, userId },
      relations: { workspace: true },
    });
    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }

    return { ...toWorkspace(membership.workspace), role: membership.role };
  }

  findMembership(userId: string, workspaceId: string): Promise<MemberEntity | null> {
    return this.members.findOne({ where: { workspaceId, userId } });
  }

  async getMembership(userId: string, workspaceId: string): Promise<MemberEntity> {
    const membership = await this.findMembership(userId, workspaceId);
    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }
    return membership;
  }

  async listMembers(userId: string, workspaceId: string): Promise<MemberWithUser[]> {
    await this.getMembership(userId, workspaceId);

    const members = await this.members.find({
      where: { workspaceId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });

    return members.map(toMemberWithUser);
  }

  async addMember(actorId: string, workspaceId: string, input: AddMemberInput): Promise<Member> {
    const actor = await this.getMembership(actorId, workspaceId);
    if (!canManageRole(actor.role, input.role)) {
      throw new ForbiddenException('You cannot assign that role in this workspace');
    }

    const user = await this.users.findByEmail(input.email);
    if (!user) {
      throw new NotFoundException('No user with that email address');
    }

    const existing = await this.members.findOne({
      where: { workspaceId, userId: user.id },
    });

    if (existing) {
      if (!canManageRole(actor.role, existing.role)) {
        throw new ForbiddenException('You cannot modify that member');
      }
      if (existing.role === 'owner' && input.role !== 'owner') {
        const owners = await this.members.count({ where: { workspaceId, role: 'owner' } });
        if (owners <= 1) {
          throw new ConflictException('A workspace must have at least one owner');
        }
      }

      existing.role = input.role;
      existing.updatedById = actorId;
      await this.members.save(existing);
      return toMember(existing);
    }

    const membership = this.members.create({
      workspaceId,
      userId: user.id,
      role: input.role,
      createdById: actorId,
      updatedById: actorId,
    });
    await this.members.save(membership);
    return toMember(membership);
  }

  async createInvitation(
    actorId: string,
    workspaceId: string,
    input: InviteMemberInput,
  ): Promise<CreateInvitationResult> {
    const actor = await this.getMembership(actorId, workspaceId);
    if (!canManageRole(actor.role, input.role)) {
      throw new ForbiddenException('You cannot invite with that role');
    }

    const user = await this.users.findByEmail(input.email);
    if (user) {
      const existingMember = await this.members.findOne({
        where: { workspaceId, userId: user.id },
      });
      if (existingMember) {
        throw new ConflictException('That user is already a member');
      }
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashInvitationToken(token);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const existingInvitation = await this.invitations.findOne({
      where: { workspaceId, email: input.email },
    });

    if (existingInvitation) {
      if (existingInvitation.acceptedAt) {
        throw new ConflictException('That email has already accepted an invitation');
      }
      existingInvitation.role = input.role;
      existingInvitation.tokenHash = tokenHash;
      existingInvitation.expiresAt = expiresAt;
      existingInvitation.invitedBy = actorId;
      existingInvitation.updatedById = actorId;
      await this.invitations.save(existingInvitation);
      return { invitation: toInvitationSummary(existingInvitation), token };
    }

    const invitation = this.invitations.create({
      workspaceId,
      email: input.email,
      role: input.role,
      tokenHash,
      invitedBy: actorId,
      expiresAt,
      createdById: actorId,
      updatedById: actorId,
    });
    await this.invitations.save(invitation);
    return { invitation: toInvitationSummary(invitation), token };
  }

  async listInvitations(actorId: string, workspaceId: string): Promise<InvitationSummary[]> {
    const actor = await this.getMembership(actorId, workspaceId);
    if (!roleAtLeast(actor.role, 'manager')) {
      throw new ForbiddenException('Only owners and managers can view invitations');
    }

    const invitations = await this.invitations.find({
      where: {
        workspaceId,
        acceptedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    return invitations.map(toInvitationSummary);
  }

  async cancelInvitation(
    actorId: string,
    workspaceId: string,
    invitationId: string,
  ): Promise<void> {
    const actor = await this.getMembership(actorId, workspaceId);
    if (!roleAtLeast(actor.role, 'manager')) {
      throw new ForbiddenException('Only owners and managers can cancel invitations');
    }

    const result = await this.invitations.delete({
      id: invitationId,
      workspaceId,
      acceptedAt: IsNull(),
    });
    if (!result.affected) {
      throw new NotFoundException('Invitation not found');
    }
  }

  async previewInvitation(token: string): Promise<InvitationPreview> {
    const invitation = await this.invitations.findOne({
      where: {
        tokenHash: hashInvitationToken(token),
        acceptedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { workspace: true },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation is invalid or has expired');
    }

    const inviter = invitation.invitedBy ? await this.users.findById(invitation.invitedBy) : null;

    return {
      workspaceId: invitation.workspaceId,
      workspaceName: invitation.workspace.name,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
      invitedBy: inviter?.name ?? null,
    };
  }

  async acceptInvitation(
    userId: string,
    email: string,
    token: string,
  ): Promise<WorkspaceMembership> {
    return this.dataSource.transaction((manager) =>
      this.acceptInvitationWithManager(manager, userId, email, token),
    );
  }

  async acceptInvitationWithManager(
    manager: EntityManager,
    userId: string,
    email: string,
    token: string,
  ): Promise<WorkspaceMembership> {
    const tokenHash = hashInvitationToken(token);

    const invitation = await manager.getRepository(WorkspaceInvitationEntity).findOne({
      where: { tokenHash },
      relations: { workspace: true },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation is invalid or has expired');
    }
    if (invitation.acceptedAt) {
      throw new ConflictException('Invitation has already been accepted');
    }
    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('Invitation is invalid or has expired');
    }
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      throw new ForbiddenException(
        `This invitation belongs to ${invitation.email}. Sign in with that email to accept.`,
      );
    }

    const memberRepository = manager.getRepository(MemberEntity);
    let membership = await memberRepository.findOne({
      where: { workspaceId: invitation.workspaceId, userId },
    });
    if (!membership) {
      membership = memberRepository.create({
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
        createdById: invitation.invitedBy,
        updatedById: userId,
      });
      await memberRepository.save(membership);
    }

    invitation.acceptedAt = new Date();
    invitation.updatedById = userId;
    await manager.getRepository(WorkspaceInvitationEntity).save(invitation);

    return { ...toWorkspace(invitation.workspace), role: membership.role };
  }
}

function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toInvitationSummary(invitation: WorkspaceInvitationEntity): InvitationSummary {
  return {
    id: invitation.id,
    workspaceId: invitation.workspaceId,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  };
}
