import { z } from 'zod';

import { emailSchema } from './auth';
import { ROLES, type Role } from './roles';
import type { PublicUser } from './users';

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const addMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(ROLES),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMembership extends Workspace {
  role: Role;
}

export interface Member {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  createdAt: string;
}

export interface MemberWithUser extends Member {
  user: Pick<PublicUser, 'id' | 'email' | 'name'>;
}

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(ROLES),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export interface InvitationSummary {
  id: string;
  workspaceId: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
}

export interface CreateInvitationResult {
  invitation: InvitationSummary;
  token: string;
}

export interface InvitationPreview {
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: Role;
  expiresAt: string;
  invitedBy: string | null;
}
