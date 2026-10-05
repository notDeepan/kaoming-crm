import 'server-only';
import { getDb } from '@/db/client';
import { commissions, leakageEntries } from '@/db/schema';
import { filteredRows, loadReportRows } from './data';
import type { ReportFilters } from './filters';
import { within } from './filters';
import { cents } from './money';

export async function queryG1(filters: ReportFilters) {
  const [all, entries, accruals] = await Promise.all([
    loadReportRows(), getDb().select().from(leakageEntries), getDb().select().from(commissions),
  ]);
  const cohort = filteredRows(all, filters).filter((row) => row.order);
  const rows = cohort.filter((row) => row.shipment?.shippedAt);
  const openRows = cohort.filter((row) => !row.shipment?.shippedAt);
  const byDeal = new Map<string, typeof entries>();
  for (const entry of entries) {
    if (entry.currency !== filters.currency || !within(entry.incurredOn, filters)) continue;
    const current = byDeal.get(entry.dealId) ?? [];
    current.push(entry);
    byDeal.set(entry.dealId, current);
  }
  const byOrder = new Map(accruals.map((entry) => [entry.orderId, entry]));
  let list = 0n, quoteDiscount = 0n, orderAdjustment = 0n, commission = 0n;
  let leakage = 0n, recovered = 0n, discountRegister = 0n, unpricedCommission = 0;
  const details = rows.map((row) => {
    const quoteList = cents(row.quote?.listTotal ?? row.order!.orderValue);
    const quoteNet = cents(row.quote?.netTotal ?? row.order!.orderValue);
    const booked = cents(row.order!.orderValue);
    const accrued = byOrder.get(row.order!.id);
    const commissionAmount = cents(accrued?.accruedAmount);
    if (!accrued) unpricedCommission++;
    const recorded = byDeal.get(row.deal.id) ?? [];
    const discountMemo = recorded.filter((item) => item.category === 'discount')
      .reduce((sum, item) => sum + cents(item.amount), 0n);
    const costEntries = recorded.filter((item) => item.category !== 'discount');
    const leakageAmount = costEntries.reduce((sum, item) => sum + cents(item.amount), 0n);
    const recoveredAmount = costEntries.filter((item) => item.recoveryStatus === 'recovered')
      .reduce((sum, item) => sum + cents(item.amount), 0n);
    list += quoteList; quoteDiscount += quoteList - quoteNet;
    orderAdjustment += quoteNet - booked; commission += commissionAmount;
    leakage += leakageAmount; recovered += recoveredAmount; discountRegister += discountMemo;
    return { dealId: row.deal.id, piNumber: row.order!.piNumber, partner: row.partner.name,
      list: quoteList, quoteDiscount: quoteList - quoteNet, orderAdjustment: quoteNet - booked,
      booked, commission: commissionAmount, leakage: leakageAmount, recovered: recoveredAmount,
      realized: booked - commissionAmount - leakageAmount + recoveredAmount,
      entries: recorded.map((entry) => ({ id: entry.id, category: entry.category,
        amount: cents(entry.amount), recoveryStatus: entry.recoveryStatus })) };
  });
  return { details, list, quoteDiscount, orderAdjustment, booked: list - quoteDiscount - orderAdjustment,
    commission, leakage, recovered, discountRegister,
    realized: list - quoteDiscount - orderAdjustment - commission - leakage + recovered,
    entryCount: details.reduce((sum, row) => sum + row.entries.length, 0), unpricedCommission,
    openOrderCount: openRows.length,
    openOrderValue: openRows.reduce((sum, row) => sum + cents(row.order?.orderValue), 0n) };
}
