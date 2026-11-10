import type { ActivitySource } from '@crewclock/shared';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';

@Entity({ name: 'activity_samples' })
@Index('uq_activity_samples_client', ['deviceId', 'clientSampleId', 'intervalStart'], {
  unique: true,
})
export class ActivitySampleEntity extends BaseEntity {
  @PrimaryColumn({ type: 'timestamptz' })
  intervalStart!: Date;

  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  deviceId!: string;

  @Column({ type: 'uuid' })
  clientSampleId!: string;

  @Column({ type: 'timestamptz' })
  intervalEnd!: Date;

  @Column({ type: 'varchar', length: 16 })
  source!: ActivitySource;

  @Column({ type: 'integer', default: 0 })
  activeSeconds!: number;

  @Column({ type: 'integer', default: 0 })
  idleSeconds!: number;

  @Column({ type: 'integer', default: 0 })
  keyboardEvents!: number;

  @Column({ type: 'integer', default: 0 })
  mouseEvents!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  appName!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  appId!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  windowTitle!: string | null;

  @Column({ type: 'text', nullable: true })
  url!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  pageTitle!: string | null;
}
