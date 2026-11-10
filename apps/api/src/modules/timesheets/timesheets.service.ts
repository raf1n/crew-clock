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
  type TimesheetQuery,
  type TimesheetSummary,
  type TimesheetTaskTotal,
} from '@crewclock/shared';
import { FindOptionsWhere, Repository } from 'typeorm';

import { isUniqueViolation } from '../../common/database-errors';
import { TimeEntryEntity } from '../time-entries/entities/time-entry.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { TimesheetEntity } from './entities/timesheet.entity';
import { toTimesheetSummary } from './mappers/timesheet.mapper';
import type { TimesheetTotals } from './types/timesheet-totals';
import { resolveWeek, type WeekRange } from './utils/week.util';

@Injectable()
export class TimesheetsService {
  constructor(
    @InjectRepository(TimesheetEntity)
    private readonly timesheets: Repository<TimesheetEntity>,
    @InjectRepository(TimeEntryEntity)
    private readonly entries: Repository<TimeEntryEntity>,
    private readonly workspaces: WorkspacesService,
  ) {}

  async getMe(
    actorId: string,
    workspaceId: string,
    query: TimesheetQuery,
  ): Promise<TimesheetSummary> {
    await this.workspaces.getMembership(actorId, workspaceId);
    const week = resolveWeek(query.weekStart);
    return this.buildSummary(workspaceId, actorId, week);
  }

  async list(
    actorId: string,
    workspaceId: string,
    query: TimesheetQuery,
  ): Promise<TimesheetSummary[]> {
    const membership = await this.workspaces.getMembership(actorId, workspaceId);
    const week = resolveWeek(query.weekStart);

    const where: FindOptionsWhere<TimesheetEntity> = {
      workspaceId,
      periodStart: week.periodStart,
    };
    if (!roleAtLeast(membership.role, 'manager')) {
      where.userId = actorId;
    }

    const rows = await this.timesheets.find({ where, order: { createdAt: 'ASC' } });
    return Promise.all(rows.map((row) => this.buildSummary(workspaceId, row.userId, week)));
  }

  async submit(
    actorId: string,
    workspaceId: string,
    query: TimesheetQuery,
  ): Promise<TimesheetSummary> {
    await this.workspaces.getMembership(actorId, workspaceId);
    const week = resolveWeek(query.weekStart);

    const totals = await this.totalsFor(workspaceId, actorId, week);
    if (totals.entryCount === 0) {
      throw new BadRequestException('No time entries to submit for this week');
    }

    const running = await this.entries
      .createQueryBuilder('entry')
      .where('entry.workspace_id = :workspaceId', { workspaceId })
      .andWhere('entry.user_id = :userId', { userId: actorId })
      .andWhere('entry.deleted_at IS NULL')
      .andWhere('entry.ended_at IS NULL')
      .andWhere('entry.started_at >= :start', { start: `${week.periodStart}T00:00:00.000Z` })
      .andWhere('entry.started_at < :end', { end: `${week.periodEnd}T00:00:00.000Z` })
      .getCount();

    if (running > 0) {
      throw new BadRequestException('Stop the running timer before submitting this week');
    }

    let timesheet = await this.findRow(workspaceId, actorId, week.periodStart);
    if (timesheet?.status === 'approved') {
      throw new ConflictException('Approved timesheets cannot be resubmitted');
    }

    if (!timesheet) {
      timesheet = this.timesheets.create({
        workspaceId,
        userId: actorId,
        periodStart: week.periodStart,
        periodEnd: week.periodEnd,
        status: 'submitted',
        submittedAt: new Date(),
        createdById: actorId,
        updatedById: actorId,
      });
      try {
        await this.timesheets.save(timesheet);
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
        timesheet = await this.findRow(workspaceId, actorId, week.periodStart);
        if (!timesheet) {
          throw new ConflictException('Timesheet could not be submitted');
        }
      }
    } else if (timesheet.status === 'draft') {
      timesheet.status = 'submitted';
      timesheet.submittedAt = new Date();
      timesheet.updatedById = actorId;
      await this.timesheets.save(timesheet);
    }

    return toTimesheetSummary({
      timesheet,
      workspaceId,
      userId: actorId,
      periodStart: timesheet.periodStart,
      periodEnd: timesheet.periodEnd,
      totals,
    });
  }

  async approve(
    actorId: string,
    workspaceId: string,
    timesheetId: string,
  ): Promise<TimesheetSummary> {
    const membership = await this.workspaces.getMembership(actorId, workspaceId);
    if (!roleAtLeast(membership.role, 'manager')) {
      throw new ForbiddenException('Only owners and managers can approve timesheets');
    }

    const timesheet = await this.timesheets.findOne({
      where: { id: timesheetId, workspaceId },
    });
    if (!timesheet) {
      throw new NotFoundException('Timesheet not found');
    }
    if (timesheet.status !== 'submitted') {
      throw new ConflictException('Only submitted timesheets can be approved');
    }

    timesheet.status = 'approved';
    timesheet.approvedAt = new Date();
    timesheet.approvedBy = actorId;
    timesheet.updatedById = actorId;
    await this.timesheets.save(timesheet);

    const totals = await this.totalsFor(workspaceId, timesheet.userId, {
      periodStart: timesheet.periodStart,
      periodEnd: timesheet.periodEnd,
    });

    return toTimesheetSummary({
      timesheet,
      workspaceId,
      userId: timesheet.userId,
      periodStart: timesheet.periodStart,
      periodEnd: timesheet.periodEnd,
      totals,
    });
  }

