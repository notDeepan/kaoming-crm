import Papa from 'papaparse';
import { readSheet, type SheetData } from 'read-excel-file/node';
import { minorUnitsToDecimal, parseDecimalToMinorUnits } from '@/lib/money';

export const REQUIRED_HEADERS = ['item_code', 'name_en', 'name_zh', 'unit', 'spec_category', 'price_usd_eu', 'price_usd_non_eu', 'price_twd'] as const;
export type ImportError = { row: number; code: string; message: string };
export type RawPriceRow = { row: number; values: Record<string, string> };
export type ParsedPriceFile = { rows: RawPriceRow[]; errors: ImportError[] };
export type ValidPriceRow = {
  row: number; itemCode: string; nameEn: string; nameZh: string; unit: string;
  categoryCode: string | null; usdEu: string; usdNonEu: string; twd: string | null;
};
export type KnownItem = { code: string; nameZh: string | null; specCategoryCode: string | null };
export type ExistingPrice = { itemCode: string; regionBand: string; currency: string; amount: string };

export async function parsePriceFile(filename: string, bytes: Uint8Array): Promise<ParsedPriceFile> {
  const errors: ImportError[] = [];
  let matrix: string[][];
  if (/\.csv$/i.test(filename)) {
    let source: string;
    try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { return { rows: [], errors: [{ row: 1, code: 'BAD_FILE', message: 'CSV must be UTF-8 encoded' }] }; }
    const parsed = Papa.parse<string[]>(source, {
      skipEmptyLines: 'greedy',
    });
    matrix = parsed.data;
    errors.push(...parsed.errors.map((error) => ({ row: (error.row ?? 0) + 1, code: 'BAD_FILE', message: error.message })));
  } else if (/\.xlsx$/i.test(filename)) {
    let sheet: SheetData;
    try { sheet = await readSheet(Buffer.from(bytes)); }
    catch { return { rows: [], errors: [{ row: 1, code: 'BAD_FILE', message: 'The XLSX file could not be read' }] }; }
    matrix = sheet
      .map((row) => row.map((value) => String(value ?? '').trim()));
  } else {
    return { rows: [], errors: [{ row: 1, code: 'BAD_FILE', message: 'Use a CSV or XLSX file' }] };
  }
  if (!matrix.length) return { rows: [], errors: [{ row: 1, code: 'EMPTY_FILE', message: 'The file has no rows' }] };
  const headers = matrix[0]!.map((header) => header.trim().replace(/^\uFEFF/, ''));
  for (const header of REQUIRED_HEADERS) {
    if (!headers.includes(header)) errors.push({ row: 1, code: 'MISSING_HEADER', message: `Missing header ${header}` });
  }
  const rows = matrix.slice(1).map((cells, index) => ({
    row: index + 2,
    values: Object.fromEntries(headers.map((header, column) => [header, (cells[column] ?? '').trim()])),
  }));
  return { rows, errors };
}

function parsePrice(value: string, row: number, field: string, required: boolean, errors: ImportError[]): string | null {
  if (!value) {
    if (required) errors.push({ row, code: 'MISSING_PRICE', message: `${field} is required` });
    return null;
  }
  try {
    const minor = parseDecimalToMinorUnits(value);
    if (minor <= 0n) {
      errors.push({ row, code: 'NON_POSITIVE', message: `${field} must be positive` });
      return null;
    }
    return minorUnitsToDecimal(minor);
  } catch {
    errors.push({ row, code: 'BAD_NUMBER', message: `${field} must be a positive amount with at most two decimals` });
    return null;
  }
}

