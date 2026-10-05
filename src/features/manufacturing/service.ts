import 'server-only';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  attachments, dealSpecValues, deals, documentApprovals, documents, items, machineModels,
  orders, partnerComplianceProfiles, partners, progressReviews, quotationLines, specCategories,
  specSheetDistributions, specSheetLines, specSheets, users, workOrders,
} from '@/db/schema';
import { renderA4Pdf } from '@/documents/pdf';
import { renderMiHtml, renderSpecSheetHtml } from '@/documents/registry';
import type { MiDocument } from '@/documents/templates/mi/template';
import type { SpecSheetDocument } from '@/documents/templates/spec-sheet/template';
import { requireRole } from '@/lib/authorization';
import { dateUtc, progressDueDates } from '@/features/production/dates';

export async function createWorkOrderDraft(orderId: string, input: {
  batchNumber: string; plannedStart: string | null; plannedFinish: string | null;
  isProvisional: boolean; provisionalHoldStage: string;
}) {
  const actor = await requireRole('admin', 'manager');
  if (input.isProvisional && !input.provisionalHoldStage.trim()) {
    throw new Error('A provisional MI needs a hold stage');
  }
  return getDb().transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update').limit(1);
    if (!order?.poVerifiedAt) throw new Error('Verify the customer PO before preparing the MI');
    const [deal] = await tx.select().from(deals).where(eq(deals.id, order.dealId)).limit(1);
    if (!deal || deal.salesStage !== 'won') throw new Error('The deal must be won before preparing the MI');
    const [existing] = await tx.select({ id: workOrders.id }).from(workOrders)
      .where(eq(workOrders.orderId, orderId)).limit(1);
    if (existing) throw new Error('This order already has an MI draft');
    const values = await tx.select().from(dealSpecValues)
      .where(and(eq(dealSpecValues.dealId, deal.id), isNull(dealSpecValues.deletedAt)));
    if (!values.length || values.some((value) => value.sourceQuotationId !== order.sourceQuotationId)) {
      throw new Error('Generate and review configuration from the order quotation first');
    }
    const [workOrder] = await tx.insert(workOrders).values({
      orderId, miNumber: deal.dealNumber.replace(/^Q-/, 'M-'),
      batchNumber: input.batchNumber.trim() || null,
      plannedStart: input.plannedStart, plannedFinish: input.plannedFinish,
      productionStatus: '未結', isProvisional: input.isProvisional,
      provisionalHoldStage: input.isProvisional ? input.provisionalHoldStage.trim() : null,
      createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: workOrders.id });
    const [sheet] = await tx.insert(specSheets).values({
      workOrderId: workOrder!.id, revision: 1, createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: specSheets.id });
    const categories = await tx.select({ id: specCategories.id, sortOrder: specCategories.sortOrder })
      .from(specCategories);
    const sort = new Map(categories.map((category) => [category.id, category.sortOrder]));
    await tx.insert(specSheetLines).values(values.map((value) => ({
      specSheetId: sheet!.id, specCategoryId: value.specCategoryId,
      valueEn: value.valueEn, valueZh: value.valueZh,
      sortOrder: sort.get(value.specCategoryId) ?? 999,
      createdBy: actor.id, updatedBy: actor.id,
    })));
    return { workOrderId: workOrder!.id, specSheetId: sheet!.id };
  });
}

export async function getDealWorkOrder(dealId: string) {
  await requireRole('admin', 'manager', 'sales', 'logistics', 'service', 'viewer');
  const [row] = await getDb().select({ workOrder: workOrders, order: orders })
    .from(workOrders).innerJoin(orders, eq(orders.id, workOrders.orderId))
    .where(and(eq(orders.dealId, dealId), isNull(workOrders.deletedAt))).limit(1);
  return row ?? null;
}

export async function getWorkOrderSpecSheets(workOrderId: string) {
  await requireRole('admin', 'manager', 'sales', 'service', 'viewer');
  return getDb().select().from(specSheets).where(eq(specSheets.workOrderId, workOrderId))
    .orderBy(desc(specSheets.revision));
}

