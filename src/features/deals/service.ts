import 'server-only';
import { and, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { addMonths } from 'date-fns';
import { PDFDocument } from 'pdf-lib';
import { getDb } from '@/db/client';
import { taipeiDate } from '@/lib/business-date';
import {
  customers, deals, designReviews, items, machineModels, partners, priceBookVersions,
  prices, quotationApprovals, quotationLines, quotations, technicalProposals,
} from '@/db/schema';
import { requireRole } from '@/lib/authorization';
import { calculateLine, calculateTotals } from './quote-math';

const editorialRoles = ['admin', 'manager', 'sales'] as const;

export async function createDeal(input: {
  partnerId: string; customerId?: string | null; machineModelId?: string | null;
  regionBand: 'eu' | 'non_eu'; currency: string; enquiryDate: string;
}) {
  const actor = await requireRole(...editorialRoles);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.enquiryDate)
    || Number.isNaN(Date.parse(input.enquiryDate))
    || new Date(input.enquiryDate).toISOString().slice(0, 10) !== input.enquiryDate) throw new Error('Enter a valid enquiry date');
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Currency must be a three-letter code');
  const db = getDb();
  return db.transaction(async (tx) => {
    const [partner] = await tx.select({ id: partners.id }).from(partners)
      .where(and(eq(partners.id, input.partnerId), isNull(partners.deletedAt))).limit(1);
    if (!partner) throw new Error('Select an active partner');
    if (input.customerId) {
      const [customer] = await tx.select({ id: customers.id }).from(customers)
        .where(and(eq(customers.id, input.customerId), eq(customers.partnerId, input.partnerId), isNull(customers.deletedAt))).limit(1);
      if (!customer) throw new Error('The customer does not belong to the selected partner');
    }
    if (input.machineModelId) {
      const [model] = await tx.select({ id: machineModels.id }).from(machineModels)
        .where(and(eq(machineModels.id, input.machineModelId), eq(machineModels.isActive, true), isNull(machineModels.deletedAt))).limit(1);
      if (!model) throw new Error('Select an active machine model');
    }
    await tx.execute(sql`SELECT pg_advisory_xact_lock(21102026)`);
    const year = input.enquiryDate.slice(0, 4);
    const prefix = `Q-${year}-`;
    const [last] = await tx.select({ number: deals.dealNumber }).from(deals)
      .where(sql`${deals.dealNumber} LIKE ${`${prefix}%`}`)
      .orderBy(desc(deals.dealNumber)).limit(1);
    const sequence = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
    if (sequence > 9999) throw new Error('Deal number range is exhausted for this year');
    const dealNumber = `${prefix}${String(sequence).padStart(4, '0')}`;
    const [deal] = await tx.insert(deals).values({
      dealNumber, partnerId: input.partnerId, customerId: input.customerId || null,
      machineModelId: input.machineModelId || null, regionBand: input.regionBand,
      currency: input.currency, enquiryDate: input.enquiryDate, ownerId: actor.id,
      createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: deals.id, dealNumber: deals.dealNumber });
    return deal!;
  });
}

async function invalidateApprovals(tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0], quotationId: string, actorId: string) {
  await tx.delete(quotationApprovals).where(eq(quotationApprovals.quotationId, quotationId));
  await tx.delete(technicalProposals).where(eq(technicalProposals.quotationId, quotationId));
  await tx.update(quotations).set({ discountApprovedBy: null, discountApprovedAt: null, updatedAt: new Date(), updatedBy: actorId })
    .where(eq(quotations.id, quotationId));
}

async function refreshTotals(tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0], quotationId: string, actorId: string) {
  const lines = await tx.select({ quantity: quotationLines.quantity, unitPrice: quotationLines.unitPrice,
    lineDiscount: quotationLines.lineDiscount, isIncludedInTotal: quotationLines.isIncludedInTotal })
    .from(quotationLines).where(and(eq(quotationLines.quotationId, quotationId), isNull(quotationLines.deletedAt)));
  const totals = calculateTotals(lines);
  await tx.update(quotations).set({ ...totals, updatedAt: new Date(), updatedBy: actorId }).where(eq(quotations.id, quotationId));
  return totals;
}

