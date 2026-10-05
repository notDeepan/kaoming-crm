import type { userRoles } from '@/db/enums';

export type UserRole = (typeof userRoles)[number];

export function requireRoleForSession<T extends { role: UserRole }>(
  user: T | null | undefined,
  allowed: readonly UserRole[],
): T {
  if (!user) throw new Error('UNAUTHENTICATED');
  if (!allowed.includes(user.role)) throw new Error('FORBIDDEN');
  return user;
}
