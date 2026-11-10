import type { TimeEntrySource } from '@crewclock/shared';
import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';

@Entity({ name: 'time_entries' })
export class TimeEntryEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({ type: 'uuid', nullable: true })
  taskId!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'varchar', length: 16, default: 'manual' })
  source!: TimeEntrySource;
}
