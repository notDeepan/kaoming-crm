import 'server-only';
import { getDb } from '@/db/client';
import { claims, progressReviews } from '@/db/schema';
import { loadReportRows } from './data';
import type { ReportFilters } from './filters';
import { within } from './filters';
import { cents, lowConfidence } from './money';

export async function queryG2(filters: ReportFilters) {
  const [all, allClaims, reviews] = await Promise.all([
    loadReportRows(), getDb().select().from(claims), getDb().select().from(progressReviews),
  ]);
  const byMachine = new Map(all.filter((row) => row.machine).map((row) => [row.machine!.id, row]));
  const selected = allClaims.filter((claim) => claim.claimedCurrency === filters.currency
    && within(claim.receivedAt, filters)
    && byMachine.has(claim.machineId)
    && (!filters.agent || byMachine.get(claim.machineId)!.partner.id === filters.agent)
    && (!filters.country || byMachine.get(claim.machineId)!.partner.countryCode === filters.country)
    && (!filters.region || byMachine.get(claim.machineId)!.partner.region === filters.region)
    && (!filters.model || byMachine.get(claim.machineId)!.model?.id === filters.model));
  const byCategory = new Map<string, { count: number; amount: bigint }>();
  const byResponsibility = new Map<string, { count: number; amount: bigint }>();
  const byAgent = new Map<string, { count: number; amount: bigint }>();
  const byModel = new Map<string, { count: number; amount: bigint }>();
  let claimed = 0n, offered = 0n, settled = 0n, openExposure = 0n, openCount = 0, pendingCredits = 0;
  let tracedDelay = 0n, settledDays = 0, settledCount = 0, unconvertedOffers = 0;
  const details = selected.map((claim) => {
    const row = byMachine.get(claim.machineId)!;
    const amount = cents(claim.claimedAmount);
    claimed += amount;
    if (claim.offeredAmount) {
      if (claim.offeredCurrency === filters.currency) offered += cents(claim.offeredAmount);
      else unconvertedOffers++;
    }
    if (claim.settledAmount && claim.settledCurrency === filters.currency) settled += cents(claim.settledAmount);
    const open = !claim.closedAt && !['closed', 'rejected', 'settled'].includes(claim.status);
    if (open) { openExposure += amount; openCount++; }
    if (claim.pendingCredit) pendingCredits++;
    if (claim.closedAt) {
      settledDays += Math.max(0, Math.round((claim.closedAt.getTime() - Date.parse(`${claim.receivedAt}T00:00:00Z`)) / 86_400_000));
      settledCount++;
    }
    const slip = reviews.filter((review) => review.workOrderId === row.work?.id && review.filledAt)
      .some((review) => (review.cumulativeSlipDays ?? 0) > 0);
    if (claim.category === 'late_delivery' && slip) tracedDelay += amount;
    for (const [map, key] of [[byCategory, claim.category], [byResponsibility, claim.responsibility],
      [byAgent, row.partner.name], [byModel, row.model?.code ?? 'Unassigned model']] as const) {
      const current = map.get(key) ?? { count: 0, amount: 0n };
      current.count++; current.amount += amount; map.set(key, current);
    }
    return { id: claim.id, number: claim.claimNumber, category: claim.category,
      status: claim.status, partner: row.partner.name, model: row.model?.code ?? '—',
      claimed: amount, offered: claim.offeredCurrency === filters.currency ? cents(claim.offeredAmount) : null,
      settled: claim.settledCurrency === filters.currency ? cents(claim.settledAmount) : null,
      responsibility: claim.responsibility, pendingCredit: claim.pendingCredit };
  });
  const groups = (map: Map<string, { count: number; amount: bigint }>) => [...map]
    .map(([label, values]) => ({ label, ...values, lowConfidence: lowConfidence(values.count) }))
    .sort((a, b) => a.amount === b.amount ? a.label.localeCompare(b.label) : a.amount > b.amount ? -1 : 1);
  return { details, claimed, offered, settled, openExposure, openCount, pendingCredits,
    tracedDelay, meanSettlementDays: settledCount ? Math.round(settledDays / settledCount) : null,
    unconvertedOffers, byCategory: groups(byCategory), byResponsibility: groups(byResponsibility),
    byAgent: groups(byAgent), byModel: groups(byModel) };
}
