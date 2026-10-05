import 'server-only';
import { and, eq, gte, isNull, lte } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import { getDb } from '@/db/client';
import {
  attachments, commissions, customers, deals, documentApprovals, documents, items,
  machineModels, orders, partnerContracts, partners, quotationLines, quotations, users,
} from '@/db/schema';
import { renderA4Pdf } from '@/documents/pdf';
import { renderPiHtml } from '@/documents/registry';
import type { PiDocument } from '@/documents/templates/pi/template';
import { requireRole } from '@/lib/authorization';
import { minorUnitsToDecimal, parseDecimalToMinorUnits } from '@/lib/money';
import { taipeiDate } from '@/lib/business-date';
import { commissionCents } from '@/queries/commission';

export async function recordDeposit(orderId: string, amount: string) {
  const actor = await requireRole('admin', 'manager', 'finance');
  const minor = parseDecimalToMinorUnits(amount);
  if (minor <= 0n) throw new Error('Deposit received amount must be positive');
  return getDb().transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update').limit(1);
    if (!order?.poVerifiedAt || order.depositReceivedAt) throw new Error('Verify the PO before recording a deposit');
    if (minor > parseDecimalToMinorUnits(order.orderValue)) throw new Error('Deposit cannot exceed the order value');
    const now = new Date();
    await tx.update(orders).set({ depositReceivedAt: now, depositReceivedAmount: minorUnitsToDecimal(minor),
      updatedAt: now, updatedBy: actor.id }).where(eq(orders.id, orderId));
    await tx.update(deals).set({ projectStage: 'deposit_received', updatedAt: now, updatedBy: actor.id })
      .where(and(eq(deals.id, order.dealId), eq(deals.projectStage, 'order_confirmed')));
  });
}

export async function createOrderFromPo(dealId: string, input: {
  poRef: string; filename: string; pdfBytes: Uint8Array; depositPercent: number;
}) {
  const actor = await requireRole('admin', 'manager', 'sales');
  if (!input.poRef.trim() || input.poRef.length > 200) throw new Error('Enter the customer purchase order reference');
  if (!Number.isFinite(input.depositPercent) || input.depositPercent < 0 || input.depositPercent > 100) {
    throw new Error('Deposit percent must be between 0 and 100');
  }
  if (input.pdfBytes.length < 100 || input.pdfBytes.length > 10_000_000
    || Buffer.from(input.pdfBytes.subarray(0, 5)).toString() !== '%PDF-') throw new Error('Attach the customer PO as a PDF up to 10 MB');
  try { await PDFDocument.load(input.pdfBytes); }
  catch { throw new Error('The customer PO PDF is damaged or unsupported'); }
  return getDb().transaction(async (tx) => {
    const [deal] = await tx.select().from(deals).where(and(eq(deals.id, dealId), isNull(deals.deletedAt))).for('update').limit(1);
    if (!deal) throw new Error('Deal not found');
    const [existing] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.dealId, dealId)).limit(1);
    if (existing) throw new Error('This deal already has a PI order');
    const [quote] = await tx.select().from(quotations)
      .where(and(eq(quotations.dealId, dealId), eq(quotations.status, 'issued')))
      .orderBy(quotations.revision).limit(1);
    if (!quote) throw new Error('Issue the final quotation before recording the customer PO');
    const [attachment] = await tx.insert(attachments).values({
      dealId, group: 'order', kind: 'customer_po', fileUrl: 'pending',
      filename: input.filename.trim() || 'customer-po.pdf', mimeType: 'application/pdf',
      fileBase64: Buffer.from(input.pdfBytes).toString('base64'), uploadedBy: actor.id,
      createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: attachments.id });
    const poUrl = `/api/attachments/${attachment!.id}`;
    await tx.update(attachments).set({ fileUrl: poUrl }).where(eq(attachments.id, attachment!.id));
    const piNumber = deal.dealNumber.replace(/^Q-/, 'P-');
    const [order] = await tx.insert(orders).values({
      dealId, sourceQuotationId: quote.id, piNumber,
      customerPoRef: input.poRef.trim(), customerPoUrl: poUrl,
      orderValue: quote.netTotal, currency: deal.currency,
      depositPercent: input.depositPercent.toFixed(2),
      createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: orders.id });
    return order!;
  });
}

