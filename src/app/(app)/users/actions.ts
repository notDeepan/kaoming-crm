"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { writeAudit } from "@/lib/audit";
import { ROLES, LANGUAGES, USER_STATUSES } from "@/lib/enums";

const optStr = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional());

const CreateSchema = z.object({
  username: z.string().trim().min(1),
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1),
  fullNameZh: optStr,
  role: z.enum(ROLES),
  languagePreference: z.enum(LANGUAGES),
  jobTitle: optStr,
  phone: optStr,
  tempPassword: z.string().min(MIN_PASSWORD_LENGTH),
});

const UpdateSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1),
  fullNameZh: optStr,
  role: z.enum(ROLES),
  languagePreference: z.enum(LANGUAGES),
  jobTitle: optStr,
  phone: optStr,
  status: z.enum(USER_STATUSES),
});

export interface UserFormState {
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

// US-01 — only an administrator creates users; there is no self-registration.
export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const admin = await requireUser();
  if (!isAdmin(admin.role)) return { error: "Only an administrator can create users." };

  const parsed = CreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Check the fields.", fieldErrors: flatten(parsed.error) };
  const d = parsed.data;

  const clash = await prisma.user.findFirst({
    where: { OR: [{ username: d.username }, { email: d.email }] },
  });
  if (clash) {
    return {
      fieldErrors:
        clash.username === d.username
          ? { username: "This username is taken." }
          : { email: "This email is already in use." },
    };
  }

  const user = await prisma.user.create({
    data: {
      username: d.username,
      email: d.email,
      fullName: d.fullName,
      fullNameZh: d.fullNameZh,
      role: d.role,
      languagePreference: d.languagePreference,
      jobTitle: d.jobTitle,
      phone: d.phone,
      status: "active",
      passwordHash: await hashPassword(d.tempPassword),
      mustChangePassword: true,
    },
  });

  await writeAudit({ userId: admin.id, action: "create", entityType: "user", entityId: user.id, summary: d.username });
  revalidatePath("/users");
  redirect("/users");
}

export async function updateUser(id: string, _prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const admin = await requireUser();
  if (!isAdmin(admin.role)) return { error: "Only an administrator can edit users." };

  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { error: "This user no longer exists." };

  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Check the fields.", fieldErrors: flatten(parsed.error) };
  const d = parsed.data;

  if (d.email !== existing.email) {
    const clash = await prisma.user.findFirst({ where: { email: d.email, id: { not: id } } });
    if (clash) return { fieldErrors: { email: "This email is already in use." } };
  }

  const roleChanged = d.role !== existing.role;
  await prisma.user.update({
    where: { id },
    data: {
      email: d.email,
      fullName: d.fullName,
      fullNameZh: d.fullNameZh,
      role: d.role,
      languagePreference: d.languagePreference,
      jobTitle: d.jobTitle,
      phone: d.phone,
      status: d.status,
    },
  });

  await writeAudit({
    userId: admin.id,
    action: roleChanged ? "permission_change" : "update",
    entityType: "user",
    entityId: id,
    before: { role: existing.role, status: existing.status },
    after: { role: d.role, status: d.status },
    summary: existing.username,
  });
  revalidatePath("/users");
  redirect("/users");
}
