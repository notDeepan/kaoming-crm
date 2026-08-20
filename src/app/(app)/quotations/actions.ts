"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { getSetting } from "@/server/settings";
import { resolvedSpec } from "@/server/catalogue";
import { resolveSpecLines } from "@/lib/spec";
import { computeTotals } from "@/server/quotations";
import { generateQuoteRef, initialsOf, withRevisionSuffix } from "@/server/quoteNumber";
import { recordValue } from "@/server/remembered";
import type { UnitSystem } from "@/lib/units";

const MACHINE_TYPE_BY_FAMILY: Record<string, string> = {
  double_column: "KAO MING BRAND DOUBLE COLUMN MACHINING CENTER",
  high_speed_double_column: "KAO MING BRAND HIGH-SPEED DOUBLE COLUMN MACHINING CENTER",
  multi_face: "KAO MING BRAND DOUBLE COLUMN MULTI-CENTER",
  five_axis: "KAO MING BRAND 5-AXIS DOUBLE COLUMN MACHINING CENTER",
  vertical: "KAO MING BRAND VERTICAL MACHINING CENTER",
  radial_drill: "KAO MING BRAND HYDRAULIC RADIAL DRILLING MACHINE",
  without_atc: "KAO MING BRAND DOUBLE COLUMN MACHINING CENTER (WITHOUT ATC)",
};

// Create a draft quotation for a customer + machine, auto-filling the header and the ten spec lines.
export async function createQuotation(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user.role, "c", "quotation")) redirect("/quotations");

  const customerId = String(formData.get("customerId") ?? "");
  const machineModelId = String(formData.get("machineModelId") ?? "");
  const currency = String(formData.get("currency") ?? "USD");
  const unitSystem = (String(formData.get("unitSystem") ?? "metric")) as UnitSystem;
  if (!customerId || !machineModelId) redirect("/quotations/new");

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  const resolved = await resolvedSpec(machineModelId);
  if (!customer || !resolved) redirect("/quotations/new");
  const { model, spec } = resolved;

  const [incoterms, place, payment, validity, timeOfDelivery, sectionManager] = await Promise.all([
    getSetting<string>("default_incoterms", "FOB"),
    getSetting<string>("default_named_place", "FOB TAIWAN"),
    getSetting<string>("default_payment_terms", ""),
    getSetting<number>("default_validity_days", 90),
    getSetting<string>("default_time_of_delivery", ""),
    getSetting<string>("default_section_manager", ""),
  ]);

  const specLines = resolveSpecLines(spec, unitSystem).map((l) => ({ key: l.key, labelKey: l.labelKey, text: l.text }));
  const basePrice = currency === "TWD" ? model!.basePriceTwd : model!.basePriceUsd;

  const count = await prisma.quotation.count();
  const quoteNo = `DRAFT-${count + 1}`;

  const quote = await prisma.quotation.create({
    data: {
      quoteNo,
      revision: 1,
      customerId,
      agentId: customer.primaryAgentId,
      quoteTo: customer.primaryAgentId ? "agent" : "end_customer",
      validityDays: validity,
      validityText: "3 months",
      currency,
      status: "draft",
      preparedById: user.id,
      unitSystem,
      machineType: MACHINE_TYPE_BY_FAMILY[model!.productFamily] ?? "",
      machineConfigHeading: "",
      incoterms,
      placeOfDelivery: place || "FOB TAIWAN",
      paymentTerms: payment,
      timeOfDelivery,
      sectionManagerName: sectionManager,
      machineModelId,
      specLinesJson: specLines,
      standardAccessoriesText: model!.standardAccessories ?? model!.series?.standardAccessories ?? "",
      createdById: user.id,
      updatedById: user.id,
      lines: {
        create: [
          {
            lineNo: 1,
            lineType: "catalogue",
            lineKind: "machine",
            machineModelId,
            descriptionEn: `Model: ${model!.modelCode}`,
            quantity: 1,
            unitPrice: basePrice ?? undefined,
          },
        ],
      },
    },
  });

  await writeAudit({ userId: user.id, action: "create", entityType: "quotation", entityId: quote.id, summary: model!.modelCode });
  revalidatePath("/quotations");
  redirect(`/quotations/${quote.id}`);
}

interface LineInput { kind: string; description: string; modelOptionId?: string; machineModelId?: string; quantity: number; unitPrice: number | null }

