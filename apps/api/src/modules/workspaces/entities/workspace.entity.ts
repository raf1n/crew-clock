import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';

@Entity({ name: 'workspaces' })
export class WorkspaceEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'integer', default: 180 })
  activityRetentionDays!: number;
}
