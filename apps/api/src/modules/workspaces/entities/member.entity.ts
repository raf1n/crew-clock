import type { Role } from '@crewclock/shared';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { WorkspaceEntity } from './workspace.entity';

@Entity({ name: 'members' })
export class MemberEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 16 })
  role!: Role;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  workspace!: WorkspaceEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: UserEntity;
}
