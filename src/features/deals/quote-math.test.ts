import { describe, expect, it } from 'vitest';
import { calculateLine, calculateTotals } from './quote-math';

describe('quotation money', () => {
  it('keeps discounts on lines and excludes offered-but-not-included items', () => {
    const lines = [
      ['686740', '0', true], ['58850', '58850', true], ['11228', '11228', true],
      ['5273', '5273', true], ['4500', '4500', true], ['1926', '1926', true],
      ['75000', '75000', true], ['24100', '24100', true], ['3973', '2713', true],
      ['15023', '0', false],
    ] as const;
    const result = calculateTotals(lines.map(([unitPrice, lineDiscount, isIncludedInTotal]) => ({
      quantity: '1', unitPrice, lineDiscount, isIncludedInTotal,
    })));
    expect(result.listTotal).toBe('871590.00');
    expect(result.netTotal).toBe('688000.00');
    expect(result.discountAmount).toBe('183590.00');
    expect(calculateLine('1', '15023', '0', false).lineTotal).toBe('0.00');
  });

  it('rejects a discount greater than its line or negative quantity', () => {
    expect(() => calculateLine('1', '100', '101', true)).toThrow();
    expect(() => calculateLine('-1', '100', '0', true)).toThrow();
  });
});
