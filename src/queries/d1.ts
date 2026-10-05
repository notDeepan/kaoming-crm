import type { ReportFilters } from './filters';
import { filteredRows, loadReportRows, matchingDimensions } from './data';
import { cents } from './money';

export function currentStage(row: Awaited<ReturnType<typeof loadReportRows>>[number]) {
  if (row.machine?.acceptedAt) return 'accepted';
  if (row.shipment?.arrivedAt) return 'arrived';
  if (row.shipment?.shippedAt) return 'shipped';
  if (row.work?.issuedAt) return 'in_production';
  if (row.order) return row.deal.projectStage ?? 'order_confirmed';
  return row.deal.salesStage;
}

export async function queryD1(filters: ReportFilters) {
  const all = await loadReportRows();
  const rows = filteredRows(all, filters, true);
  const stages = new Map<string, { count: number; value: bigint }>();
  for (const row of rows) {
    const stage = currentStage(row);
    const current = stages.get(stage) ?? { count: 0, value: 0n };
    current.count++;
    current.value += cents(row.order?.orderValue);
    stages.set(stage, current);
  }
  const queue = all.filter((row) => matchingDimensions(row, filters) && row.order && !row.shipment?.shippedAt)
    .sort((a, b) => (a.order?.contractualDeliveryDate ?? '9999').localeCompare(b.order?.contractualDeliveryDate ?? '9999'));
  return { stages: [...stages].map(([stage, values]) => ({ stage, ...values })),
    queue, openCount: queue.length,
    openValue: queue.reduce((total, row) => total + cents(row.order?.orderValue), 0n) };
}