  async withdraw(
    actorId: string,
    workspaceId: string,
    timesheetId: string,
  ): Promise<TimesheetSummary> {
    const membership = await this.workspaces.getMembership(actorId, workspaceId);

    const timesheet = await this.timesheets.findOne({
      where: { id: timesheetId, workspaceId },
    });
    if (!timesheet || (timesheet.userId !== actorId && !roleAtLeast(membership.role, 'manager'))) {
      throw new NotFoundException('Timesheet not found');
    }
    if (timesheet.status !== 'submitted') {
      throw new ConflictException('Only submitted timesheets can be withdrawn');
    }

    timesheet.status = 'draft';
    timesheet.submittedAt = null;
    timesheet.updatedById = actorId;
    await this.timesheets.save(timesheet);

    const totals = await this.totalsFor(workspaceId, timesheet.userId, {
      periodStart: timesheet.periodStart,
      periodEnd: timesheet.periodEnd,
    });

    return toTimesheetSummary({
      timesheet,
      workspaceId,
      userId: timesheet.userId,
      periodStart: timesheet.periodStart,
      periodEnd: timesheet.periodEnd,
      totals,
    });
  }

  private async buildSummary(
    workspaceId: string,
    userId: string,
    week: WeekRange,
  ): Promise<TimesheetSummary> {
    const [totals, timesheet] = await Promise.all([
      this.totalsFor(workspaceId, userId, week),
      this.findRow(workspaceId, userId, week.periodStart),
    ]);

    return toTimesheetSummary({
      timesheet,
      workspaceId,
      userId,
      periodStart: week.periodStart,
      periodEnd: week.periodEnd,
      totals,
    });
  }

  private findRow(
    workspaceId: string,
    userId: string,
    periodStart: string,
  ): Promise<TimesheetEntity | null> {
    return this.timesheets.findOne({ where: { workspaceId, userId, periodStart } });
  }

  private async totalsFor(
    workspaceId: string,
    userId: string,
    week: WeekRange,
  ): Promise<TimesheetTotals> {
    const rows = await this.entries
      .createQueryBuilder('entry')
      .leftJoin('projects', 'project', 'project.id = entry.project_id')
      .leftJoin('tasks', 'task', 'task.id = entry.task_id')
      .select('entry.project_id', 'projectId')
      .addSelect('project.name', 'projectName')
      .addSelect('entry.task_id', 'taskId')
      .addSelect("COALESCE(task.title, 'No task')", 'taskTitle')
      .addSelect("to_char(entry.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(EXTRACT(EPOCH FROM (entry.ended_at - entry.started_at)))', 'seconds')
      .addSelect('COUNT(*)', 'entryCount')
      .where('entry.workspace_id = :workspaceId', { workspaceId })
      .andWhere('entry.user_id = :userId', { userId })
      .andWhere('entry.deleted_at IS NULL')
      .andWhere('entry.ended_at IS NOT NULL')
      .andWhere('entry.started_at >= :start', { start: `${week.periodStart}T00:00:00.000Z` })
      .andWhere('entry.started_at < :end', { end: `${week.periodEnd}T00:00:00.000Z` })
      .groupBy('entry.project_id')
      .addGroupBy('project.name')
      .addGroupBy('entry.task_id')
      .addGroupBy('task.title')
      .addGroupBy("to_char(entry.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')")
      .getRawMany<{
        projectId: string;
        projectName: string | null;
        taskId: string | null;
        taskTitle: string;
        date: string;
        seconds: string;
        entryCount: string;
      }>();

    const projectTotals = new Map<string, { projectName: string; seconds: number }>();
    const taskTotals = new Map<string, TimesheetTaskTotal & { rawSeconds: number }>();
    const dayTotals = new Map<string, { seconds: number; entryCount: number }>();

    for (const row of rows) {
      const seconds = Number(row.seconds);
      const project = projectTotals.get(row.projectId) ?? {
        projectName: row.projectName ?? 'Unknown project',
        seconds: 0,
      };
      project.seconds += seconds;
      projectTotals.set(row.projectId, project);

      const taskKey = `${row.projectId}:${row.taskId ?? 'none'}`;
      const task = taskTotals.get(taskKey) ?? {
        taskId: row.taskId,
        taskTitle: row.taskTitle,
        projectId: row.projectId,
        projectName: row.projectName ?? 'Unknown project',
        seconds: 0,
        rawSeconds: 0,
      };
      task.rawSeconds += seconds;
      taskTotals.set(taskKey, task);

      const day = dayTotals.get(row.date) ?? { seconds: 0, entryCount: 0 };
      day.seconds += seconds;
      day.entryCount += Number(row.entryCount);
      dayTotals.set(row.date, day);
    }

    const projects = Array.from(projectTotals, ([projectId, project]) => ({
      projectId,
      projectName: project.projectName,
      seconds: Math.round(project.seconds),
    })).sort((left, right) => right.seconds - left.seconds);

    const tasks = Array.from(taskTotals.values())
      .map((task) => ({
        taskId: task.taskId,
        taskTitle: task.taskTitle,
        projectId: task.projectId,
        projectName: task.projectName,
        seconds: Math.round(task.rawSeconds),
      }))
      .sort((left, right) => right.seconds - left.seconds);

    const days = weekDates(week.periodStart).map((date) => {
      const day = dayTotals.get(date);
      return {
        date,
        seconds: Math.round(day?.seconds ?? 0),
        entryCount: day?.entryCount ?? 0,
      };
    });

    return {
      projects,
      tasks,
      days,
      totalSeconds: projects.reduce((total, project) => total + project.seconds, 0),
      entryCount: rows.reduce((total, row) => total + Number(row.entryCount), 0),
    };
  }
}

function weekDates(periodStart: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${periodStart}T00:00:00.000Z`);
  for (let index = 0; index < 7; index += 1) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
