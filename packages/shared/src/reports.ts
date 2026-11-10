import { z } from 'zod';

import { isoDateTimeSchema } from './time-entries';

export const REPORT_GROUP_BYS = ['user', 'project', 'task'] as const;

export type ReportGroupBy = (typeof REPORT_GROUP_BYS)[number];

export const reportQuerySchema = z
  .object({
    from: isoDateTimeSchema,
    to: isoDateTimeSchema,
    groupBy: z.enum(REPORT_GROUP_BYS).default('user'),
    userId: z.uuid().optional(),
  })
  .refine((value) => new Date(value.from).getTime() < new Date(value.to).getTime(), {
    message: 'from must be before to',
    path: ['to'],
  });

export type ReportQuery = z.infer<typeof reportQuerySchema>;

export const dailyReportQuerySchema = z
  .object({
    from: isoDateTimeSchema,
    to: isoDateTimeSchema,
    userId: z.uuid().optional(),
  })
  .refine((value) => new Date(value.from).getTime() < new Date(value.to).getTime(), {
    message: 'from must be before to',
    path: ['to'],
  });

export type DailyReportQuery = z.infer<typeof dailyReportQuerySchema>;

export interface DailyReportDay {
  date: string;
  seconds: number;
  entryCount: number;
}

export interface DailyReportMember {
  userId: string;
  label: string;
  totalSeconds: number;
  days: DailyReportDay[];
}

export interface DailyTimeReport {
  from: string;
  to: string;
  dates: string[];
  totalSeconds: number;
  members: DailyReportMember[];
}

export interface TimeReportGroup {
  key: string | null;
  label: string;
  seconds: number;
  entryCount: number;
}

export interface TimeReport {
  from: string;
  to: string;
  groupBy: ReportGroupBy;
  totalSeconds: number;
  groups: TimeReportGroup[];
}
