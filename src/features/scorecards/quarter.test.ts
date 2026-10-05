import { describe, expect, it } from 'vitest';
import { consecutiveQuarterCount, previousClosedQuarter } from './quarter';

describe('previous closed scorecard quarter', () => {
  it('uses the last complete quarter and its trailing 12 months', () => {
    expect(previousClosedQuarter('2026-10-05')).toEqual({ period: '2026-Q3',
      start: '2025-10-01', end: '2026-09-30' });
    expect(previousClosedQuarter('2026-01-01')).toEqual({ period: '2025-Q4',
      start: '2025-01-01', end: '2025-12-31' });
  });
});

it('requires consecutive observed quarters', () => {
  expect(consecutiveQuarterCount(['2025-Q4', '2026-Q1', '2026-Q3'], '2026-Q3')).toBe(1);
  expect(consecutiveQuarterCount(['2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3'], '2026-Q3')).toBe(4);
});
