import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';

@Entity({ name: 'projects' })
export class ProjectEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;
}
