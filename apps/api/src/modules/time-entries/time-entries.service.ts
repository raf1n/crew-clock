import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  roleAtLeast,
  type CreateTimeEntryInput,
  type ListTimeEntriesQuery,
  type Page,
  type StartTimerInput,
  type TimeEntry,
  type UpdateTimeEntryInput,
} from '@crewclock/shared';
import { IsNull, Repository } from 'typeorm';

import { isOverlapViolation } from '../../common/database-errors';
import { ProjectsService } from '../projects/projects.service';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TimesheetEntity } from '../timesheets/entities/timesheet.entity';
import { resolveWeekForDate } from '../timesheets/utils/week.util';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { TimeEntryEntity } from './entities/time-entry.entity';
import { toTimeEntry } from './mappers/time-entry.mapper';

@Injectable()
export class TimeEntriesService {
  constructor(
    @InjectRepository(TimeEntryEntity)
    private readonly entries: Repository<TimeEntryEntity>,
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
    @InjectRepository(TimesheetEntity)
    private readonly timesheets: Repository<TimesheetEntity>,
    private readonly projects: ProjectsService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async list(
    actorId: string,
    workspaceId: string,
    query: ListTimeEntriesQuery,
  ): Promise<Page<TimeEntry>> {
    const membership = await this.workspaces.getMembership(actorId, workspaceId);
    const scopedUserId = roleAtLeast(membership.role, 'manager') ? query.userId : actorId;

    const builder = this.entries
      .createQueryBuilder('entry')
      .where('entry.workspace_id = :workspaceId', { workspaceId })
      .andWhere('entry.deleted_at IS NULL');

    if (scopedUserId) {
      builder.andWhere('entry.user_id = :userId', { userId: scopedUserId });
    }
    if (query.projectId) {
      builder.andWhere('entry.project_id = :projectId', { projectId: query.projectId });
    }
    if (query.taskId) {
      builder.andWhere('entry.task_id = :taskId', { taskId: query.taskId });
    }
    if (query.from) {
      builder.andWhere('entry.started_at >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      builder.andWhere('entry.started_at < :to', { to: new Date(query.to) });
    }

    const [items, total] = await builder
      .orderBy('entry.started_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items: items.map(toTimeEntry),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async get(actorId: string, workspaceId: string, entryId: string): Promise<TimeEntry> {
    const entry = await this.getAccessibleEntry(actorId, workspaceId, entryId);
    return toTimeEntry(entry);
  }

  async running(actorId: string, workspaceId: string): Promise<TimeEntry | null> {
    await this.workspaces.getMembership(actorId, workspaceId);

    const entry = await this.entries.findOne({
      where: { userId: actorId, workspaceId, endedAt: IsNull() },
    });
    return entry ? toTimeEntry(entry) : null;
  }

  async create(
    actorId: string,
    workspaceId: string,
    input: CreateTimeEntryInput,
  ): Promise<TimeEntry> {
    await this.assertCanTrack(actorId, workspaceId);
    await this.assertProjectAndTask(actorId, workspaceId, input.projectId, input.taskId ?? null);

    const startedAt = new Date(input.startedAt);
    const endedAt = new Date(input.endedAt);
    assertRange(startedAt, endedAt);
    await this.assertWeekEditable(actorId, workspaceId, startedAt);

    const entry = this.entries.create({
      workspaceId,
      userId: actorId,
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      description: input.description ?? null,
      startedAt,
      endedAt,
      source: 'manual',
      createdById: actorId,
      updatedById: actorId,
    });

    await this.save(entry);
    return toTimeEntry(entry);
  }

  async startTimer(
    actorId: string,
    workspaceId: string,
    input: StartTimerInput,
  ): Promise<TimeEntry> {
    await this.assertCanTrack(actorId, workspaceId);
    await this.assertProjectAndTask(actorId, workspaceId, input.projectId, input.taskId ?? null);

    const startedAt = new Date();
    await this.assertWeekEditable(actorId, workspaceId, startedAt);

    const running = await this.entries.findOne({
      where: { userId: actorId, endedAt: IsNull() },
    });
    if (running) {
      throw new ConflictException('A timer is already running');
    }

    const entry = this.entries.create({
      workspaceId,
      userId: actorId,
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      description: input.description ?? null,
      startedAt,
      endedAt: null,
      source: 'timer',
      createdById: actorId,
      updatedById: actorId,
    });

    await this.save(entry);
    return toTimeEntry(entry);
  }

  async stopTimer(actorId: string, workspaceId: string, entryId: string): Promise<TimeEntry> {
    const entry = await this.entries.findOne({
      where: { id: entryId, workspaceId, userId: actorId },
    });
    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }
    if (entry.endedAt) {
      throw new ConflictException('Timer is not running');
    }

    entry.endedAt = new Date(Math.max(Date.now(), entry.startedAt.getTime() + 1000));
    entry.updatedById = actorId;
    await this.save(entry);
    return toTimeEntry(entry);
  }

  async update(
    actorId: string,
    workspaceId: string,
    entryId: string,
    input: UpdateTimeEntryInput,
  ): Promise<TimeEntry> {
    await this.assertCanTrack(actorId, workspaceId);
    const entry = await this.getAccessibleEntry(actorId, workspaceId, entryId);
    await this.assertWeekEditable(entry.userId, workspaceId, entry.startedAt);

    if (entry.endedAt === null && (input.startedAt || input.endedAt)) {
      throw new ConflictException('Stop the timer before editing its times');
    }

    let projectId = entry.projectId;
    let taskId = entry.taskId;

    if (input.projectId !== undefined) {
      projectId = input.projectId;
      if (input.taskId === undefined) {
        taskId = null;
      }
    }
    if (input.taskId !== undefined) {
      taskId = input.taskId;
    }
    if (input.projectId !== undefined || input.taskId !== undefined) {
      await this.assertProjectAndTask(actorId, workspaceId, projectId, taskId);
    }

    const startedAt = input.startedAt ? new Date(input.startedAt) : entry.startedAt;
    const endedAt = input.endedAt ? new Date(input.endedAt) : entry.endedAt;
    assertRange(startedAt, endedAt);

    if (startedAt.getTime() !== entry.startedAt.getTime()) {
      await this.assertWeekEditable(entry.userId, workspaceId, startedAt);
    }

    entry.projectId = projectId;
    entry.taskId = taskId;
    entry.startedAt = startedAt;
    entry.endedAt = endedAt;
    if (input.description !== undefined) {
      entry.description = input.description;
    }
    entry.updatedById = actorId;

    await this.save(entry);
    return toTimeEntry(entry);
  }

  async remove(actorId: string, workspaceId: string, entryId: string): Promise<void> {
    await this.assertCanTrack(actorId, workspaceId);
    const entry = await this.getAccessibleEntry(actorId, workspaceId, entryId);
    await this.assertWeekEditable(entry.userId, workspaceId, entry.startedAt);

    await this.entries.update(
      { id: entry.id },
      { deletedAt: new Date(), deletedById: actorId, updatedById: actorId },
    );
  }

  private async getAccessibleEntry(
    actorId: string,
    workspaceId: string,
    entryId: string,
  ): Promise<TimeEntryEntity> {
    const membership = await this.workspaces.getMembership(actorId, workspaceId);

    const entry = await this.entries.findOne({ where: { id: entryId, workspaceId } });
    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }
    if (entry.userId !== actorId && !roleAtLeast(membership.role, 'manager')) {
      throw new NotFoundException('Time entry not found');
    }
    return entry;
  }

  private async assertProjectAndTask(
    actorId: string,
    workspaceId: string,
    projectId: string,
    taskId: string | null,
  ): Promise<void> {
    await this.projects.getForMember(actorId, workspaceId, projectId);

    if (!taskId) {
      return;
    }

    const task = await this.tasks.findOne({ where: { id: taskId, workspaceId, projectId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
  }

  private async save(entry: TimeEntryEntity): Promise<void> {
    try {
      await this.entries.save(entry);
    } catch (error) {
      if (isOverlapViolation(error)) {
        throw new ConflictException('Time entry overlaps an existing entry');
      }
      throw error;
    }
  }

  private async assertWeekEditable(userId: string, workspaceId: string, at: Date): Promise<void> {
    const { periodStart } = resolveWeekForDate(at);
    const timesheet = await this.timesheets.findOne({
      where: { workspaceId, userId, periodStart },
    });

    if (timesheet && timesheet.status !== 'draft') {
      throw new ConflictException('This week is locked by a submitted timesheet');
    }
  }

  private async assertCanTrack(actorId: string, workspaceId: string): Promise<void> {
    const membership = await this.workspaces.getMembership(actorId, workspaceId);
    if (membership.role !== 'member') {
      throw new ForbiddenException('Only workspace members can track time');
    }
  }
}

function assertRange(startedAt: Date, endedAt: Date | null): void {
  if (endedAt && endedAt.getTime() <= startedAt.getTime()) {
    throw new BadRequestException('endedAt must be after startedAt');
  }
}
