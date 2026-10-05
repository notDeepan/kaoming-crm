import 'server-only';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import { getDb } from '@/db/client';
import { machineModels, specCategories, technicalProposals } from '@/db/schema';
import { requireRole } from '@/lib/authorization';

const profileCategories = new Set(['electrical', 'compliance', 'colour']);

export async function invalidateDraftModelProposals(tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0], modelId: string) {
  await tx.delete(technicalProposals).where(sql`${technicalProposals.quotationId} IN (
    SELECT q.id FROM quotations q JOIN deals d ON d.id = q.deal_id
    WHERE d.machine_model_id = ${modelId} AND q.status = 'draft'
  )`);
}

export async function saveModelBaseSpecs(modelId: string, formData: FormData) {
  const actor = await requireRole('admin', 'manager');
  return getDb().transaction(async (tx) => {
    const [model] = await tx.select({ id: machineModels.id }).from(machineModels)
      .where(and(eq(machineModels.id, modelId), isNull(machineModels.deletedAt))).for('update').limit(1);
    if (!model) throw new Error('Machine model not found');
    const categories = await tx.select({ code: specCategories.code }).from(specCategories)
      .where(isNull(specCategories.deletedAt));
    const specs: Record<string, { valueEn: string; valueZh: string }> = {};
    for (const { code } of categories) {
      if (profileCategories.has(code)) continue;
      const rawEn = formData.get(`spec_${code}_en`);
      const rawZh = formData.get(`spec_${code}_zh`);
      if ((rawEn !== null && typeof rawEn !== 'string') || (rawZh !== null && typeof rawZh !== 'string')) {
        throw new Error(`${code}: enter text values`);
      }
      const valueEn = (rawEn ?? '').trim();
      const valueZh = (rawZh ?? '').trim();
      if (valueEn.length > 1000 || valueZh.length > 1000) throw new Error(`${code}: use at most 1000 characters per language`);
      if (Boolean(valueEn) !== Boolean(valueZh)) throw new Error(`${code}: provide both English and Chinese values`);
      if (valueEn && valueZh) specs[code] = { valueEn, valueZh };
    }
    if (!Object.keys(specs).length) throw new Error('Enter at least one bilingual base specification');
    await tx.update(machineModels).set({ baseSpecs: specs, updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(machineModels.id, modelId));
    await invalidateDraftModelProposals(tx, modelId);
    return Object.keys(specs).length;
  });
}

export async function uploadModelProposalAsset(modelId: string, filename: string, bytes: Uint8Array) {
  const actor = await requireRole('admin', 'manager');
  if (bytes.length < 100 || bytes.length > 10_000_000
    || Buffer.from(bytes.subarray(0, 5)).toString() !== '%PDF-') {
    throw new Error('Choose a model literature PDF up to 10 MB');
  }
  let pdf: PDFDocument;
  try { pdf = await PDFDocument.load(bytes); }
  catch { throw new Error('Model literature PDF is damaged or unsupported'); }
  if (!pdf.getPageCount()) throw new Error('Model literature PDF has no pages');
  const safeName = filename.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, '').trim() ?? '';
  if (!safeName.toLowerCase().endsWith('.pdf') || safeName.length > 200) {
    throw new Error('Choose a PDF filename up to 200 characters');
  }
  return getDb().transaction(async (tx) => {
    const [model] = await tx.select({ id: machineModels.id }).from(machineModels)
      .where(and(eq(machineModels.id, modelId), isNull(machineModels.deletedAt))).for('update').limit(1);
    if (!model) throw new Error('Machine model not found');
    await tx.update(machineModels).set({
      proposalAssetUrl: `/api/models/${modelId}/proposal/pdf`, proposalAssetName: safeName,
      proposalAssetBase64: Buffer.from(bytes).toString('base64'),
      updatedAt: new Date(), updatedBy: actor.id,
    }).where(eq(machineModels.id, modelId));
    await invalidateDraftModelProposals(tx, modelId);
  });
}
