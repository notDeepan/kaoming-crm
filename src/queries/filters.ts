import { z } from 'zod';

export const reportBases = ['order', 'shipment', 'acceptance', 'payment'] as const;
export const reportMeasures = ['bookings', 'revenue', 'cash', 'order_book', 'count'] as const;
export type ReportBasis = typeof reportBases[number];
export type ReportMeasure = typeof reportMeasures[number];
export type ReportFilters = {
  from: string;
  to: string;
  basis: ReportBasis;
  agent: string;
  country: string;
  region: string;
  model: string;
  measure: ReportMeasure;
  currency: string;
};

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.string().uuid();
export function parseReportFilters(input: Record<string, string | string[] | undefined>, now = new Date()): ReportFilters {
  const today = now.toISOString().slice(0, 10);
  const previous = new Date(now);
  previous.setUTCFullYear(previous.getUTCFullYear() - 1);
  const from = date.safeParse(input.from).success ? input.from as string : previous.toISOString().slice(0, 10);
  const to = date.safeParse(input.to).success ? input.to as string : today;
  return {
    from: from <= to ? from : to,
    to,
    basis: z.enum(reportBases).catch('order').parse(input.basis),
    agent: uuid.safeParse(input.agent).success ? input.agent as string : '',
    country: z.string().regex(/^[A-Z]{2}$/).catch('').parse(input.country),
    region: z.string().regex(/^[a-z_]+$/).catch('').parse(input.region),
    model: uuid.safeParse(input.model).success ? input.model as string : '',
    measure: z.enum(reportMeasures).catch('revenue').parse(input.measure),
    currency: z.string().regex(/^[A-Z]{3}$/).catch('USD').parse(input.currency),
  };
}

export function iso(value: Date | string | null | undefined): string | null {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value ?? null;
}
export function within(value: Date | string | null | undefined, filters: ReportFilters): boolean {
  const dateValue = iso(value);
  return dateValue !== null && dateValue >= filters.from && dateValue <= filters.to;
}
