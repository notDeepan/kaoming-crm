import 'server-only';
import { eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { deals, documentApprovals, documents, machineModels, machines, orders, partnerContracts,
  partners, quotations, shipments, workOrders } from '@/db/schema';
import type { ReportFilters } from './filters';
import { iso, within } from './filters';

export async function loadReportRows() {
  return getDb().select({ deal: deals, partner: partners, model: machineModels, order: orders,
    shipment: shipments, machine: machines, quote: quotations, work: workOrders })
    .from(deals).innerJoin(partners, eq(partners.id, deals.partnerId))
    .leftJoin(machineModels, eq(machineModels.id, deals.machineModelId))
    .leftJoin(orders, eq(orders.dealId, deals.id))
    .leftJoin(shipments, eq(shipments.orderId, orders.id))
    .leftJoin(machines, eq(machines.orderId, orders.id))
    .leftJoin(quotations, eq(quotations.id, orders.sourceQuotationId))
    .leftJoin(workOrders, eq(workOrders.orderId, orders.id))
    .where(isNull(deals.deletedAt));
}
export type ReportRow = Awaited<ReturnType<typeof loadReportRows>>[number];

export function basisDate(row: ReportRow, basis: ReportFilters['basis']): Date | string | null {
  if (basis === 'shipment') return row.shipment?.shippedAt ?? null;
  if (basis === 'acceptance') return row.machine?.acceptedAt ?? null;
  if (basis === 'payment') return row.shipment?.finalPaymentReceivedAt ?? row.order?.depositReceivedAt ?? null;
  return row.order?.createdAt ?? row.deal.enquiryDate;
}

export function matchingDimensions(row: ReportRow, filters: ReportFilters): boolean {
    if (filters.agent && row.partner.id !== filters.agent) return false;
    if (filters.country && row.partner.countryCode !== filters.country) return false;
    if (filters.region && row.partner.region !== filters.region) return false;
    if (filters.model && row.model?.id !== filters.model) return false;
    if (row.order && row.order.currency !== filters.currency) return false;
    if (!row.order && row.deal.currency !== filters.currency) return false;
    return true;
}

export function filteredRows(rows: ReportRow[], filters: ReportFilters, includeOpen = false) {
  return rows.filter((row) => matchingDimensions(row, filters)
    && (includeOpen && !row.order ? within(row.deal.enquiryDate, filters) : within(basisDate(row, filters.basis), filters)));
}

export async function reportOptions() {
  const db = getDb();
  const [agentRows, modelRows] = await Promise.all([
    db.select({ id: partners.id, name: partners.name, country: partners.countryCode,
      region: partners.region }).from(partners).where(isNull(partners.deletedAt)),
    db.select({ id: machineModels.id, code: machineModels.code }).from(machineModels)
      .where(isNull(machineModels.deletedAt)),
  ]);
  return { agents: agentRows, models: modelRows,
    countries: [...new Set(agentRows.map((row) => row.country))].sort(),
    regions: [...new Set(agentRows.map((row) => row.region))].sort(),
    currencies: ['USD', 'TWD', 'EUR'] };
}

export async function loadContracts() {
  return getDb().select().from(partnerContracts).where(isNull(partnerContracts.deletedAt));
}

export async function loadDocumentRows() {
  const db = getDb();
  const [rows, approvals] = await Promise.all([
    db.select({ document: documents, deal: deals, partner: partners, model: machineModels })
      .from(documents).innerJoin(deals, eq(deals.id, documents.dealId))
      .innerJoin(partners, eq(partners.id, deals.partnerId))
      .leftJoin(machineModels, eq(machineModels.id, deals.machineModelId))
      .where(isNull(documents.deletedAt)),
    db.select().from(documentApprovals).where(isNull(documentApprovals.deletedAt)),
  ]);
  return { rows, approvals };
}

export function monthKey(value: Date | string | null | undefined): string {
  return iso(value)?.slice(0, 7) ?? '';
}
