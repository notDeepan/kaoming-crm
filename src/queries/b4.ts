import 'server-only';
import { getDb } from '@/db/client';
import { commissions } from '@/db/schema';
import { filteredRows, loadReportRows } from './data';
import type { ReportFilters } from './filters';
import { cents, lowConfidence } from './money';

export async function queryB4(filters: ReportFilters) {
  const [all, accruals] = await Promise.all([loadReportRows(), getDb().select().from(commissions)]);
  const byOrder = new Map(accruals.map((entry) => [entry.orderId, entry]));
  const rows = filteredRows(all, filters).filter((row) => row.order);
  const agents = new Map<string, { name: string; orders: number; gross: bigint;
    accrued: bigint; claimed: bigint; settled: bigint; missing: number }>();
  for (const row of rows) {
    const current = agents.get(row.partner.id) ?? { name: row.partner.name, orders: 0,
      gross: 0n, accrued: 0n, claimed: 0n, settled: 0n, missing: 0 };
    const accrual = byOrder.get(row.order!.id);
    current.orders++; current.gross += cents(row.order!.orderValue);
    if (accrual) {
      current.accrued += cents(accrual.accruedAmount);
      current.claimed += cents(accrual.claimedAmount);
      if (accrual.settledAt) current.settled += cents(accrual.claimedAmount ?? accrual.accruedAmount);
    } else current.missing++;
    agents.set(row.partner.id, current);
  }
  const details = [...agents].map(([id, values]) => ({ id, ...values,
    net: values.gross - values.accrued, lowConfidence: lowConfidence(values.orders) }));
  return { details, accrued: details.reduce((sum, row) => sum + row.accrued, 0n),
    claimed: details.reduce((sum, row) => sum + row.claimed, 0n),
    settled: details.reduce((sum, row) => sum + row.settled, 0n),
    missing: details.reduce((sum, row) => sum + row.missing, 0) };
}
