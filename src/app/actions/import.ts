"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import {
  AGENT_TYPES, AGENT_STATUSES, CUSTOMER_TYPES, CONTACT_PARENTS,
  INDUSTRIES, CURRENCIES, EXCLUSIVITY, ROLES_IN_DEAL,
} from "@/lib/enums";
import { COUNTRY_CODES } from "@/lib/countries";

export type ImportEntity = "agent" | "customer" | "contact";

interface ColumnSpec { header: string; required?: boolean; example: string }

const COLUMNS: Record<ImportEntity, ColumnSpec[]> = {
  agent: [
    { header: "agent_code", required: true, example: "TR-02" },
    { header: "company_name_en", required: true, example: "Example Machine Tools" },
    { header: "agent_type", required: true, example: "agent" },
    { header: "status", required: true, example: "active" },
    { header: "territory_countries", example: "TR PL" },
    { header: "company_name_local", example: "" },
    { header: "exclusivity", example: "non_exclusive" },
    { header: "commission_percent", example: "8" },
    { header: "preferred_currency", example: "USD" },
    { header: "contact_cadence_days", example: "30" },
    { header: "owner_email", example: "deepan@kaoming.com" },
  ],
  customer: [
    { header: "company_name_en", required: true, example: "Example Manufacturing" },
    { header: "country", required: true, example: "IN" },
    { header: "customer_type", required: true, example: "prospect" },
    { header: "customer_code", example: "(auto)" },
    { header: "company_name_local", example: "" },
    { header: "city", example: "Pune" },
    { header: "industry", example: "automotive" },
    { header: "primary_agent_code", example: "IN-01" },
    { header: "owner_email", example: "deepan@kaoming.com" },
  ],
  contact: [
    { header: "parent_type", required: true, example: "customer" },
    { header: "parent_code", required: true, example: "C-0001" },
    { header: "full_name", required: true, example: "Jane Doe" },
    { header: "job_title", example: "Purchasing" },
    { header: "role_in_deal", example: "purchasing" },
    { header: "email", example: "jane@example.com" },
    { header: "phone", example: "+90 000 000" },
    { header: "is_primary", example: "false" },
  ],
};

// ── Template download (SL-07) ───────────────────────────────────────────────────
export async function getTemplate(entity: ImportEntity): Promise<{ base64: string; filename: string }> {
  await requireUser();
  const cols = COLUMNS[entity];
  const aoa = [cols.map((c) => c.header), cols.map((c) => c.example)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, entity);
  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  return { base64, filename: `${entity}-import-template.xlsx` };
}

export interface PreviewRow {
  rowNo: number;
  cells: Record<string, string>;
  errors: string[];
  dupId?: string;
  dupLabel?: string;
  suggested: "create" | "update" | "skip";
}
export interface PreviewResult {
  headers: string[];
  rows: PreviewRow[];
  validCount: number;
  invalidCount: number;
  error?: string;
}

function parseSheet(base64: string): Record<string, string>[] {
  const wb = XLSX.read(base64, { type: "base64" });
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return json.map((r) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) out[String(k).trim()] = String(v ?? "").trim();
    return out;
  });
}

interface Ctx {
  userByEmail: Map<string, string>;
  agentByCode: Map<string, string>;
  customerByCode: Map<string, string>;
  currentUserId: string;
}

async function buildCtx(currentUserId: string): Promise<Ctx> {
  const [users, agents, customers] = await Promise.all([
    prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, email: true } }),
    prisma.agent.findMany({ where: { deletedAt: null }, select: { id: true, agentCode: true } }),
    prisma.customer.findMany({ where: { deletedAt: null }, select: { id: true, customerCode: true } }),
  ]);
  return {
    userByEmail: new Map(users.map((u) => [u.email.toLowerCase(), u.id])),
    agentByCode: new Map(agents.map((a) => [a.agentCode.toLowerCase(), a.id])),
    customerByCode: new Map(customers.map((c) => [c.customerCode.toLowerCase(), c.id])),
    currentUserId,
  };
}

function inEnum(v: string, list: readonly string[]): boolean {
  return list.includes(v);
}