export function validatePriceRows(parsed: ParsedPriceFile, knownItems: KnownItem[], categoryCodes: string[]) {
  const errors = [...parsed.errors];
  const itemByCode = new Map(knownItems.map((item) => [item.code.toUpperCase(), item]));
  const categories = new Set(categoryCodes);
  const seen = new Set<string>();
  const valid: ValidPriceRow[] = [];
  for (const { row, values } of parsed.rows) {
    const before = errors.length;
    const itemCode = (values.item_code ?? '').toUpperCase();
    const item = itemByCode.get(itemCode);
    if (!item) errors.push({ row, code: 'UNKNOWN_ITEM', message: `${itemCode || '(blank)'} is not in the item master` });
    if (seen.has(itemCode)) errors.push({ row, code: 'DUPLICATE_ITEM', message: `${itemCode || '(blank)'} occurs twice` });
    seen.add(itemCode);
    if (!item && !(values.name_zh ?? '').trim()) errors.push({ row, code: 'MISSING_品名', message: 'A new item needs a Chinese name' });
    const categoryCode = (values.spec_category ?? '').trim();
    if (categoryCode && !categories.has(categoryCode)) errors.push({ row, code: 'UNKNOWN_CATEGORY', message: `${categoryCode} is not a seeded category` });
    // A category mismatch on a known item would silently change its meaning.
    if (item && categoryCode !== (item.specCategoryCode ?? '')) errors.push({ row, code: 'UNKNOWN_CATEGORY', message: `Category for ${itemCode} differs from the item master` });
    const usdEu = parsePrice(values.price_usd_eu ?? '', row, 'price_usd_eu', true, errors);
    const usdNonEu = parsePrice(values.price_usd_non_eu ?? '', row, 'price_usd_non_eu', true, errors);
    const twd = parsePrice(values.price_twd ?? '', row, 'price_twd', false, errors);
    if (errors.length === before && usdEu && usdNonEu) valid.push({
      row, itemCode, nameEn: values.name_en ?? '', nameZh: values.name_zh ?? '',
      unit: values.unit ?? '', categoryCode: categoryCode || null, usdEu, usdNonEu, twd,
    });
  }
  if (!parsed.rows.length && !errors.length) errors.push({ row: 1, code: 'EMPTY_FILE', message: 'At least one item is required' });
  return { valid, errors };
}

export type DiffMovement = { itemCode: string; regionBand: string; currency: string; oldPrice: string; newPrice: string; percent: number };
export type PriceDiff = { added: number; removed: number; changed: number; averageMovementPercent: number; largestMovements: DiffMovement[]; removedOnOpenQuotations: string[] };

export function buildPriceDiff(rows: ValidPriceRow[], old: ExistingPrice[], openItemCodes: string[]): PriceDiff {
  const oldCodes = new Set(old.map((price) => price.itemCode));
  const newCodes = new Set(rows.map((row) => row.itemCode));
  const oldMap = new Map(old.map((price) => [`${price.itemCode}|${price.regionBand}|${price.currency}`, price.amount]));
  const movements: DiffMovement[] = [];
  const comparablePercentages: number[] = [];
  let changed = 0;
  for (const row of rows) {
    const cells = [
      { regionBand: 'eu', currency: 'USD', amount: row.usdEu },
      { regionBand: 'non_eu', currency: 'USD', amount: row.usdNonEu },
      ...(row.twd ? [{ regionBand: 'non_eu', currency: 'TWD', amount: row.twd }] : []),
    ];
    let itemChanged = false;
    for (const cell of cells) {
      const previous = oldMap.get(`${row.itemCode}|${cell.regionBand}|${cell.currency}`);
      if (previous) {
        const percent = (Number(parseDecimalToMinorUnits(cell.amount) - parseDecimalToMinorUnits(previous))
          / Number(parseDecimalToMinorUnits(previous))) * 100;
        comparablePercentages.push(percent);
        if (previous !== cell.amount) {
          itemChanged = true;
          movements.push({ itemCode: row.itemCode, regionBand: cell.regionBand, currency: cell.currency, oldPrice: previous, newPrice: cell.amount, percent });
        }
      } else if (oldCodes.has(row.itemCode)) {
        itemChanged = true;
      }
    }
    if (oldCodes.has(row.itemCode) && old.some((price) => price.itemCode === row.itemCode && !cells.some((cell) => cell.regionBand === price.regionBand && cell.currency === price.currency))) {
      itemChanged = true;
    }
    if (itemChanged) changed += 1;
  }
  const removedCodes = [...oldCodes].filter((code) => !newCodes.has(code));
  return {
    added: [...newCodes].filter((code) => !oldCodes.has(code)).length,
    removed: removedCodes.length,
    changed,
    averageMovementPercent: comparablePercentages.length ? comparablePercentages.reduce((sum, percent) => sum + percent, 0) / comparablePercentages.length : 0,
    largestMovements: movements.sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent)).slice(0, 10),
    removedOnOpenQuotations: removedCodes.filter((code) => openItemCodes.includes(code)),
  };
}
