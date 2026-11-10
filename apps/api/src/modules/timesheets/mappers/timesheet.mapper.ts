import type { TimesheetSummary } from '@crewclock/shared';

import type { TimesheetEntity } from '../entities/timesheet.entity';
import type { TimesheetTotals } from '../types/timesheet-totals';

interface TimesheetSummaryInput {
  timesheet: TimesheetEntity | null;
  workspaceId: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  totals: TimesheetTotals;
}

export function toTimesheetSummary(input: TimesheetSummaryInput): TimesheetSummary {
  const { timesheet, workspaceId, userId, periodStart, periodEnd, totals } = input;

  return {
    id: timesheet?.id ?? null,
    workspaceId,
    userId,
    periodStart,
    periodEnd,
    status: timesheet?.status ?? 'draft',
    submittedAt: timesheet?.submittedAt ? timesheet.submittedAt.toISOString() : null,
    approvedAt: timesheet?.approvedAt ? timesheet.approvedAt.toISOString() : null,
    approvedBy: timesheet?.approvedBy ?? null,
    totalSeconds: totals.totalSeconds,
    entryCount: totals.entryCount,
    projects: totals.projects,
    tasks: totals.tasks,
    days: totals.days,
  };
}
