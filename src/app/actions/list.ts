"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canExport } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

type Cell = string | number | null;

/**
 * The single Excel export helper, built once and reused by every list view (GP2 / SL-03).
 * Exports the filtered set with the visible columns the client passes. Every export is logged
 * with user, entity and row count (SE-11) — bulk export is how a customer database leaves a company.
 */
export async function exportRows(input: {
  entityType: string;
  sheetName: string;
  headers: string[];
  rows: Cell[][];
}): Promise<{ base64: string; filename: string } | { error: "forbidden" }> {
  const user = await requireUser();
  if (!canExport(user.role)) return { error: "forbidden" };

  const aoa = [input.headers, ...input.rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, input.sheetName.slice(0, 31));
  const buf = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

  await writeAudit({
    userId: user.id,
    action: "export",
    entityType: input.entityType,
    summary: `${input.rows.length} rows`,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return { base64: buf, filename: `${input.entityType}-${stamp}.xlsx` };
}

// ── Saved views (SL-02) ────────────────────────────────────────────────────────
export async function saveView(input: {
  entityType: string;
  name: string;
  config: unknown;
  makeDefault: boolean;
}): Promise<void> {
  const user = await requireUser();
  if (input.makeDefault) {
    await prisma.savedView.updateMany({
      where: { userId: user.id, entityType: input.entityType },
      data: { isDefault: false },
    });
  }
  await prisma.savedView.create({
    data: {
      userId: user.id,
      entityType: input.entityType,
      name: input.name.slice(0, 60),
      configJson: input.config as object,
      isDefault: input.makeDefault,
    },
  });
  revalidatePath(`/${input.entityType}s`);
}

export async function deleteView(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.savedView.deleteMany({ where: { id, userId: user.id } });
}
