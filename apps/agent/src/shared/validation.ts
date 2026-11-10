import { loginSchema } from '@crewclock/shared';
import { z } from 'zod';

export const loginIpcSchema = loginSchema;

export const registerDeviceIpcSchema = z.object({
  workspaceId: z.uuid(),
  deviceName: z.string().trim().min(1).max(100),
});

export const startTimerIpcSchema = z.object({
  projectId: z.uuid(),
  projectName: z.string().trim().min(1).max(200),
  taskId: z.uuid().optional(),
  taskTitle: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
});

export const tasksIpcSchema = z.object({
  projectId: z.uuid(),
});

export function parseIpc<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Invalid input');
  }
  return result.data;
}
