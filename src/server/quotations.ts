import "server-only";
import { prisma } from "@/lib/prisma";

export async function listQuotations() {
  return prisma.quotation.findMany({
    where: { deletedAt: null },
    include: {
      customer: { select: { companyNameEn: true, customerCode: true } },
      machineModel: { select: { modelCode: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getQuotation(id: string) {
  return prisma.quotation.findFirst({
    where: { id, deletedAt: null },
    include: {
      customer: true,
      agent: true,
      machineModel: { include: { series: true } },
      lines: { orderBy: { lineNo: "asc" } },
    },
  });
}

/** Totals per A7: TBD lines (null price) are excluded and the total is flagged incomplete. */
export interface Totals {
  subtotal: number;
  discountAmount: number;
  net: number;
  hasTbd: boolean;
  currency: string;
}

export function computeTotals(
  lines: { unitPrice: unknown; quantity: unknown; lineTotal?: unknown }[],
  discountPercent: number | null,
  currency: string
): Totals {
  let subtotal = 0;
  let hasTbd = false;
  for (const l of lines) {
    if (l.unitPrice == null) {
      hasTbd = true;
      continue; // never treated as zero (Q-23)
    }
    subtotal += Number(l.unitPrice) * Number(l.quantity ?? 1);
  }
  const discountAmount = discountPercent ? (subtotal * discountPercent) / 100 : 0;
  return { subtotal, discountAmount, net: subtotal - discountAmount, hasTbd, currency };
}
