import "server-only";
import { prisma } from "@/lib/prisma";

export interface UserRow {
  id: string;
  username: string;
  fullName: string;
  fullNameZh: string | null;
  email: string;
  role: string;
  languagePreference: string;
  status: string;
  lastLoginAt: Date | null;
}

export async function listUsers(): Promise<UserRow[]> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { fullName: "asc" },
  });
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    fullNameZh: u.fullNameZh,
    email: u.email,
    role: u.role,
    languagePreference: u.languagePreference,
    status: u.status,
    lastLoginAt: u.lastLoginAt,
  }));
}

export async function getUser(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}
