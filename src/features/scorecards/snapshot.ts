import { eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { commissions, deals, leakageEntries, orders, partners, quotations,
  scorecardSnapshots, shipments } from '@/db/schema';
import { taipeiDate } from '@/lib/business-date';
import { minorUnitsToDecimal, parseDecimalToMinorUnits } from '@/lib/money';
import { consecutiveQuarterCount, previousClosedQuarter } from './quarter';

const cents = (value: string | null | undefined) => value ? parseDecimalToMinorUnits(value) : 0n;

export async function snapshotClosedQuarter(today = taipeiDate(new Date())) {
  const db = getDb();
  const { period, start, end } = previousClosedQuarter(today);
  const [agents, shipped, accruals, leakage, older] = await Promise.all([
    db.select().from(partners).where(isNull(partners.deletedAt)),
    db.select({ order: orders, deal: deals, shipment: shipments, quote: quotations })
      .from(orders).innerJoin(deals, eq(deals.id, orders.dealId))
      .innerJoin(shipments, eq(shipments.orderId, orders.id))
      .leftJoin(quotations, eq(quotations.id, orders.sourceQuotationId))
      .where(isNull(orders.deletedAt)),
    db.select().from(commissions).where(isNull(commissions.deletedAt)),
    db.select().from(leakageEntries).where(isNull(leakageEntries.deletedAt)),
    db.select().from(scorecardSnapshots),
  ]);
  const commissionByOrder = new Map(accruals.map((row) => [row.orderId, row]));
  let created = 0;
  for (const partner of agents) {
    const partnerOrders = shipped.filter((row) => row.deal.partnerId === partner.id
      && row.shipment.shippedAt && taipeiDate(row.shipment.shippedAt) >= start
      && taipeiDate(row.shipment.shippedAt) <= end);
    const usdOrders = partnerOrders.filter((row) => row.order.currency === 'USD');
    const currencyMissing = usdOrders.length !== partnerOrders.length;
    const noAccrual = usdOrders.some((row) => !commissionByOrder.has(row.order.id));
    const quoteMissing = usdOrders.some((row) => !row.quote);
    const dealIds = new Set(usdOrders.map((row) => row.deal.id));
    const partnerLeakage = leakage.filter((entry) => dealIds.has(entry.dealId)
      && entry.incurredOn >= start && entry.incurredOn <= end && entry.attribution === 'kao_ming'
      && entry.category !== 'discount');
    const leakageCurrencyMissing = partnerLeakage.some((entry) => entry.currency !== 'USD');
    const gross = usdOrders.reduce((sum, row) => sum + cents(row.order.orderValue), 0n);
    const commission = usdOrders.reduce((sum, row) => sum + cents(commissionByOrder.get(row.order.id)?.accruedAmount), 0n);
    const discount = usdOrders.reduce((sum, row) => {
      const difference = cents(row.quote?.listTotal) - cents(row.order.orderValue);
      return sum + (difference > 0n ? difference : 0n);
    }, 0n);
    const leakageCost = partnerLeakage.filter((entry) => entry.currency === 'USD'
      && entry.recoveryStatus !== 'recovered').reduce((sum, entry) => sum + cents(entry.amount), 0n);
    const net = gross - commission;
    const costPct = gross > 0n ? Number((discount + commission + leakageCost) * 10_000n / gross) / 100 : null;
    const prior = older.filter((row) => row.partnerId === partner.id && row.period < period)
      .sort((a, b) => b.period.localeCompare(a.period));
    const quarterCount = consecutiveQuarterCount([...prior.map((row) => row.period), period], period);
    const reasons = [quarterCount < 4 ? 'Fewer than four completed quarterly snapshots' : null,
      partnerOrders.length < 5 ? 'Fewer than five shipped orders in trailing 12 months' : null,
      currencyMissing || leakageCurrencyMissing ? 'Non-USD amounts need dated FX conversion' : null,
      noAccrual ? 'Commission accrual missing' : null,
      quoteMissing ? 'Quotation list value missing' : null,
      'Market-size bands and agreed scoring thresholds are not configured'].filter(Boolean).join('; ');
    const result = await db.insert(scorecardSnapshots).values({ partnerId: partner.id, period,
      tier: 'unrated', previousTier: prior[0]?.tier ?? null,
      netRevenue12m: currencyMissing || noAccrual ? null : minorUnitsToDecimal(net),
      costToServePct: currencyMissing || leakageCurrencyMissing || noAccrual || quoteMissing || costPct === null
        ? null : costPct.toFixed(2),
      dataPoints: partnerOrders.length, publicationBlockedReason: reasons,
    }).onConflictDoNothing({ target: [scorecardSnapshots.partnerId, scorecardSnapshots.period] })
      .returning({ id: scorecardSnapshots.id });
    if (result.length) created++;
  }
  return { period, created };
}
