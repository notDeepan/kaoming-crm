import { expect, it } from 'vitest';
import { taipeiDate } from './business-date';

it('uses the Taiwan business date at the UTC midnight boundary', () => {
  expect(taipeiDate(new Date('2026-10-01T16:00:00Z'))).toBe('2026-10-02');
});
