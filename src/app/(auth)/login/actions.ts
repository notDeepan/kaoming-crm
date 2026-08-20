"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { writeAudit } from "@/lib/audit";
import type { Role } from "@/lib/enums";

const MAX_ATTEMPTS = 5; // SE-04
const LOCK_MINUTES = 15;

export interface LoginState {
  error?: "wrongCredentials" | "locked" | "disabled";
  lockMinutes?: number;
}

export async function signIn(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findFirst({
    where: { username, deletedAt: null },
  });

  // Uniform failure for unknown user — do not reveal which field was wrong.
  if (!user) {
    await writeAudit({ action: "login_failed", entityType: "user", summary: username });
    return { error: "wrongCredentials" };
  }

  if (user.status === "disabled") return { error: "disabled" };

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { error: "locked", lockMinutes: mins };
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      },
    });
    await writeAudit({
      action: "login_failed",
      entityType: "user",
      entityId: user.id,
      summary: lock ? "locked after 5 attempts" : `attempt ${failed}`,
    });
    if (lock) return { error: "locked", lockMinutes: LOCK_MINUTES };
    return { error: "wrongCredentials" };
  }

  // Success — reset counters, stamp login, open session.
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const session = await getSession();
  session.userId = user.id;
  session.role = user.role as Role;
  session.fullName = user.fullName;
  session.mustChangePassword = user.mustChangePassword;
  await session.save();

  await writeAudit({ action: "login", entityType: "user", entityId: user.id });

  redirect(user.mustChangePassword ? "/set-password" : "/agents");
}

export async function signOut(): Promise<void> {
  const session = await getSession();
  const userId = session.userId;
  session.destroy();
  await writeAudit({ action: "logout", entityType: "user", entityId: userId });
  redirect("/login");
}