/** Validate one row for an entity. Returns errors and, if a duplicate exists, its id. */
async function validateRow(entity: ImportEntity, r: Record<string, string>, ctx: Ctx) {
  const g = (k: string): string => r[k] ?? "";
  const errors: string[] = [];
  let dupId: string | undefined;
  let dupLabel: string | undefined;

  if (entity === "agent") {
    if (!g("agent_code")) errors.push("agent_code is required");
    if (!g("company_name_en")) errors.push("company_name_en is required");
    if (!inEnum(g("agent_type"), AGENT_TYPES)) errors.push(`agent_type must be one of ${AGENT_TYPES.join(", ")}`);
    if (!inEnum(g("status"), AGENT_STATUSES)) errors.push(`status must be one of ${AGENT_STATUSES.join(", ")}`);
    if (g("exclusivity") && !inEnum(g("exclusivity"), EXCLUSIVITY)) errors.push("exclusivity is not valid");
    if (g("preferred_currency") && !inEnum(g("preferred_currency"), CURRENCIES)) errors.push("preferred_currency must be USD or TWD");
    if (g("commission_percent") && Number.isNaN(Number(g("commission_percent")))) errors.push("commission_percent must be a number");
    const countries = g("territory_countries").split(/[\s,]+/).filter(Boolean);
    for (const c of countries) if (!inEnum(c.toUpperCase(), COUNTRY_CODES)) errors.push(`territory country ${c} is not a known code`);
    if (g("owner_email") && !ctx.userByEmail.has(g("owner_email").toLowerCase())) errors.push(`owner_email ${g("owner_email")} matches no user`);
    if (g("agent_code")) {
      dupId = ctx.agentByCode.get(g("agent_code").toLowerCase());
      if (dupId) dupLabel = g("agent_code");
    }
  } else if (entity === "customer") {
    if (!g("company_name_en")) errors.push("company_name_en is required");
    if (!inEnum(g("country").toUpperCase(), COUNTRY_CODES)) errors.push("country must be a known ISO code");
    if (!inEnum(g("customer_type"), CUSTOMER_TYPES)) errors.push(`customer_type must be one of ${CUSTOMER_TYPES.join(", ")}`);
    if (g("industry") && !inEnum(g("industry"), INDUSTRIES)) errors.push("industry is not valid");
    if (g("primary_agent_code") && !ctx.agentByCode.has(g("primary_agent_code").toLowerCase())) errors.push(`primary_agent_code ${g("primary_agent_code")} matches no agent`);
    if (g("owner_email") && !ctx.userByEmail.has(g("owner_email").toLowerCase())) errors.push(`owner_email ${g("owner_email")} matches no user`);
    if (g("customer_code") && g("customer_code") !== "(auto)") {
      dupId = ctx.customerByCode.get(g("customer_code").toLowerCase());
      if (dupId) dupLabel = g("customer_code");
    }
  } else {
    if (!inEnum(g("parent_type"), CONTACT_PARENTS)) errors.push("parent_type must be agent or customer");
    if (!g("full_name")) errors.push("full_name is required");
    if (g("role_in_deal") && !inEnum(g("role_in_deal"), ROLES_IN_DEAL)) errors.push("role_in_deal is not valid");
    if (g("parent_type") === "agent") {
      if (!ctx.agentByCode.has(g("parent_code").toLowerCase())) errors.push(`parent_code ${g("parent_code")} matches no agent`);
    } else if (g("parent_type") === "customer") {
      if (!ctx.customerByCode.has(g("parent_code").toLowerCase())) errors.push(`parent_code ${g("parent_code")} matches no customer`);
    }
  }

  return { errors, dupId, dupLabel };
}

export async function previewImport(entity: ImportEntity, base64: string): Promise<PreviewResult> {
  const user = await requireUser();
  if (!can(user.role, "c", entity)) return { headers: [], rows: [], validCount: 0, invalidCount: 0, error: "You cannot import this." };

  const headers = COLUMNS[entity].map((c) => c.header);
  const raw = parseSheet(base64);
  const ctx = await buildCtx(user.id);

  const rows: PreviewRow[] = [];
  let valid = 0;
  let invalid = 0;
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]!;
    const { errors, dupId, dupLabel } = await validateRow(entity, r, ctx);
    if (errors.length) invalid++;
    else valid++;
    rows.push({
      rowNo: i + 2, // header is row 1
      cells: r,
      errors,
      dupId,
      dupLabel,
      suggested: errors.length ? "skip" : dupId ? "update" : "create",
    });
  }
  return { headers, rows, validCount: valid, invalidCount: invalid };
}

export interface CommitDecision { rowNo: number; action: "create" | "update" | "skip" }
export interface CommitResult { imported: number; skipped: number; error?: string }

