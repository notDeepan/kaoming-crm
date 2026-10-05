import type { ReportFilters } from './filters';
import { filteredRows, loadDocumentRows, loadReportRows, matchingDimensions } from './data';
import { within } from './filters';
import { lowConfidence } from './money';

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export async function queryF1(filters: ReportFilters) {
  const [scope, docs] = await Promise.all([loadReportRows(), loadDocumentRows()]);
  const allowed = new Set(scope.filter((row) => matchingDimensions(row, filters)).map((row) => row.deal.id));
  const eligible = docs.rows.filter((row) => allowed.has(row.deal.id));
  const cohort = new Set(filteredRows(scope, filters, true).map((row) => row.deal.id));
  const rows = eligible.filter((row) => cohort.has(row.deal.id)
    && within(row.document.generatedAt ?? row.document.createdAt, filters));
  const awaitingApproval = eligible.filter((row) => docs.approvals.some((approval) =>
    approval.documentId === row.document.id && approval.required && !approval.completedAt));
  const printedNotReleased = eligible.filter((row) => row.document.printedAt && !row.document.releasedAt);
  const durations = rows.flatMap((row) => row.document.printedAt && row.document.releasedAt
    ? [{ type: row.document.docType, days: (row.document.releasedAt.getTime() -
      row.document.printedAt.getTime()) / 86_400_000 }] : []);
  const types = [...new Set(durations.map((item) => item.type))].map((type) => {
    const values = durations.filter((item) => item.type === type).map((item) => item.days);
    return { type, medianDays: median(values), count: values.length, lowConfidence: lowConfidence(values.length) };
  });
  const waiting = [...new Map([...awaitingApproval, ...printedNotReleased]
    .map((row) => [row.document.id, row])).values()]
    .sort((a, b) => a.document.createdAt.getTime() - b.document.createdAt.getTime());
  return { awaitingApproval: awaitingApproval.length, printedNotReleased: printedNotReleased.length,
    medianDays: median(durations.map((item) => item.days)), sampleSize: durations.length,
    lowConfidence: lowConfidence(durations.length), types, waiting };
}
