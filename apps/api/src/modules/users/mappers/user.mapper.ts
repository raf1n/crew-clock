import type { PublicUser } from '@crewclock/shared';

import type { UserEntity } from '../entities/user.entity';

export function toPublicUser(user: UserEntity): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}
