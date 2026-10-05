import 'server-only';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { items, machines, partners, partsQuotations, partsRequests, serviceCases, users } from '@/db/schema';
import type { priceSources } from '@/db/enums';
import { escapeHtml as e } from '@/documents/chinese';
import { renderA4Pdf } from '@/documents/pdf';
import { taipeiDate } from '@/lib/business-date';
import { requireRole } from '@/lib/authorization';
import { minorUnitsToDecimal, parseDecimalToMinorUnits } from '@/lib/money';

type PriceSource = typeof priceSources[number];

export async function listPartsRequests() {
  await requireRole('admin', 'manager', 'sales', 'logistics', 'service', 'viewer');
  return getDb().select({ request: partsRequests, partnerName: partners.name,
    serialNumber: machines.serialNumber }).from(partsRequests)
    .innerJoin(partners, eq(partners.id, partsRequests.partnerId))
    .leftJoin(machines, eq(machines.id, partsRequests.machineId))
    .where(isNull(partsRequests.deletedAt)).orderBy(desc(partsRequests.requestedAt));
}

export async function partsOptions() {
  await requireRole('admin', 'manager', 'sales', 'logistics', 'service', 'viewer');
  const db = getDb();
  return Promise.all([
    db.select({ id: partners.id, name: partners.name }).from(partners).where(isNull(partners.deletedAt)),
    db.select({ id: machines.id, serialNumber: machines.serialNumber,
      partnerId: machines.partnerId }).from(machines).where(isNull(machines.deletedAt)),
    db.select({ id: items.id, code: items.code, nameEn: items.nameEn }).from(items)
      .where(isNull(items.deletedAt)),
  ]);
}

export async function getPartsRequest(requestId: string) {
  await requireRole('admin', 'manager', 'sales', 'logistics', 'service', 'viewer');
  const db = getDb();
  const [row] = await db.select({ request: partsRequests, partnerName: partners.name,
    serialNumber: machines.serialNumber }).from(partsRequests)
    .innerJoin(partners, eq(partners.id, partsRequests.partnerId))
    .leftJoin(machines, eq(machines.id, partsRequests.machineId))
    .where(and(eq(partsRequests.id, requestId), isNull(partsRequests.deletedAt))).limit(1);
  if (!row) return null;
  const [quotation] = await db.select().from(partsQuotations)
    .where(eq(partsQuotations.partsRequestId, requestId)).limit(1);
  return { ...row, quotation: quotation ?? null };
}

