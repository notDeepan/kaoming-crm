import 'server-only';
import { createHmac } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { loginAttempts } from '@/db/schema';

const windowMs = 15 * 60 * 1000;
const accountLimit = 5;
const sourceLimit = 100;

function keyHash(kind: 'account' | 'source', value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is required');
  return createHmac('sha256', secret).update(`${kind}:${value}`).digest('hex');
}

function sourceAddress(request: Request): string | null {
  const source = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip');
  return source?.split(',')[0]?.trim() || null;
}

async function consume(key: string, now: Date): Promise<number> {
  const resetBefore = new Date(now.getTime() - windowMs).toISOString();
  const nowIso = now.toISOString();
  const [row] = await getDb().insert(loginAttempts)
    .values({ keyHash: key, attemptCount: 1, windowStartedAt: now, lastAttemptAt: now })
    .onConflictDoUpdate({
      target: loginAttempts.keyHash,
      set: {
        attemptCount: sql`CASE WHEN ${loginAttempts.windowStartedAt} <= ${resetBefore}::timestamptz THEN 1 ELSE ${loginAttempts.attemptCount} + 1 END`,
        windowStartedAt: sql`CASE WHEN ${loginAttempts.windowStartedAt} <= ${resetBefore}::timestamptz THEN ${nowIso}::timestamptz ELSE ${loginAttempts.windowStartedAt} END`,
        lastAttemptAt: now,
        updatedAt: now,
      },
    }).returning({ count: loginAttempts.attemptCount });
  if (!row) throw new Error('Login attempt could not be recorded');
  return row.count;
}

export async function allowCredentialAttempt(email: string, request: Request): Promise<boolean> {
  const now = new Date();
  const accountCount = await consume(keyHash('account', email), now);
  const source = sourceAddress(request);
  const sourceCount = source ? await consume(keyHash('source', source), now) : 0;
  return accountCount <= accountLimit && sourceCount <= sourceLimit;
}

export async function resetAccountAttempts(email: string): Promise<void> {
  await getDb().update(loginAttempts)
    .set({ attemptCount: 0, windowStartedAt: new Date(), updatedAt: new Date() })
    .where(eq(loginAttempts.keyHash, keyHash('account', email)));
}
