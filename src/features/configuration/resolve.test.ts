import { describe, expect, it } from 'vitest';
import { resolveConfiguration, type ConfigurationLine } from './resolve';

const line = (overrides: Partial<ConfigurationLine>): ConfigurationLine => ({
  itemId: 'item', itemType: 'accessory', categoryCode: 'special',
  descriptionEn: 'Option', descriptionZh: '附件', specOverride: null,
  included: true, ...overrides,
});

describe('quotation to factory configuration', () => {
  it('replaces a base specification, appends paid accessories, and excludes service and separate options', () => {
    const specs = resolveConfiguration({
      travels: { valueEn: 'Z 900 mm', valueZh: 'Z 軸 900 mm' },
      controller: { valueEn: 'Fanuc 31iMB', valueZh: 'Fanuc 31iMB' },
    }, [
      line({ itemType: 'machine', categoryCode: null }),
      line({ itemId: 'upgrade', itemType: 'spec_change', categoryCode: 'travels',
        specOverride: { valueEn: 'Z 1100 mm', valueZh: 'Z 軸 1100 mm' } }),
      line({ itemId: 'coolant', categoryCode: 'coolant',
        descriptionEn: '40 bar coolant', descriptionZh: '主軸中心出水 40BAR' }),
      line({ itemId: 'chiller', categoryCode: 'coolant',
        descriptionEn: 'Chiller', descriptionZh: '冷卻機' }),
      line({ itemId: 'service', itemType: 'service', categoryCode: null,
        descriptionEn: 'Installation', descriptionZh: '安裝服務' }),
      line({ itemId: 'probe', categoryCode: 'special', included: false,
        descriptionEn: 'Probe', descriptionZh: '探測系統' }),
    ], null);
    expect(specs.find((spec) => spec.categoryCode === 'travels')).toMatchObject({
      valueEn: 'Z 1100 mm', valueZh: 'Z 軸 1100 mm', isUpgraded: true,
      sourceItemIds: ['upgrade'],
    });
    expect(specs.find((spec) => spec.categoryCode === 'coolant')).toMatchObject({
      valueEn: '40 bar coolant; Chiller', valueZh: '主軸中心出水 40BAR；冷卻機',
      sourceItemIds: ['coolant', 'chiller'],
    });
    expect(specs.find((spec) => spec.categoryCode === 'controller')?.source).toBe('base');
    expect(specs.some((spec) => spec.categoryCode === 'special')).toBe(false);
    expect(specs).toHaveLength(3);
  });

  it('adds bilingual structured destination values and refuses a change without a Chinese override', () => {
    const compliance = {
      voltage: '415V', frequency: '50Hz', phase: '3相', ceVariant: 'CE standard',
      labelLanguages: ['English', 'Turkish'], nameplateRequired: true,
      defaultColourCodes: ['790-49780H', '790-49K84'],
    };
    const specs = resolveConfiguration(null, [], compliance);
    expect(specs.find((spec) => spec.categoryCode === 'electrical')?.valueZh).toBe('415V / 50Hz / 3 相');
    expect(specs.find((spec) => spec.categoryCode === 'compliance')?.valueZh).toContain('貼代理商名牌');
    expect(specs.find((spec) => spec.categoryCode === 'colour')?.valueEn).toContain('790-49780H');
    expect(() => resolveConfiguration(null, [line({ itemType: 'spec_change', specOverride: null })], null))
      .toThrow('bilingual override');
  });
});