// Full-editor save: rewrites header, spec lines and all lines from the submitted state (draft only).
export async function saveQuotation(id: string, payload: {
  header: Record<string, string>;
  specLines: { key: string; labelKey: string; text: string }[];
  lines: LineInput[];
  discountPercent: number | null;
  showDiscountOnPrint: boolean;
  unitSystem: UnitSystem;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const existing = await prisma.quotation.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { ok: false, error: "Gone." };
  if (!can(user.role, "u", "quotation")) return { ok: false, error: "Not permitted." };
  if (existing.status !== "draft") return { ok: false, error: "Issued quotations are read-only (QU-01)." };

  const h = payload.header;
  await prisma.$transaction([
    prisma.quotationLine.deleteMany({ where: { quotationId: id } }),
    prisma.quotation.update({
      where: { id },
      data: {
        machineType: h.machineType ?? null,
        machineConfigHeading: h.machineConfigHeading ?? null,
        paymentTerms: h.paymentTerms ?? null,
        placeOfDelivery: h.placeOfDelivery ?? null,
        timeOfDelivery: h.timeOfDelivery ?? null,
        validityText: h.validityText ?? null,
        sectionManagerName: h.sectionManagerName ?? null,
        notesToCustomer: h.notesToCustomer ?? null,
        standardAccessoriesText: h.standardAccessoriesText ?? null,
        quoteTo: h.quoteTo === "agent" ? "agent" : "end_customer",
        unitSystem: payload.unitSystem,
        discountPercent: payload.discountPercent ?? null,
        showDiscountOnPrint: payload.showDiscountOnPrint,
        specLinesJson: payload.specLines,
        updatedById: user.id,
        lines: {
          create: payload.lines.map((l, i) => ({
            lineNo: i + 1,
            lineType: l.kind === "custom" ? "custom" : "catalogue",
            lineKind: l.kind,
            machineModelId: l.machineModelId ?? null,
            modelOptionId: l.modelOptionId ?? null,
            descriptionEn: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice ?? undefined,
            requiresEngineeringReview: l.kind === "custom",
            engineeringReviewStatus: l.kind === "custom" ? "pending" : null,
          })),
        },
      },
    }),
  ]);

  // A4 — remember free-text values by the customer's country.
  const customer = await prisma.customer.findUnique({ where: { id: existing.customerId }, select: { country: true } });
  const country = customer?.country ?? null;
  await Promise.all([
    h.paymentTerms && recordValue("terms_of_payment", h.paymentTerms, country, user.id),
    h.timeOfDelivery && recordValue("time_of_delivery", h.timeOfDelivery, country, user.id),
    h.placeOfDelivery && recordValue("place_of_delivery", h.placeOfDelivery, country, user.id),
    h.machineType && recordValue("machine_type", h.machineType, country, user.id),
    h.machineConfigHeading && recordValue("config_heading", h.machineConfigHeading, country, user.id),
  ]);

  revalidatePath(`/quotations/${id}`);
  return { ok: true };
}

// Re-resolve the ten spec lines from the catalogue in the given unit system (A5 Q-14 / Q-02).
// Overwrites any hand-edited spec text — the caller confirms first.
export async function refillSpecs(id: string, unitSystem: UnitSystem): Promise<{ key: string; labelKey: string; text: string }[]> {
  await requireUser();
  const q = await prisma.quotation.findFirst({ where: { id, deletedAt: null }, select: { machineModelId: true } });
  if (!q?.machineModelId) return [];
  const resolved = await resolvedSpec(q.machineModelId);
  if (!resolved) return [];
  return resolveSpecLines(resolved.spec, unitSystem).map((l) => ({ key: l.key, labelKey: l.labelKey, text: l.text }));
}

// QU-01/QU-02 + QS-01 — freeze the reference, snapshot the configuration, make it read-only.
export async function issueQuotation(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const q = await prisma.quotation.findFirst({ where: { id, deletedAt: null }, include: { lines: { orderBy: { lineNo: "asc" } }, machineModel: { include: { series: true } } } });
  if (!q) return { ok: false, error: "Gone." };
  if (!can(user.role, "u", "quotation")) return { ok: false, error: "Not permitted." };
  if (q.status !== "draft") return { ok: false, error: "Already issued." };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { fullName: true, username: true } });
  const initials = initialsOf(dbUser?.fullName ?? "", dbUser?.username ?? "XX");
  const now = new Date();
  const baseRef = await generateQuoteRef(user.id, initials, now);
  const refNo = withRevisionSuffix(baseRef, q.revision);

  const validUntil = q.validityDays ? new Date(now.getTime() + q.validityDays * 86400_000) : null;
  const totals = computeTotals(q.lines, q.discountPercent ? Number(q.discountPercent) : null, q.currency);

  // QS-01 — a complete frozen copy; later catalogue edits can never alter this quotation.
  const snapshot = {
    frozenAt: now.toISOString(),
    refNo,
    modelCode: q.machineModel?.modelCode ?? null,
    seriesCode: q.machineModel?.series?.seriesCode ?? null,
    machineType: q.machineType,
    machineConfigHeading: q.machineConfigHeading,
    specLines: q.specLinesJson,
    standardAccessories: q.standardAccessoriesText,
    lines: q.lines.map((l) => ({ kind: l.lineKind, description: l.descriptionEn, quantity: Number(l.quantity), unitPrice: l.unitPrice == null ? null : Number(l.unitPrice) })),
    totals,
    currency: q.currency,
    unitSystem: q.unitSystem,
  };

  const finalQuoteNo = q.quoteNo.startsWith("DRAFT-") ? baseRef : q.quoteNo;

  await prisma.quotation.update({
    where: { id },
    data: {
      status: "issued",
      refNo,
      quoteNo: finalQuoteNo,
      issueDate: now,
      validUntil,
      // round-trip to a plain JSON value for the frozen snapshot (§16.6)
      configurationSnapshot: JSON.parse(JSON.stringify(snapshot)),
      updatedById: user.id,
    },
  });
  await writeAudit({ userId: user.id, action: "quotation_issue", entityType: "quotation", entityId: id, summary: refNo });
  revalidatePath(`/quotations/${id}`);
  return { ok: true };
}