export async function refreshDraftSpecification(workOrderId: string) {
  const actor = await requireRole('admin', 'manager');
  await getDb().transaction(async (tx) => {
    const [work] = await tx.select().from(workOrders).where(eq(workOrders.id, workOrderId)).for('update').limit(1);
    if (!work) throw new Error('MI not found');
    const [sheet] = await tx.select().from(specSheets).where(eq(specSheets.workOrderId, workOrderId))
      .orderBy(desc(specSheets.revision)).for('update').limit(1);
    if (!sheet || sheet.issuedAt) throw new Error('Only the current draft specification can be refreshed');
    const [order] = await tx.select().from(orders).where(eq(orders.id, work.orderId)).limit(1);
    const values = await tx.select().from(dealSpecValues).where(and(
      eq(dealSpecValues.dealId, order!.dealId), isNull(dealSpecValues.deletedAt)));
    if (!values.length || values.some((value) => value.sourceQuotationId !== order!.sourceQuotationId)) {
      throw new Error('Review configuration against the order quotation before refreshing this revision');
    }
    const categories = await tx.select({ id: specCategories.id, sortOrder: specCategories.sortOrder }).from(specCategories);
    const sort = new Map(categories.map((category) => [category.id, category.sortOrder]));
    await tx.delete(specSheetLines).where(eq(specSheetLines.specSheetId, sheet.id));
    await tx.insert(specSheetLines).values(values.map((value) => ({
      specSheetId: sheet.id, specCategoryId: value.specCategoryId, valueEn: value.valueEn,
      valueZh: value.valueZh, sortOrder: sort.get(value.specCategoryId) ?? 999,
      createdBy: actor.id, updatedBy: actor.id,
    })));
    await tx.update(specSheets).set({ updatedAt: new Date(), updatedBy: actor.id }).where(eq(specSheets.id, sheet.id));
  });
}

export async function createSpecRevision(workOrderId: string) {
  const actor = await requireRole('admin', 'manager');
  return getDb().transaction(async (tx) => {
    const [work] = await tx.select().from(workOrders).where(eq(workOrders.id, workOrderId)).for('update').limit(1);
    if (!work?.issuedAt) throw new Error('Issue the MI and first specification before making a revision');
    const [previous] = await tx.select().from(specSheets).where(eq(specSheets.workOrderId, workOrderId))
      .orderBy(desc(specSheets.revision)).limit(1);
    if (!previous?.issuedAt) throw new Error('Issue the current specification revision first');
    const [order] = await tx.select().from(orders).where(eq(orders.id, work.orderId)).limit(1);
    const values = await tx.select().from(dealSpecValues).where(and(
      eq(dealSpecValues.dealId, order!.dealId), isNull(dealSpecValues.deletedAt)));
    if (!values.length || values.some((value) => value.sourceQuotationId !== order!.sourceQuotationId)) {
      throw new Error('Review configuration against the order quotation before making a revision');
    }
    const categories = await tx.select({ id: specCategories.id, sortOrder: specCategories.sortOrder }).from(specCategories);
    const sort = new Map(categories.map((category) => [category.id, category.sortOrder]));
    const [sheet] = await tx.insert(specSheets).values({
      workOrderId, revision: previous.revision + 1, createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: specSheets.id, revision: specSheets.revision });
    await tx.insert(specSheetLines).values(values.map((value) => ({
      specSheetId: sheet!.id, specCategoryId: value.specCategoryId, valueEn: value.valueEn,
      valueZh: value.valueZh, sortOrder: sort.get(value.specCategoryId) ?? 999,
      createdBy: actor.id, updatedBy: actor.id,
    })));
    return sheet!;
  });
}

