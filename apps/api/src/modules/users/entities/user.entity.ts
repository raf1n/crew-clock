import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';

@Entity({ name: 'users' })
export class UserEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 64, default: 'UTC' })
  timezone!: string;
}