// QU-02 — editing an issued quote creates revision n+1 and supersedes the previous.
export async function reviseQuotation(id: string): Promise<void> {
  const user = await requireUser();
  const q = await prisma.quotation.findFirst({ where: { id, deletedAt: null }, include: { lines: { orderBy: { lineNo: "asc" } } } });
  if (!q || !can(user.role, "u", "quotation")) redirect(`/quotations/${id}`);

  const next = await prisma.quotation.create({
    data: {
      quoteNo: q!.quoteNo,
      revision: q!.revision + 1,
      previousRevisionId: q!.id,
      opportunityId: q!.opportunityId,
      customerId: q!.customerId,
      agentId: q!.agentId,
      quoteTo: q!.quoteTo,
      validityDays: q!.validityDays,
      validityText: q!.validityText,
      currency: q!.currency,
      status: "draft",
      preparedById: user.id,
      unitSystem: q!.unitSystem,
      machineType: q!.machineType,
      machineConfigHeading: q!.machineConfigHeading,
      incoterms: q!.incoterms,
      placeOfDelivery: q!.placeOfDelivery,
      paymentTerms: q!.paymentTerms,
      timeOfDelivery: q!.timeOfDelivery,
      sectionManagerName: q!.sectionManagerName,
      machineModelId: q!.machineModelId,
      specLinesJson: q!.specLinesJson ?? undefined,
      standardAccessoriesText: q!.standardAccessoriesText,
      discountPercent: q!.discountPercent,
      showDiscountOnPrint: q!.showDiscountOnPrint,
      notesToCustomer: q!.notesToCustomer,
      createdById: user.id,
      updatedById: user.id,
      lines: {
        create: q!.lines.map((l) => ({
          lineNo: l.lineNo, lineType: l.lineType, lineKind: l.lineKind,
          machineModelId: l.machineModelId, modelOptionId: l.modelOptionId,
          descriptionEn: l.descriptionEn, descriptionZh: l.descriptionZh,
          quantity: l.quantity, unitPrice: l.unitPrice ?? undefined, discountPercent: l.discountPercent,
        })),
      },
    },
  });
  await prisma.quotation.update({ where: { id }, data: { status: "superseded", updatedById: user.id } });
  await writeAudit({ userId: user.id, action: "quotation_revise", entityType: "quotation", entityId: next.id, summary: `rev ${next.revision}` });
  revalidatePath("/quotations");
  redirect(`/quotations/${next.id}`);
}