export async function commitImport(
  entity: ImportEntity,
  base64: string,
  decisions: CommitDecision[]
): Promise<CommitResult> {
  const user = await requireUser();
  if (!can(user.role, "c", entity)) return { imported: 0, skipped: 0, error: "You cannot import this." };

  const raw = parseSheet(base64);
  const ctx = await buildCtx(user.id);
  const decisionByRow = new Map(decisions.map((d) => [d.rowNo, d.action]));

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < raw.length; i++) {
    const rowNo = i + 2;
    const action = decisionByRow.get(rowNo) ?? "create";
    const r = raw[i]!;
    const { errors, dupId } = await validateRow(entity, r, ctx);
    if (action === "skip" || errors.length) {
      skipped++;
      continue;
    }
    await commitRow(entity, r, action, dupId, ctx);
    imported++;
  }

  await writeAudit({ userId: user.id, action: "create", entityType: entity, summary: `Excel import: ${imported} imported, ${skipped} skipped` });
  revalidatePath(`/${entity}s`);
  return { imported, skipped };
}

async function nextCustomerCode(): Promise<string> {
  const last = await prisma.customer.findFirst({
    where: { customerCode: { startsWith: "C-" } },
    orderBy: { customerCode: "desc" },
    select: { customerCode: true },
  });
  const n = last ? Number(last.customerCode.slice(2)) + 1 : 1;
  return `C-${String(n).padStart(4, "0")}`;
}

async function commitRow(
  entity: ImportEntity,
  r: Record<string, string>,
  action: "create" | "update",
  dupId: string | undefined,
  ctx: Ctx
) {
  const g = (k: string): string => r[k] ?? "";
  if (entity === "agent") {
    const owner = g("owner_email") ? ctx.userByEmail.get(g("owner_email").toLowerCase())! : ctx.currentUserId;
    const countries = g("territory_countries").split(/[\s,]+/).filter(Boolean).map((c) => c.toUpperCase());
    const data = {
      companyNameEn: g("company_name_en"),
      companyNameLocal: g("company_name_local") || null,
      agentType: g("agent_type"),
      status: g("status"),
      exclusivity: g("exclusivity") || null,
      commissionPercent: g("commission_percent") ? Number(g("commission_percent")) : null,
      preferredCurrency: g("preferred_currency") || null,
      contactCadenceDays: g("contact_cadence_days") ? Number(g("contact_cadence_days")) : null,
      ownerUserId: owner,
      updatedById: ctx.currentUserId,
    };
    if (action === "update" && dupId) {
      await prisma.$transaction([
        prisma.agentTerritory.deleteMany({ where: { agentId: dupId } }),
        prisma.agent.update({
          where: { id: dupId },
          data: { ...data, territories: { create: countries.map((c) => ({ countryCode: c })) } },
        }),
      ]);
    } else {
      await prisma.agent.create({
        data: {
          agentCode: g("agent_code"), ...data, createdById: ctx.currentUserId,
          territories: { create: countries.map((c) => ({ countryCode: c })) },
        },
      });
    }
  } else if (entity === "customer") {
    const owner = g("owner_email") ? ctx.userByEmail.get(g("owner_email").toLowerCase())! : ctx.currentUserId;
    const primaryAgentId = g("primary_agent_code") ? ctx.agentByCode.get(g("primary_agent_code").toLowerCase()) ?? null : null;
    const data = {
      companyNameEn: g("company_name_en"),
      companyNameLocal: g("company_name_local") || null,
      country: g("country").toUpperCase(),
      city: g("city") || null,
      industry: g("industry") || null,
      customerType: g("customer_type"),
      primaryAgentId,
      ownerUserId: owner,
      updatedById: ctx.currentUserId,
    };
    if (action === "update" && dupId) {
      await prisma.customer.update({ where: { id: dupId }, data });
    } else {
      const code = g("customer_code") && g("customer_code") !== "(auto)" ? g("customer_code") : await nextCustomerCode();
      await prisma.customer.create({ data: { customerCode: code, ...data, createdById: ctx.currentUserId } });
    }
  } else {
    const isAgent = g("parent_type") === "agent";
    const parentId = isAgent
      ? ctx.agentByCode.get(g("parent_code").toLowerCase())
      : ctx.customerByCode.get(g("parent_code").toLowerCase());
    await prisma.contact.create({
      data: {
        parentType: g("parent_type"),
        agentId: isAgent ? parentId : undefined,
        customerId: isAgent ? undefined : parentId,
        fullName: g("full_name"),
        jobTitle: g("job_title") || null,
        roleInDeal: g("role_in_deal") || null,
        email: g("email") || null,
        phone: g("phone") || null,
        isPrimary: g("is_primary").toLowerCase() === "true",
        createdById: ctx.currentUserId,
      },
    });
  }
}
