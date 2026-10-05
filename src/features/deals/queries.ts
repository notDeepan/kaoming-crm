import 'server-only';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  customers, deals, designReviews, items, machineModels, partners, priceBookVersions,
  prices, quotationApprovals, quotationLines, quotations, technicalProposals,
} from '@/db/schema';

export async function listDeals() {
  return getDb().select({
    id: deals.id, dealNumber: deals.dealNumber, salesStage: deals.salesStage,
    enquiryDate: deals.enquiryDate, regionBand: deals.regionBand, currency: deals.currency,
    partnerName: partners.name, modelCode: machineModels.code, customerName: customers.name,
  }).from(deals)
    .innerJoin(partners, eq(partners.id, deals.partnerId))
    .leftJoin(machineModels, eq(machineModels.id, deals.machineModelId))
    .leftJoin(customers, eq(customers.id, deals.customerId))
    .where(isNull(deals.deletedAt)).orderBy(desc(deals.createdAt));
}

export async function getDeal(id: string) {
  const [deal] = await getDb().select({
    id: deals.id, dealNumber: deals.dealNumber, partnerId: deals.partnerId,
    partnerName: partners.name, customerName: customers.name, modelName: machineModels.nameEn,
    modelCode: machineModels.code, salesStage: deals.salesStage, enquiryDate: deals.enquiryDate,
    regionBand: deals.regionBand, currency: deals.currency,
  }).from(deals)
    .innerJoin(partners, eq(partners.id, deals.partnerId))
    .leftJoin(machineModels, eq(machineModels.id, deals.machineModelId))
    .leftJoin(customers, eq(customers.id, deals.customerId))
    .where(and(eq(deals.id, id), isNull(deals.deletedAt))).limit(1);
  return deal;
}

export async function listQuoteRevisions(dealId: string) {
  return getDb().select({
    id: quotations.id, revision: quotations.revision, status: quotations.status,
    createdAt: quotations.createdAt, issuedAt: quotations.issuedAt,
    listTotal: quotations.listTotal, discountAmount: quotations.discountAmount,
    netTotal: quotations.netTotal, priceBookName: priceBookVersions.name,
  }).from(quotations)
    .innerJoin(priceBookVersions, eq(priceBookVersions.id, quotations.priceBookVersionId))
    .where(and(eq(quotations.dealId, dealId), isNull(quotations.deletedAt)))
    .orderBy(desc(quotations.revision));
}

export async function getQuotationDetail(id: string) {
  const [quote] = await getDb().select({
    id: quotations.id, dealId: quotations.dealId, revision: quotations.revision,
    status: quotations.status, priceBookVersionId: quotations.priceBookVersionId,
    priceBookName: priceBookVersions.name, issuedAt: quotations.issuedAt,
    validUntil: quotations.validUntil, paymentTerms: quotations.paymentTerms,
    deliveryTerms: quotations.deliveryTerms, leadTimeText: quotations.leadTimeText,
    leadTimeWeeksFrom: quotations.leadTimeWeeksFrom, leadTimeEndsAt: quotations.leadTimeEndsAt,
    incoterm: quotations.incoterm, warrantyMonths: quotations.warrantyMonths,
    listTotal: quotations.listTotal, discountAmount: quotations.discountAmount,
    netTotal: quotations.netTotal, designReviewId: quotations.designReviewId,
    discountApprovedBy: quotations.discountApprovedBy,
  }).from(quotations).innerJoin(priceBookVersions, eq(priceBookVersions.id, quotations.priceBookVersionId))
    .where(and(eq(quotations.id, id), isNull(quotations.deletedAt))).limit(1);
  if (!quote) return null;
  const [lines, reviews, approvals, proposals] = await Promise.all([
    getDb().select({
      id: quotationLines.id, lineNo: quotationLines.lineNo, itemCode: items.code,
      itemType: quotationLines.itemType, descriptionEn: quotationLines.descriptionEn,
      descriptionZh: quotationLines.descriptionZh, quantity: quotationLines.quantity,
      unitPrice: quotationLines.unitPrice, lineDiscount: quotationLines.lineDiscount,
      lineTotal: quotationLines.lineTotal, isIncludedInTotal: quotationLines.isIncludedInTotal,
    }).from(quotationLines).innerJoin(items, eq(items.id, quotationLines.itemId))
      .where(and(eq(quotationLines.quotationId, id), isNull(quotationLines.deletedAt)))
      .orderBy(asc(quotationLines.lineNo)),
    quote.designReviewId ? getDb().select().from(designReviews).where(eq(designReviews.id, quote.designReviewId)) : Promise.resolve([]),
    getDb().select({ stage: quotationApprovals.stage, approvedAt: quotationApprovals.approvedAt })
      .from(quotationApprovals).where(eq(quotationApprovals.quotationId, id)),
    getDb().select({ pdfUrl: technicalProposals.pdfUrl }).from(technicalProposals)
      .where(eq(technicalProposals.quotationId, id)).limit(1),
  ]);
  return { quote, lines, review: reviews[0] ?? null, approvals, proposal: proposals[0] ?? null };
}

export async function listDealFormOptions() {
  const [partnerRows, customerRows, modelRows] = await Promise.all([
    getDb().select({ id: partners.id, name: partners.name, code: partners.code })
      .from(partners).where(isNull(partners.deletedAt)).orderBy(partners.name),
    getDb().select({ id: customers.id, name: customers.name, partnerId: customers.partnerId })
      .from(customers).where(isNull(customers.deletedAt)).orderBy(customers.name),
    getDb().select({ id: machineModels.id, code: machineModels.code, name: machineModels.nameEn })
      .from(machineModels).where(and(eq(machineModels.isActive, true), isNull(machineModels.deletedAt))).orderBy(machineModels.code),
  ]);
  return { partners: partnerRows, customers: customerRows, models: modelRows };
}

export async function listPricedItems(quoteId: string) {
  const [quote] = await getDb().select({ bookId: quotations.priceBookVersionId, dealId: quotations.dealId })
    .from(quotations).where(eq(quotations.id, quoteId)).limit(1);
  if (!quote) return [];
  const [deal] = await getDb().select({ regionBand: deals.regionBand, currency: deals.currency })
    .from(deals).where(eq(deals.id, quote.dealId)).limit(1);
  if (!deal) return [];
  return getDb().select({ id: items.id, code: items.code, nameEn: items.nameEn, amount: prices.amount })
    .from(prices).innerJoin(items, eq(items.id, prices.itemId))
    .where(and(eq(prices.priceBookVersionId, quote.bookId), eq(prices.regionBand, deal.regionBand),
      eq(prices.currency, deal.currency), isNull(items.deletedAt)))
    .orderBy(items.code);
}
