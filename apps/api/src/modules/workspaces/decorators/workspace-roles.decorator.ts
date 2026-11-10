import { SetMetadata } from '@nestjs/common';
import type { Role } from '@crewclock/shared';

export const WORKSPACE_ROLES_KEY = 'workspaceRoles';

export const WorkspaceRoles = (...roles: Role[]): MethodDecorator =>
  SetMetadata(WORKSPACE_ROLES_KEY, roles);