export async function uploadCustomChangeImage(dealId: string, specSheetId: string, filename: string, bytes: Uint8Array) {
  const actor = await requireRole('admin', 'manager', 'sales');
  if (bytes.length < 100 || bytes.length > 10_000_000) throw new Error('Choose a PNG or JPEG image up to 10 MB');
  const png = bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!png && !jpeg) throw new Error('Custom change references must be PNG or JPEG images');
  return getDb().transaction(async (tx) => {
    const [sheet] = await tx.select({ id: specSheets.id, issuedAt: specSheets.issuedAt,
      dealId: orders.dealId }).from(specSheets)
      .innerJoin(workOrders, eq(workOrders.id, specSheets.workOrderId))
      .innerJoin(orders, eq(orders.id, workOrders.orderId))
      .where(eq(specSheets.id, specSheetId)).limit(1);
    if (!sheet || sheet.dealId !== dealId || sheet.issuedAt) throw new Error('Select the current draft specification revision');
    const [attachment] = await tx.insert(attachments).values({
      dealId, group: 'manufacturing', kind: 'custom_change_image',
      specSheetId, fileUrl: 'pending', filename: filename.trim() || 'custom-change-image',
      mimeType: png ? 'image/png' : 'image/jpeg', fileBase64: Buffer.from(bytes).toString('base64'),
      uploadedBy: actor.id, createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: attachments.id });
    await tx.update(attachments).set({ fileUrl: `/api/attachments/${attachment!.id}` })
      .where(eq(attachments.id, attachment!.id));
    return attachment!;
  });
}

async function loadManufacturingDocuments(workOrderId: string, sheetId: string, issuedAt: Date) {
  const db = getDb();
  const [row] = await db.select({
    workOrder: workOrders, order: orders, deal: deals, partner: partners,
    model: machineModels, preparer: users,
  }).from(workOrders).innerJoin(orders, eq(orders.id, workOrders.orderId))
    .innerJoin(deals, eq(deals.id, orders.dealId))
    .innerJoin(partners, eq(partners.id, deals.partnerId))
    .leftJoin(machineModels, eq(machineModels.id, deals.machineModelId))
    .innerJoin(users, eq(users.id, workOrders.createdBy))
    .where(eq(workOrders.id, workOrderId)).limit(1);
  const [sheet] = await db.select().from(specSheets).where(eq(specSheets.id, sheetId)).limit(1);
  if (!row || !sheet || sheet.workOrderId !== workOrderId || !row.model) throw new Error('MI source records are incomplete');
  const [profile] = await db.select({ complete: partnerComplianceProfiles.isComplete })
    .from(partnerComplianceProfiles).where(eq(partnerComplianceProfiles.partnerId, row.deal.partnerId)).limit(1);
  if (!profile?.complete) throw new Error('G4: Complete the agent destination and compliance profile before issuing the MI');
  const compliance = await db.select({ code: specCategories.code }).from(dealSpecValues)
    .innerJoin(specCategories, eq(specCategories.id, dealSpecValues.specCategoryId))
    .where(and(eq(dealSpecValues.dealId, row.deal.id), isNull(dealSpecValues.deletedAt)));
  if (!['electrical', 'compliance', 'colour'].every((code) => compliance.some((value) => value.code === code))) {
    throw new Error('G4: Copy the complete destination values into the deal configuration before issuing the MI');
  }
  const unbound = await db.select({ id: attachments.id }).from(attachments)
    .where(and(eq(attachments.dealId, row.deal.id), eq(attachments.kind, 'custom_change_image'), isNull(attachments.specSheetId), isNull(attachments.deletedAt)));
  if (unbound.length) throw new Error('G11: Bind every custom change image to the current specification revision');
  const bound = await db.select({ id: attachments.id, filename: attachments.filename }).from(attachments)
    .where(and(eq(attachments.specSheetId, sheet.id), eq(attachments.kind, 'custom_change_image'), isNull(attachments.deletedAt)));
  const quoteLines = await db.select({
    lineNo: quotationLines.lineNo, itemCode: items.code, nameZh: quotationLines.descriptionZh,
    unit: items.unit, quantity: quotationLines.quantity, itemType: quotationLines.itemType,
    included: quotationLines.isIncludedInTotal,
  }).from(quotationLines).innerJoin(items, eq(items.id, quotationLines.itemId))
    .where(and(eq(quotationLines.quotationId, row.order.sourceQuotationId), isNull(quotationLines.deletedAt)))
    .orderBy(quotationLines.lineNo);
  const specs = await db.select({ categoryZh: specCategories.nameZh, valueZh: specSheetLines.valueZh,
    sortOrder: specSheetLines.sortOrder })
    .from(specSheetLines).innerJoin(specCategories, eq(specCategories.id, specSheetLines.specCategoryId))
    .where(eq(specSheetLines.specSheetId, sheet.id)).orderBy(asc(specSheetLines.sortOrder));
  if (!specs.length) throw new Error('The manufacturing specification sheet has no values');
  const common = {
    dealNumber: row.deal.dealNumber, piNumber: row.order.piNumber,
    miNumber: row.workOrder.miNumber, issuedAt,
    partnerCode: row.partner.code, partnerName: row.partner.name,
    modelCode: row.model.code, modelNameZh: row.model.nameZh,
    batchNumber: row.workOrder.batchNumber, preparedBy: row.preparer.name,
    customImageCount: bound.length, customImageNames: bound.map((image) => image.filename),
  };
  const mi: MiDocument = {
    ...common, plannedStart: row.workOrder.plannedStart,
    plannedFinish: row.workOrder.plannedFinish,
    productionStatus: row.workOrder.productionStatus ?? '未結',
    isProvisional: row.workOrder.isProvisional,
    provisionalHoldStage: row.workOrder.provisionalHoldStage,
    lines: quoteLines.filter((line) => line.included && ['machine', 'spec_change', 'accessory'].includes(line.itemType))
      .map((line) => ({ lineNo: line.lineNo, itemCode: line.itemCode,
        nameZh: line.nameZh, unit: line.unit, quantity: line.quantity })),
  };
  const spec: SpecSheetDocument = {
    ...common, revision: sheet.revision, neededAt: row.workOrder.plannedFinish,
    quantity: mi.lines.find((line) => line.itemCode === row.model!.code)?.quantity ?? '1',
    specs: specs.map(({ categoryZh, valueZh }) => ({ categoryZh, valueZh })),
  };
  return { mi, spec, dealId: row.deal.id, sheet };
}

