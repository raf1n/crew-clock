import { z } from 'zod';

import { isoDateTimeSchema } from './time-entries';

export const ACTIVITY_SOURCES = ['desktop', 'browser'] as const;

export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

const MAX_INTERVAL_SECONDS = 60 * 60;

export const activitySampleSchema = z
  .object({
    clientSampleId: z.uuid(),
    intervalStart: isoDateTimeSchema,
    intervalEnd: isoDateTimeSchema,
    source: z.enum(ACTIVITY_SOURCES),
    activeSeconds: z.number().int().min(0).max(MAX_INTERVAL_SECONDS),
    idleSeconds: z.number().int().min(0).max(MAX_INTERVAL_SECONDS),
    keyboardEvents: z.number().int().min(0).max(1_000_000),
    mouseEvents: z.number().int().min(0).max(1_000_000),
    appName: z.string().trim().max(255).nullable().optional(),
    appId: z.string().trim().max(255).nullable().optional(),
    windowTitle: z.string().trim().max(512).nullable().optional(),
    url: z.url().max(2048).nullable().optional(),
    pageTitle: z.string().trim().max(512).nullable().optional(),
  })
  .refine(
    (value) => new Date(value.intervalEnd).getTime() > new Date(value.intervalStart).getTime(),
    {
      message: 'intervalEnd must be after intervalStart',
      path: ['intervalEnd'],
    },
  )
  .refine(
    (value) => {
      const seconds =
        (new Date(value.intervalEnd).getTime() - new Date(value.intervalStart).getTime()) / 1000;
      return value.activeSeconds + value.idleSeconds <= Math.ceil(seconds) + 5;
    },
    {
      message: 'activeSeconds + idleSeconds exceed the interval',
      path: ['idleSeconds'],
    },
  )
  .refine(
    (value) =>
      (new Date(value.intervalEnd).getTime() - new Date(value.intervalStart).getTime()) / 1000 <=
      MAX_INTERVAL_SECONDS,
    {
      message: 'Activity interval is too long',
      path: ['intervalEnd'],
    },
  );

export type ActivitySampleInput = z.infer<typeof activitySampleSchema>;

export const activityBatchSchema = z.object({
  samples: z.array(activitySampleSchema).min(1).max(100),
});

export type ActivityBatchInput = z.infer<typeof activityBatchSchema>;

export interface ActivityIngestResult {
  accepted: number;
  duplicates: number;
}

export const activityReportQuerySchema = z
  .object({
    from: isoDateTimeSchema,
    to: isoDateTimeSchema,
    userId: z.uuid().optional(),
  })
  .refine((value) => new Date(value.from).getTime() < new Date(value.to).getTime(), {
    message: 'from must be before to',
    path: ['to'],
  });

export type ActivityReportQuery = z.infer<typeof activityReportQuerySchema>;

export interface ActivityAppGroup {
  appName: string;
  appId: string | null;
  activeSeconds: number;
  idleSeconds: number;
  keyboardEvents: number;
  mouseEvents: number;
  sampleCount: number;
}

export interface ActivityMemberGroup {
  userId: string;
  label: string;
  activeSeconds: number;
  idleSeconds: number;
  activityPercent: number;
  sampleCount: number;
  apps: ActivityAppGroup[];
}

export interface ActivityReport {
  from: string;
  to: string;
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  activityPercent: number;
  sampleCount: number;
  groups: ActivityAppGroup[];
  members: ActivityMemberGroup[];
}

export interface ActivitySample {
  id: string;
  workspaceId: string;
  userId: string;
  deviceId: string;
  clientSampleId: string;
  intervalStart: string;
  intervalEnd: string;
  source: ActivitySource;
  activeSeconds: number;
  idleSeconds: number;
  keyboardEvents: number;
  mouseEvents: number;
  appName: string | null;
  appId: string | null;
  windowTitle: string | null;
  url: string | null;
  pageTitle: string | null;
  createdAt: string;
}
