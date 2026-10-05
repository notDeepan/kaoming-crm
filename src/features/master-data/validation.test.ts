import { describe, expect, it } from 'vitest';
import { itemInput, partnerInput, priceBookVersionInput } from './validation';

const partner = {
  code: 'A16001', name: 'TEZMAKSAN', nameZh: '', countryCode: 'TR', region: 'europe',
  lifecycleStatus: 'active', relationshipType: 'distributor', commissionModel: 'markup',
  exclusivity: 'exclusive', defaultCurrency: 'USD', notes: '',
};

describe('master data validation', () => {
  it('accepts a real partner and rejects non-ISO country and currency codes', () => {
    expect(partnerInput.safeParse(partner).success).toBe(true);
    expect(partnerInput.safeParse({ ...partner, countryCode: 'Turkey' }).success).toBe(false);
    expect(partnerInput.safeParse({ ...partner, countryCode: 'ZZ' }).success).toBe(false);
    expect(partnerInput.safeParse({ ...partner, defaultCurrency: 'ZZZ' }).success).toBe(false);
  });

  it('requires the factory Chinese name on every item', () => {
    const item = {
      code: 'OPT-AUH', nameEn: 'Automatic universal head', nameZh: '', itemType: 'accessory',
      specCategoryId: '', machineModelId: '', unit: 'set', isStandardAccessory: false,
    };
    expect(itemInput.safeParse(item).success).toBe(false);
  });

  it('requires bilingual replacement values and a category for a spec change', () => {
    const change = {
      code: 'OPT-ZW11', nameEn: 'Travel upgrade', nameZh: '行程升級', itemType: 'spec_change',
      specCategoryId: '', machineModelId: '', unit: 'set', isStandardAccessory: false,
      specOverrideEn: '', specOverrideZh: '',
    };
    expect(itemInput.safeParse(change).success).toBe(false);
    expect(itemInput.safeParse({ ...change, specCategoryId: '123e4567-e89b-42d3-a456-426614174000', specOverrideEn: 'Z 1100 mm', specOverrideZh: 'Z 軸 1100 mm' }).success).toBe(true);
  });

  it('refuses a price book period whose end precedes its start', () => {
    expect(priceBookVersionInput.safeParse({ name: '2026-H2', effectiveFrom: '2026-07-01', effectiveTo: '2026-06-30' }).success).toBe(false);
    expect(priceBookVersionInput.safeParse({ name: '2026-H2', effectiveFrom: '2026-02-30', effectiveTo: '' }).success).toBe(false);
  });
});
