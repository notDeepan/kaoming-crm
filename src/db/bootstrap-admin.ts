import { and, eq, isNull } from 'drizzle-orm';
import { closeDb, getDb } from './client';
import { users } from './schema';
import { hashPassword } from '@/lib/password';
import { ensureReferenceData } from './reference-data';

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
  const db = getDb();
  await ensureReferenceData();
  const [existing] = await db.select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users).where(and(eq(users.email, email), isNull(users.deletedAt))).limit(1);
  if (existing) {
    if (existing.role !== 'admin' || !existing.isActive) {
      throw new Error('The configured administrator email belongs to an inactive or non-admin account');
    }
    process.stdout.write(`Administrator ${email} already exists; reference categories checked\n`);
    return;
  }
  const [created] = await db.insert(users).values({ name: 'Administrator', email,
    role: 'admin', passwordHash: await hashPassword(password) }).returning({ id: users.id });
  if (!created) throw new Error('Administrator could not be created');
  process.stdout.write(`Created administrator ${email}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}).finally(async () => { await closeDb(); });
