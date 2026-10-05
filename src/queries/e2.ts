import 'server-only';
import { getDb } from '@/db/client';
import { partsQuotations, partsRequests, partners } from '@/db/schema';
import { loadReportRows } from './data';
import type { ReportFilters } from './filters';
import { within } from './filters';

function hours(start: Date | null, end: Date | null) {
  return start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 3_600_000)) : null;
}

export async function queryE2(filters: ReportFilters) {
  const [all, requests, quotations, agents] = await Promise.all([
    loadReportRows(), getDb().select().from(partsRequests), getDb().select().from(partsQuotations),
    getDb().select().from(partners),
  ]);
  const allowed = new Set(agents.filter((agent) => !agent.deletedAt
    && (!filters.agent || agent.id === filters.agent)
    && (!filters.country || agent.countryCode === filters.country)
    && (!filters.region || agent.region === filters.region)).map((agent) => agent.id));
  const machines = new Map(all.filter((row) => row.machine).map((row) => [row.machine!.id, row]));
  const selected = requests.filter((request) => allowed.has(request.partnerId)
    && within(request.requestedAt, filters)
    && (!filters.model || (request.machineId && machines.get(request.machineId)?.model?.id === filters.model)));
  const quoteByRequest = new Map(quotations.map((quote) => [quote.partsRequestId, quote]));
  const details = selected.map((row) => ({ id: row.id, number: row.requestNumber,
    status: row.status, determination: row.warrantyDetermination,
    identificationHours: hours(row.identificationRequestedAt, row.identificationReceivedAt),
    pricingHours: hours(row.pricingRequestedAt, row.pricingReceivedAt),
    quotationHours: hours(row.pricingReceivedAt, quoteByRequest.get(row.id)?.issuedAt ?? null),
    alternativeOutcome: row.alternativeOutcome }));
  const average = (values: (number | null)[]) => {
    const present = values.filter((value): value is number => value !== null);
    return present.length ? Math.round(present.reduce((sum, value) => sum + value, 0) / present.length) : null;
  };
  return { details, requests: selected.length,
    awaitingIdentification: selected.filter((row) => row.identificationRequestedAt && !row.identificationReceivedAt).length,
    awaitingPricing: selected.filter((row) => row.pricingRequestedAt && !row.pricingReceivedAt).length,
    preparingQuotation: selected.filter((row) => row.pricingReceivedAt && !quoteByRequest.get(row.id)?.issuedAt).length,
    undeterminable: selected.filter((row) => row.warrantyDetermination === 'undeterminable').length,
    alternativesSuggested: selected.filter((row) => row.alternativeItemId || row.alternativePartNumber).length,
    alternativesRejected: selected.filter((row) => row.alternativeOutcome === 'rejected').length,
    averageIdentificationHours: average(details.map((row) => row.identificationHours)),
    averagePricingHours: average(details.map((row) => row.pricingHours)),
    averageQuotationHours: average(details.map((row) => row.quotationHours)) };
}
