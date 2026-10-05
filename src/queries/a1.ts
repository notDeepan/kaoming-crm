import 'server-only';
import { queryA2 } from './a2';
import { queryD2 } from './d2';
import { queryE3 } from './e3';
import type { ReportFilters } from './filters';

export async function queryA1(filters: ReportFilters) {
  const [commercial, delays, cases] = await Promise.all([
    queryA2(filters), queryD2(filters), queryE3(filters),
  ]);
  return { bookings: commercial.bookings, revenue: commercial.revenue,
    cash: commercial.cash, orderBook: commercial.orderBook,
    delayedOrders: delays.over30, openCases: cases.open,
    unvaluedPayments: commercial.unvaluedPayments };
}
