import 'server-only';
import { and, asc, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  claimEvents, claimLines, claims, deals, leakageEntries, machineModels, machines,
  orders, partners, serviceCases, shipments,
} from '@/db/schema';
import { requireRole } from '@/lib/authorization';
import { dateUtc } from '@/features/production/dates';
import type { claimCategories, claimEventTypes, claimResponsibilities, leakageCategories,
  recoveryStatuses, settlementMethods } from '@/db/enums';

type ClaimCategory = typeof claimCategories[number];
type Responsibility = typeof claimResponsibilities[number];
type EventType = typeof claimEventTypes[number];
type SettlementMethod = typeof settlementMethods[number];
type LeakageCategory = typeof leakageCategories[number];
type RecoveryStatus = typeof recoveryStatuses[number];

function money(value: string, label: string) {
  if (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(value)) throw new Error(`Enter a valid ${label} amount`);
  return Number(value).toFixed(2);
}
function currency(value: string) {
  if (!/^[A-Z]{3}$/.test(value)) throw new Error('Enter a three-letter currency code');
  return value;
}

export async function listClaims() {
  await requireRole('admin', 'manager', 'sales', 'finance', 'service', 'viewer');
  return getDb().select({ claim: claims, partnerName: partners.name, serialNumber: machines.serialNumber,
    modelCode: machineModels.code, dealId: deals.id, dealNumber: deals.dealNumber,
  }).from(claims).innerJoin(partners, eq(partners.id, claims.partnerId))
    .innerJoin(machines, eq(machines.id, claims.machineId))
    .innerJoin(machineModels, eq(machineModels.id, machines.machineModelId))
    .innerJoin(orders, eq(orders.id, machines.orderId))
    .innerJoin(deals, eq(deals.id, orders.dealId))
    .where(isNull(claims.deletedAt)).orderBy(desc(claims.receivedAt));
}

export async function getClaimDetail(claimId: string) {
  await requireRole('admin', 'manager', 'sales', 'finance', 'service', 'viewer');
  const db = getDb();
  const [row] = await db.select({ claim: claims, partnerName: partners.name, serialNumber: machines.serialNumber,
    modelCode: machineModels.code, dealId: deals.id, dealNumber: deals.dealNumber,
    contractualDeliveryDate: orders.contractualDeliveryDate, shippedAt: shipments.shippedAt,
  }).from(claims).innerJoin(partners, eq(partners.id, claims.partnerId))
    .innerJoin(machines, eq(machines.id, claims.machineId))
    .innerJoin(orders, eq(orders.id, machines.orderId))
    .innerJoin(deals, eq(deals.id, orders.dealId))
    .innerJoin(machineModels, eq(machineModels.id, machines.machineModelId))
    .leftJoin(shipments, eq(shipments.orderId, orders.id))
    .where(and(eq(claims.id, claimId), isNull(claims.deletedAt))).limit(1);
  if (!row) return null;
  const [lines, events, leakage] = await Promise.all([
    db.select().from(claimLines).where(eq(claimLines.claimId, claimId)).orderBy(asc(claimLines.lineNo)),
    db.select().from(claimEvents).where(eq(claimEvents.claimId, claimId)).orderBy(desc(claimEvents.occurredAt)),
    db.select().from(leakageEntries).where(eq(leakageEntries.sourceClaimId, claimId)).limit(1),
  ]);
  return { ...row, lines, events, leakage: leakage[0] ?? null };
}

export async function claimCaseOptions(partnerId: string) {
  await requireRole('admin', 'manager', 'sales', 'finance', 'service', 'viewer');
  return getDb().select({ id: serviceCases.id, number: serviceCases.caseNumber,
    subject: serviceCases.subject, machineId: serviceCases.machineId }).from(serviceCases)
    .where(and(eq(serviceCases.partnerId, partnerId), isNull(serviceCases.deletedAt)))
    .orderBy(desc(serviceCases.openedAt));
}

export async function linkClaimCase(claimId: string, caseId: string) {
  const actor = await requireRole('admin', 'manager', 'sales', 'finance');
  return getDb().transaction(async (tx) => {
    const [claim] = await tx.select().from(claims).where(eq(claims.id, claimId)).for('update').limit(1);
    const [serviceCase] = await tx.select().from(serviceCases).where(eq(serviceCases.id, caseId)).limit(1);
    if (!claim || !serviceCase || claim.partnerId !== serviceCase.partnerId
      || serviceCase.machineId && serviceCase.machineId !== claim.machineId) {
      throw new Error('Select a case for this agent and machine');
    }
    await tx.update(claims).set({ linkedCaseId: caseId, updatedAt: new Date(),
      updatedBy: actor.id }).where(eq(claims.id, claimId));
  });
}

