import { describe, expect, it } from 'vitest';
import { nextTaipeiRun } from './schedule';

describe('Taipei nightly schedule', () => {
  it('runs at the next 02:00, including across a year boundary', () => {
    expect(nextTaipeiRun(new Date('2026-12-31T17:30:00Z')).toISOString())
      .toBe('2026-12-31T18:00:00.000Z');
    expect(nextTaipeiRun(new Date('2026-12-31T18:00:00Z')).toISOString())
      .toBe('2027-01-01T18:00:00.000Z');
  });
});
