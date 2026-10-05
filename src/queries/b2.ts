import 'server-only';
import { getDb } from '@/db/client';
import { partners, scorecardSnapshots } from '@/db/schema';
import { consecutiveQuarterCount } from '@/features/scorecards/quarter';
import type { ReportFilters } from './filters';

export async function queryB2(filters: ReportFilters) {
  const [agents, snapshots] = await Promise.all([
    getDb().select().from(partners), getDb().select().from(scorecardSnapshots),
  ]);
  const selected = agents.filter((agent) => !agent.deletedAt && (!filters.agent || agent.id === filters.agent)
    && (!filters.country || agent.countryCode === filters.country)
    && (!filters.region || agent.region === filters.region));
  const details = selected.map((agent) => {
    const history = snapshots.filter((row) => row.partnerId === agent.id).sort((a, b) => b.period.localeCompare(a.period));
    const latest = history[0] ?? null;
    const observed = latest ? consecutiveQuarterCount(history.map((row) => row.period), latest.period) : 0;
    return { id: agent.id, name: agent.name, country: agent.countryCode,
      region: agent.region, period: latest?.period ?? null,
      tier: latest?.tier ?? 'unrated', netRevenue12m: latest?.netRevenue12m ?? null,
      costToServePct: latest?.costToServePct ?? null, dataPoints: latest?.dataPoints ?? 0,
      observedQuarters: observed, published: Boolean(latest?.publishedAt && observed >= 4),
      blockedReason: latest?.publicationBlockedReason ?? 'No closed-quarter snapshot yet' };
  });
  return { details, published: details.filter((row) => row.published).length,
    awaitingFourQuarters: details.filter((row) => row.observedQuarters < 4).length,
    unrated: details.filter((row) => row.tier === 'unrated').length };
}
