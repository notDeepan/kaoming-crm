import 'server-only';
import { redirect } from 'next/navigation';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { requireRoleForSession, type UserRole } from './role-policy';

export async function getActiveUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [current] = await getDb().select({ id: users.id, name: users.name, email: users.email, role: users.role, department: users.department })
    .from(users)
    .where(and(eq(users.id, session.user.id), eq(users.isActive, true), isNull(users.deletedAt)))
    .limit(1);
  return current ?? null;
}

export async function requireUser() {
  const current = await getActiveUser();
  if (!current) redirect('/login');
  return current;
}

export async function requireRole(...allowed: UserRole[]) {
  const user = await requireUser();
  return requireRoleForSession(user, allowed);
}
