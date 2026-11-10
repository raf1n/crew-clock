import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  roleAtLeast,
  type ActivityAppGroup,
  type ActivityBatchInput,
  type ActivityIngestResult,
  type ActivityMemberGroup,
  type ActivityReport,
  type ActivityReportQuery,
} from '@crewclock/shared';
import { In, Repository } from 'typeorm';

import { WorkspacesService } from '../workspaces/workspaces.service';
import { ActivitySampleEntity } from './entities/activity-sample.entity';
import type { AuthenticatedDevice } from '../devices/types/authenticated-device';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivitySampleEntity)
    private readonly samples: Repository<ActivitySampleEntity>,
    private readonly workspaces: WorkspacesService,
  ) {}

  async ingest(
    device: AuthenticatedDevice,
    input: ActivityBatchInput,
  ): Promise<ActivityIngestResult> {
    const unique = Array.from(
      new Map(input.samples.map((sample) => [sample.clientSampleId, sample])).values(),
    );
    const ids = unique.map((sample) => sample.clientSampleId);
    const existing = await this.samples.find({
      where: {
        deviceId: device.deviceId,
        clientSampleId: In(ids),
      },
      select: { clientSampleId: true },
    });
    const existingIds = new Set(existing.map((sample) => sample.clientSampleId));
    const fresh = unique.filter((sample) => !existingIds.has(sample.clientSampleId));

    if (fresh.length > 0) {
      await this.samples
        .createQueryBuilder()
        .insert()
        .into(ActivitySampleEntity)
        .values(
          fresh.map((sample) => ({
            workspaceId: device.workspaceId,
            userId: device.userId,
            deviceId: device.deviceId,
            clientSampleId: sample.clientSampleId,
            intervalStart: new Date(sample.intervalStart),
            intervalEnd: new Date(sample.intervalEnd),
            source: sample.source,
            activeSeconds: sample.activeSeconds,
            idleSeconds: sample.idleSeconds,
            keyboardEvents: sample.keyboardEvents,
            mouseEvents: sample.mouseEvents,
            appName: sample.appName ?? null,
            appId: sample.appId ?? null,
            windowTitle: sample.windowTitle ?? null,
            url: sample.url ?? null,
            pageTitle: sample.pageTitle ?? null,
            createdById: device.userId,
            updatedById: device.userId,
          })),
        )
        .orIgnore()
        .execute();
    }

    const duplicates = input.samples.length - fresh.length;
    return { accepted: fresh.length, duplicates };
  }

  async report(
    actorId: string,
    workspaceId: string,
    query: ActivityReportQuery,
  ): Promise<ActivityReport> {
    const membership = await this.workspaces.getMembership(actorId, workspaceId);
    const scopedUserId = roleAtLeast(membership.role, 'manager') ? query.userId : actorId;

    const builder = this.samples
      .createQueryBuilder('sample')
      .select("COALESCE(sample.app_name, 'Unknown app')", 'appName')
      .addSelect('sample.app_id', 'appId')
      .addSelect('SUM(sample.active_seconds)', 'activeSeconds')
      .addSelect('SUM(sample.idle_seconds)', 'idleSeconds')
      .addSelect('SUM(sample.keyboard_events)', 'keyboardEvents')
      .addSelect('SUM(sample.mouse_events)', 'mouseEvents')
      .addSelect('COUNT(*)', 'sampleCount')
      .where('sample.workspace_id = :workspaceId', { workspaceId })
      .andWhere('sample.deleted_at IS NULL')
      .andWhere('sample.interval_start >= :from', { from: new Date(query.from) })
      .andWhere('sample.interval_start < :to', { to: new Date(query.to) })
      .groupBy('sample.app_name')
      .addGroupBy('sample.app_id')
      .orderBy('SUM(sample.active_seconds)', 'DESC');

    if (scopedUserId) {
      builder.andWhere('sample.user_id = :userId', { userId: scopedUserId });
    }

    const rows = await builder.getRawMany<{
      appName: string;
      appId: string | null;
      activeSeconds: string;
      idleSeconds: string;
      keyboardEvents: string;
      mouseEvents: string;
      sampleCount: string;
    }>();

    const groups: ActivityAppGroup[] = rows.map((row) => ({
      appName: row.appName,
      appId: row.appId,
      activeSeconds: Number(row.activeSeconds),
      idleSeconds: Number(row.idleSeconds),
      keyboardEvents: Number(row.keyboardEvents),
      mouseEvents: Number(row.mouseEvents),
      sampleCount: Number(row.sampleCount),
    }));

    const totalActiveSeconds = groups.reduce((total, group) => total + group.activeSeconds, 0);
    const totalIdleSeconds = groups.reduce((total, group) => total + group.idleSeconds, 0);
    const tracked = totalActiveSeconds + totalIdleSeconds;

    const memberRows = await this.memberAppTotals(workspaceId, scopedUserId, query);
    const workspaceMembers = await this.workspaces.listMembers(actorId, workspaceId);
    const trackable = workspaceMembers.filter(
      (member) => member.role === 'member' && (!scopedUserId || member.userId === scopedUserId),
    );

    const appsByMember = new Map<string, Map<string, ActivityAppGroup>>();
    for (const row of memberRows) {
      const memberApps = appsByMember.get(row.userId) ?? new Map<string, ActivityAppGroup>();
      const key = `${row.appId ?? ''}:${row.appName}`;
      const group = memberApps.get(key) ?? {
        appName: row.appName,
        appId: row.appId,
        activeSeconds: 0,
        idleSeconds: 0,
        keyboardEvents: 0,
        mouseEvents: 0,
        sampleCount: 0,
      };
      group.activeSeconds += Number(row.activeSeconds);
      group.idleSeconds += Number(row.idleSeconds);
      group.keyboardEvents += Number(row.keyboardEvents);
      group.mouseEvents += Number(row.mouseEvents);
      group.sampleCount += Number(row.sampleCount);
      memberApps.set(key, group);
      appsByMember.set(row.userId, memberApps);
    }

    const members: ActivityMemberGroup[] = trackable
      .map((member) => {
        const apps = Array.from(appsByMember.get(member.userId)?.values() ?? []).sort(
          (left, right) => right.activeSeconds - left.activeSeconds,
        );
        const activeSeconds = apps.reduce((total, app) => total + app.activeSeconds, 0);
        const idleSeconds = apps.reduce((total, app) => total + app.idleSeconds, 0);
        const memberTracked = activeSeconds + idleSeconds;
        return {
          userId: member.userId,
          label: member.user.name,
          activeSeconds,
          idleSeconds,
          activityPercent:
            memberTracked > 0 ? Math.round((activeSeconds / memberTracked) * 100) : 0,
          sampleCount: apps.reduce((total, app) => total + app.sampleCount, 0),
          apps,
        };
      })
      .sort((left, right) => right.activeSeconds - left.activeSeconds);

    return {
      from: query.from,
      to: query.to,
      totalActiveSeconds,
      totalIdleSeconds,
      activityPercent: tracked > 0 ? Math.round((totalActiveSeconds / tracked) * 100) : 0,
      sampleCount: groups.reduce((total, group) => total + group.sampleCount, 0),
      groups,
      members,
    };
  }

  private async memberAppTotals(
    workspaceId: string,
    scopedUserId: string | undefined,
    query: ActivityReportQuery,
  ): Promise<
    Array<{
      userId: string;
      appName: string;
      appId: string | null;
      activeSeconds: string;
      idleSeconds: string;
      keyboardEvents: string;
      mouseEvents: string;
      sampleCount: string;
    }>
  > {
    const builder = this.samples
      .createQueryBuilder('sample')
      .select('sample.user_id', 'userId')
      .addSelect("COALESCE(sample.app_name, 'Unknown app')", 'appName')
      .addSelect('sample.app_id', 'appId')
      .addSelect('SUM(sample.active_seconds)', 'activeSeconds')
      .addSelect('SUM(sample.idle_seconds)', 'idleSeconds')
      .addSelect('SUM(sample.keyboard_events)', 'keyboardEvents')
      .addSelect('SUM(sample.mouse_events)', 'mouseEvents')
      .addSelect('COUNT(*)', 'sampleCount')
      .where('sample.workspace_id = :workspaceId', { workspaceId })
      .andWhere('sample.deleted_at IS NULL')
      .andWhere('sample.interval_start >= :from', { from: new Date(query.from) })
      .andWhere('sample.interval_start < :to', { to: new Date(query.to) })
      .groupBy('sample.user_id')
      .addGroupBy('sample.app_name')
      .addGroupBy('sample.app_id');

    if (scopedUserId) {
      builder.andWhere('sample.user_id = :userId', { userId: scopedUserId });
    }

    return builder.getRawMany();
  }
}