export async function issueWorkOrder(workOrderId: string, contractualDeliveryDate: string) {
  const actor = await requireRole('admin', 'manager');
  dateUtc(contractualDeliveryDate);
  const [sheet] = await getDb().select().from(specSheets)
    .where(eq(specSheets.workOrderId, workOrderId)).orderBy(desc(specSheets.revision)).limit(1);
  if (!sheet || sheet.revision !== 1 || sheet.issuedAt) throw new Error('Prepare a draft MI and 版次 1 specification first');
  const issuedAt = new Date();
  const data = await loadManufacturingDocuments(workOrderId, sheet.id, issuedAt);
  if (!data.mi.isProvisional && !data.mi.plannedFinish) throw new Error('Enter a planned finish date before issuing the MI');
  const [miPdf, specPdf] = await Promise.all([
    renderA4Pdf(await renderMiHtml(data.mi), {
      dealNumber: data.mi.dealNumber, revision: 1, issueDate: issuedAt.toISOString().slice(0, 10),
    }),
    renderA4Pdf(await renderSpecSheetHtml(data.spec), {
      dealNumber: data.spec.dealNumber, revision: data.spec.revision, issueDate: issuedAt.toISOString().slice(0, 10),
    }),
  ]);
  return getDb().transaction(async (tx) => {
    const [locked] = await tx.select().from(workOrders).where(eq(workOrders.id, workOrderId)).for('update').limit(1);
    const [currentSheet] = await tx.select().from(specSheets).where(eq(specSheets.id, sheet.id)).for('update').limit(1);
    if (!locked || locked.issuedAt || !currentSheet || currentSheet.issuedAt) throw new Error('MI issue state changed; reload and try again');
    const [order] = await tx.select().from(orders).where(eq(orders.id, locked.orderId)).for('update').limit(1);
    if (!order) throw new Error('Order not found');
    if (order.contractualDeliveryDate && order.contractualDeliveryDate !== contractualDeliveryDate) {
      throw new Error('The contractual delivery date changed; reload before issuing the MI');
    }
    if (progressDueDates(issuedAt, contractualDeliveryDate).length === 0) {
      throw new Error('Contractual delivery date is too far before MI issue for monthly reviews');
    }
    const [deal] = await tx.select({ partnerId: deals.partnerId }).from(deals)
      .where(eq(deals.id, data.dealId)).limit(1);
    const [currentProfile] = deal ? await tx.select({ complete: partnerComplianceProfiles.isComplete })
      .from(partnerComplianceProfiles).where(eq(partnerComplianceProfiles.partnerId, deal.partnerId)).limit(1) : [];
    if (!currentProfile?.complete) throw new Error('G4: Destination profile changed before MI issue');
    const unbound = await tx.select({ id: attachments.id }).from(attachments)
      .where(and(eq(attachments.dealId, data.dealId), eq(attachments.kind, 'custom_change_image'),
        isNull(attachments.specSheetId), isNull(attachments.deletedAt)));
    if (unbound.length) throw new Error('G11: Bind every custom image to a specification revision');
    const [miDoc] = await tx.insert(documents).values({
      dealId: data.dealId, docType: 'mi', docNumber: locked.miNumber, revision: 1,
      language: 'zh_hant', status: 'issued', pdfUrl: 'pending',
      pdfBase64: Buffer.from(miPdf).toString('base64'), generatedAt: issuedAt,
      createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: documents.id });
    const [specDoc] = await tx.insert(documents).values({
      dealId: data.dealId, docType: 'spec_sheet', docNumber: locked.miNumber,
      revision: 1, language: 'zh_hant', status: 'issued', pdfUrl: 'pending',
      pdfBase64: Buffer.from(specPdf).toString('base64'), generatedAt: issuedAt,
      createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: documents.id });
    await tx.update(documents).set({ pdfUrl: `/api/documents/${miDoc!.id}/pdf` }).where(eq(documents.id, miDoc!.id));
    await tx.update(documents).set({ pdfUrl: `/api/documents/${specDoc!.id}/pdf` }).where(eq(documents.id, specDoc!.id));
    await tx.insert(documentApprovals).values([
      { documentId: miDoc!.id, approvalType: 'supervisor', required: true, createdBy: actor.id, updatedBy: actor.id },
      { documentId: specDoc!.id, approvalType: 'supervisor', required: true, createdBy: actor.id, updatedBy: actor.id },
    ]);
    await tx.update(workOrders).set({ issuedAt, documentId: miDoc!.id, updatedAt: issuedAt,
      updatedBy: actor.id }).where(eq(workOrders.id, workOrderId));
    await tx.update(orders).set({ contractualDeliveryDate, updatedAt: issuedAt, updatedBy: actor.id })
      .where(eq(orders.id, order.id));
    await tx.insert(progressReviews).values(progressDueDates(issuedAt, contractualDeliveryDate).map((dueDate, index) => ({
      workOrderId, sequence: index + 1, dueDate, createdBy: actor.id, updatedBy: actor.id,
    })));
    await tx.update(specSheets).set({ issuedAt, documentId: specDoc!.id,
      updatedAt: issuedAt, updatedBy: actor.id }).where(eq(specSheets.id, sheet.id));
    await tx.update(deals).set({ projectStage: 'work_order_released', updatedAt: issuedAt,
      updatedBy: actor.id }).where(eq(deals.id, data.dealId));
    return { miDocumentId: miDoc!.id, specDocumentId: specDoc!.id };
  });
}

