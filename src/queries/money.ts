import { minorUnitsToDecimal, parseDecimalToMinorUnits } from '@/lib/money';

export function cents(value: string | null | undefined): bigint {
  return value == null ? 0n : parseDecimalToMinorUnits(value);
}
export function money(value: bigint, currency: string): string {
  const negative = value < 0n;
  const decimal = minorUnitsToDecimal(negative ? -value : value);
  const [whole, fraction] = decimal.split('.');
  return `${negative ? '−' : ''}${currency} ${Number(whole).toLocaleString('en-US')}.${fraction}`;
}
export function lowConfidence(n: number) {
  return n < 5;
}
