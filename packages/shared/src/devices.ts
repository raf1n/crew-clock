import { z } from 'zod';

export const DEVICE_PLATFORMS = ['macos', 'windows', 'linux'] as const;

export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export const createDeviceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  platform: z.enum(DEVICE_PLATFORMS),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;

export interface Device {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  platform: DevicePlatform;
  lastSeenAt: string | null;
  revokedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDeviceResult {
  device: Device;
  token: string;
}
