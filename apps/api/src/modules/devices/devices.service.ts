import { randomBytes } from 'node:crypto';

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  roleAtLeast,
  type CreateDeviceInput,
  type CreateDeviceResult,
  type Device,
} from '@crewclock/shared';
import { IsNull, Repository } from 'typeorm';

import { hashToken } from '../../common/utils/token-hash';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { DeviceEntity } from './entities/device.entity';
import { toDevice } from './mappers/device.mapper';

const DEVICE_TOKEN_PREFIX = 'cc_dev_';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(DeviceEntity)
    private readonly devices: Repository<DeviceEntity>,
    private readonly workspaces: WorkspacesService,
  ) {}

  async create(
    actorId: string,
    workspaceId: string,
    input: CreateDeviceInput,
  ): Promise<CreateDeviceResult> {
    const membership = await this.workspaces.getMembership(actorId, workspaceId);
    if (membership.role !== 'member') {
      throw new ForbiddenException('Only workspace members can register tracking devices');
    }

    const token = `${DEVICE_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
    const device = this.devices.create({
      workspaceId,
      userId: actorId,
      name: input.name,
      platform: input.platform,
      tokenHash: hashToken(token),
      createdById: actorId,
      updatedById: actorId,
    });

    await this.devices.save(device);
    return { device: toDevice(device), token };
  }

  async list(actorId: string, workspaceId: string): Promise<Device[]> {
    const membership = await this.workspaces.getMembership(actorId, workspaceId);
    const where = roleAtLeast(membership.role, 'manager')
      ? { workspaceId }
      : { workspaceId, userId: actorId };

    const devices = await this.devices.find({ where, order: { createdAt: 'DESC' } });
    return devices.map(toDevice);
  }

  async revoke(actorId: string, workspaceId: string, deviceId: string): Promise<void> {
    const membership = await this.workspaces.getMembership(actorId, workspaceId);
    const device = await this.devices.findOne({ where: { id: deviceId, workspaceId } });

    if (!device || (device.userId !== actorId && !roleAtLeast(membership.role, 'manager'))) {
      throw new NotFoundException('Device not found');
    }
    if (device.revokedAt) {
      return;
    }

    device.revokedAt = new Date();
    device.isActive = false;
    device.updatedById = actorId;
    await this.devices.save(device);
  }

  async authenticateToken(token: string): Promise<DeviceEntity> {
    if (!token.startsWith(DEVICE_TOKEN_PREFIX)) {
      throw new UnauthorizedException('Invalid device token');
    }

    const device = await this.devices.findOne({
      where: {
        tokenHash: hashToken(token),
        revokedAt: IsNull(),
        isActive: true,
      },
    });
    if (!device) {
      throw new UnauthorizedException('Invalid device token');
    }

    const membership = await this.workspaces.findMembership(device.userId, device.workspaceId);
    if (!membership || membership.role !== 'member') {
      throw new UnauthorizedException('Invalid device token');
    }

    device.lastSeenAt = new Date();
    await this.devices.update({ id: device.id }, { lastSeenAt: device.lastSeenAt });
    return device;
  }
}