export async function createQuotationRevision(dealId: string) {
  const actor = await requireRole(...editorialRoles);
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM deals WHERE id = ${dealId} FOR UPDATE`);
    const [deal] = await tx.select().from(deals).where(and(eq(deals.id, dealId), isNull(deals.deletedAt))).limit(1);
    if (!deal) throw new Error('Deal not found');
    const [prior] = await tx.select().from(quotations).where(eq(quotations.dealId, dealId))
      .orderBy(desc(quotations.revision)).limit(1);
    if (prior && prior.status === 'draft') throw new Error('Finish or edit the current draft before creating another revision');
    const today = taipeiDate();
    const [book] = await tx.select().from(priceBookVersions)
      .where(and(eq(priceBookVersions.isPublished, true), lte(priceBookVersions.effectiveFrom, today),
        or(isNull(priceBookVersions.effectiveTo), gte(priceBookVersions.effectiveTo, today)), isNull(priceBookVersions.deletedAt)))
      .orderBy(desc(priceBookVersions.effectiveFrom)).limit(1);
    if (!book) throw new Error('No published price book is effective today');
    const oldLines = prior ? await tx.select().from(quotationLines)
      .where(and(eq(quotationLines.quotationId, prior.id), isNull(quotationLines.deletedAt)))
      .orderBy(quotationLines.lineNo) : [];
    const currentPrices = new Map<string, string>();
    for (const old of oldLines) {
      const [price] = await tx.select({ amount: prices.amount }).from(prices)
        .where(and(eq(prices.priceBookVersionId, book.id), eq(prices.itemId, old.itemId),
          eq(prices.regionBand, deal.regionBand), eq(prices.currency, deal.currency))).limit(1);
      if (price) currentPrices.set(old.itemId, price.amount);
    }
    // Keep an editable draft on the prior book if an item disappeared. The user can
    // remove it, then refresh; issueQuotation still requires today's published book.
    const needsRemoval = oldLines.some((old) => !currentPrices.has(old.itemId));
    const [quote] = await tx.insert(quotations).values({
      dealId, revision: (prior?.revision ?? 0) + 1,
      priceBookVersionId: needsRemoval ? prior!.priceBookVersionId : book.id,
      paymentTerms: prior?.paymentTerms, deliveryTerms: prior?.deliveryTerms,
      // DECISION-PENDING: D4 — quoted lead time starts at deposit by default.
      leadTimeText: prior?.leadTimeText, leadTimeWeeksFrom: prior?.leadTimeWeeksFrom ?? 'deposit',
      leadTimeEndsAt: prior?.leadTimeEndsAt ?? 'ready_to_ship', incoterm: prior?.incoterm ?? 'FOB',
      // DECISION-PENDING: D5 — warranty defaults to 12 months, overridable per deal.
      warrantyMonths: prior?.warrantyMonths ?? 12, supersedesId: prior?.id,
      createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: quotations.id, revision: quotations.revision });
    if (prior) {
      for (const old of oldLines) {
        const calculated = calculateLine(old.quantity,
          needsRemoval ? old.unitPrice : currentPrices.get(old.itemId)!, old.lineDiscount, old.isIncludedInTotal);
        await tx.insert(quotationLines).values({
          quotationId: quote!.id, lineNo: old.lineNo, itemId: old.itemId, itemType: old.itemType,
          descriptionEn: old.descriptionEn, descriptionZh: old.descriptionZh,
          quantity: calculated.quantity, unitPrice: calculated.unitPrice,
          lineDiscount: calculated.lineDiscount, lineTotal: calculated.lineTotal,
          isIncludedInTotal: calculated.isIncludedInTotal, createdBy: actor.id, updatedBy: actor.id,
        });
      }
      await refreshTotals(tx, quote!.id, actor.id);
    }
    return quote!;
  });
}

export async function addQuotationLine(quotationId: string, input: { itemId: string; quantity: string; lineDiscount: string; included: boolean }) {
  const actor = await requireRole(...editorialRoles);
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM quotations WHERE id = ${quotationId} FOR UPDATE`);
    const [quote] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
    if (!quote || quote.status !== 'draft') throw new Error('Only a draft quotation can be edited');
    const [deal] = await tx.select().from(deals).where(eq(deals.id, quote.dealId)).limit(1);
    const [item] = await tx.select().from(items).where(and(eq(items.id, input.itemId), isNull(items.deletedAt))).limit(1);
    if (!item || !deal) throw new Error('Item or deal not found');
    const [price] = await tx.select({ amount: prices.amount }).from(prices)
      .where(and(eq(prices.priceBookVersionId, quote.priceBookVersionId), eq(prices.itemId, item.id),
        eq(prices.regionBand, deal.regionBand), eq(prices.currency, deal.currency))).limit(1);
    if (!price) throw new Error('This item has no price in the locked price book for this region and currency');
    const calculated = calculateLine(input.quantity, price.amount, input.lineDiscount, input.included);
    const [last] = await tx.select({ lineNo: quotationLines.lineNo }).from(quotationLines)
      .where(eq(quotationLines.quotationId, quotationId)).orderBy(desc(quotationLines.lineNo)).limit(1);
    await tx.insert(quotationLines).values({
      quotationId, lineNo: (last?.lineNo ?? 0) + 1, itemId: item.id,
      itemType: input.included ? item.itemType : 'excluded', descriptionEn: item.nameEn,
      descriptionZh: item.nameZh, quantity: calculated.quantity, unitPrice: calculated.unitPrice,
      lineDiscount: calculated.lineDiscount, lineTotal: calculated.lineTotal,
      isIncludedInTotal: calculated.isIncludedInTotal, createdBy: actor.id, updatedBy: actor.id,
    });
    await invalidateApprovals(tx, quotationId, actor.id);
    return refreshTotals(tx, quotationId, actor.id);
  });
}

