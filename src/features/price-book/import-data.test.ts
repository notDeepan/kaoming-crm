import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildPriceDiff, parsePriceFile, validatePriceRows } from './import-data';

const header = 'item_code,name_en,name_zh,unit,spec_category,price_usd_eu,price_usd_non_eu,price_twd';
const parse = (csv: string) => parsePriceFile('test.csv', new TextEncoder().encode(csv));

describe('price list import', () => {
  it('matches headers by name, not their order, and validates all rows', async () => {
    const reordered = 'price_usd_non_eu,item_code,price_twd,name_zh,spec_category,price_usd_eu,unit,name_en\n100,A,3000,中文,special,110,set,English';
    const result = validatePriceRows(await parse(reordered), [{ code: 'A', nameZh: '中文', specCategoryCode: 'special' }], ['special']);
    expect(result.errors).toEqual([]);
    expect(result.valid[0]?.usdNonEu).toBe('100.00');
  });

  it('reads the same fixed headers and row numbers from an XLSX sheet', async () => {
    const bytes = readFileSync('tests/fixtures/price-list.xlsx');
    const parsed = await parsePriceFile('prices.xlsx', bytes);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({ row: 2, values: { item_code: 'A', price_usd_non_eu: '100' } });
  });

  it('returns row-numbered problems without stopping at the first error', async () => {
    const csv = `${header}\nUNKNOWN,X,,,wrong,,abc,-5\nA,X,中文,set,special,0,100,\nA,X,中文,set,special,120,110,`;
    const result = validatePriceRows(await parse(csv), [{ code: 'A', nameZh: '中文', specCategoryCode: 'special' }], ['special']);
    expect(result.errors.map(({ row, code }) => [row, code])).toEqual(expect.arrayContaining([
      [2, 'UNKNOWN_ITEM'], [2, 'MISSING_品名'], [2, 'UNKNOWN_CATEGORY'],
      [2, 'MISSING_PRICE'], [2, 'BAD_NUMBER'], [2, 'NON_POSITIVE'], [3, 'NON_POSITIVE'], [4, 'DUPLICATE_ITEM'],
    ]));
  });

  it('shows additions, removals, outliers, and removed items on open quotes', async () => {
    const rows = validatePriceRows(await parse(`${header}\nA,A,中文,set,,150,100,\nC,C,中文,set,,300,200,`),
      [{ code: 'A', nameZh: '中文', specCategoryCode: null }, { code: 'C', nameZh: '中文', specCategoryCode: null }], []).valid;
    const diff = buildPriceDiff(rows, [
      { itemCode: 'A', regionBand: 'eu', currency: 'USD', amount: '100.00' },
      { itemCode: 'A', regionBand: 'non_eu', currency: 'USD', amount: '100.00' },
      { itemCode: 'B', regionBand: 'eu', currency: 'USD', amount: '200.00' },
    ], ['B']);
    expect(diff).toMatchObject({ added: 1, removed: 1, changed: 1, removedOnOpenQuotations: ['B'] });
    expect(diff.largestMovements[0]?.percent).toBe(50);
  });
});
