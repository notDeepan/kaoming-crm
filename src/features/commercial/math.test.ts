import { describe, expect, it } from 'vitest';
import { calculatePenaltyExposure } from './math';

describe('contractual penalty exposure', () => {
  it('rounds positive slip up to whole weeks and applies the cap', () => {
    expect(calculatePenaltyExposure({ orderValue: '100000.00', cumulativeSlipDays: 8,
      ratePerWeek: '0.0050', capRate: '0.0500' })).toEqual({
      weeksLate: 2, ratePerWeek: '0.0050', accruedExposure: '1000.00', capAmount: '5000.00',
    });
    expect(calculatePenaltyExposure({ orderValue: '100000.00', cumulativeSlipDays: 100,
      ratePerWeek: '0.0050', capRate: '0.0500' }).accruedExposure).toBe('5000.00');
  });
  it('reports no current exposure for early orders', () => {
    expect(calculatePenaltyExposure({ orderValue: '100000.00', cumulativeSlipDays: -5,
      ratePerWeek: '0.0050', capRate: '0.0500' }).accruedExposure).toBe('0.00');
  });
});
