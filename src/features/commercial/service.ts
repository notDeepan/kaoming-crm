import 'server-only';
import { desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { commissions, deals, machines, orders, partners, penaltyExposures } from '@/db/schema';
import { requireRole } from '@/lib/authorization';
import { minorUnitsToDecimal, parseDecimalToMinorUnits } from '@/lib/money';

export async function listCommissions() {
  await requireRole('admin', 'manager', 'finance');
  return getDb().select({ commission: commissions, piNumber: orders.piNumber,
    currency: orders.currency, dealId: deals.id, partnerName: partners.name,
    acceptedAt: machines.acceptedAt }).from(commissions)
    .innerJoin(orders, eq(orders.id, commissions.orderId))
    .innerJoin(deals, eq(deals.id, orders.dealId))
    .innerJoin(partners, eq(partners.id, commissions.partnerId))
    .leftJoin(machines, eq(machines.orderId, orders.id))
    .where(isNull(commissions.deletedAt)).orderBy(desc(commissions.accruedAt));
}

export async function recordCommissionClaim(commissionId: string, amount: string) {
  const actor = await requireRole('admin', 'manager', 'finance');
  const minor = parseDecimalToMinorUnits(amount);
  if (minor < 0n) throw new Error('Claimed commission must be nonnegative');
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(commissions).where(eq(commissions.id, commissionId)).for('update').limit(1);
    if (!row || row.settledAt) throw new Error('Open commission accrual required');
    const variance = minor - parseDecimalToMinorUnits(row.accruedAmount);
    await tx.update(commissions).set({ claimedAmount: minorUnitsToDecimal(minor),
      claimedAt: new Date(), variance: minorUnitsToDecimal(variance),
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(commissions.id, commissionId));
  });
}

export async function settleCommission(commissionId: string) {
  const actor = await requireRole('admin', 'manager', 'finance');
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(commissions).where(eq(commissions.id, commissionId)).for('update').limit(1);
    if (!row || row.settledAt || row.claimedAmount === null) throw new Error('Claimed, unsettled commission required');
    const [partner] = await tx.select().from(partners).where(eq(partners.id, row.partnerId)).limit(1);
    const [machine] = await tx.select().from(machines).where(eq(machines.orderId, row.orderId)).limit(1);
    if (!partner || !['agent', 'distributor'].includes(partner.relationshipType)
      || partner.commissionModel !== row.model || !machine?.acceptedAt || !row.becomesDueAt) {
      throw new Error('G7: Confirm relationship/model and machine acceptance before commission settlement');
    }
    if (row.model === 'markup' && parseDecimalToMinorUnits(row.claimedAmount) !== 0n) {
      throw new Error('Markup partners have no commission payable');
    }
    await tx.update(commissions).set({ settledAt: new Date(), approvedBy: actor.id,
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(commissions.id, commissionId));
  });
}

export async function listPenaltyExposures() {
  await requireRole('admin', 'manager', 'sales', 'finance', 'viewer');
  return getDb().select({ exposure: penaltyExposures, piNumber: orders.piNumber,
    currency: orders.currency, dealId: deals.id }).from(penaltyExposures)
    .innerJoin(orders, eq(orders.id, penaltyExposures.orderId))
    .innerJoin(deals, eq(deals.id, orders.dealId));
}
