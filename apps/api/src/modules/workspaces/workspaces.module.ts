import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { MemberEntity } from './entities/member.entity';
import { WorkspaceInvitationEntity } from './entities/workspace-invitation.entity';
import { WorkspaceEntity } from './entities/workspace.entity';
import { WorkspaceRolesGuard } from './guards/workspace-roles.guard';
import { InvitationsController } from './invitations.controller';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceEntity, MemberEntity, WorkspaceInvitationEntity]),
    UsersModule,
  ],
  controllers: [WorkspacesController, InvitationsController],
  providers: [WorkspacesService, WorkspaceRolesGuard],
  exports: [WorkspacesService, WorkspaceRolesGuard],
})
export class WorkspacesModule {}