export async function removeQuotationLine(lineId: string) {
  const actor = await requireRole(...editorialRoles);
  return getDb().transaction(async (tx) => {
    const [line] = await tx.select().from(quotationLines).where(eq(quotationLines.id, lineId)).limit(1);
    if (!line) throw new Error('Line not found');
    await tx.execute(sql`SELECT id FROM quotations WHERE id = ${line.quotationId} FOR UPDATE`);
    const [quote] = await tx.select().from(quotations).where(eq(quotations.id, line.quotationId)).limit(1);
    if (!quote || quote.status !== 'draft') throw new Error('Only a draft quotation can be edited');
    await tx.update(quotationLines).set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(quotationLines.id, lineId));
    await invalidateApprovals(tx, quote.id, actor.id);
    return refreshTotals(tx, quote.id, actor.id);
  });
}

export async function refreshDraftPriceBook(quotationId: string) {
  const actor = await requireRole(...editorialRoles);
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM quotations WHERE id = ${quotationId} FOR UPDATE`);
    const [quote] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
    if (!quote || quote.status !== 'draft') throw new Error('Only a draft can be repriced');
    const [deal] = await tx.select().from(deals).where(eq(deals.id, quote.dealId)).limit(1);
    if (!deal) throw new Error('Deal not found');
    const today = taipeiDate();
    const [book] = await tx.select().from(priceBookVersions)
      .where(and(eq(priceBookVersions.isPublished, true), lte(priceBookVersions.effectiveFrom, today),
        or(isNull(priceBookVersions.effectiveTo), gte(priceBookVersions.effectiveTo, today))))
      .orderBy(desc(priceBookVersions.effectiveFrom)).limit(1);
    if (!book) throw new Error('No published price book is effective today');
    if (book.id === quote.priceBookVersionId) return { changed: false };
    const lines = await tx.select().from(quotationLines)
      .where(and(eq(quotationLines.quotationId, quotationId), isNull(quotationLines.deletedAt)));
    for (const line of lines) {
      const [price] = await tx.select({ amount: prices.amount }).from(prices)
        .where(and(eq(prices.priceBookVersionId, book.id), eq(prices.itemId, line.itemId),
          eq(prices.regionBand, deal.regionBand), eq(prices.currency, deal.currency))).limit(1);
      if (!price) throw new Error(`A quotation item has no current ${deal.regionBand} ${deal.currency} price; remove it before repricing`);
      const calculated = calculateLine(line.quantity, price.amount, line.lineDiscount, line.isIncludedInTotal);
      await tx.update(quotationLines).set({ unitPrice: calculated.unitPrice, lineTotal: calculated.lineTotal,
        updatedAt: new Date(), updatedBy: actor.id }).where(eq(quotationLines.id, line.id));
    }
    await tx.update(quotations).set({ priceBookVersionId: book.id, updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(quotations.id, quotationId));
    await invalidateApprovals(tx, quotationId, actor.id);
    await refreshTotals(tx, quotationId, actor.id);
    return { changed: true };
  });
}

export async function saveQuotationTerms(quotationId: string, input: {
  paymentTerms: string; deliveryTerms: string; leadTimeText: string;
  leadTimeWeeksFrom: 'po' | 'deposit'; leadTimeEndsAt: 'ready_to_ship' | 'arrived';
  incoterm: 'EXW' | 'FOB' | 'CFR' | 'CIF' | 'CIP' | 'DAP' | 'DDP'; warrantyMonths: number;
}) {
  const actor = await requireRole(...editorialRoles);
  if (!Number.isInteger(input.warrantyMonths) || input.warrantyMonths < 0 || input.warrantyMonths > 120) throw new Error('Warranty months must be between 0 and 120');
  await getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM quotations WHERE id = ${quotationId} FOR UPDATE`);
    const [quote] = await tx.select({ status: quotations.status }).from(quotations).where(eq(quotations.id, quotationId)).limit(1);
    if (!quote || quote.status !== 'draft') throw new Error('Only a draft quotation can be edited');
    await tx.update(quotations).set({ ...input, updatedAt: new Date(), updatedBy: actor.id }).where(eq(quotations.id, quotationId));
    await tx.delete(technicalProposals).where(eq(technicalProposals.quotationId, quotationId));
  });
}

