import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DEFAULT_TIMEZONE } from '@crewclock/shared';
import { Repository } from 'typeorm';

import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  findById(id: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  async getTimezone(userId: string): Promise<string> {
    const user = await this.users.findOne({
      where: { id: userId },
      select: { timezone: true },
    });
    return user?.timezone ?? DEFAULT_TIMEZONE;
  }

  async setTimezone(userId: string, timezone: string): Promise<void> {
    await this.users.update({ id: userId }, { timezone });
  }
}
