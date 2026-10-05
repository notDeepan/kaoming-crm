import 'server-only';
import { desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { deals, leakageEntries } from '@/db/schema';
import type { attributions, leakageCategories, recoveryStatuses } from '@/db/enums';
import { requireRole } from '@/lib/authorization';
import { dateUtc } from '@/features/production/dates';
import { minorUnitsToDecimal, parseDecimalToMinorUnits } from '@/lib/money';

type LeakageCategory = typeof leakageCategories[number];
type Attribution = typeof attributions[number];
type Recovery = typeof recoveryStatuses[number];

export async function listLeakage() {
  await requireRole('admin', 'manager', 'finance', 'sales');
  return getDb().select({ entry: leakageEntries, dealNumber: deals.dealNumber })
    .from(leakageEntries).innerJoin(deals, eq(deals.id, leakageEntries.dealId))
    .where(isNull(leakageEntries.deletedAt)).orderBy(desc(leakageEntries.incurredOn));
}
export async function leakageDealOptions() {
  await requireRole('admin', 'manager', 'finance', 'sales');
  return getDb().select({ id: deals.id, number: deals.dealNumber, currency: deals.currency })
    .from(deals).where(isNull(deals.deletedAt)).orderBy(desc(deals.createdAt));
}
export async function recordLeakage(input: {
  dealId: string; category: LeakageCategory; amount: string; currency: string;
  incurredOn: string; attribution: Attribution; recoveryStatus: Recovery; notes: string;
}) {
  const actor = await requireRole('admin', 'manager', 'finance', 'sales');
  dateUtc(input.incurredOn);
  const minor = parseDecimalToMinorUnits(input.amount);
  if (minor <= 0n || !/^[A-Z]{3}$/.test(input.currency)) throw new Error('Enter a positive amount and three-letter currency');
  const [deal] = await getDb().select({ id: deals.id }).from(deals)
    .where(eq(deals.id, input.dealId)).limit(1);
  if (!deal) throw new Error('Select a deal');
  const [entry] = await getDb().insert(leakageEntries).values({ dealId: input.dealId,
    category: input.category, amount: minorUnitsToDecimal(minor), currency: input.currency,
    incurredOn: input.incurredOn, attribution: input.attribution,
    recoveryStatus: input.recoveryStatus, notes: input.notes.trim() || null,
    createdBy: actor.id, updatedBy: actor.id }).returning();
  return entry!;
}
