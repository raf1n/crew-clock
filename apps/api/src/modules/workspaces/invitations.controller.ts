import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import type { InvitationPreview, WorkspaceMembership } from '@crewclock/shared';

import type { AuthenticatedUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { WorkspacesService } from './workspaces.service';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Public()
  @Get(':token')
  preview(@Param('token') token: string): Promise<InvitationPreview> {
    return this.workspaces.previewInvitation(token);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':token/accept')
  accept(
    @CurrentUser() current: AuthenticatedUser,
    @Param('token') token: string,
  ): Promise<WorkspaceMembership> {
    return this.workspaces.acceptInvitation(current.userId, current.email, token);
  }
}
