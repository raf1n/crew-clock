import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  roleAtLeast,
  type DailyReportMember,
  type DailyReportQuery,
  type DailyTimeReport,
  type ReportQuery,
  type TimeReport,
  type TimeReportGroup,
} from '@crewclock/shared';
import { Repository } from 'typeorm';

import { WorkspacesService } from '../workspaces/workspaces.service';
import { TimeEntryEntity } from '../time-entries/entities/time-entry.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(TimeEntryEntity)
    private readonly entries: Repository<TimeEntryEntity>,
    private readonly workspaces: WorkspacesService,
  ) {}

  async timeReport(actorId: string, workspaceId: string, query: ReportQuery): Promise<TimeReport> {
    const membership = await this.workspaces.getMembership(actorId, workspaceId);
    const scopedUserId = roleAtLeast(membership.role, 'manager') ? query.userId : actorId;

    const groupColumn =
      query.groupBy === 'user'
        ? 'entry.userId'
        : query.groupBy === 'project'
          ? 'entry.projectId'
          : 'entry.taskId';

    const builder = this.entries
      .createQueryBuilder('entry')
      .select(groupColumn, 'key')
      .addSelect('SUM(EXTRACT(EPOCH FROM (entry.ended_at - entry.started_at)))', 'seconds')
      .addSelect('COUNT(*)', 'entryCount')
      .where('entry.workspace_id = :workspaceId', { workspaceId })
      .andWhere('entry.deleted_at IS NULL')
      .andWhere('entry.ended_at IS NOT NULL')
      .andWhere('entry.started_at >= :from', { from: new Date(query.from) })
      .andWhere('entry.started_at < :to', { to: new Date(query.to) })
      .groupBy(groupColumn);

    if (scopedUserId) {
      builder.andWhere('entry.user_id = :userId', { userId: scopedUserId });
    }

    if (query.groupBy === 'user') {
      builder
        .leftJoin('users', 'memberUser', 'memberUser.id = entry.user_id')
        .addSelect('memberUser.name', 'label')
        .addGroupBy('memberUser.name');
    } else if (query.groupBy === 'project') {
      builder
        .leftJoin('projects', 'project', 'project.id = entry.project_id')
        .addSelect('project.name', 'label')
        .addGroupBy('project.name');
    } else {
      builder
        .leftJoin('tasks', 'task', 'task.id = entry.task_id')
        .addSelect("COALESCE(task.title, 'No task')", 'label')
        .addGroupBy('task.title');
    }

    const rows = await builder.getRawMany<{
      key: string | null;
      label: string | null;
      seconds: string;
      entryCount: string;
    }>();

    const groups: TimeReportGroup[] = rows
      .map((row) => ({
        key: row.key,
        label: row.label ?? 'Unknown',
        seconds: Math.round(Number(row.seconds)),
        entryCount: Number(row.entryCount),
      }))
      .sort((left, right) => right.seconds - left.seconds);

    return {
      from: query.from,
      to: query.to,
      groupBy: query.groupBy,
      totalSeconds: groups.reduce((total, group) => total + group.seconds, 0),
      groups,
    };
  }

  async dailyReport(
    actorId: string,
    workspaceId: string,
    query: DailyReportQuery,
  ): Promise<DailyTimeReport> {
    const membership = await this.workspaces.getMembership(actorId, workspaceId);
    const scopedUserId = roleAtLeast(membership.role, 'manager') ? query.userId : actorId;

    const from = new Date(query.from);
    const to = new Date(query.to);
    const dates = buildDates(from, to);
    if (dates.length > 92) {
      throw new BadRequestException('Date range is too large (maximum 92 days)');
    }

    const rows = await this.entries
      .createQueryBuilder('entry')
      .innerJoin('users', 'memberUser', 'memberUser.id = entry.user_id')
      .select('entry.user_id', 'userId')
      .addSelect('memberUser.name', 'name')
      .addSelect("to_char(entry.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(EXTRACT(EPOCH FROM (entry.ended_at - entry.started_at)))', 'seconds')
      .addSelect('COUNT(*)', 'entryCount')
      .where('entry.workspace_id = :workspaceId', { workspaceId })
      .andWhere('entry.deleted_at IS NULL')
      .andWhere('entry.ended_at IS NOT NULL')
      .andWhere('entry.started_at >= :from', { from })
      .andWhere('entry.started_at < :to', { to })
      .groupBy('entry.user_id')
      .addGroupBy('memberUser.name')
      .addGroupBy("to_char(entry.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')")
      .getRawMany<{
        userId: string;
        name: string;
        date: string;
        seconds: string;
        entryCount: string;
      }>();

    const members = await this.workspaces.listMembers(actorId, workspaceId);
    const trackable = members.filter(
      (member) => member.role === 'member' && (!scopedUserId || member.userId === scopedUserId),
    );

    const secondsByUser = new Map<
      string,
      { total: number; days: Map<string, { seconds: number; entryCount: number }> }
    >();
    for (const row of rows) {
      let entry = secondsByUser.get(row.userId);
      if (!entry) {
        entry = { total: 0, days: new Map() };
        secondsByUser.set(row.userId, entry);
      }
      const seconds = Math.round(Number(row.seconds));
      entry.total += seconds;
      entry.days.set(row.date, { seconds, entryCount: Number(row.entryCount) });
    }

    const reportMembers: DailyReportMember[] = trackable
      .map((member) => {
        const days = dates.map((date) => {
          const day = secondsByUser.get(member.userId)?.days.get(date);
          return { date, seconds: day?.seconds ?? 0, entryCount: day?.entryCount ?? 0 };
        });
        return {
          userId: member.userId,
          label: member.user.name,
          totalSeconds: days.reduce((total, day) => total + day.seconds, 0),
          days,
        };
      })
      .sort((left, right) => right.totalSeconds - left.totalSeconds);

    return {
      from: query.from,
      to: query.to,
      dates,
      totalSeconds: reportMembers.reduce((total, member) => total + member.totalSeconds, 0),
      members: reportMembers,
    };
  }
}

function buildDates(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (cursor.getTime() < to.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
