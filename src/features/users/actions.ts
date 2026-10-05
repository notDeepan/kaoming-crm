'use server';

import { and, eq, isNull, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { userRoles } from '@/db/enums';
import { users } from '@/db/schema';
import { requireRole } from '@/lib/authorization';
import { hashPassword } from '@/lib/password';
import type { UserActionState } from './validation';

const createUserInput = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(1024),
  role: z.enum(userRoles),
  department: z.string().trim().transform((value) => value || null),
  locale: z.enum(['en', 'zh-Hant']),
});

export async function createUser(_previous: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await requireRole('admin');
  const parsed = createUserInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: 'Check the account fields' };
  const { password, ...values } = parsed.data;
  try {
    await getDb().insert(users).values({
      ...values,
      passwordHash: await hashPassword(password),
      isActive: true,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    revalidatePath('/settings');
    return { ok: true, message: 'User account created' };
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    return { ok: false, message: code === '23505' ? 'Email already exists' : 'User account could not be created' };
  }
}

export async function deactivateUser(formData: FormData): Promise<void> {
  const actor = await requireRole('admin');
  const id = z.string().uuid().parse(formData.get('id'));
  if (id === actor.id) throw new Error('You cannot deactivate your own account');
  const [target] = await getDb().select({ role: users.role }).from(users)
    .where(and(eq(users.id, id), eq(users.isActive, true), isNull(users.deletedAt))).limit(1);
  if (!target) throw new Error('User account was not found');
  if (target.role === 'admin') throw new Error('Administrator accounts cannot be deactivated here');
  const deactivated = await getDb().update(users)
    .set({ isActive: false, updatedAt: new Date(), updatedBy: actor.id })
    .where(and(eq(users.id, id), ne(users.role, 'admin'), eq(users.isActive, true), isNull(users.deletedAt)))
    .returning({ id: users.id });
  if (!deactivated.length) throw new Error('User account could not be deactivated');
  revalidatePath('/settings');
}