export async function verifyCustomerPo(orderId: string, varianceNotes: string) {
  const actor = await requireRole('admin', 'manager');
  await getDb().transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update').limit(1);
    if (!order || !order.customerPoUrl) throw new Error('Attach the customer PO before verification');
    if (order.poVerifiedAt) throw new Error('The customer PO is already verified');
    await tx.update(orders).set({ poVerifiedAt: new Date(), poVarianceNotes: varianceNotes.trim() || null,
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(orders.id, orderId));
  });
}

export async function markDealWon(dealId: string) {
  const actor = await requireRole('admin', 'manager');
  await getDb().transaction(async (tx) => {
    const [deal] = await tx.select().from(deals).where(eq(deals.id, dealId)).for('update').limit(1);
    if (!deal) throw new Error('Deal not found');
    if (deal.salesStage === 'won') throw new Error('Deal already confirmed');
    const [order] = await tx.select().from(orders).where(eq(orders.dealId, dealId)).limit(1);
    if (!order?.customerPoUrl || !order.poVerifiedAt) {
      throw new Error('G3: The customer PO must be attached and verified before the deal can be won');
    }
    const [partner] = await tx.select().from(partners).where(eq(partners.id, deal.partnerId)).limit(1);
    const [quote] = await tx.select().from(quotations).where(eq(quotations.id, order.sourceQuotationId)).limit(1);
    if (!partner || !quote) throw new Error('Order commission source data is incomplete');
    const on = taipeiDate(order.createdAt);
    const [contract] = await tx.select().from(partnerContracts).where(and(
      eq(partnerContracts.partnerId, partner.id), lte(partnerContracts.startDate, on),
      gte(partnerContracts.endDate, on), isNull(partnerContracts.deletedAt))).limit(1);
    const machineLines = await tx.select({ total: quotationLines.lineTotal,
      included: quotationLines.isIncludedInTotal, type: quotationLines.itemType })
      .from(quotationLines).where(eq(quotationLines.quotationId, quote.id));
    const machineTotal = machineLines.filter((line) => line.type === 'machine' && line.included)
      .reduce((sum, line) => sum + parseDecimalToMinorUnits(line.total), 0n);
    const accrued = commissionCents({ orderValue: order.orderValue,
      quoteListTotal: quote.listTotal, quoteIncoterm: quote.incoterm,
      machineLinesTotal: machineTotal > 0n ? machineTotal : null,
      partnerModel: partner.commissionModel, contract: contract ?? null });
    if (accrued === null) throw new Error('Confirm contract commission terms before marking the order won');
    const now = new Date();
    await tx.insert(commissions).values({ orderId: order.id, partnerId: partner.id,
      model: partner.commissionModel, rate: contract?.commissionRate ?? null,
      base: contract?.commissionBase ?? null, accruedAmount: minorUnitsToDecimal(accrued),
      accruedAt: now, createdBy: actor.id, updatedBy: actor.id });
    await tx.update(deals).set({ salesStage: 'won', projectStage: 'order_confirmed',
      updatedAt: now, updatedBy: actor.id }).where(eq(deals.id, dealId));
  });
}

export async function getDealOrder(dealId: string) {
  await requireRole('admin', 'manager', 'sales', 'logistics', 'finance', 'service', 'viewer');
  const [order] = await getDb().select().from(orders)
    .where(and(eq(orders.dealId, dealId), isNull(orders.deletedAt))).limit(1);
  return order ?? null;
}

