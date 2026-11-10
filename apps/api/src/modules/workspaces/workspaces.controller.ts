import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  addMemberSchema,
  createWorkspaceSchema,
  inviteMemberSchema,
  type AddMemberInput,
  type CreateInvitationResult,
  type CreateWorkspaceInput,
  type InvitationSummary,
  type InviteMemberInput,
  type Member,
  type MemberWithUser,
  type WorkspaceMembership,
} from '@crewclock/shared';

import type { AuthenticatedUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { WorkspaceRoles } from './decorators/workspace-roles.decorator';
import { WorkspaceRolesGuard } from './guards/workspace-roles.guard';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  create(
    @CurrentUser() current: AuthenticatedUser,
    @Body(new ZodValidationPipe(createWorkspaceSchema)) input: CreateWorkspaceInput,
  ): Promise<WorkspaceMembership> {
    return this.workspaces.create(current.userId, input.name);
  }

  @Get()
  list(@CurrentUser() current: AuthenticatedUser): Promise<WorkspaceMembership[]> {
    return this.workspaces.listForUser(current.userId);
  }

  @Get(':workspaceId')
  get(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<WorkspaceMembership> {
    return this.workspaces.getForUser(current.userId, workspaceId);
  }

  @Get(':workspaceId/members')
  listMembers(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<MemberWithUser[]> {
    return this.workspaces.listMembers(current.userId, workspaceId);
  }

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles('owner', 'manager')
  @Post(':workspaceId/members')
  addMember(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body(new ZodValidationPipe(addMemberSchema)) input: AddMemberInput,
  ): Promise<Member> {
    return this.workspaces.addMember(current.userId, workspaceId, input);
  }

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles('owner', 'manager')
  @Post(':workspaceId/invitations')
  createInvitation(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body(new ZodValidationPipe(inviteMemberSchema)) input: InviteMemberInput,
  ): Promise<CreateInvitationResult> {
    return this.workspaces.createInvitation(current.userId, workspaceId, input);
  }

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles('owner', 'manager')
  @Get(':workspaceId/invitations')
  listInvitations(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<InvitationSummary[]> {
    return this.workspaces.listInvitations(current.userId, workspaceId);
  }

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles('owner', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':workspaceId/invitations/:invitationId')
  async cancelInvitation(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<void> {
    await this.workspaces.cancelInvitation(current.userId, workspaceId, invitationId);
  }
}
