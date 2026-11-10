import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@crewclock/shared';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../../../common/auth-user';
import { WORKSPACE_ROLES_KEY } from '../decorators/workspace-roles.decorator';
import { WorkspacesService } from '../workspaces.service';

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(
    private readonly workspaces: WorkspacesService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Role[]>(WORKSPACE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const workspaceId = request.params.workspaceId;
    if (typeof workspaceId !== 'string' || !workspaceId) {
      throw new ForbiddenException('Workspace context is required');
    }
    if (!request.user) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    const membership = await this.workspaces.getMembership(request.user.userId, workspaceId);
    if (!required.includes(membership.role)) {
      throw new ForbiddenException('Insufficient role in this workspace');
    }

    return true;
  }
}