export async function recordDesignReview(quotationId: string, reviewerName: string, outcome: 'confirmed' | 'rejected', notes: string) {
  const actor = await requireRole('admin', 'manager');
  if (!reviewerName.trim()) throw new Error('Record the design reviewer name');
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM quotations WHERE id = ${quotationId} FOR UPDATE`);
    const [quote] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
    if (!quote || quote.status !== 'draft') throw new Error('Design review belongs to a draft revision');
    const [review] = await tx.insert(designReviews).values({
      dealId: quote.dealId, reviewedBy: reviewerName.trim(), reviewedAt: new Date(),
      outcome, notes, createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: designReviews.id });
    await tx.update(quotations).set({ designReviewId: review!.id, updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(quotations.id, quotationId));
    return review!;
  });
}

export async function attachTechnicalProposal(quotationId: string, bytes: Uint8Array) {
  const actor = await requireRole('admin', 'manager');
  if (bytes.byteLength < 100 || bytes.byteLength > 10_000_000 || Buffer.from(bytes.subarray(0, 5)).toString() !== '%PDF-') {
    throw new Error('Attach a PDF up to 10 MB for this revision');
  }
  try { await PDFDocument.load(bytes); }
  catch { throw new Error('The technical proposal PDF is damaged or unsupported'); }
  const pdfUrl = `/api/quotations/${quotationId}/technical-proposal/pdf`;
  const pdfBase64 = Buffer.from(bytes).toString('base64');
  await getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM quotations WHERE id = ${quotationId} FOR UPDATE`);
    const [quote] = await tx.select({ status: quotations.status }).from(quotations).where(eq(quotations.id, quotationId)).limit(1);
    if (!quote || quote.status !== 'draft') throw new Error('The proposal must be attached to a draft revision');
    await tx.insert(technicalProposals).values({ quotationId, pdfUrl, pdfBase64, createdBy: actor.id, updatedBy: actor.id })
      .onConflictDoUpdate({ target: technicalProposals.quotationId, set: { pdfUrl, pdfBase64, generatedAt: new Date(), updatedAt: new Date(), updatedBy: actor.id } });
  });
}

