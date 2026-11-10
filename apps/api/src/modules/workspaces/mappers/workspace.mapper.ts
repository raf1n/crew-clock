import type { Member, MemberWithUser, Workspace } from '@crewclock/shared';

import type { MemberEntity } from '../entities/member.entity';
import type { WorkspaceEntity } from '../entities/workspace.entity';

export function toWorkspace(workspace: WorkspaceEntity): Workspace {
  return {
    id: workspace.id,
    name: workspace.name,
    activityRetentionDays: workspace.activityRetentionDays,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

export function toMember(member: MemberEntity): Member {
  return {
    id: member.id,
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
  };
}

export function toMemberWithUser(member: MemberEntity): MemberWithUser {
  return {
    ...toMember(member),
    user: {
      id: member.user.id,
      email: member.user.email,
      name: member.user.name,
    },
  };
}
