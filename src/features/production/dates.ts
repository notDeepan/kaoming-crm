const dayMs = 86_400_000;

export function dateUtc(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('Enter a valid calendar date');
  }
  return date;
}

export function addMonths(value: string, months: number) {
  const date = dateUtc(value);
  const day = date.getUTCDate();
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((dateUtc(to).getTime() - dateUtc(from).getTime()) / dayMs);
}

export function addDays(value: string, days: number) {
  const date = dateUtc(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function progressDueDates(issuedAt: Date, contractualDate: string) {
  const issuedDate = issuedAt.toISOString().slice(0, 10);
  const end = addMonths(contractualDate, 6);
  const dates: string[] = [];
  for (let month = 1; month <= 240; month++) {
    const due = addMonths(issuedDate, month);
    if (due > end) break;
    dates.push(due);
  }
  return dates;
}

export function escalationForSlip(slipDays: number) {
  return slipDays > 60 ? 'gm' : slipDays > 30 ? 'dept_manager' : 'none';
}

export function warrantyEnd(acceptedAt: string, months: number) {
  return addMonths(acceptedAt, months);
}

export function requiresShippingMark(weightKg: number, dimensionsMm: number[]) {
  return weightKg > 100 || dimensionsMm.some((dimension) => dimension > 2500);
}
