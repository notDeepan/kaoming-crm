import type { ReportFilters } from './filters';
import { filteredRows, loadReportRows, matchingDimensions } from './data';
import { within } from './filters';
import { cents } from './money';

export async function queryA3(filters: ReportFilters) {
  const all = await loadReportRows();
  const rows = filteredRows(all, filters);
  let recordedCash = 0n, unvaluedEvents = 0, paymentEvents = 0, estimatedBalanceDue = 0n;
  const depositsOutstanding = [];
  const bookingAtRisk = [];
  for (const row of rows) {
    const order = row.order;
    if (!order) continue;
    for (const [date, amount] of [
      [order.depositReceivedAt, order.depositReceivedAmount],
      [row.shipment?.finalPaymentReceivedAt, row.shipment?.finalPaymentReceivedAmount],
    ] as const) {
      if (within(date, filters)) {
        paymentEvents++;
        if (amount) recordedCash += cents(amount); else unvaluedEvents++;
      }
    }
  }
  for (const row of all) {
    const order = row.order;
    if (!order || !matchingDimensions(row, filters)) continue;
    if (!order.depositReceivedAt && Number(order.depositPercent ?? 0) > 0) depositsOutstanding.push(row);
    if (!row.shipment?.finalPaymentReceivedAt) {
      estimatedBalanceDue += cents(order.orderValue) - cents(order.depositReceivedAmount);
      if (row.shipment?.completionNotifiedAt && row.shipment.bookingDueBy) bookingAtRisk.push(row);
    }
  }
  return { recordedCash, unvaluedEvents, paymentEvents, estimatedBalanceDue,
    depositsOutstanding, bookingAtRisk };
}
