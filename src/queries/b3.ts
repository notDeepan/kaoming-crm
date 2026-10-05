import 'server-only';
import { getDb } from '@/db/client';
import { partners } from '@/db/schema';
import { loadReportRows } from './data';
import type { ReportFilters } from './filters';
import { within } from './filters';

export async function queryB3(filters: ReportFilters, today = new Date().toISOString().slice(0, 10)) {
  const [agents, rows] = await Promise.all([getDb().select().from(partners), loadReportRows()]);
  const selected = agents.filter((agent) => !agent.deletedAt && (!filters.agent || agent.id === filters.agent)
    && (!filters.country || agent.countryCode === filters.country)
    && (!filters.region || agent.region === filters.region));
  const current = new Date(`${today}T00:00:00Z`);
  current.setUTCMonth(current.getUTCMonth() - 24);
  const dormancyCutoff = current.toISOString().slice(0, 10);
  const details = selected.map((agent) => {
    const allOrders = rows.filter((row) => row.partner.id === agent.id && row.order);
    const lastOrder = allOrders.map((row) => row.order!.createdAt.toISOString().slice(0, 10)).sort().at(-1) ?? null;
    const recent = allOrders.filter((row) => row.order!.currency === filters.currency
      && (!filters.model || row.model?.id === filters.model)
      && within(row.order!.createdAt, filters)).length;
    const dormant = !lastOrder || lastOrder < dormancyCutoff;
    return { id: agent.id, name: agent.name, country: agent.countryCode,
      region: agent.region, status: agent.lifecycleStatus,
      ordersInPeriod: recent, lastOrder, dormant };
  }).filter((row) => !filters.model || rows.some((entry) => entry.partner.id === row.id && entry.model?.id === filters.model));
  const countries = new Map<string, { agents: number; active: number; recentOrders: number }>();
  for (const row of details) {
    const current = countries.get(row.country) ?? { agents: 0, active: 0, recentOrders: 0 };
    current.agents++; if (row.status === 'active') current.active++;
    current.recentOrders += row.ordersInPeriod; countries.set(row.country, current);
  }
  return { details: details.sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name)),
    countries: [...countries].map(([country, values]) => ({ country, ...values })),
    dormant: details.filter((row) => row.dormant).length,
    inactiveCountries: [...countries].filter(([, values]) => values.recentOrders === 0).length,
    territoryUniverseAvailable: false };
}
