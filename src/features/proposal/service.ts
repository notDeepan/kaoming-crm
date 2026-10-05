import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getDb } from '@/db/client';
import {
  customers, deals, items, machineModels, partnerComplianceProfiles, partners,
  quotationLines, quotations, specCategories, technicalProposals,
} from '@/db/schema';
import { renderA4Pdf } from '@/documents/pdf';
import { renderTechnicalProposalHtml } from '@/documents/registry';
import type { TechnicalProposalDocument } from '@/documents/templates/technical-proposal/template';
import { resolveConfiguration } from '@/features/configuration/resolve';
import { requireRole } from '@/lib/authorization';

export async function generateTechnicalProposal(quotationId: string) {
  const actor = await requireRole('admin', 'manager');
  const db = getDb();
  const [quote] = await db.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
  if (!quote || quote.status !== 'draft') throw new Error('Generate the proposal for a draft quotation revision');
  const [deal] = await db.select().from(deals).where(eq(deals.id, quote.dealId)).limit(1);
  if (!deal?.machineModelId) throw new Error('Select a machine model for the deal');
  const [[model], [partner], [customer], [profile], categories, lines] = await Promise.all([
    db.select().from(machineModels).where(eq(machineModels.id, deal.machineModelId)).limit(1),
    db.select().from(partners).where(eq(partners.id, deal.partnerId)).limit(1),
    deal.customerId ? db.select().from(customers).where(eq(customers.id, deal.customerId)).limit(1) : Promise.resolve([]),
    db.select().from(partnerComplianceProfiles).where(eq(partnerComplianceProfiles.partnerId, deal.partnerId)).limit(1),
    db.select().from(specCategories).where(isNull(specCategories.deletedAt)).orderBy(asc(specCategories.sortOrder)),
    db.select({
      id: quotationLines.id, itemId: quotationLines.itemId, itemType: quotationLines.itemType,
      descriptionEn: quotationLines.descriptionEn, descriptionZh: quotationLines.descriptionZh,
      quantity: quotationLines.quantity, included: quotationLines.isIncludedInTotal,
      updatedAt: quotationLines.updatedAt, itemCode: items.code, specOverride: items.specOverride,
      categoryCode: specCategories.code,
    }).from(quotationLines).innerJoin(items, eq(items.id, quotationLines.itemId))
      .leftJoin(specCategories, eq(specCategories.id, items.specCategoryId))
      .where(and(eq(quotationLines.quotationId, quotationId), isNull(quotationLines.deletedAt)))
      .orderBy(quotationLines.lineNo),
  ]);
  if (!model || !partner || !lines.some((line) => line.itemType === 'machine' && line.included)) {
    throw new Error('The draft needs an included machine and agent');
  }
  let modelBytes: Uint8Array;
  if (model.proposalAssetBase64) {
    modelBytes = Buffer.from(model.proposalAssetBase64, 'base64');
  } else if (model.proposalAssetUrl && /^\/model-proposals\/[A-Za-z0-9._-]+\.pdf$/.test(model.proposalAssetUrl)) {
    modelBytes = await readFile(join(process.cwd(), 'public', model.proposalAssetUrl.slice(1)))
      .catch(() => { throw new Error(`The model literature PDF for ${model.code} is missing`); });
  } else {
    throw new Error(`Upload approved static model literature for ${model.code} before generating the proposal`);
  }
  if (modelBytes.length > 10_000_000) throw new Error('Model literature PDF exceeds 10 MB');
  let modelPdf: PDFDocument;
  try { modelPdf = await PDFDocument.load(modelBytes); }
  catch { throw new Error('Model literature PDF is damaged'); }
  const categoryByCode = new Map(categories.map((category) => [category.code, category]));
  const resolved = resolveConfiguration(model.baseSpecs, lines, profile ?? null)
    .filter((spec) => categoryByCode.get(spec.categoryCode)?.appearsOn.includes('proposal'))
    .sort((a, b) => (categoryByCode.get(a.categoryCode)?.sortOrder ?? 999)
      - (categoryByCode.get(b.categoryCode)?.sortOrder ?? 999));
  if (!resolved.length) throw new Error('The model has no resolved proposal specifications');
  if (resolved.some((spec) => spec.valueEn.includes('*'))) {
    throw new Error('Resolve the model literature paid-option marker before generating a customer proposal');
  }
  const issuedAt = new Date();
  const data: TechnicalProposalDocument = {
    dealNumber: deal.dealNumber, revision: quote.revision, issueDate: issuedAt.toISOString().slice(0, 10),
    modelCode: model.code, modelName: model.nameEn,
    agentName: partner.name, customerName: customer?.name ?? 'Not disclosed',
    quotationNumber: deal.dealNumber, incoterm: quote.incoterm,
    paymentTerms: quote.paymentTerms ?? '', deliveryTerms: quote.deliveryTerms ?? '',
    leadTimeText: quote.leadTimeText ?? '', warrantyMonths: quote.warrantyMonths,
    specs: resolved.map((spec) => ({ name: categoryByCode.get(spec.categoryCode)!.nameEn, value: spec.valueEn })),
    excludedOptions: lines.filter((line) => !line.included || line.itemType === 'excluded')
      .map((line) => ({ code: line.itemCode, name: line.descriptionEn, quantity: line.quantity })),
  };
  const [configBytes, dealBytes] = await Promise.all([
    renderA4Pdf(await renderTechnicalProposalHtml(data, 'configuration'),
      { dealNumber: deal.dealNumber, revision: quote.revision, issueDate: data.issueDate }),
    renderA4Pdf(await renderTechnicalProposalHtml(data, 'deal'),
      { dealNumber: deal.dealNumber, revision: quote.revision, issueDate: data.issueDate }),
  ]);
  const merged = await PDFDocument.create();
  for (const source of [modelPdf, await PDFDocument.load(configBytes), await PDFDocument.load(dealBytes)]) {
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  const font = await merged.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < modelPdf.getPageCount(); index++) {
    merged.getPage(index).drawText(`${deal.dealNumber}  |  revision ${quote.revision}  |  issued ${data.issueDate}`,
      { x: 55, y: 17, font, size: 8, color: rgb(0.35, 0.4, 0.47) });
  }
  const bytes = await merged.save();
  const lineSignature = lines.map((line) => `${line.id}:${line.updatedAt.toISOString()}`).join('|');
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM quotations WHERE id = ${quotationId} FOR UPDATE`);
    const [current] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
    const currentLines = await tx.select({ id: quotationLines.id, updatedAt: quotationLines.updatedAt })
      .from(quotationLines).where(and(eq(quotationLines.quotationId, quotationId), isNull(quotationLines.deletedAt)))
      .orderBy(quotationLines.lineNo);
    if (!current || current.status !== 'draft' || current.updatedAt.getTime() !== quote.updatedAt.getTime()
      || currentLines.map((line) => `${line.id}:${line.updatedAt.toISOString()}`).join('|') !== lineSignature) {
      throw new Error('The quotation changed while generating its proposal; regenerate it');
    }
    await tx.insert(technicalProposals).values({
      quotationId, pdfUrl: `/api/quotations/${quotationId}/technical-proposal/pdf`,
      pdfBase64: Buffer.from(bytes).toString('base64'), generatedAt: issuedAt,
      createdBy: actor.id, updatedBy: actor.id,
    }).onConflictDoUpdate({ target: technicalProposals.quotationId, set: {
      pdfBase64: Buffer.from(bytes).toString('base64'), generatedAt: issuedAt,
      updatedAt: issuedAt, updatedBy: actor.id,
    } });
  });
  return { pageCount: merged.getPageCount() };
}
