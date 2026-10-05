import 'server-only';
import { getDb } from '@/db/client';
import { quotations } from '@/db/schema';
import { filteredRows, loadReportRows } from './data';
import type { ReportFilters } from './filters';
import { cents, lowConfidence } from './money';

export async function queryC1(filters: ReportFilters) {
  const [all, quoteRows] = await Promise.all([loadReportRows(), getDb().select().from(quotations)]);
  const latest = new Map<string, typeof quoteRows[number]>();
  for (const quote of quoteRows) {
    const current = latest.get(quote.dealId);
    if (!current || current.revision < quote.revision) latest.set(quote.dealId, quote);
  }
  const rows = filteredRows(all, filters, true);
  const stages = new Map<string, { count: number; quoted: bigint }>();
  let quoted = 0, revised = 0, won = 0, lost = 0;
  const details = rows.map((row) => {
    const quote = latest.get(row.deal.id);
    if (quote) { quoted++; if (quote.revision > 1) revised++; }
    if (row.deal.salesStage === 'won') won++;
    if (row.deal.salesStage === 'lost') lost++;
    const stage = stages.get(row.deal.salesStage) ?? { count: 0, quoted: 0n };
    stage.count++; stage.quoted += cents(quote?.netTotal);
    stages.set(row.deal.salesStage, stage);
    return { id: row.deal.id, number: row.deal.dealNumber, partner: row.partner.name,
      stage: row.deal.salesStage, quoteRevision: quote?.revision ?? null,
      quoteStatus: quote?.status ?? null, quotedValue: cents(quote?.netTotal) };
  });
  const decided = won + lost;
  return { details, stages: [...stages].map(([stage, values]) => ({ stage, ...values })),
    enquiryCount: rows.length, quoted, revised, won, lost,
    winRate: decided ? Math.round(100 * won / decided) : null,
    lowConfidence: lowConfidence(decided) };
}