export async function issueSpecRevision(workOrderId: string) {
  const actor = await requireRole('admin', 'manager');
  const [sheet] = await getDb().select().from(specSheets).where(eq(specSheets.workOrderId, workOrderId))
    .orderBy(desc(specSheets.revision)).limit(1);
  if (!sheet || sheet.revision < 2 || sheet.issuedAt) throw new Error('Prepare an unissued specification revision first');
  const issuedAt = new Date();
  const data = await loadManufacturingDocuments(workOrderId, sheet.id, issuedAt);
  const specPdf = await renderA4Pdf(await renderSpecSheetHtml(data.spec), {
    dealNumber: data.spec.dealNumber, revision: sheet.revision, issueDate: issuedAt.toISOString().slice(0, 10),
  });
  return getDb().transaction(async (tx) => {
    const [work] = await tx.select().from(workOrders).where(eq(workOrders.id, workOrderId)).for('update').limit(1);
    const [current] = await tx.select().from(specSheets).where(eq(specSheets.id, sheet.id)).for('update').limit(1);
    if (!work?.issuedAt || !current || current.issuedAt) throw new Error('Specification issue state changed; reload');
    const [latest] = await tx.select({ id: specSheets.id }).from(specSheets)
      .where(eq(specSheets.workOrderId, workOrderId)).orderBy(desc(specSheets.revision)).limit(1);
    if (latest?.id !== sheet.id) throw new Error('A newer specification revision exists');
    const [deal] = await tx.select({ partnerId: deals.partnerId }).from(deals).where(eq(deals.id, data.dealId)).limit(1);
    const [profile] = deal ? await tx.select({ complete: partnerComplianceProfiles.isComplete })
      .from(partnerComplianceProfiles).where(eq(partnerComplianceProfiles.partnerId, deal.partnerId)).limit(1) : [];
    if (!profile?.complete) throw new Error('G4: Destination profile changed before specification issue');
    const unbound = await tx.select({ id: attachments.id }).from(attachments).where(and(
      eq(attachments.dealId, data.dealId), eq(attachments.kind, 'custom_change_image'),
      isNull(attachments.specSheetId), isNull(attachments.deletedAt)));
    if (unbound.length) throw new Error('G11: Bind every custom image to a specification revision');
    const [document] = await tx.insert(documents).values({
      dealId: data.dealId, docType: 'spec_sheet', docNumber: work.miNumber,
      revision: sheet.revision, language: 'zh_hant', status: 'issued', pdfUrl: 'pending',
      pdfBase64: Buffer.from(specPdf).toString('base64'), generatedAt: issuedAt,
      createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: documents.id });
    await tx.update(documents).set({ pdfUrl: `/api/documents/${document!.id}/pdf` }).where(eq(documents.id, document!.id));
    await tx.insert(documentApprovals).values({ documentId: document!.id, approvalType: 'supervisor',
      required: true, createdBy: actor.id, updatedBy: actor.id });
    const [previous] = await tx.select().from(specSheets).where(and(
      eq(specSheets.workOrderId, workOrderId), eq(specSheets.revision, sheet.revision - 1))).limit(1);
    if (previous) {
      await tx.update(specSheets).set({ supersededAt: issuedAt, updatedAt: issuedAt, updatedBy: actor.id })
        .where(eq(specSheets.id, previous.id));
      if (previous.documentId) await tx.update(documents).set({ status: 'superseded', updatedAt: issuedAt,
        updatedBy: actor.id }).where(eq(documents.id, previous.documentId));
    }
    await tx.update(specSheets).set({ issuedAt, documentId: document!.id, updatedAt: issuedAt,
      updatedBy: actor.id }).where(eq(specSheets.id, sheet.id));
    return document!.id;
  });
}

