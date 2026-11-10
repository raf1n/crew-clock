import { z } from 'zod';

import { paginationSchema } from './pagination';

export const TIME_ENTRY_SOURCES = ['manual', 'timer'] as const;

export type TimeEntrySource = (typeof TIME_ENTRY_SOURCES)[number];

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const createTimeEntrySchema = z
  .object({
    projectId: z.uuid(),
    taskId: z.uuid().nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    startedAt: isoDateTimeSchema,
    endedAt: isoDateTimeSchema,
    clientId: z.uuid().optional(),
    idleSeconds: z.number().int().min(0).max(604_800).optional(),
  })
  .refine((value) => new Date(value.endedAt).getTime() > new Date(value.startedAt).getTime(), {
    message: 'endedAt must be after startedAt',
    path: ['endedAt'],
  });

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;

export const startTimerSchema = z.object({
  projectId: z.uuid(),
  taskId: z.uuid().nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

export type StartTimerInput = z.infer<typeof startTimerSchema>;

export const updateTimeEntrySchema = z
  .object({
    projectId: z.uuid().optional(),
    taskId: z.uuid().nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    startedAt: isoDateTimeSchema.optional(),
    endedAt: isoDateTimeSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;

export const listTimeEntriesQuerySchema = paginationSchema
  .extend({
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional(),
    userId: z.uuid().optional(),
    projectId: z.uuid().optional(),
    taskId: z.uuid().optional(),
  })
  .refine((value) => !value.from || !value.to || new Date(value.from) < new Date(value.to), {
    message: 'from must be before to',
    path: ['to'],
  });

export type ListTimeEntriesQuery = z.infer<typeof listTimeEntriesQuerySchema>;

export interface TimeEntry {
  id: string;
  workspaceId: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  description: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  source: TimeEntrySource;
  clientId: string | null;
  idleSeconds: number;
  timezone: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
