"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import {
  AGENT_TYPES,
  AGENT_STATUSES,
  EXCLUSIVITY,
  PRICING_BASIS,
  CURRENCIES,
  WORKING_LANGUAGES,
  PRODUCT_FAMILIES,
} from "@/lib/enums";

// Empty strings from HTML forms become undefined so optional fields stay null.
const optStr = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional());
const optNum = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(v)),
  z.number().optional()
);
const optDate = z.preprocess(
  (v) => (v === "" || v == null ? undefined : new Date(String(v))),
  z.date().optional()
);

const AgentSchema = z.object({
  agentCode: z.string().trim().min(1),
  companyNameEn: z.string().trim().min(1),
  companyNameLocal: optStr,
  agentType: z.enum(AGENT_TYPES),
  status: z.enum(AGENT_STATUSES),
  website: optStr,
  ownerUserId: z.string().min(1),
  exclusivity: z.preprocess((v) => (v === "" ? undefined : v), z.enum(EXCLUSIVITY).optional()),
  pricingBasis: z.preprocess((v) => (v === "" ? undefined : v), z.enum(PRICING_BASIS).optional()),
  preferredCurrency: z.preprocess((v) => (v === "" ? undefined : v), z.enum(CURRENCIES).optional()),
  workingLanguage: z.preprocess((v) => (v === "" ? undefined : v), z.enum(WORKING_LANGUAGES).optional()),
  commissionPercent: optNum,
  standardDiscountPercent: optNum,
  contactCadenceDays: optNum,
  paymentTerms: optStr,
  preferredIncoterms: optStr,
  territoryNotes: optStr,
  notes: optStr,
  agreementStartDate: optDate,
  agreementEndDate: optDate,
  firstAppointedDate: optDate,
});

export interface AgentFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function parse(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const territories = formData.getAll("territories").map(String).filter(Boolean);
  const families = formData.getAll("exclusiveProductFamilies").map(String).filter(Boolean);
  return { parsed: AgentSchema.safeParse(raw), territories, families };
}

export async function createAgent(
  _prev: AgentFormState,
  formData: FormData
): Promise<AgentFormState> {
  const user = await requireUser();
  if (!can(user.role, "c", "agent")) return { error: "You cannot create agents." };

  const { parsed, territories, families } = parse(formData);
  if (!parsed.success) {
    return { error: "Check the required fields.", fieldErrors: flatten(parsed.error) };
  }
  const d = parsed.data;

  const dupe = await prisma.agent.findFirst({ where: { agentCode: d.agentCode, deletedAt: null } });
  if (dupe) return { fieldErrors: { agentCode: "This agent code is already in use." } };

  const validFamilies = families.filter((f) => (PRODUCT_FAMILIES as readonly string[]).includes(f));

  const agent = await prisma.agent.create({
    data: {
      ...toData(d),
      exclusiveProductFamilies: validFamilies.length ? validFamilies : undefined,
      createdById: user.id,
      updatedById: user.id,
      territories: {
        create: territories.map((c) => ({ countryCode: c, exclusivity: d.exclusivity })),
      },
    },
  });

  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "agent",
    entityId: agent.id,
    after: { agentCode: agent.agentCode, companyNameEn: agent.companyNameEn },
    summary: agent.agentCode,
  });

  revalidatePath("/agents");
  redirect(`/agents/${agent.id}`);
}

export async function updateAgent(
  id: string,
  _prev: AgentFormState,
  formData: FormData
): Promise<AgentFormState> {
  const user = await requireUser();
  if (!can(user.role, "u", "agent")) return { error: "You cannot edit agents." };

  const existing = await prisma.agent.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { error: "This agent no longer exists." };

  const { parsed, territories, families } = parse(formData);
  if (!parsed.success) {
    return { error: "Check the required fields.", fieldErrors: flatten(parsed.error) };
  }
  const d = parsed.data;

  if (d.agentCode !== existing.agentCode) {
    const dupe = await prisma.agent.findFirst({
      where: { agentCode: d.agentCode, deletedAt: null, id: { not: id } },
    });
    if (dupe) return { fieldErrors: { agentCode: "This agent code is already in use." } };
  }

  const validFamilies = families.filter((f) => (PRODUCT_FAMILIES as readonly string[]).includes(f));

  await prisma.$transaction([
    prisma.agentTerritory.deleteMany({ where: { agentId: id } }),
    prisma.agent.update({
      where: { id },
      data: {
        ...toData(d),
        exclusiveProductFamilies: validFamilies.length ? validFamilies : Prisma.JsonNull,
        updatedById: user.id,
        territories: {
          create: territories.map((c) => ({ countryCode: c, exclusivity: d.exclusivity })),
        },
      },
    }),
  ]);

  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "agent",
    entityId: id,
    before: { agentCode: existing.agentCode, status: existing.status },
    after: { agentCode: d.agentCode, status: d.status },
    summary: d.agentCode,
  });

  revalidatePath("/agents");
  revalidatePath(`/agents/${id}`);
  redirect(`/agents/${id}`);
}

// AG-07 — deactivating/deleting an agent never orphans history; soft delete only.
export async function deleteAgent(id: string): Promise<void> {
  const user = await requireUser();
  if (!can(user.role, "d", "agent")) return;
  await prisma.agent.update({ where: { id }, data: { deletedAt: new Date(), updatedById: user.id } });
  await writeAudit({ userId: user.id, action: "delete", entityType: "agent", entityId: id });
  revalidatePath("/agents");
  redirect("/agents");
}

function toData(d: z.infer<typeof AgentSchema>) {
  return {
    agentCode: d.agentCode,
    companyNameEn: d.companyNameEn,
    companyNameLocal: d.companyNameLocal,
    agentType: d.agentType,
    status: d.status,
    website: d.website,
    ownerUserId: d.ownerUserId,
    exclusivity: d.exclusivity,
    pricingBasis: d.pricingBasis,
    preferredCurrency: d.preferredCurrency,
    workingLanguage: d.workingLanguage,
    commissionPercent: d.commissionPercent,
    standardDiscountPercent: d.standardDiscountPercent,
    contactCadenceDays: d.contactCadenceDays,
    paymentTerms: d.paymentTerms,
    preferredIncoterms: d.preferredIncoterms,
    territoryNotes: d.territoryNotes,
    notes: d.notes,
    agreementStartDate: d.agreementStartDate,
    agreementEndDate: d.agreementEndDate,
    firstAppointedDate: d.firstAppointedDate,
  };
}

function flatten(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
