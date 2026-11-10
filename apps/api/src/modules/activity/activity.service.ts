import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  roleAtLeast,
  type ActivityAppGroup,
  type ActivityBatchInput,
  type ActivityIngestResult,
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

    return {
      from: query.from,
      to: query.to,
      totalActiveSeconds,
      totalIdleSeconds,
      activityPercent: tracked > 0 ? Math.round((totalActiveSeconds / tracked) * 100) : 0,
      sampleCount: groups.reduce((total, group) => total + group.sampleCount, 0),
      groups,
    };
  }
}