async function loadPiDocument(orderId: string, issuedAt: Date): Promise<PiDocument> {
  const db = getDb();
  const [row] = await db.select({
    order: orders, deal: deals, quote: quotations,
    partner: partners, customer: customers, model: machineModels, owner: users,
  }).from(orders)
    .innerJoin(deals, eq(deals.id, orders.dealId))
    .innerJoin(quotations, eq(quotations.id, orders.sourceQuotationId))
    .innerJoin(partners, eq(partners.id, deals.partnerId))
    .leftJoin(customers, eq(customers.id, deals.customerId))
    .leftJoin(machineModels, eq(machineModels.id, deals.machineModelId))
    .innerJoin(users, eq(users.id, deals.ownerId))
    .where(eq(orders.id, orderId)).limit(1);
  if (!row) throw new Error('Order not found');
  const quoteLines = await db.select({
    lineNo: quotationLines.lineNo, code: items.code, nameZh: quotationLines.descriptionZh,
    unit: items.unit, quantity: quotationLines.quantity, unitPrice: quotationLines.unitPrice,
    lineTotal: quotationLines.lineTotal, included: quotationLines.isIncludedInTotal,
  }).from(quotationLines).innerJoin(items, eq(items.id, quotationLines.itemId))
    .where(and(eq(quotationLines.quotationId, row.quote.id), isNull(quotationLines.deletedAt)))
    .orderBy(quotationLines.lineNo);
  return {
    dealNumber: row.deal.dealNumber, piNumber: row.order.piNumber, issuedAt,
    partnerCode: row.partner.code, partnerName: row.partner.name,
    customerName: row.customer?.name ?? null,
    countryCode: row.customer?.countryCode ?? row.partner.countryCode,
    salesOwnerName: row.owner.name,
    modelCode: row.model?.code ?? '', currency: row.order.currency,
    incoterm: row.quote.incoterm, paymentTerms: row.quote.paymentTerms ?? '',
    deliveryTerms: row.quote.deliveryTerms ?? '', leadTimeText: row.quote.leadTimeText ?? '',
    poRef: row.order.customerPoRef,
    listTotal: row.quote.listTotal, discountAmount: row.quote.discountAmount, netTotal: row.quote.netTotal,
    lines: quoteLines.filter((line) => line.included).map((line) => ({
      lineNo: line.lineNo, code: line.code, nameZh: line.nameZh, unit: line.unit,
      quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: line.lineTotal,
    })),
  };
}

export async function issuePiDocument(orderId: string) {
  const actor = await requireRole('admin', 'manager');
  const [order] = await getDb().select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order?.poVerifiedAt) throw new Error('G3: Verify the customer PO before issuing the PI');
  if (order.documentId) throw new Error('The PI document has already been issued');
  const [deal] = await getDb().select({ salesStage: deals.salesStage }).from(deals)
    .where(eq(deals.id, order.dealId)).limit(1);
  if (deal?.salesStage !== 'won') throw new Error('Mark the deal won after PO verification before issuing the PI');
  const issuedAt = new Date();
  const data = await loadPiDocument(orderId, issuedAt);
  const pdfBytes = await renderA4Pdf(await renderPiHtml(data), {
    dealNumber: data.dealNumber, revision: 1, issueDate: issuedAt.toISOString().slice(0, 10),
  });
  return getDb().transaction(async (tx) => {
    const [locked] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update').limit(1);
    if (!locked?.poVerifiedAt || locked.documentId) throw new Error('The PI issue state changed; reload and try again');
    const [currentDeal] = await tx.select({ salesStage: deals.salesStage }).from(deals)
      .where(eq(deals.id, locked.dealId)).limit(1);
    if (currentDeal?.salesStage !== 'won') throw new Error('The deal is no longer won');
    const [document] = await tx.insert(documents).values({
      dealId: locked.dealId, docType: 'pi', docNumber: locked.piNumber,
      revision: 1, language: 'zh_hant', status: 'issued',
      pdfUrl: 'pending', pdfBase64: Buffer.from(pdfBytes).toString('base64'),
      generatedAt: issuedAt, createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: documents.id });
    const pdfUrl = `/api/documents/${document!.id}/pdf`;
    await tx.update(documents).set({ pdfUrl }).where(eq(documents.id, document!.id));
    await tx.insert(documentApprovals).values({
      documentId: document!.id, approvalType: 'deputy_manager_signature', required: true,
      createdBy: actor.id, updatedBy: actor.id,
    });
    await tx.update(orders).set({ documentId: document!.id, updatedAt: issuedAt,
      updatedBy: actor.id }).where(eq(orders.id, orderId));
    return { documentId: document!.id, pdfUrl };
  });
}
