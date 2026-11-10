import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';

@Entity({ name: 'workspaces' })
export class WorkspaceEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string;
}
