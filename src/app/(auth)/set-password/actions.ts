"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { writeAudit } from "@/lib/audit";

export interface SetPasswordState {
  error?: "tooShort" | "mismatch" | "unauthenticated";
}

export async function setPassword(
  _prev: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const session = await getSession();
  if (!session.userId) return { error: "unauthenticated" };

  const pw = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (pw.length < MIN_PASSWORD_LENGTH) return { error: "tooShort" };
  if (pw !== confirm) return { error: "mismatch" };

  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: await hashPassword(pw), mustChangePassword: false },
  });
  session.mustChangePassword = false;
  await session.save();
  await writeAudit({
    action: "update",
    entityType: "user",
    entityId: session.userId,
    summary: "password set at first sign-in",
  });

  redirect("/agents");
}