export async function recordSpecSheetDistribution(sheetId: string, department: string) {
  const actor = await requireRole('admin', 'manager');
  if (!['生管', '採購', '製造'].includes(department)) throw new Error('Choose a receiving department');
  const [sheet] = await getDb().select({ issuedAt: specSheets.issuedAt }).from(specSheets)
    .where(eq(specSheets.id, sheetId)).limit(1);
  if (!sheet?.issuedAt) throw new Error('Issue the specification before recording distribution');
  await getDb().insert(specSheetDistributions).values({
    specSheetId: sheetId, department, distributedAt: new Date(),
    createdBy: actor.id, updatedBy: actor.id,
  }).onConflictDoNothing();
}

export async function getSpecSheetDistributions(sheetId: string) {
  await requireRole('admin', 'manager', 'sales', 'service', 'viewer');
  return getDb().select().from(specSheetDistributions)
    .where(eq(specSheetDistributions.specSheetId, sheetId));
}

export async function acknowledgeSpecSheetDistribution(distributionId: string) {
  const actor = await requireRole('admin', 'manager');
  const [distribution] = await getDb().select().from(specSheetDistributions)
    .where(eq(specSheetDistributions.id, distributionId)).limit(1);
  if (!distribution?.distributedAt || distribution.acknowledgedAt) {
    throw new Error('This paper copy is not awaiting acknowledgement');
  }
  await getDb().update(specSheetDistributions).set({
    acknowledgedAt: new Date(), updatedAt: new Date(), updatedBy: actor.id,
  }).where(eq(specSheetDistributions.id, distributionId));
}
