import { inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { commissions, quotationLines } from '@/db/schema';
import type { ReportFilters } from './filters';
import { filteredRows, loadContracts, loadReportRows } from './data';
import { iso, within } from './filters';
import { cents, lowConfidence } from './money';
import { commissionCents } from './commission';

export async function queryB1(filters: ReportFilters) {
  const rows = filteredRows(await loadReportRows(), filters);
  const shipped = rows.filter((row) => row.order && row.shipment?.shippedAt && within(row.shipment.shippedAt, filters));
  const contracts = await loadContracts();
  const accruals = await getDb().select().from(commissions);
  const accruedByOrder = new Map(accruals.map((entry) => [entry.orderId, entry]));
  let historicalFallbacks = 0;
  const quoteIds = shipped.flatMap((row) => row.quote ? [row.quote.id] : []);
  const lines = quoteIds.length ? await getDb().select({ quotationId: quotationLines.quotationId,
    itemType: quotationLines.itemType, lineTotal: quotationLines.lineTotal,
    included: quotationLines.isIncludedInTotal }).from(quotationLines)
    .where(inArray(quotationLines.quotationId, quoteIds)) : [];
  const machineTotals = new Map<string, bigint>();
  for (const line of lines) if (line.itemType === 'machine' && line.included) {
    machineTotals.set(line.quotationId, (machineTotals.get(line.quotationId) ?? 0n) + cents(line.lineTotal));
  }
  const agents = new Map<string, { id: string; name: string; region: string; country: string;
    gross: bigint; commission: bigint; net: bigint; orders: number; missing: number }>();
  for (const row of shipped) {
    const order = row.order!;
    const agent = agents.get(row.partner.id) ?? { id: row.partner.id, name: row.partner.name,
      region: row.partner.region, country: row.partner.countryCode,
      gross: 0n, commission: 0n, net: 0n, orders: 0, missing: 0 };
    const orderDate = iso(order.createdAt)!;
    const contract = contracts.find((candidate) => candidate.partnerId === row.partner.id
      && candidate.startDate <= orderDate && candidate.endDate >= orderDate) ?? null;
    const stored = accruedByOrder.get(order.id);
    const commission = stored ? cents(stored.accruedAmount) : commissionCents({ orderValue: order.orderValue,
      quoteListTotal: row.quote?.listTotal ?? null, quoteIncoterm: row.quote?.incoterm ?? null,
      machineLinesTotal: row.quote && machineTotals.has(row.quote.id) ? machineTotals.get(row.quote.id)! : null,
      partnerModel: row.partner.commissionModel, contract });
    if (!stored && commission !== null) historicalFallbacks++;
    agent.orders++;
    if (commission === null) agent.missing++;
    else {
      agent.gross += cents(order.orderValue);
      agent.commission += commission;
      agent.net += cents(order.orderValue) - commission;
    }
    agents.set(agent.id, agent);
  }
  const eligible = [...agents.values()].filter((agent) => !agent.missing)
    .sort((a, b) => a.net === b.net ? a.name.localeCompare(b.name) : a.net > b.net ? -1 : 1);
  const ranked = eligible.map((agent, index) => {
    const regionPeers = eligible.filter((peer) => peer.region === agent.region);
    const below = regionPeers.filter((peer) => peer.net < agent.net).length;
    return { ...agent, rank: index + 1,
      regionPercentile: regionPeers.length > 1 ? Math.round(100 * below / (regionPeers.length - 1)) : null,
      lowConfidence: lowConfidence(agent.orders) || lowConfidence(regionPeers.length) };
  });
  return { ranked, unranked: [...agents.values()].filter((agent) => agent.missing),
    currency: filters.currency, missingMarketSizeBand: true, historicalFallbacks };
}
