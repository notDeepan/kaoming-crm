import 'server-only';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  dealSpecValues, deals, items, machineModels, partnerComplianceProfiles,
  quotationLines, quotations, specCategories,
} from '@/db/schema';
import { requireRole } from '@/lib/authorization';
import { resolveConfiguration } from './resolve';

const editorRoles = ['admin', 'manager', 'sales'] as const;

export async function generateDealConfiguration(dealId: string, replaceManual = false) {
  const actor = await requireRole(...editorRoles);
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM deals WHERE id = ${dealId} FOR UPDATE`);
    const [deal] = await tx.select().from(deals).where(and(eq(deals.id, dealId), isNull(deals.deletedAt))).limit(1);
    if (!deal) throw new Error('Deal not found');
    const [quote] = await tx.select().from(quotations)
      .where(and(eq(quotations.dealId, dealId), eq(quotations.status, 'issued')))
      .orderBy(desc(quotations.revision)).limit(1);
    if (!quote) throw new Error('Issue the final quotation before generating the factory configuration');
    const [model] = deal.machineModelId ? await tx.select().from(machineModels)
      .where(eq(machineModels.id, deal.machineModelId)).limit(1) : [];
    if (!model) throw new Error('Select the machine model before generating its configuration');
    const [profile] = await tx.select().from(partnerComplianceProfiles)
      .where(and(eq(partnerComplianceProfiles.partnerId, deal.partnerId), isNull(partnerComplianceProfiles.deletedAt))).limit(1);
    const lines = await tx.select({
      itemId: quotationLines.itemId, itemType: quotationLines.itemType,
      descriptionEn: quotationLines.descriptionEn, descriptionZh: quotationLines.descriptionZh,
      included: quotationLines.isIncludedInTotal,
      specOverride: items.specOverride, categoryCode: specCategories.code,
    }).from(quotationLines)
      .innerJoin(items, eq(items.id, quotationLines.itemId))
      .leftJoin(specCategories, eq(specCategories.id, items.specCategoryId))
      .where(and(eq(quotationLines.quotationId, quote.id), isNull(quotationLines.deletedAt)))
      .orderBy(quotationLines.lineNo);
    if (!lines.some((line) => line.itemType === 'machine' && line.included)) {
      throw new Error('The issued quotation needs an included machine line');
    }
    const resolved = resolveConfiguration(model.baseSpecs, lines, profile ?? null);
    if (!resolved.length) throw new Error('The model has no source specifications to resolve');
    const categories = await tx.select({ id: specCategories.id, code: specCategories.code })
      .from(specCategories).where(isNull(specCategories.deletedAt));
    const categoryIds = new Map(categories.map((category) => [category.code, category.id]));
    for (const spec of resolved) {
      if (!categoryIds.has(spec.categoryCode)) throw new Error(`Unknown specification category ${spec.categoryCode}`);
    }
    const existing = await tx.select().from(dealSpecValues).where(eq(dealSpecValues.dealId, dealId));
    if (!replaceManual && existing.some((value) => value.source === 'manual' && value.sourceQuotationId !== quote.id)) {
      throw new Error('Manual configuration edits from an earlier quotation need review before replacing them');
    }
    const now = new Date();
    const currentCodes = new Set(resolved.map((spec) => spec.categoryCode));
    for (const row of existing) {
      const code = categories.find((category) => category.id === row.specCategoryId)?.code;
      if (code && !currentCodes.has(code) && (replaceManual || row.source !== 'manual')) {
        await tx.update(dealSpecValues).set({ deletedAt: now, updatedAt: now, updatedBy: actor.id })
          .where(eq(dealSpecValues.id, row.id));
      }
    }
    for (const spec of resolved) {
      const previous = existing.find((row) => row.specCategoryId === categoryIds.get(spec.categoryCode));
      if (previous?.source === 'manual' && !replaceManual && previous.sourceQuotationId === quote.id) continue;
      await tx.insert(dealSpecValues).values({
        dealId, specCategoryId: categoryIds.get(spec.categoryCode)!,
        valueEn: spec.valueEn, valueZh: spec.valueZh, isUpgraded: spec.isUpgraded,
        source: spec.source, sourceQuotationId: quote.id, sourceItemIds: spec.sourceItemIds,
        createdBy: actor.id, updatedBy: actor.id,
      }).onConflictDoUpdate({
        target: [dealSpecValues.dealId, dealSpecValues.specCategoryId],
        set: {
          valueEn: spec.valueEn, valueZh: spec.valueZh, isUpgraded: spec.isUpgraded,
          source: spec.source, sourceQuotationId: quote.id, sourceItemIds: spec.sourceItemIds,
          deletedAt: null, updatedAt: now, updatedBy: actor.id,
        },
      });
    }
    return { quotationId: quote.id, count: resolved.length };
  });
}

export async function saveManualSpecValue(dealId: string, categoryId: string, valueEn: string, valueZh: string) {
  const actor = await requireRole(...editorRoles);
  if (!valueEn.trim() || !valueZh.trim()) throw new Error('Both English and Chinese specification values are required');
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM deals WHERE id = ${dealId} FOR UPDATE`);
    const [category] = await tx.select({ id: specCategories.id }).from(specCategories)
      .where(and(eq(specCategories.id, categoryId), isNull(specCategories.deletedAt))).limit(1);
    const [quote] = await tx.select({ id: quotations.id }).from(quotations)
      .where(and(eq(quotations.dealId, dealId), eq(quotations.status, 'issued')))
      .orderBy(desc(quotations.revision)).limit(1);
    if (!category || !quote) throw new Error('Issue a quotation and select an active specification category');
    await tx.insert(dealSpecValues).values({
      dealId, specCategoryId: category.id, valueEn: valueEn.trim(), valueZh: valueZh.trim(),
      source: 'manual', sourceQuotationId: quote.id, createdBy: actor.id, updatedBy: actor.id,
    }).onConflictDoUpdate({
      target: [dealSpecValues.dealId, dealSpecValues.specCategoryId],
      set: {
        valueEn: valueEn.trim(), valueZh: valueZh.trim(), source: 'manual',
        sourceQuotationId: quote.id, deletedAt: null, updatedAt: new Date(), updatedBy: actor.id,
      },
    });
  });
}

export async function listDealConfiguration(dealId: string) {
  await requireRole('admin', 'manager', 'sales', 'service', 'viewer');
  return getDb().select({
    id: dealSpecValues.id, categoryId: specCategories.id, code: specCategories.code,
    nameEn: specCategories.nameEn, nameZh: specCategories.nameZh,
    sortOrder: specCategories.sortOrder, valueEn: dealSpecValues.valueEn,
    valueZh: dealSpecValues.valueZh, source: dealSpecValues.source,
    isUpgraded: dealSpecValues.isUpgraded, sourceQuotationId: dealSpecValues.sourceQuotationId,
  }).from(dealSpecValues)
    .innerJoin(specCategories, eq(specCategories.id, dealSpecValues.specCategoryId))
    .where(and(eq(dealSpecValues.dealId, dealId), isNull(dealSpecValues.deletedAt)))
    .orderBy(specCategories.sortOrder);
}
