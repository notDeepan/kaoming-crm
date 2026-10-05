import type { ReportFilters } from './filters';
import { filteredRows, loadReportRows, matchingDimensions, monthKey } from './data';
import { within } from './filters';
import { cents, lowConfidence } from './money';

export async function queryA2(filters: ReportFilters) {
  const all = await loadReportRows();
  const rows = filteredRows(all, filters);
  let bookings = 0n, revenue = 0n, cash = 0n, orderBook = 0n;
  let bookingsN = 0, revenueN = 0, cashN = 0, unvaluedPayments = 0;
  const months = new Map<string, { bookings: bigint; revenue: bigint; cash: bigint }>();
  const byRegion = new Map<string, { bookings: bigint; revenue: bigint; orders: number }>();
  for (const row of rows) {
    const order = row.order;
    if (!order) continue;
    const region = byRegion.get(row.partner.region) ?? { bookings: 0n, revenue: 0n, orders: 0 };
    const addMonth = (date: Date | null, field: 'bookings' | 'revenue' | 'cash', amount: bigint) => {
      const key = monthKey(date);
      const current = months.get(key) ?? { bookings: 0n, revenue: 0n, cash: 0n };
      current[field] += amount;
      months.set(key, current);
    };
    if (within(order.createdAt, filters)) {
      const amount = cents(order.orderValue);
      bookings += amount; bookingsN++; region.bookings += amount; region.orders++;
      addMonth(order.createdAt, 'bookings', amount);
    }
    if (row.shipment?.shippedAt && within(row.shipment.shippedAt, filters)) {
      const amount = cents(order.orderValue);
      revenue += amount; revenueN++; region.revenue += amount;
      addMonth(row.shipment.shippedAt, 'revenue', amount);
    }
    for (const [date, amount] of [
      [order.depositReceivedAt, order.depositReceivedAmount],
      [row.shipment?.finalPaymentReceivedAt, row.shipment?.finalPaymentReceivedAmount],
    ] as const) {
      if (within(date, filters)) {
        cashN++;
        if (amount) { const value = cents(amount); cash += value; addMonth(date!, 'cash', value); }
        else unvaluedPayments++;
      }
    }
    byRegion.set(row.partner.region, region);
  }
  orderBook = all.filter((row) => matchingDimensions(row, filters) && row.order && !row.shipment?.shippedAt)
    .reduce((total, row) => total + cents(row.order?.orderValue), 0n);
  return { bookings, revenue, cash, orderBook, bookingsN, revenueN, cashN, unvaluedPayments,
    lowConfidence: { bookings: lowConfidence(bookingsN), revenue: lowConfidence(revenueN), cash: lowConfidence(cashN) },
    months: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, ...value })),
    regions: [...byRegion].map(([region, value]) => ({ region, ...value })).sort((a, b) => a.region.localeCompare(b.region)) };
}
