import { expect, it } from 'vitest';
import { timeInState } from './timing';

it('attributes elapsed time to each case state, including repeated waits', () => {
  const at = (hour: number) => new Date(Date.UTC(2026, 9, 4, hour));
  expect(timeInState([
    { toStatus: 'received', at: at(0) },
    { toStatus: 'translated', at: at(1) },
    { toStatus: 'with_engineering', at: at(3) },
    { toStatus: 'on_hold_parts', at: at(5) },
    { toStatus: 'with_engineering', at: at(7) },
    { toStatus: 'closed', at: at(8) },
  ], at(10))).toEqual([
    { status: 'received', hours: 1 },
    { status: 'translated', hours: 2 },
    { status: 'with_engineering', hours: 3 },
    { status: 'on_hold_parts', hours: 2 },
  ]);
});