export async function approveQuotationDiscount(quotationId: string, stage: 'dept_manager' | 'gm') {
  const actor = await requireRole('admin', 'manager');
  if (stage === 'gm' && actor.department?.trim().toUpperCase() !== 'GM') throw new Error('Only the GM account may give final discount approval');
  if (stage === 'dept_manager' && actor.department?.trim().toUpperCase() === 'GM') throw new Error('Department manager approval must come first');
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM quotations WHERE id = ${quotationId} FOR UPDATE`);
    const [quote] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
    if (!quote || quote.status !== 'draft') throw new Error('Only a draft can be approved');
    if (Number(quote.discountAmount) <= 0) throw new Error('This quotation has no discount');
    const approvals = await tx.select().from(quotationApprovals).where(eq(quotationApprovals.quotationId, quotationId));
    if (approvals.some((approval) => approval.stage === stage)) throw new Error('This approval stage is already recorded');
    if (stage === 'gm') {
      const manager = approvals.find((approval) => approval.stage === 'dept_manager');
      if (!manager) throw new Error('The department manager must approve before the GM');
      if (manager.approvedBy === actor.id) throw new Error('Two different people must approve the discount');
    }
    await tx.insert(quotationApprovals).values({
      quotationId, stage, approvedBy: actor.id, createdBy: actor.id, updatedBy: actor.id,
    });
    if (stage === 'gm') await tx.update(quotations)
      .set({ discountApprovedBy: actor.id, discountApprovedAt: new Date(), updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(quotations.id, quotationId));
  });
}

export async function issueQuotation(quotationId: string) {
  const actor = await requireRole('admin', 'manager');
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM quotations WHERE id = ${quotationId} FOR UPDATE`);
    const [quote] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
    if (!quote || quote.status !== 'draft') throw new Error('Only a draft quotation can be issued');
    const today = taipeiDate();
    const [activeBook] = await tx.select({ id: priceBookVersions.id }).from(priceBookVersions)
      .where(and(eq(priceBookVersions.isPublished, true), lte(priceBookVersions.effectiveFrom, today),
        or(isNull(priceBookVersions.effectiveTo), gte(priceBookVersions.effectiveTo, today))))
      .orderBy(desc(priceBookVersions.effectiveFrom)).limit(1);
    if (!activeBook || activeBook.id !== quote.priceBookVersionId) {
      throw new Error('Refresh draft prices to the price book effective today before issuing');
    }
    const lines = await tx.select().from(quotationLines)
      .where(and(eq(quotationLines.quotationId, quotationId), isNull(quotationLines.deletedAt)));
    if (!lines.some((line) => line.isIncludedInTotal)) throw new Error('Add at least one included item before issuing');
    const [review] = quote.designReviewId ? await tx.select().from(designReviews)
      .where(and(eq(designReviews.id, quote.designReviewId), eq(designReviews.dealId, quote.dealId))).limit(1) : [];
    const [proposal] = await tx.select({ id: technicalProposals.id }).from(technicalProposals)
      .where(eq(technicalProposals.quotationId, quote.id)).limit(1);
    if (review?.outcome !== 'confirmed' || !proposal) throw new Error('G1: Confirmed design review and a technical proposal for this revision are required');
    const totals = calculateTotals(lines);
    if (Number(totals.discountAmount) > 0) {
      const approvals = await tx.select().from(quotationApprovals).where(eq(quotationApprovals.quotationId, quote.id));
      if (!quote.discountApprovedBy || !approvals.some((approval) => approval.stage === 'dept_manager')
        || !approvals.some((approval) => approval.stage === 'gm')) {
        throw new Error('G2: Department manager and GM discount approvals are required');
      }
    }
    const now = new Date();
    await tx.update(quotations).set({
      ...totals, status: 'issued', issuedAt: now, validUntil: addMonths(now, 3).toISOString().slice(0, 10),
      updatedAt: now, updatedBy: actor.id,
    }).where(eq(quotations.id, quotationId));
    if (quote.supersedesId) await tx.update(quotations)
      .set({ status: 'superseded', updatedAt: now, updatedBy: actor.id })
      .where(and(eq(quotations.id, quote.supersedesId), eq(quotations.status, 'issued')));
    await tx.update(deals).set({ salesStage: 'final_quotation', updatedAt: now, updatedBy: actor.id })
      .where(eq(deals.id, quote.dealId));
    return { quotationId, revision: quote.revision, ...totals };
  });
}
