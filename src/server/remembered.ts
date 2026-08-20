import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * A4 — the system learns per-country values (payment terms, delivery times, …) instead of a
 * maintained library. Record every distinct value; suggest ranked same-country → most recent →
 * most frequent. Suggestions never constrain the field (Q-09).
 */
export async function recordValue(
  fieldKey: string,
  value: string,
  country: string | null,
  userId: string | null
): Promise<void> {
  const v = value.trim();
  if (!v) return;
  const existing = await prisma.rememberedValue.findFirst({
    where: { fieldKey, value: v, country: country ?? null },
  });
  if (existing) {
    await prisma.rememberedValue.update({
      where: { id: existing.id },
      data: { useCount: { increment: 1 }, lastUsedAt: new Date(), userId },
    });
  } else {
    await prisma.rememberedValue.create({ data: { fieldKey, value: v, country, userId } });
  }
}

export interface Suggestion {
  value: string;
  isCountryDefault: boolean;
  sameCountry: boolean;
}

export async function suggestValues(
  fieldKey: string,
  country: string | null,
  limit = 8
): Promise<Suggestion[]> {
  const rows = await prisma.rememberedValue.findMany({
    where: { fieldKey },
    orderBy: [{ isCountryDefault: "desc" }, { lastUsedAt: "desc" }, { useCount: "desc" }],
    take: 40,
  });
  const scored = rows.map((r) => ({
    value: r.value,
    isCountryDefault: r.isCountryDefault && r.country === country,
    sameCountry: !!country && r.country === country,
    lastUsedAt: r.lastUsedAt,
    useCount: r.useCount,
  }));
  // same-country first, then default flag, then recency, then frequency
  scored.sort((a, b) => {
    if (a.sameCountry !== b.sameCountry) return a.sameCountry ? -1 : 1;
    if (a.isCountryDefault !== b.isCountryDefault) return a.isCountryDefault ? -1 : 1;
    if (+b.lastUsedAt !== +a.lastUsedAt) return +b.lastUsedAt - +a.lastUsedAt;
    return b.useCount - a.useCount;
  });
  // de-duplicate values, keep first (highest ranked)
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const s of scored) {
    if (seen.has(s.value)) continue;
    seen.add(s.value);
    out.push({ value: s.value, isCountryDefault: s.isCountryDefault, sameCountry: s.sameCountry });
    if (out.length >= limit) break;
  }
  return out;
}
