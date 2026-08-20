"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { INDUSTRIES, CUSTOMER_TYPES } from "@/lib/enums";

const optStr = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional());
const optNum = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().optional());

const CustomerSchema = z.object({
  customerCode: optStr,
  companyNameEn: z.string().trim().min(1),
  companyNameLocal: optStr,
  country: z.string().trim().min(1),
  city: optStr,
  addressEn: optStr,
  addressLocal: optStr,
  industry: z.preprocess((v) => (v === "" ? undefined : v), z.enum(INDUSTRIES).optional()),
  customerType: z.enum(CUSTOMER_TYPES),
  primaryAgentId: optStr,
  ownerUserId: z.string().min(1),
  website: optStr,
  employeeCount: optNum,
  existingMachinesNotes: optStr,
  notes: optStr,
});

export interface CustomerFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
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

function flatten(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const user = await requireUser();
  if (!can(user.role, "c", "customer")) return { error: "You cannot create customers." };

  const parsed = CustomerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Check the required fields.", fieldErrors: flatten(parsed.error) };
  const d = parsed.data;

  const code = d.customerCode?.trim() || (await nextCustomerCode());
  const dupe = await prisma.customer.findFirst({ where: { customerCode: code, deletedAt: null } });
  if (dupe) return { fieldErrors: { customerCode: "This customer code is already in use." } };

  const customer = await prisma.customer.create({
    data: {
      customerCode: code,
      companyNameEn: d.companyNameEn,
      companyNameLocal: d.companyNameLocal,
      country: d.country,
      city: d.city,
      addressEn: d.addressEn,
      addressLocal: d.addressLocal,
      industry: d.industry,
      customerType: d.customerType,
      primaryAgentId: d.primaryAgentId || null,
      ownerUserId: d.ownerUserId,
      website: d.website,
      employeeCount: d.employeeCount,
      existingMachinesNotes: d.existingMachinesNotes,
      notes: d.notes,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  await writeAudit({
    userId: user.id, action: "create", entityType: "customer", entityId: customer.id,
    after: { customerCode: code, companyNameEn: d.companyNameEn }, summary: code,
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(
  id: string,
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const user = await requireUser();
  if (!can(user.role, "u", "customer")) return { error: "You cannot edit customers." };

  const existing = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { error: "This customer no longer exists." };

  const parsed = CustomerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Check the required fields.", fieldErrors: flatten(parsed.error) };
  const d = parsed.data;
  const code = d.customerCode?.trim() || existing.customerCode;

  if (code !== existing.customerCode) {
    const dupe = await prisma.customer.findFirst({ where: { customerCode: code, deletedAt: null, id: { not: id } } });
    if (dupe) return { fieldErrors: { customerCode: "This customer code is already in use." } };
  }

  await prisma.customer.update({
    where: { id },
    data: {
      customerCode: code,
      companyNameEn: d.companyNameEn,
      companyNameLocal: d.companyNameLocal,
      country: d.country,
      city: d.city,
      addressEn: d.addressEn,
      addressLocal: d.addressLocal,
      industry: d.industry,
      customerType: d.customerType,
      primaryAgentId: d.primaryAgentId || null,
      ownerUserId: d.ownerUserId,
      website: d.website,
      employeeCount: d.employeeCount,
      existingMachinesNotes: d.existingMachinesNotes,
      notes: d.notes,
      updatedById: user.id,
    },
  });

  await writeAudit({
    userId: user.id, action: "update", entityType: "customer", entityId: id,
    before: { companyNameEn: existing.companyNameEn }, after: { companyNameEn: d.companyNameEn }, summary: code,
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: string): Promise<void> {
  const user = await requireUser();
  if (!can(user.role, "d", "customer")) return;
  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), updatedById: user.id } });
  await writeAudit({ userId: user.id, action: "delete", entityType: "customer", entityId: id });
  revalidatePath("/customers");
  redirect("/customers");
}
