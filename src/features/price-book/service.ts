import 'server-only';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { items, priceBookImports, priceBookVersions, prices, quotationLines, quotations, specCategories } from '@/db/schema';
import { requireRole } from '@/lib/authorization';
import { buildPriceDiff, parsePriceFile, validatePriceRows, type ExistingPrice, type PriceDiff } from './import-data';

const MAX_FILE_BYTES = 5_000_000;

function yesterday(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function uploadPriceFile(filename: string, bytes: Uint8Array) {
  const actor = await requireRole('admin', 'manager');
  if (bytes.byteLength > MAX_FILE_BYTES) throw new Error('The price file exceeds 5 MB');
  const parsed = await parsePriceFile(filename, bytes);
  const db = getDb();
  const [itemRows, categoryRows, priorVersion] = await Promise.all([
    db.select({ code: items.code, nameZh: items.nameZh, specCategoryCode: specCategories.code })
      .from(items).leftJoin(specCategories, eq(specCategories.id, items.specCategoryId))
      .where(isNull(items.deletedAt)),
    db.select({ code: specCategories.code }).from(specCategories).where(isNull(specCategories.deletedAt)),
    db.select({ id: priceBookVersions.id }).from(priceBookVersions)
      .where(and(eq(priceBookVersions.isPublished, true), isNull(priceBookVersions.deletedAt)))
      .orderBy(desc(priceBookVersions.effectiveFrom)).limit(1),
  ]);
  const validated = validatePriceRows(parsed, itemRows, categoryRows.map((row) => row.code));
  let diff: PriceDiff | null = null;
  if (validated.errors.length === 0) {
    const old = priorVersion[0] ? await db.select({ itemCode: items.code, regionBand: prices.regionBand, currency: prices.currency, amount: prices.amount })
      .from(prices).innerJoin(items, eq(items.id, prices.itemId))
      .where(eq(prices.priceBookVersionId, priorVersion[0].id)) : [];
    const openItems = await db.selectDistinct({ code: items.code })
      .from(quotationLines).innerJoin(items, eq(items.id, quotationLines.itemId))
      .innerJoin(quotations, eq(quotations.id, quotationLines.quotationId))
      .where(inArray(quotations.status, ['draft', 'pending_approval', 'approved', 'issued']));
    diff = buildPriceDiff(validated.valid, old as ExistingPrice[], openItems.map((row) => row.code));
  }
  const [record] = await db.insert(priceBookImports).values({
    filename, uploadedBy: actor.id, status: validated.errors.length ? 'failed' : 'validated',
    rowCount: parsed.rows.length, errorCount: validated.errors.length, errors: validated.errors,
    diffSummary: diff ? { ...diff, baselineVersionId: priorVersion[0]?.id ?? null } : null,
    sourceBase64: Buffer.from(bytes).toString('base64'), createdBy: actor.id, updatedBy: actor.id,
  }).returning({ id: priceBookImports.id });
  return { id: record!.id, errors: validated.errors, diff };
}

export async function publishPriceImport(importId: string, name: string, effectiveFrom: string, confirmed: boolean) {
  const actor = await requireRole('admin', 'manager');
  if (!confirmed) throw new Error('G12: Review and confirm the diff before publication');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)
    || Number.isNaN(Date.parse(`${effectiveFrom}T00:00:00Z`))
    || new Date(`${effectiveFrom}T00:00:00Z`).toISOString().slice(0, 10) !== effectiveFrom) {
    throw new Error('Enter a valid effective date');
  }
  if (!name.trim()) throw new Error('A price book version name is required');
  const db = getDb();
  return db.transaction(async (tx) => {
    // One publisher at a time: the prior version must be closed without a gap.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(22012026)`);
    const [record] = await tx.select().from(priceBookImports).where(eq(priceBookImports.id, importId)).for('update').limit(1);
    if (!record || record.status !== 'validated' || record.errorCount !== 0 || !record.diffSummary) {
      throw new Error('G12: This import has validation errors or is no longer publishable');
    }
    const parsed = await parsePriceFile(record.filename, Buffer.from(record.sourceBase64, 'base64'));
    const itemRows = await tx.select({ id: items.id, code: items.code, nameZh: items.nameZh, specCategoryCode: specCategories.code })
      .from(items).leftJoin(specCategories, eq(specCategories.id, items.specCategoryId))
      .where(isNull(items.deletedAt));
    const categoryRows = await tx.select({ code: specCategories.code }).from(specCategories).where(isNull(specCategories.deletedAt));
    const validated = validatePriceRows(parsed, itemRows, categoryRows.map((row) => row.code));
    if (validated.errors.length) throw new Error(`G12: ${validated.errors.length} price-list validation errors remain`);
    const [prior] = await tx.select().from(priceBookVersions)
      .where(and(eq(priceBookVersions.isPublished, true), isNull(priceBookVersions.deletedAt)))
      .orderBy(desc(priceBookVersions.effectiveFrom)).limit(1);
    if ((record.diffSummary.baselineVersionId ?? null) !== (prior?.id ?? null)) {
      throw new Error('G12: A newer price book was published; upload again to review a current diff');
    }
    if (prior && (prior.effectiveTo || effectiveFrom <= prior.effectiveFrom)) {
      throw new Error('The new version must start after the latest open published version');
    }
    if (prior) await tx.update(priceBookVersions)
      .set({ effectiveTo: yesterday(effectiveFrom), updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(priceBookVersions.id, prior.id));
    const [version] = await tx.insert(priceBookVersions).values({
      name: name.trim(), effectiveFrom, isPublished: true, createdBy: actor.id, updatedBy: actor.id,
    }).returning({ id: priceBookVersions.id });
    const ids = new Map(itemRows.map((item) => [item.code.toUpperCase(), item.id]));
    const newPrices = validated.valid.flatMap((row) => {
      const itemId = ids.get(row.itemCode)!;
      return [
        { itemId, regionBand: 'eu' as const, currency: 'USD', amount: row.usdEu },
        { itemId, regionBand: 'non_eu' as const, currency: 'USD', amount: row.usdNonEu },
        ...(row.twd ? [{ itemId, regionBand: 'non_eu' as const, currency: 'TWD', amount: row.twd }] : []),
      ].map((price) => ({ ...price, priceBookVersionId: version!.id, createdBy: actor.id, updatedBy: actor.id }));
    });
    if (newPrices.length) await tx.insert(prices).values(newPrices);
    await tx.update(priceBookImports).set({
      status: 'published', targetVersionId: version!.id, publishedAt: new Date(),
      updatedAt: new Date(), updatedBy: actor.id,
    }).where(eq(priceBookImports.id, importId));
    return { versionId: version!.id };
  });
}

export async function discardPriceImport(importId: string) {
  const actor = await requireRole('admin', 'manager');
  await getDb().update(priceBookImports).set({ status: 'discarded', updatedAt: new Date(), updatedBy: actor.id })
    .where(and(eq(priceBookImports.id, importId), inArray(priceBookImports.status, ['failed', 'validated'])));
}

export async function listPriceImports() {
  await requireRole('admin', 'manager');
  return getDb().select({
    id: priceBookImports.id, filename: priceBookImports.filename, status: priceBookImports.status,
    rowCount: priceBookImports.rowCount, errorCount: priceBookImports.errorCount,
    errors: priceBookImports.errors, diffSummary: priceBookImports.diffSummary,
    createdAt: priceBookImports.createdAt, publishedAt: priceBookImports.publishedAt,
  }).from(priceBookImports).orderBy(desc(priceBookImports.createdAt)).limit(50);
}
