import type { TimesheetStatus } from '@crewclock/shared';
import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';

@Entity({ name: 'timesheets' })
export class TimesheetEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'date' })
  periodStart!: string;

  @Column({ type: 'date' })
  periodEnd!: string;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status!: TimesheetStatus;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  approvedBy!: string | null;
}
