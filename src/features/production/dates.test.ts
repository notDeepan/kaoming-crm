import { describe, expect, it } from 'vitest';
import { addMonths, daysBetween, escalationForSlip, progressDueDates, requiresShippingMark } from './dates';

describe('production calendar', () => {
  it('clips month ends and generates reviews through contractual date plus six months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(progressDueDates(new Date('2026-01-31T10:00:00Z'), '2026-03-01')).toEqual([
      '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31',
      '2026-06-30', '2026-07-31', '2026-08-31',
    ]);
  });
  it('uses strict escalation thresholds', () => {
    expect(escalationForSlip(30)).toBe('none');
    expect(escalationForSlip(31)).toBe('dept_manager');
    expect(escalationForSlip(60)).toBe('dept_manager');
    expect(escalationForSlip(61)).toBe('gm');
    expect(daysBetween('2026-03-01', '2026-05-01')).toBe(61);
  });
  it('uses either weight or an oversized dimension for a shipping mark', () => {
    expect(requiresShippingMark(100, [2500])).toBe(false);
    expect(requiresShippingMark(101, [100])).toBe(true);
    expect(requiresShippingMark(20, [2501])).toBe(true);
  });
});
