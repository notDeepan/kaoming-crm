import { describe, expect, it } from 'vitest';
import { requireRoleForSession } from './role-policy';

describe('role enforcement', () => {
  it('refuses unauthenticated and unauthorized calls', () => {
    expect(() => requireRoleForSession(null, ['admin'])).toThrow('UNAUTHENTICATED');
    expect(() => requireRoleForSession({ role: 'viewer' }, ['admin'])).toThrow('FORBIDDEN');
  });

  it('returns an allowed user for mutation audit fields', () => {
    const user = { id: 'user-1', role: 'manager' } as const;
    expect(requireRoleForSession(user, ['admin', 'manager'])).toBe(user);
  });
});
