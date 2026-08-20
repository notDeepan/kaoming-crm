import "server-only";
import { prisma } from "@/lib/prisma";

/** id → display name map, for resolving owner columns without N+1 queries. */
export async function userNameMap(): Promise<Map<string, string>> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, fullName: true },
  });
  return new Map(users.map((u) => [u.id, u.fullName]));
}

export async function activeUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null, status: "active" },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: "asc" },
  });
}
