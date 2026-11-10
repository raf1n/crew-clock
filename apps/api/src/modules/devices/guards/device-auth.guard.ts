import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

import { DevicesService } from '../devices.service';
import type { AuthenticatedDevice } from '../types/authenticated-device';

type DeviceRequest = Request & { device?: AuthenticatedDevice };

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly devices: DevicesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<DeviceRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing device token');
    }

    const device = await this.devices.authenticateToken(token);
    request.device = {
      deviceId: device.id,
      userId: device.userId,
      workspaceId: device.workspaceId,
      name: device.name,
      platform: device.platform,
      lastSeenAt: (device.lastSeenAt ?? new Date()).toISOString(),
    };
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}
