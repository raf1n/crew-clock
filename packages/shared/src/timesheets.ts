import { z } from 'zod';

export const TIMESHEET_STATUSES = ['draft', 'submitted', 'approved'] as const;

export type TimesheetStatus = (typeof TIMESHEET_STATUSES)[number];

export const weekStartSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'weekStart must be a YYYY-MM-DD date')
  .optional();

export const timesheetQuerySchema = z.object({
  weekStart: weekStartSchema,
});

export type TimesheetQuery = z.infer<typeof timesheetQuerySchema>;

export interface TimesheetProjectTotal {
  projectId: string;
  projectName: string;
  seconds: number;
}

export interface TimesheetDayTotal {
  date: string;
  seconds: number;
  entryCount: number;
}

export interface TimesheetTaskTotal {
  taskId: string | null;
  taskTitle: string;
  projectId: string;
  projectName: string;
  seconds: number;
}

export interface TimesheetSummary {
  id: string | null;
  workspaceId: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  status: TimesheetStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  totalSeconds: number;
  entryCount: number;
  projects: TimesheetProjectTotal[];
  tasks: TimesheetTaskTotal[];
  days: TimesheetDayTotal[];
}
