import { z } from 'zod';

export const DEFAULT_TIMEZONE = 'UTC';

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isValidTimeZone, 'Invalid timezone');

export const updateTimezoneSchema = z.object({
  timezone: timezoneSchema,
});

export type UpdateTimezoneInput = z.infer<typeof updateTimezoneSchema>;

export const heartbeatTimezoneSchema = z
  .object({
    timezone: timezoneSchema.optional(),
  })
  .optional();

export type HeartbeatTimezoneInput = z.infer<typeof heartbeatTimezoneSchema>;
