import type { Device } from '@crewclock/shared';

import type { DeviceEntity } from '../entities/device.entity';

export function toDevice(device: DeviceEntity): Device {
  return {
    id: device.id,
    workspaceId: device.workspaceId,
    userId: device.userId,
    name: device.name,
    platform: device.platform,
    lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
    revokedAt: device.revokedAt ? device.revokedAt.toISOString() : null,
    isActive: device.isActive,
    createdAt: device.createdAt.toISOString(),
  };
}
