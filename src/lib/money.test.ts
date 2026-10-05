import { describe, expect, it } from 'vitest';
import { minorUnitsToDecimal, parseDecimalToMinorUnits } from './money';

describe('money', () => {
  it('parses and formats exact decimal values without a float', () => {
    expect(parseDecimalToMinorUnits('686740')).toBe(68_674_000n);
    expect(parseDecimalToMinorUnits('183590.25')).toBe(18_359_025n);
    expect(minorUnitsToDecimal(-18_359_025n)).toBe('-183590.25');
  });

  it('refuses extra precision and numeric overflow', () => {
    expect(() => parseDecimalToMinorUnits('1.001')).toThrow();
    expect(() => parseDecimalToMinorUnits('1000000000000.00')).toThrow();
  });
});
