import 'server-only';
import { inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { quotationLines } from '@/db/schema';
import { filteredRows, loadReportRows } from './data';
import type { ReportFilters } from './filters';
import { cents, lowConfidence } from './money';

export async function queryC2(filters: ReportFilters) {
  const rows = filteredRows(await loadReportRows(), filters).filter((row) => row.order && row.quote);
  const quoteIds = rows.map((row) => row.quote!.id);
  const lines = quoteIds.length ? await getDb().select().from(quotationLines)
    .where(inArray(quotationLines.quotationId, quoteIds)) : [];
  const byQuote = new Map<string, typeof lines>();
  for (const line of lines) {
    const current = byQuote.get(line.quotationId) ?? [];
    current.push(line);
    byQuote.set(line.quotationId, current);
  }
  const byModel = new Map<string, { orders: number; booked: bigint; list: bigint;
    discount: bigint; options: bigint; optionsCount: number }>();
  let totalDiscount = 0n, totalList = 0n, optionRevenue = 0n, optionLines = 0;
  for (const row of rows) {
    const quote = row.quote!;
    const model = row.model?.code ?? 'Unassigned model';
    const current = byModel.get(model) ?? { orders: 0, booked: 0n, list: 0n,
      discount: 0n, options: 0n, optionsCount: 0 };
    const discount = cents(quote.listTotal) - cents(quote.netTotal);
    const options = (byQuote.get(quote.id) ?? []).filter((line) => line.isIncludedInTotal
      && ['accessory', 'spec_change'].includes(line.itemType));
    const optionTotal = options.reduce((sum, line) => sum + cents(line.lineTotal), 0n);
    current.orders++; current.booked += cents(row.order!.orderValue);
    current.list += cents(quote.listTotal); current.discount += discount;
    current.options += optionTotal; current.optionsCount += options.length;
    totalList += cents(quote.listTotal); totalDiscount += discount;
    optionRevenue += optionTotal; optionLines += options.length;
    byModel.set(model, current);
  }
  return { models: [...byModel].map(([model, values]) => ({ model, ...values,
    lowConfidence: lowConfidence(values.orders) })).sort((a, b) => a.model.localeCompare(b.model)),
    orderCount: rows.length, totalList, totalDiscount, optionRevenue, optionLines };
}
