import 'server-only';
import { getDb } from '@/db/client';
import { progressReviews } from '@/db/schema';
import { filteredRows, loadReportRows } from './data';
import type { ReportFilters } from './filters';
import { iso } from './filters';

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export async function queryD2(filters: ReportFilters, today = new Date().toISOString().slice(0, 10)) {
  const [all, reviews] = await Promise.all([loadReportRows(), getDb().select().from(progressReviews)]);
  const byWork = new Map<string, typeof reviews>();
  for (const review of reviews) {
    const entries = byWork.get(review.workOrderId) ?? [];
    entries.push(review);
    byWork.set(review.workOrderId, entries);
  }
  const orders = filteredRows(all, filters).filter((row) => row.order);
  const rows = orders.map((row) => {
    const curve = (byWork.get(row.work?.id ?? '') ?? []).filter((review) => review.filledAt)
      .sort((a, b) => a.sequence - b.sequence).map((review) => ({
        dueDate: review.dueDate, expected: review.expectedCompletion,
        slipDays: review.cumulativeSlipDays ?? 0, stage: review.reportedStage,
        reason: review.delayReason, escalation: review.escalationLevel,
      }));
    const latest = curve.at(-1);
    const completion = row.work?.actualFinish ?? latest?.expected ?? row.work?.plannedFinish ?? null;
    const bookingDue = row.shipment?.bookingDueBy ?? null;
    const confirmed = iso(row.shipment?.bookingConfirmedAt);
    const bookingDaysLate = bookingDue && confirmed && confirmed > bookingDue
      ? daysBetween(bookingDue, confirmed) : 0;
    const bookingOverdue = Boolean(bookingDue && !confirmed && bookingDue < today);
    const paymentRisk = Boolean(completion && !row.shipment?.shippedAt && !row.shipment?.finalPaymentReceivedAt
      && daysBetween(today, completion) <= 21);
    return { dealId: row.deal.id, piNumber: row.order!.piNumber,
      partner: row.partner.name, model: row.model?.code ?? '—', contractDate: row.order!.contractualDeliveryDate,
      curve, latestSlipDays: latest?.slipDays ?? 0, latestStage: latest?.stage ?? null,
      escalation: latest?.escalation ?? 'none', completion, bookingDue, confirmed,
      bookingDaysLate, bookingOverdue, bookingCause: row.shipment?.bookingDelayCause ?? null,
      paymentRisk, finalPaymentReceived: Boolean(row.shipment?.finalPaymentReceivedAt) };
  });
  return { rows: rows.sort((a, b) => b.latestSlipDays - a.latestSlipDays),
    over30: rows.filter((row) => row.latestSlipDays >= 30).length,
    over60: rows.filter((row) => row.latestSlipDays >= 60).length,
    bookingDelayed: rows.filter((row) => row.bookingDaysLate > 0 || row.bookingOverdue).length,
    bookingCauseMissing: rows.filter((row) => (row.bookingDaysLate > 0 || row.bookingOverdue) && !row.bookingCause).length,
    paymentRisk: rows.filter((row) => row.paymentRisk).length };
}