export async function createClaim(input: {
  machineId: string; receivedAt: string; sourceReference: string; category: ClaimCategory;
  description: string; claimedAmount: string; claimedCurrency: string; responsibility: Responsibility;
}) {
  const actor = await requireRole('admin', 'manager', 'sales', 'finance');
  dateUtc(input.receivedAt);
  if (!input.description.trim()) throw new Error('Describe the issue');
  const claimedAmount = money(input.claimedAmount, 'claimed');
  const claimedCurrency = currency(input.claimedCurrency);
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(6147291)`);
    const [machine] = await tx.select().from(machines).where(eq(machines.id, input.machineId)).limit(1);
    if (!machine) throw new Error('Select a registered machine');
    const prefix = `CL-${input.receivedAt.slice(0, 4)}-`;
    const [last] = await tx.select({ claimNumber: claims.claimNumber }).from(claims)
      .where(sql`${claims.claimNumber} LIKE ${`${prefix}%`}`).orderBy(desc(claims.claimNumber)).limit(1);
    const sequence = last ? Number(last.claimNumber.slice(prefix.length)) + 1 : 1;
    if (sequence > 9999) throw new Error('Claim number range exhausted');
    const [claim] = await tx.insert(claims).values({ claimNumber: `${prefix}${String(sequence).padStart(4, '0')}`,
      machineId: machine.id, orderId: machine.orderId, partnerId: machine.partnerId, customerId: machine.customerId,
      receivedAt: input.receivedAt, sourceReference: input.sourceReference.trim() || null,
      category: input.category, description: input.description.trim(), claimedAmount, claimedCurrency,
      responsibility: input.responsibility, ownerId: actor.id, createdBy: actor.id, updatedBy: actor.id,
    }).returning();
    await tx.insert(claimEvents).values({ claimId: claim!.id, eventType: 'received', occurredAt: input.receivedAt,
      summary: input.description.trim(), recordedBy: actor.id, createdBy: actor.id, updatedBy: actor.id });
    return claim!;
  });
}

export async function addClaimLine(claimId: string, input: {
  description: string; amount: string; currency: string; notes: string;
}) {
  const actor = await requireRole('admin', 'manager', 'sales', 'finance');
  if (!input.description.trim()) throw new Error('Describe the claimed item');
  return getDb().transaction(async (tx) => {
    const [claim] = await tx.select().from(claims).where(eq(claims.id, claimId)).for('update').limit(1);
    if (!claim || ['settled', 'closed'].includes(claim.status)) throw new Error('Claim lines are locked after settlement');
    const [last] = await tx.select({ lineNo: claimLines.lineNo }).from(claimLines).where(eq(claimLines.claimId, claimId))
      .orderBy(desc(claimLines.lineNo)).limit(1);
    const [line] = await tx.insert(claimLines).values({ claimId, lineNo: (last?.lineNo ?? 0) + 1,
      description: input.description.trim(), amount: money(input.amount, 'line'), currency: currency(input.currency),
      notes: input.notes.trim() || null, createdBy: actor.id, updatedBy: actor.id }).returning();
    return line!;
  });
}

export async function decideClaimLine(lineId: string, accepted: boolean, notes: string) {
  const actor = await requireRole('admin', 'manager', 'finance');
  return getDb().transaction(async (tx) => {
    const [line] = await tx.select().from(claimLines).where(eq(claimLines.id, lineId)).for('update').limit(1);
    if (!line) throw new Error('Claim line not found');
    const [claim] = await tx.select().from(claims).where(eq(claims.id, line.claimId)).limit(1);
    if (!claim || ['settled', 'closed'].includes(claim.status)) throw new Error('Claim line decision is locked after settlement');
    await tx.update(claimLines).set({ accepted, notes: notes.trim() || null,
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(claimLines.id, lineId));
  });
}

export async function recordClaimPosition(claimId: string, position: string, occurredAt: string) {
  const actor = await requireRole('admin', 'manager', 'sales');
  dateUtc(occurredAt);
  if (!position.trim()) throw new Error('State Kao Ming’s position');
  return getDb().transaction(async (tx) => {
    const [claim] = await tx.select().from(claims).where(eq(claims.id, claimId)).for('update').limit(1);
    if (!claim || ['settled', 'closed'].includes(claim.status)) throw new Error('This claim is no longer open for positions');
    await tx.update(claims).set({ kaoMingPosition: position.trim(), status: 'position_stated',
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(claims.id, claimId));
    await tx.insert(claimEvents).values({ claimId, eventType: 'position_sent', occurredAt,
      summary: position.trim(), recordedBy: actor.id, createdBy: actor.id, updatedBy: actor.id });
  });
}

export async function recordClaimEvent(claimId: string, input: {
  eventType: EventType; occurredAt: string; summary: string; attachmentUrl?: string;
}) {
  const actor = await requireRole('admin', 'manager', 'sales', 'finance');
  dateUtc(input.occurredAt);
  if (!input.summary.trim()) throw new Error('Summarize the claim event');
  return getDb().transaction(async (tx) => {
    const [claim] = await tx.select().from(claims).where(eq(claims.id, claimId)).for('update').limit(1);
    if (!claim || claim.status === 'closed') throw new Error('Closed claim cannot receive events');
    await tx.insert(claimEvents).values({ claimId, eventType: input.eventType,
      occurredAt: input.occurredAt, summary: input.summary.trim(),
      attachmentUrl: input.attachmentUrl?.trim() || null, recordedBy: actor.id,
      createdBy: actor.id, updatedBy: actor.id });
  });
}

export async function recordClaimOffer(claimId: string, amount: string, offerCurrency: string) {
  const actor = await requireRole('admin', 'manager', 'finance');
  const offeredAmount = money(amount, 'offered');
  const offeredCurrency = currency(offerCurrency);
  return getDb().transaction(async (tx) => {
    const [claim] = await tx.select().from(claims).where(eq(claims.id, claimId)).for('update').limit(1);
    if (!claim || ['settled', 'closed'].includes(claim.status)) throw new Error('Cannot offer on a settled claim');
    await tx.update(claims).set({ offeredAmount, offeredCurrency, status: 'negotiating',
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(claims.id, claimId));
    await tx.insert(claimEvents).values({ claimId, eventType: 'counter_offer',
      occurredAt: new Date().toISOString().slice(0, 10), summary: `Offered ${offeredCurrency} ${offeredAmount}`,
      recordedBy: actor.id, createdBy: actor.id, updatedBy: actor.id });
  });
}

export async function recordNextAction(claimId: string, nextAction: string) {
  const actor = await requireRole('admin', 'manager', 'sales', 'finance');
  if (!nextAction.trim()) throw new Error('Describe the next action');
  const [claim] = await getDb().update(claims).set({ nextAction: nextAction.trim(), ownerId: actor.id,
    updatedAt: new Date(), updatedBy: actor.id }).where(and(eq(claims.id, claimId), ne(claims.status, 'closed'))).returning();
  if (!claim) throw new Error('Closed claim cannot receive a next action');
}

export async function settleClaim(claimId: string, input: {
  method: SettlementMethod; amount: string; currency: string; outcome: string;
  leakageCategory?: LeakageCategory | null; recoveryStatus?: RecoveryStatus | null;
  fxRate?: string | null; fxRateDate?: string | null; costSharePct?: string | null; incurredOn?: string | null;
}) {
  const actor = await requireRole('admin', 'manager', 'finance');
  if (!input.method || input.method === 'none') throw new Error('G19: Choose a settlement method');
  const settledAmount = money(input.amount, 'settled');
  const settledCurrency = currency(input.currency);
  if (input.method === 'cost_share' && (!input.costSharePct || Number(input.costSharePct) <= 0 || Number(input.costSharePct) > 100)) {
    throw new Error('Enter the agreed cost-share percentage');
  }
  if (input.method === 'rejected' && Number(settledAmount) !== 0) throw new Error('Rejected claims must settle at zero');
  if (input.fxRateDate) dateUtc(input.fxRateDate);
  if (input.fxRate && (!/^\d{1,6}(?:\.\d{1,6})?$/.test(input.fxRate) || Number(input.fxRate) <= 0)) {
    throw new Error('Enter a valid positive USD FX rate');
  }
  if (settledCurrency !== 'USD' && (!input.fxRate || !input.fxRateDate)) {
    throw new Error('Enter the USD FX rate and rate date for non-USD settlement');
  }
  if (input.incurredOn) dateUtc(input.incurredOn);
  const baseAmountUsd = settledCurrency === 'USD' ? settledAmount : (Number(settledAmount) * Number(input.fxRate)).toFixed(2);
  // DECISION-PENDING: D20 — department manager approves through USD 5,000; GM above.
  if (Number(baseAmountUsd) > 5000 && actor.role !== 'admin' && actor.department !== 'GM') {
    throw new Error('GM approval is required for settlements above USD 5,000');
  }
  return getDb().transaction(async (tx) => {
    const [claim] = await tx.select().from(claims).where(eq(claims.id, claimId)).for('update').limit(1);
    if (!claim || ['settled', 'closed'].includes(claim.status)) throw new Error('Claim already settled or closed');
    if (claim.responsibility === 'kao_ming' && Number(settledAmount) > 0 && (!input.leakageCategory || !input.recoveryStatus)) {
      throw new Error('G20: Classify the Kao Ming leakage and recovery before settlement');
    }
    if (claim.responsibility === 'kao_ming' && Number(settledAmount) > 0 && !input.incurredOn) {
      throw new Error('Record when the loss arose for the leakage register');
    }
    const now = new Date();
    await tx.update(claims).set({ settledAmount, settledCurrency, settlementMethod: input.method,
      baseAmountUsd, fxRate: input.fxRate ?? null, fxRateDate: input.fxRateDate ?? null,
      costSharePct: input.costSharePct ?? null, outcome: input.outcome.trim() || null,
      pendingCredit: input.method === 'credit_note', status: 'settled', updatedAt: now, updatedBy: actor.id,
    }).where(eq(claims.id, claimId));
    await tx.insert(claimEvents).values({ claimId, eventType: 'settled', occurredAt: now.toISOString().slice(0, 10),
      summary: `${input.method}: ${settledCurrency} ${settledAmount}${input.outcome.trim() ? ` — ${input.outcome.trim()}` : ''}`,
      recordedBy: actor.id, createdBy: actor.id, updatedBy: actor.id });
    if (claim.responsibility === 'kao_ming' && Number(settledAmount) > 0) {
      const [machine] = await tx.select().from(machines).where(eq(machines.id, claim.machineId)).limit(1);
      const [order] = await tx.select().from(orders).where(eq(orders.id, machine!.orderId)).limit(1);
      await tx.insert(leakageEntries).values({ dealId: order!.dealId, sourceClaimId: claimId,
        category: input.leakageCategory!, amount: settledAmount, currency: settledCurrency,
        incurredOn: input.incurredOn!, attribution: 'kao_ming',
        recoveryStatus: input.recoveryStatus!, notes: `Claim ${claim.claimNumber}`,
        createdBy: actor.id, updatedBy: actor.id });
    }
  });
}

export async function applyPendingCredit(claimId: string, orderId: string) {
  const actor = await requireRole('admin', 'manager', 'finance');
  return getDb().transaction(async (tx) => {
    const [claim] = await tx.select().from(claims).where(eq(claims.id, claimId)).for('update').limit(1);
    if (!claim?.pendingCredit || claim.appliedToOrderId) throw new Error('No unapplied credit note on this claim');
    if (claim.orderId === orderId) throw new Error('Apply the credit note to a later order');
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const [deal] = order ? await tx.select().from(deals).where(eq(deals.id, order.dealId)).limit(1) : [];
    if (!deal || deal.partnerId !== claim.partnerId) throw new Error('Apply credit to an order for the same agent');
    await tx.update(claims).set({ pendingCredit: false, appliedToOrderId: orderId,
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(claims.id, claimId));
  });
}

export async function closeClaim(claimId: string) {
  const actor = await requireRole('admin', 'manager');
  const [claim] = await getDb().update(claims).set({ status: 'closed', closedAt: new Date(),
    updatedAt: new Date(), updatedBy: actor.id }).where(and(eq(claims.id, claimId),
    eq(claims.status, 'settled'), eq(claims.pendingCredit, false))).returning();
  if (!claim) throw new Error('Settle the claim and apply any pending credit before closure');
}

export async function openClaimsForPartner(partnerId: string) {
  await requireRole('admin', 'manager', 'sales', 'finance', 'service', 'viewer');
  return getDb().select({ claim: claims, machine: machines, model: machineModels,
    shipment: shipments, order: orders }).from(claims)
    .innerJoin(machines, eq(machines.id, claims.machineId))
    .innerJoin(machineModels, eq(machineModels.id, machines.machineModelId))
    .innerJoin(orders, eq(orders.id, machines.orderId))
    .leftJoin(shipments, eq(shipments.orderId, orders.id))
    .where(and(eq(claims.partnerId, partnerId), ne(claims.status, 'closed')))
    .orderBy(asc(claims.receivedAt));
}
