import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { deals, orders, partnerContracts, penaltyExposures, progressReviews,
  shipments, workOrders } from '@/db/schema';
import { taipeiDate } from '@/lib/business-date';
import { calculatePenaltyExposure } from './math';

export async function recalculatePenaltyExposures() {
  const db = getDb();
  const candidates = await db.select({ order: orders, deal: deals,
    shippedAt: shipments.shippedAt, workId: workOrders.id })
    .from(orders).innerJoin(deals, eq(deals.id, orders.dealId))
    .leftJoin(shipments, eq(shipments.orderId, orders.id))
    .leftJoin(workOrders, eq(workOrders.orderId, orders.id))
    .where(isNull(orders.deletedAt));
  const contracts = await db.select().from(partnerContracts).where(isNull(partnerContracts.deletedAt));
  let calculated = 0;
  for (const candidate of candidates) {
    if (candidate.shippedAt || !candidate.workId) continue;
    const [latest] = await db.select({ slip: progressReviews.cumulativeSlipDays })
      .from(progressReviews).where(and(eq(progressReviews.workOrderId, candidate.workId),
        isNull(progressReviews.deletedAt), isNotNull(progressReviews.filledAt)))
      .orderBy(desc(progressReviews.sequence)).limit(1);
    const day = taipeiDate(candidate.order.createdAt);
    const contract = contracts.find((entry) => entry.partnerId === candidate.deal.partnerId
      && entry.startDate <= day && entry.endDate >= day);
    // DECISION-PENDING: D1 — provisional default: 0.5% weekly, capped at 5%.
    const rate = contract?.ldRatePerWeek ?? '0.0050';
    const cap = contract?.ldCap ?? '0.0500';
    const result = calculatePenaltyExposure({ orderValue: candidate.order.orderValue,
      cumulativeSlipDays: latest?.slip ?? 0, ratePerWeek: rate, capRate: cap });
    await db.insert(penaltyExposures).values({ orderId: candidate.order.id,
      weeksLate: result.weeksLate, ratePerWeek: rate, accruedExposure: result.accruedExposure,
      capAmount: result.capAmount, calculatedAt: new Date() })
      .onConflictDoUpdate({ target: penaltyExposures.orderId,
        set: { weeksLate: result.weeksLate, ratePerWeek: rate,
          accruedExposure: result.accruedExposure, capAmount: result.capAmount,
          calculatedAt: new Date(), updatedAt: new Date() } });
    calculated++;
  }
  return calculated;
}
