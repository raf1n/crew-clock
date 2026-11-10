import type { DevicePlatform } from '@crewclock/shared';

export interface AuthenticatedDevice {
  deviceId: string;
  userId: string;
  workspaceId: string;
  name: string;
  platform: DevicePlatform;
  lastSeenAt: string;
}
