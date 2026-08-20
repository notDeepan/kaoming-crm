import "server-only";
import { prisma } from "@/lib/prisma";

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const rows = await prisma.systemSetting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.valueJson]));
}

export async function getSetting<T = unknown>(key: string, fallback: T): Promise<T> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row ? (row.valueJson as T) : fallback;
}

export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const v = await getSetting<unknown>(key, fallback);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
