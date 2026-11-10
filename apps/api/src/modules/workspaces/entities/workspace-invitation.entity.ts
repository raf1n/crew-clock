import type { Role } from '@crewclock/shared';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';
import { WorkspaceEntity } from './workspace.entity';

@Entity({ name: 'workspace_invitations' })
export class WorkspaceInvitationEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 16 })
  role!: Role;

  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ type: 'uuid', nullable: true })
  invitedBy!: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  workspace!: WorkspaceEntity;
}