export async function openPartsRequest(input: {
  partnerId: string; machineId: string | null; description: string; quantity: number;
  linkedCaseId?: string | null;
}) {
  const actor = await requireRole('admin', 'manager', 'sales', 'logistics', 'service');
  if (!input.description.trim() || !Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 1000) {
    throw new Error('Enter the requested part description and a quantity from 1 to 1000');
  }
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(6147293)`);
    const [partner] = await tx.select().from(partners).where(eq(partners.id, input.partnerId)).limit(1);
    const [machine] = input.machineId ? await tx.select().from(machines)
      .where(eq(machines.id, input.machineId)).limit(1) : [];
    if (!partner || input.machineId && (!machine || machine.partnerId !== partner.id)) {
      throw new Error('Select an agent and a machine belonging to that agent');
    }
    const [linkedCase] = input.linkedCaseId ? await tx.select().from(serviceCases)
      .where(eq(serviceCases.id, input.linkedCaseId)).for('update').limit(1) : [];
    if (input.linkedCaseId && (!linkedCase || linkedCase.partnerId !== partner.id
      || linkedCase.machineId && linkedCase.machineId !== input.machineId
      || linkedCase.linkedPartsRequestId)) {
      throw new Error('Linked case must belong to this agent and have no existing parts request');
    }
    const today = taipeiDate();
    const determination = !machine?.acceptedAt || !machine.warrantyExpiresAt ? 'undeterminable'
      : machine.warrantyExpiresAt >= today ? 'in_warranty' : 'out_of_warranty';
    const prefix = `PR-${today.slice(0, 4)}-`;
    const [last] = await tx.select({ requestNumber: partsRequests.requestNumber }).from(partsRequests)
      .where(sql`${partsRequests.requestNumber} LIKE ${`${prefix}%`}`)
      .orderBy(desc(partsRequests.requestNumber)).limit(1);
    const number = last ? Number(last.requestNumber.slice(prefix.length)) + 1 : 1;
    if (number > 9999) throw new Error('Parts request number range exhausted');
    const [request] = await tx.insert(partsRequests).values({
      requestNumber: `${prefix}${String(number).padStart(4, '0')}`,
      partnerId: partner.id, machineId: machine?.id ?? null,
      requestedDescription: input.description.trim(), requestedQuantity: input.quantity,
      warrantyDetermination: determination, linkedCaseId: input.linkedCaseId ?? null,
      status: 'requested', createdBy: actor.id, updatedBy: actor.id,
    }).returning();
    if (linkedCase) await tx.update(serviceCases).set({ linkedPartsRequestId: request!.id,
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(serviceCases.id, linkedCase.id));
    return request!;
  });
}

export async function requestIdentification(requestId: string) {
  const actor = await requireRole('admin', 'manager', 'sales', 'logistics', 'service');
  const [row] = await getDb().update(partsRequests).set({ status: 'awaiting_identification',
    identificationRequestedAt: new Date(), updatedAt: new Date(), updatedBy: actor.id })
    .where(and(eq(partsRequests.id, requestId), eq(partsRequests.status, 'requested'))).returning();
  if (!row) throw new Error('Identification may be requested only from a new enquiry');
}

export async function identifyPart(requestId: string, partNumber: string, identifiedBy: string) {
  const actor = await requireRole('admin', 'manager', 'sales', 'logistics', 'service');
  if (!partNumber.trim() || !identifiedBy.trim()) throw new Error('Record the part number and who identified it');
  const [item] = await getDb().select({ id: items.id }).from(items)
    .where(eq(items.code, partNumber.trim())).limit(1);
  const [row] = await getDb().update(partsRequests).set({
    identifiedPartNumber: partNumber.trim(), identifiedItemId: item?.id ?? null,
    identifiedBy: identifiedBy.trim(), identificationReceivedAt: new Date(), status: 'identified',
    updatedAt: new Date(), updatedBy: actor.id,
  }).where(and(eq(partsRequests.id, requestId), eq(partsRequests.status, 'awaiting_identification'))).returning();
  if (!row) throw new Error('Part identification is not awaiting a response');
}

export async function suggestAlternative(requestId: string, partNumber: string, identifiedBy: string) {
  const actor = await requireRole('admin', 'manager', 'sales', 'logistics', 'service');
  if (!partNumber.trim() || !identifiedBy.trim()) throw new Error('Name the alternative and who suggested it');
  const [item] = await getDb().select({ id: items.id }).from(items)
    .where(eq(items.code, partNumber.trim())).limit(1);
  const [row] = await getDb().update(partsRequests).set({ alternativePartNumber: partNumber.trim(),
    alternativeItemId: item?.id ?? null, alternativeOutcome: 'pending',
    identifiedBy: identifiedBy.trim(), identificationReceivedAt: new Date(),
    status: 'alternative_suggested', updatedAt: new Date(), updatedBy: actor.id,
  }).where(and(eq(partsRequests.id, requestId), eq(partsRequests.status, 'awaiting_identification'))).returning();
  if (!row) throw new Error('Alternative may be suggested only during identification');
}

export async function decideAlternative(requestId: string, accepted: boolean, reason: string) {
  const actor = await requireRole('admin', 'manager', 'sales', 'logistics', 'service');
  if (!accepted && !reason.trim()) throw new Error('Record why the alternative was rejected');
  const [row] = await getDb().update(partsRequests).set({ alternativeOutcome: accepted ? 'accepted' : 'rejected',
    alternativeRejectionReason: accepted ? null : reason.trim(),
    status: accepted ? 'alternative_accepted' : 'alternative_rejected',
    updatedAt: new Date(), updatedBy: actor.id,
  }).where(and(eq(partsRequests.id, requestId), eq(partsRequests.status, 'alternative_suggested'))).returning();
  if (!row) throw new Error('No pending alternative decision');
}

export async function checkStock(requestId: string, inStock: boolean, leadDays: number | null) {
  const actor = await requireRole('admin', 'manager', 'logistics', 'service');
  if (!inStock && (!Number.isInteger(leadDays) || leadDays === null || leadDays < 1)) {
    throw new Error('Out-of-stock parts need procurement lead days');
  }
  const [row] = await getDb().update(partsRequests).set({ inStock,
    procurementLeadDays: inStock ? null : leadDays, status: 'stock_checked',
    updatedAt: new Date(), updatedBy: actor.id,
  }).where(and(eq(partsRequests.id, requestId),
    sql`${partsRequests.status} IN ('identified', 'alternative_accepted')`)).returning();
  if (!row) throw new Error('Identify the part or accept the alternative before checking stock');
}

export async function requestPricing(requestId: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  const [row] = await getDb().update(partsRequests).set({ status: 'awaiting_pricing',
    pricingRequestedAt: new Date(), updatedAt: new Date(), updatedBy: actor.id })
    .where(and(eq(partsRequests.id, requestId), eq(partsRequests.status, 'stock_checked'))).returning();
  if (!row) throw new Error('Check stock before requesting a price');
}

export async function recordPartPrice(requestId: string, input: {
  price: string; currency: string; source: PriceSource; pricedBy: string;
}) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  const minor = parseDecimalToMinorUnits(input.price);
  if (minor < 0n || !/^[A-Z]{3}$/.test(input.currency) || !input.pricedBy.trim()) {
    throw new Error('Enter a valid price, currency and pricing source');
  }
  const [row] = await getDb().update(partsRequests).set({ unitPrice: minorUnitsToDecimal(minor),
    currency: input.currency, priceSource: input.source, pricedBy: input.pricedBy.trim(),
    pricingReceivedAt: new Date(), status: 'priced', updatedAt: new Date(), updatedBy: actor.id,
  }).where(and(eq(partsRequests.id, requestId), eq(partsRequests.status, 'awaiting_pricing'))).returning();
  if (!row) throw new Error('Price has not been requested');
}

export async function draftPartsQuotation(requestId: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  return getDb().transaction(async (tx) => {
    const [request] = await tx.select().from(partsRequests).where(eq(partsRequests.id, requestId)).for('update').limit(1);
    if (!request || request.status !== 'priced' || !request.priceSource || request.unitPrice === null
      || request.inStock === null || !(request.identifiedPartNumber ||
        request.alternativePartNumber && request.alternativeOutcome === 'accepted')) {
      throw new Error('G17: Identify or accept a part, check stock and record a price before drafting a quotation');
    }
    const [existing] = await tx.select({ id: partsQuotations.id }).from(partsQuotations)
      .where(eq(partsQuotations.partsRequestId, requestId)).limit(1);
    if (existing) throw new Error('This request already has a quotation');
    const total = minorUnitsToDecimal(parseDecimalToMinorUnits(request.unitPrice) * BigInt(request.requestedQuantity));
    const [quote] = await tx.insert(partsQuotations).values({ partsRequestId: requestId,
      quoteNumber: request.requestNumber.replace(/^PR-/, 'PQ-'),
      preparedBy: actor.id, currency: request.currency!, total,
      isFoc: total === '0.00', status: 'draft',
      createdBy: actor.id, updatedBy: actor.id }).returning();
    return quote!;
  });
}

export async function approvePartsQuotation(quotationId: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  const [quote] = await getDb().select().from(partsQuotations).where(eq(partsQuotations.id, quotationId)).limit(1);
  if (!quote || quote.status !== 'draft') throw new Error('Draft parts quotation required');
  if (quote.preparedBy === actor.id) throw new Error('G18: The approver cannot be the preparer');
  const [preparer] = await getDb().select({ role: users.role }).from(users)
    .where(eq(users.id, quote.preparedBy)).limit(1);
  if (preparer?.role === 'logistics' && actor.role === 'logistics') {
    throw new Error('G18: A logistics-prepared quotation requires department manager approval');
  }
  const [row] = await getDb().update(partsQuotations).set({ status: 'pending_approval',
    supervisorApprovedBy: actor.id, supervisorApprovedAt: new Date(),
    updatedAt: new Date(), updatedBy: actor.id })
    .where(and(eq(partsQuotations.id, quotationId), eq(partsQuotations.status, 'draft'))).returning();
  if (!row) throw new Error('Quotation approval could not be recorded');
}

export async function completePartsTerms(quotationId: string, paymentTerms: string, deliveryText: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  if (!paymentTerms.trim() || !deliveryText.trim()) throw new Error('Enter payment and delivery terms');
  const [row] = await getDb().update(partsQuotations).set({ paymentTerms: paymentTerms.trim(),
    deliveryText: deliveryText.trim(), status: 'approved',
    updatedAt: new Date(), updatedBy: actor.id })
    .where(and(eq(partsQuotations.id, quotationId), eq(partsQuotations.status, 'pending_approval'),
      sql`${partsQuotations.supervisorApprovedAt} IS NOT NULL`)).returning();
  if (!row) throw new Error('G8: Supervisor approval is required before completing terms');
}

export async function issuePartsQuotation(quotationId: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  const [row] = await getDb().select({ quote: partsQuotations, request: partsRequests,
    partner: partners }).from(partsQuotations)
    .innerJoin(partsRequests, eq(partsRequests.id, partsQuotations.partsRequestId))
    .innerJoin(partners, eq(partners.id, partsRequests.partnerId))
    .where(eq(partsQuotations.id, quotationId)).limit(1);
  if (!row?.quote.supervisorApprovedAt || row.quote.status !== 'approved'
    || !row.quote.deliveryText || !row.quote.paymentTerms) {
    throw new Error('Approve the quotation and complete terms before issue');
  }
  const quote = row.quote, request = row.request;
  const issueDate = taipeiDate();
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><style>
    @page{size:A4;margin:17mm}body{font:12px Arial,sans-serif;color:#17263b}header{border-bottom:2px solid #17263b;padding-bottom:12px}
    h1{font-size:22px}table{border-collapse:collapse;width:100%;margin-top:28px}td,th{border-bottom:1px solid #ccd3dc;padding:9px;text-align:left}
    .tot{text-align:right;font-size:17px;font-weight:bold;margin-top:25px}
    </style></head><body><header><strong>KAO MING</strong><h1>Spare parts quotation</h1>
    <div>${e(quote.quoteNumber)} · ${e(issueDate)}</div></header>
    <p>To: ${e(row.partner.name)}</p><p>Reference: ${e(request.requestNumber)}</p>
    <table><thead><tr><th>Part</th><th>Quantity</th><th>Unit price</th><th>Total</th></tr></thead><tbody><tr>
    <td>${e(request.alternativeOutcome === 'accepted' ? request.alternativePartNumber : request.identifiedPartNumber)}
    <br/>${e(request.requestedDescription)}</td><td>${e(request.requestedQuantity)}</td>
    <td>${e(quote.currency)} ${e(request.unitPrice)}</td><td>${e(quote.currency)} ${e(quote.total)}</td></tr></tbody></table>
    <p class="tot">Total: ${e(quote.currency)} ${e(quote.total)}${quote.isFoc ? ' · FOC' : ''}</p>
    <p>Payment: ${e(quote.paymentTerms)}<br/>Delivery: ${e(quote.deliveryText)}</p></body></html>`;
  const pdf = await renderA4Pdf(html, { dealNumber: quote.quoteNumber, revision: 1, issueDate });
  return getDb().transaction(async (tx) => {
    const [locked] = await tx.select().from(partsQuotations).where(eq(partsQuotations.id, quotationId)).for('update').limit(1);
    if (!locked || locked.status !== 'approved') throw new Error('Quotation already issued or changed');
    const now = new Date();
    await tx.update(partsQuotations).set({ status: 'issued', issuedAt: now,
      pdfBase64: Buffer.from(pdf).toString('base64'), updatedAt: now, updatedBy: actor.id })
      .where(eq(partsQuotations.id, quotationId));
    await tx.update(partsRequests).set({ status: 'quoted', updatedAt: now, updatedBy: actor.id })
      .where(eq(partsRequests.id, request.id));
  });
}
