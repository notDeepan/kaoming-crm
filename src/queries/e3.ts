import 'server-only';
import { getDb } from '@/db/client';
import { caseMessages, caseStateLog, partners, serviceCases, siteVisits } from '@/db/schema';
import { timeInState } from '@/features/cases/timing';
import { loadReportRows } from './data';
import type { ReportFilters } from './filters';
import { within } from './filters';

export async function queryE3(filters: ReportFilters) {
  const [all, cases, messages, states, visits, agents] = await Promise.all([
    loadReportRows(), getDb().select().from(serviceCases), getDb().select().from(caseMessages),
    getDb().select().from(caseStateLog), getDb().select().from(siteVisits), getDb().select().from(partners),
  ]);
  const allowed = new Set(agents.filter((agent) => !agent.deletedAt
    && (!filters.agent || agent.id === filters.agent)
    && (!filters.country || agent.countryCode === filters.country)
    && (!filters.region || agent.region === filters.region)).map((agent) => agent.id));
  const machines = new Map(all.filter((row) => row.machine).map((row) => [row.machine!.id, row]));
  const selected = cases.filter((item) => allowed.has(item.partnerId) && within(item.openedAt, filters)
    && (!filters.model || (item.machineId && machines.get(item.machineId)?.model?.id === filters.model)));
  const caseIds = new Set(selected.map((row) => row.id));
  const selectedMessages = messages.filter((message) => caseIds.has(message.caseId));
  const stateHours = new Map<string, number>();
  for (const item of selected) {
    for (const entry of timeInState(states.filter((row) => row.caseId === item.id))) {
      stateHours.set(entry.status, (stateHours.get(entry.status) ?? 0) + entry.hours);
    }
  }
  const models = new Map<string, number>();
  for (const item of selected) {
    const model = item.machineId ? machines.get(item.machineId)?.model?.code ?? 'Unknown model' : 'No machine linked';
    models.set(model, (models.get(model) ?? 0) + 1);
  }
  const visitIds = new Set(selected.flatMap((item) => item.linkedSiteVisitId ? [item.linkedSiteVisitId] : []));
  const linkedVisits = visits.filter((visit) => visitIds.has(visit.id));
  return { cases: selected.length, open: selected.filter((item) => !item.closedAt).length,
    machineDown: selected.filter((item) => item.priority === 'machine_down').length,
    translatedMessages: selectedMessages.filter((item) => item.reviewedAt).length,
    translationPending: selectedMessages.filter((item) => !item.reviewedAt).length,
    linkedVisits: linkedVisits.length, billedVisits: selected.filter((item) => item.linkedSiteVisitId && item.billed).length,
    stateHours: [...stateHours].map(([status, hours]) => ({ status, hours: Math.round(hours * 10) / 10 })),
    models: [...models].map(([model, count]) => ({ model, count })),
    details: selected.map((item) => ({ id: item.id, number: item.caseNumber,
      subject: item.subject, status: item.status, priority: item.priority })) };
}
