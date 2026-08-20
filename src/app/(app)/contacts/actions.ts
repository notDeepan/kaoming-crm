"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { CONTACT_PARENTS, ROLES_IN_DEAL, LANGUAGES } from "@/lib/enums";

const optStr = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional());

const ContactSchema = z
  .object({
    parentType: z.enum(CONTACT_PARENTS),
    agentId: optStr,
    customerId: optStr,
    fullName: z.string().trim().min(1),
    nameLocal: optStr,
    jobTitle: optStr,
    roleInDeal: z.preprocess((v) => (v === "" ? undefined : v), z.enum(ROLES_IN_DEAL).optional()),
    email: optStr,
    phone: optStr,
    mobile: optStr,
    messagingHandle: optStr,
    preferredLanguage: z.preprocess((v) => (v === "" ? undefined : v), z.enum(LANGUAGES).optional()),
    isPrimary: z.preprocess((v) => v === "on" || v === "true", z.boolean()).optional(),
    notes: optStr,
  })
  .refine((d) => (d.parentType === "agent" ? !!d.agentId : !!d.customerId), {
    message: "Choose the company this contact belongs to.",
    path: ["parentId"],
  });

export interface ContactFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function flatten(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

// One primary per parent — clear the flag on siblings when this one is set (spec: is_primary).
async function ensureSinglePrimary(parentType: string, parentId: string, keepId?: string) {
  const where =
    parentType === "agent"
      ? { agentId: parentId, deletedAt: null, id: { not: keepId } }
      : { customerId: parentId, deletedAt: null, id: { not: keepId } };
  await prisma.contact.updateMany({ where, data: { isPrimary: false } });
}

export async function createContact(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const user = await requireUser();
  if (!can(user.role, "c", "contact")) return { error: "You cannot create contacts." };

  const parsed = ContactSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Check the required fields.", fieldErrors: flatten(parsed.error) };
  const d = parsed.data;
  const agentId = d.parentType === "agent" ? d.agentId! : undefined;
  const customerId = d.parentType === "customer" ? d.customerId! : undefined;

  const contact = await prisma.contact.create({
    data: {
      parentType: d.parentType,
      agentId,
      customerId,
      fullName: d.fullName,
      nameLocal: d.nameLocal,
      jobTitle: d.jobTitle,
      roleInDeal: d.roleInDeal,
      email: d.email,
      phone: d.phone,
      mobile: d.mobile,
      messagingHandle: d.messagingHandle,
      preferredLanguage: d.preferredLanguage,
      isPrimary: d.isPrimary ?? false,
      notes: d.notes,
      createdById: user.id,
      updatedById: user.id,
    },
  });
  if (d.isPrimary) await ensureSinglePrimary(d.parentType, (agentId ?? customerId)!, contact.id);

  await writeAudit({ userId: user.id, action: "create", entityType: "contact", entityId: contact.id, summary: d.fullName });
  revalidatePath("/contacts");
  redirect(`/contacts/${contact.id}`);
}

export async function updateContact(
  id: string,
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const user = await requireUser();
  if (!can(user.role, "u", "contact")) return { error: "You cannot edit contacts." };
  const existing = await prisma.contact.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { error: "This contact no longer exists." };

  const parsed = ContactSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Check the required fields.", fieldErrors: flatten(parsed.error) };
  const d = parsed.data;
  const agentId = d.parentType === "agent" ? d.agentId! : null;
  const customerId = d.parentType === "customer" ? d.customerId! : null;

  await prisma.contact.update({
    where: { id },
    data: {
      parentType: d.parentType,
      agentId,
      customerId,
      fullName: d.fullName,
      nameLocal: d.nameLocal,
      jobTitle: d.jobTitle,
      roleInDeal: d.roleInDeal,
      email: d.email,
      phone: d.phone,
      mobile: d.mobile,
      messagingHandle: d.messagingHandle,
      preferredLanguage: d.preferredLanguage,
      isPrimary: d.isPrimary ?? false,
      notes: d.notes,
      updatedById: user.id,
    },
  });
  if (d.isPrimary) await ensureSinglePrimary(d.parentType, (agentId ?? customerId)!, id);

  await writeAudit({ userId: user.id, action: "update", entityType: "contact", entityId: id, summary: d.fullName });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function deleteContact(id: string): Promise<void> {
  const user = await requireUser();
  if (!can(user.role, "d", "contact")) return;
  await prisma.contact.update({ where: { id }, data: { deletedAt: new Date(), updatedById: user.id } });
  await writeAudit({ userId: user.id, action: "delete", entityType: "contact", entityId: id });
  revalidatePath("/contacts");
  redirect("/contacts");
}
