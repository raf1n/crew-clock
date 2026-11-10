import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  CreateTaskInput,
  ListTasksQuery,
  Page,
  Task,
  UpdateTaskInput,
} from '@crewclock/shared';
import { FindOptionsWhere, Repository } from 'typeorm';

import { ProjectsService } from '../projects/projects.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { TaskEntity } from './entities/task.entity';
import { toTask } from './mappers/task.mapper';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
    private readonly projects: ProjectsService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async list(
    userId: string,
    workspaceId: string,
    projectId: string,
    query: ListTasksQuery,
  ): Promise<Page<Task>> {
    await this.projects.getForMember(userId, workspaceId, projectId);

    const where: FindOptionsWhere<TaskEntity> = { workspaceId, projectId };
    if (query.status !== undefined) {
      where.status = query.status;
    }
    if (query.assigneeId !== undefined) {
      where.assigneeId = query.assigneeId;
    }

    const [items, total] = await this.tasks.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      items: items.map(toTask),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async get(userId: string, workspaceId: string, projectId: string, taskId: string): Promise<Task> {
    await this.projects.getForMember(userId, workspaceId, projectId);
    const task = await this.getActiveTask(workspaceId, projectId, taskId);
    return toTask(task);
  }

  async create(
    userId: string,
    workspaceId: string,
    projectId: string,
    input: CreateTaskInput,
  ): Promise<Task> {
    await this.projects.getForMember(userId, workspaceId, projectId);

    if (input.assigneeId) {
      await this.assertAssigneeIsMember(workspaceId, input.assigneeId);
    }

    const task = this.tasks.create({
      workspaceId,
      projectId,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      assigneeId: input.assigneeId ?? null,
      createdById: userId,
      updatedById: userId,
    });
    await this.tasks.save(task);
    return toTask(task);
  }

  async update(
    userId: string,
    workspaceId: string,
    projectId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<Task> {
    await this.projects.getForMember(userId, workspaceId, projectId);
    const task = await this.getActiveTask(workspaceId, projectId, taskId);
    const membership = await this.workspaces.getMembership(userId, workspaceId);

    if (membership.role === 'member') {
      const fields = Object.keys(input);
      if (fields.some((field) => field !== 'status')) {
        throw new ForbiddenException('Members can only update task status');
      }
      if (task.assigneeId !== userId) {
        throw new ForbiddenException('You can only update tasks assigned to you');
      }
    }

    if (input.title !== undefined) {
      task.title = input.title;
    }
    if (input.description !== undefined) {
      task.description = input.description;
    }
    if (input.status !== undefined) {
      task.status = input.status;
    }
    if (input.assigneeId !== undefined) {
      if (input.assigneeId !== null) {
        await this.assertAssigneeIsMember(workspaceId, input.assigneeId);
      }
      task.assigneeId = input.assigneeId;
    }
    task.updatedById = userId;

    await this.tasks.save(task);
    return toTask(task);
  }

  async remove(
    userId: string,
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<void> {
    await this.projects.getForMember(userId, workspaceId, projectId);
    const task = await this.getActiveTask(workspaceId, projectId, taskId);
    await this.tasks.update(
      { id: task.id },
      { deletedAt: new Date(), deletedById: userId, updatedById: userId },
    );
  }

  private async getActiveTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskEntity> {
    const task = await this.tasks.findOne({
      where: { id: taskId, workspaceId, projectId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  private async assertAssigneeIsMember(workspaceId: string, userId: string): Promise<void> {
    const membership = await this.workspaces.findMembership(userId, workspaceId);
    if (!membership) {
      throw new BadRequestException('Assignee must be a member of this workspace');
    }
  }
}
