import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { deals, items } from '@/db/schema';
import { getDeal, getQuotationDetail } from '@/features/deals/queries';
import type { QuotationDocument } from './templates/quotation/template';

export async function loadQuotationDocument(quotationId: string): Promise<QuotationDocument | null> {
  const detail = await getQuotationDetail(quotationId);
  if (!detail) return null;
  const deal = await getDeal(detail.quote.dealId);
  if (!deal) return null;
  const standard = deal.modelCode ? await getDb().select({ name: items.nameEn }).from(items)
    .innerJoin(deals, eq(deals.machineModelId, items.machineModelId))
    .where(and(eq(deals.id, deal.id), eq(items.isStandardAccessory, true), isNull(items.deletedAt))) : [];
  return {
    dealNumber: deal.dealNumber, revision: detail.quote.revision,
    issuedDate: detail.quote.issuedAt?.toISOString().slice(0, 10) ?? 'Draft',
    validUntil: detail.quote.validUntil, partnerName: deal.partnerName,
    customerName: deal.customerName, modelName: deal.modelName, modelCode: deal.modelCode,
    currency: deal.currency, priceBookName: detail.quote.priceBookName,
    paymentTerms: detail.quote.paymentTerms, deliveryTerms: detail.quote.deliveryTerms,
    leadTimeText: detail.quote.leadTimeText, incoterm: detail.quote.incoterm,
    warrantyMonths: detail.quote.warrantyMonths, listTotal: detail.quote.listTotal,
    discountAmount: detail.quote.discountAmount, netTotal: detail.quote.netTotal,
    draft: detail.quote.status === 'draft',
    lines: detail.lines.map((line) => ({
      lineNo: line.lineNo, itemCode: line.itemCode, itemType: line.itemType,
      descriptionEn: line.descriptionEn, quantity: line.quantity, unitPrice: line.unitPrice,
      lineDiscount: line.lineDiscount, lineTotal: line.lineTotal, included: line.isIncludedInTotal,
    })),
    standardAccessories: standard.map((row) => row.name),
  };
}
