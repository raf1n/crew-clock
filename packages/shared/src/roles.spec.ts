import { canManageRole, isRole, roleAtLeast } from './roles';

describe('roles', () => {
  it('recognizes the three workspace roles', () => {
    expect(isRole('owner')).toBe(true);
    expect(isRole('manager')).toBe(true);
    expect(isRole('member')).toBe(true);
    expect(isRole('admin')).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it('orders roles from member up to owner', () => {
    expect(roleAtLeast('owner', 'manager')).toBe(true);
    expect(roleAtLeast('manager', 'manager')).toBe(true);
    expect(roleAtLeast('member', 'manager')).toBe(false);
  });

  it('only lets owners manage owners and managers', () => {
    expect(canManageRole('owner', 'owner')).toBe(true);
    expect(canManageRole('owner', 'manager')).toBe(true);
    expect(canManageRole('manager', 'manager')).toBe(false);
    expect(canManageRole('manager', 'member')).toBe(true);
    expect(canManageRole('member', 'member')).toBe(false);
  });
});
