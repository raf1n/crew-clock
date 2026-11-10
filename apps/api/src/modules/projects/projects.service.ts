import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  CreateProjectInput,
  ListProjectsQuery,
  Page,
  Project,
  UpdateProjectInput,
} from '@crewclock/shared';
import { DataSource, Repository } from 'typeorm';

import { TaskEntity } from '../tasks/entities/task.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ProjectEntity } from './entities/project.entity';
import { toProject } from './mappers/project.mapper';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    private readonly workspaces: WorkspacesService,
  ) {}

  async list(
    userId: string,
    workspaceId: string,
    query: ListProjectsQuery,
  ): Promise<Page<Project>> {
    await this.workspaces.getMembership(userId, workspaceId);

    const [items, total] = await this.projects.findAndCount({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      items: items.map(toProject),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async get(userId: string, workspaceId: string, projectId: string): Promise<Project> {
    const project = await this.getForMember(userId, workspaceId, projectId);
    return toProject(project);
  }

  async getForMember(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectEntity> {
    await this.workspaces.getMembership(userId, workspaceId);

    const project = await this.projects.findOne({
      where: { id: projectId, workspaceId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async create(userId: string, workspaceId: string, input: CreateProjectInput): Promise<Project> {
    await this.workspaces.getMembership(userId, workspaceId);

    const project = this.projects.create({
      workspaceId,
      createdById: userId,
      updatedById: userId,
      name: input.name,
      description: input.description ?? null,
    });
    await this.projects.save(project);
    return toProject(project);
  }

  async update(
    userId: string,
    workspaceId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<Project> {
    const project = await this.getForMember(userId, workspaceId, projectId);

    if (input.name !== undefined) {
      project.name = input.name;
    }
    if (input.description !== undefined) {
      project.description = input.description;
    }
    project.updatedById = userId;

    await this.projects.save(project);
    return toProject(project);
  }

  async remove(userId: string, workspaceId: string, projectId: string): Promise<void> {
    const project = await this.getForMember(userId, workspaceId, projectId);

    await this.dataSource.transaction(async (manager) => {
      const deletion = {
        deletedAt: new Date(),
        deletedById: userId,
        updatedById: userId,
      };
      await manager.getRepository(TaskEntity).update({ projectId: project.id }, deletion);
      await manager.getRepository(ProjectEntity).update({ id: project.id }, deletion);
    });
  }
}
