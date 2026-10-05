import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { parseDecimalToMinorUnits } from '../lib/money';

function rows(file: string): Record<string, string>[] {
  const source = readFileSync(resolve(process.cwd(), file), 'utf8');
  const parsed = Papa.parse<Record<string, string>>(source, { header: true, skipEmptyLines: true });
  expect(parsed.errors).toEqual([]);
  return parsed.data;
}

describe('worked-example seed data', () => {
  it('uses unique codes and valid item references', () => {
    const models = rows('data/seed/machine-models.csv');
    const categories = rows('data/seed/spec-categories.csv');
    const items = rows('data/seed/items.template.csv');
    const modelCodes = new Set(models.map((row) => row.code));
    const categoryCodes = new Set(categories.map((row) => row.code));
    expect(modelCodes.size).toBe(models.length);
    expect(categoryCodes.size).toBe(categories.length);
    expect(new Set(items.map((row) => row.code)).size).toBe(items.length);
    for (const item of items) {
      expect(item.name_zh).toBeTruthy();
      if (item.machine_model) expect(modelCodes.has(item.machine_model)).toBe(true);
      if (item.spec_category) expect(categoryCodes.has(item.spec_category)).toBe(true);
      if (item.item_type === 'spec_change') {
        expect(item.spec_category).toBeTruthy();
        expect(item.spec_override_en).toBeTruthy();
        expect(item.spec_override_zh).toBeTruthy();
      }
    }
  });

  it('prices known items using valid minor-unit amounts', () => {
    const itemCodes = new Set(rows('data/seed/items.template.csv').map((row) => row.code));
    for (const price of rows('data/import-templates/price-list.csv')) {
      expect(itemCodes.has(price.item_code)).toBe(true);
      for (const field of ['price_usd_eu', 'price_usd_non_eu', 'price_twd']) {
        expect(parseDecimalToMinorUnits(price[field] ?? '')).toBeGreaterThan(0n);
      }
    }
  });
});
