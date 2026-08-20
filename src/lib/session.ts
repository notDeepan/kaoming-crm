import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import type { Role } from "./enums";

export interface SessionData {
  userId?: string;
  role?: Role;
  fullName?: string;
  mustChangePassword?: boolean;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "kmc_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // SE-03 — 12 hours of inactivity, configurable.
    maxAge: 60 * 60 * 12,
  },
};

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions);
}

export interface CurrentUser {
  id: string;
  role: Role;
  fullName: string;
  fullNameZh: string | null;
  username: string;
  email: string;
  languagePreference: string;
  mustChangePassword: boolean;
}

/** Resolve the signed-in user, or null. Confirms the account still exists and is active. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const user = await prisma.user.findFirst({
    where: { id: session.userId, deletedAt: null, status: "active" },
  });
  if (!user) return null;
  return {
    id: user.id,
    role: user.role as Role,
    fullName: user.fullName,
    fullNameZh: user.fullNameZh,
    username: user.username,
    email: user.email,
    languagePreference: user.languagePreference,
    mustChangePassword: user.mustChangePassword,
  };
}

/** Use in server components / actions that require a signed-in user. Redirects if not. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/set-password");
  return user;
}
