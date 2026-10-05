import 'server-only';
import { getDb } from '@/db/client';
import { claims, leakageEntries, partsRequests } from '@/db/schema';
import { loadReportRows, matchingDimensions } from './data';
import type { ReportFilters } from './filters';
import { within } from './filters';
import { cents, lowConfidence } from './money';

export async function queryE1(filters: ReportFilters) {
  const [all, requests, allClaims, entries] = await Promise.all([
    loadReportRows(), getDb().select().from(partsRequests), getDb().select().from(claims),
    getDb().select().from(leakageEntries),
  ]);
  const machines = all.filter((row) => row.machine && matchingDimensions(row, filters));
  const machineIds = new Set(machines.map((row) => row.machine!.id));
  const dealIds = new Set(machines.map((row) => row.deal.id));
  const warrantyRequests = requests.filter((request) => request.machineId && machineIds.has(request.machineId)
    && within(request.requestedAt, filters));
  const warrantyClaims = allClaims.filter((claim) => machineIds.has(claim.machineId)
    && within(claim.receivedAt, filters));
  const foc = entries.filter((entry) => dealIds.has(entry.dealId)
    && entry.currency === filters.currency && within(entry.incurredOn, filters)
    && entry.category.startsWith('foc_'));
  const models = new Map<string, { installed: number; requests: number; claims: number }>();
  for (const row of machines) {
    const model = row.model?.code ?? 'Unassigned model';
    const current = models.get(model) ?? { installed: 0, requests: 0, claims: 0 };
    current.installed++;
    current.requests += warrantyRequests.filter((item) => item.machineId === row.machine!.id).length;
    current.claims += warrantyClaims.filter((item) => item.machineId === row.machine!.id).length;
    models.set(model, current);
  }
  return { installed: machines.length, requests: warrantyRequests.length,
    inWarranty: warrantyRequests.filter((row) => row.warrantyDetermination === 'in_warranty').length,
    outOfWarranty: warrantyRequests.filter((row) => row.warrantyDetermination === 'out_of_warranty').length,
    undeterminable: warrantyRequests.filter((row) => row.warrantyDetermination === 'undeterminable').length,
    claimCount: warrantyClaims.length, focCount: foc.length,
    focAmount: foc.reduce((sum, entry) => sum + cents(entry.amount), 0n),
    models: [...models].map(([model, values]) => ({ model, ...values,
      lowConfidence: lowConfidence(values.installed) })) };
}
