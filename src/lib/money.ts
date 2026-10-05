const MAX_MINOR_UNITS = 99_999_999_999_999n;

export function parseDecimalToMinorUnits(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error('Money must have at most two decimal places');
  const whole = BigInt(match[2]!);
  const fraction = BigInt((match[3] ?? '').padEnd(2, '0'));
  const minorUnits = (whole * 100n + fraction) * (match[1] === '-' ? -1n : 1n);
  if (minorUnits > MAX_MINOR_UNITS || minorUnits < -MAX_MINOR_UNITS) {
    throw new Error('Money exceeds numeric(14,2) range');
  }
  return minorUnits;
}

export function minorUnitsToDecimal(minorUnits: bigint): string {
  const sign = minorUnits < 0n ? '-' : '';
  const absolute = minorUnits < 0n ? -minorUnits : minorUnits;
  return `${sign}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
}
