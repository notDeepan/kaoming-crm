import { minorUnitsToDecimal, parseDecimalToMinorUnits } from '@/lib/money';

export function calculatePenaltyExposure(input: {
  orderValue: string; cumulativeSlipDays: number; ratePerWeek: string; capRate: string;
}) {
  if (!Number.isInteger(input.cumulativeSlipDays)) throw new Error('Slip days must be an integer');
  const rateUnits = (value: string) => {
    const match = /^(\d+)(?:\.(\d{1,4}))?$/.exec(value);
    if (!match) throw new Error('Rate must have at most four decimals');
    return BigInt(match[1]!) * 10_000n + BigInt((match[2] ?? '').padEnd(4, '0'));
  };
  const weeksLate = Math.ceil(Math.max(input.cumulativeSlipDays, 0) / 7);
  const value = parseDecimalToMinorUnits(input.orderValue);
  const weekly = rateUnits(input.ratePerWeek);
  const cap = rateUnits(input.capRate);
  const capCents = (value * cap + 5_000n) / 10_000n;
  const raw = (value * weekly * BigInt(weeksLate) + 5_000n) / 10_000n;
  return { weeksLate, ratePerWeek: input.ratePerWeek,
    accruedExposure: minorUnitsToDecimal(raw < capCents ? raw : capCents),
    capAmount: minorUnitsToDecimal(capCents) };
}
