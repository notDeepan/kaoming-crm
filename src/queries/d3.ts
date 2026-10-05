import 'server-only';
import { getDb } from '@/db/client';
import { progressReviews } from '@/db/schema';
import { filteredRows, loadReportRows } from './data';
import type { ReportFilters } from './filters';

export async function queryD3(filters: ReportFilters, today = new Date().toISOString().slice(0, 10)) {
  const [all, reviews] = await Promise.all([loadReportRows(), getDb().select().from(progressReviews)]);
  const latest = new Map<string, typeof reviews[number]>();
  for (const review of reviews) {
    if (!review.filledAt) continue;
    const current = latest.get(review.workOrderId);
    if (!current || current.sequence < review.sequence) latest.set(review.workOrderId, review);
  }
  const rows = filteredRows(all, filters).filter((row) => row.order && row.work && !row.work.actualFinish);
  const months = new Map<string, { count: number; provisional: number }>();
  let overdue = 0, noForecast = 0;
  const details = rows.map((row) => {
    const review = latest.get(row.work!.id);
    const expected = review?.expectedCompletion ?? row.work!.plannedFinish;
    if (!expected) noForecast++;
    if (expected && expected < today) overdue++;
    if (expected) {
      const month = expected.slice(0, 7);
      const current = months.get(month) ?? { count: 0, provisional: 0 };
      current.count++; if (row.work!.isProvisional) current.provisional++;
      months.set(month, current);
    }
    return { dealId: row.deal.id, piNumber: row.order!.piNumber, partner: row.partner.name,
      model: row.model?.code ?? '—', expected, contractual: row.order!.contractualDeliveryDate,
      provisional: row.work!.isProvisional, overdue: Boolean(expected && expected < today) };
  });
  return { details: details.sort((a, b) => (a.expected ?? '9999').localeCompare(b.expected ?? '9999')),
    months: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, values]) => ({ month, ...values })),
    open: rows.length, overdue, noForecast, capacityBaselineAvailable: false };
}
