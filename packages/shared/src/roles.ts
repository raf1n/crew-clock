export const ROLES = ['owner', 'manager', 'member'] as const;

export type Role = (typeof ROLES)[number];

const ROLE_RANK: Record<Role, number> = {
  owner: 3,
  manager: 2,
  member: 1,
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLES.some((role) => role === value);
}

export function roleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canManageRole(actor: Role, target: Role): boolean {
  if (actor === 'owner') {
    return true;
  }
  if (actor === 'manager') {
    return target === 'member';
  }
  return false;
}
