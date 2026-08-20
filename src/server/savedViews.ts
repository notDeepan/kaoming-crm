import "server-only";
import { prisma } from "@/lib/prisma";
import type { SavedViewData } from "@/components/list/types";

export async function loadSavedViews(userId: string, entityType: string): Promise<SavedViewData[]> {
  const views = await prisma.savedView.findMany({
    where: { userId, entityType },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return views.map((v) => ({
    id: v.id,
    name: v.name,
    isDefault: v.isDefault,
    config: v.configJson as SavedViewData["config"],
  }));
}
