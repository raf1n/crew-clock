import type { DevicePlatform } from '@crewclock/shared';
import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';

@Entity({ name: 'devices' })
@Index('uq_devices_token_hash', ['tokenHash'], { unique: true })
export class DeviceEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 16 })
  platform!: DevicePlatform;

  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}
