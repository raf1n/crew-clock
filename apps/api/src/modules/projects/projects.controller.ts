import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
  type CreateProjectInput,
  type ListProjectsQuery,
  type Page,
  type Project,
  type UpdateProjectInput,
} from '@crewclock/shared';

import type { AuthenticatedUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { WorkspaceRoles } from '../workspaces/decorators/workspace-roles.decorator';
import { WorkspaceRolesGuard } from '../workspaces/guards/workspace-roles.guard';
import { ProjectsService } from './projects.service';

@Controller('workspaces/:workspaceId/projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query(new ZodValidationPipe(listProjectsQuerySchema)) query: ListProjectsQuery,
  ): Promise<Page<Project>> {
    return this.projects.list(current.userId, workspaceId, query);
  }

  @Get(':projectId')
  get(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<Project> {
    return this.projects.get(current.userId, workspaceId, projectId);
  }

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles('owner', 'manager')
  @Post()
  create(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body(new ZodValidationPipe(createProjectSchema)) input: CreateProjectInput,
  ): Promise<Project> {
    return this.projects.create(current.userId, workspaceId, input);
  }

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles('owner', 'manager')
  @Patch(':projectId')
  update(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) input: UpdateProjectInput,
  ): Promise<Project> {
    return this.projects.update(current.userId, workspaceId, projectId, input);
  }

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles('owner', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':projectId')
  async remove(
    @CurrentUser() current: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<void> {
    await this.projects.remove(current.userId, workspaceId, projectId);
  }
}
