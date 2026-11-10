import type { TimeEntry } from '@crewclock/shared';

import type { TimeEntryEntity } from '../entities/time-entry.entity';

export function toTimeEntry(entry: TimeEntryEntity): TimeEntry {
  return {
    id: entry.id,
    workspaceId: entry.workspaceId,
    userId: entry.userId,
    projectId: entry.projectId,
    taskId: entry.taskId,
    description: entry.description,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt ? entry.endedAt.toISOString() : null,
    durationSeconds: entry.endedAt
      ? Math.max(0, Math.floor((entry.endedAt.getTime() - entry.startedAt.getTime()) / 1000))
      : null,
    source: entry.source,
    createdBy: entry.createdById,
    updatedBy: entry.updatedById,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}
