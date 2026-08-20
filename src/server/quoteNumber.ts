import "server-only";
import { prisma } from "@/lib/prisma";

/** Initials from a full name (A6 Q-19), falling back to the username. "Deepan Goswami" → "DG". */
export function initialsOf(fullName: string, username: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const letters = parts.map((p) => p[0]!.toUpperCase()).join("");
  return (letters || username.slice(0, 2)).slice(0, 3).toUpperCase();
}

function ddmmyyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}${mm}${d.getFullYear()}`;
}

/**
 * A6 — generate the quotation reference on issue (never on draft, Q-18): Q + ddmmyyyy + initials +
 * sequence. Sequence is per user per day, starting at 01 (Q-20). Revisions append a suffix (Q-21)
 * rather than burning a new reference.
 */
export async function generateQuoteRef(
  preparedById: string,
  initials: string,
  when: Date = new Date()
): Promise<string> {
  const startOfDay = new Date(when.getFullYear(), when.getMonth(), when.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400_000);

  const issuedToday = await prisma.quotation.count({
    where: {
      preparedById,
      refNo: { not: null },
      issueDate: { gte: startOfDay, lt: endOfDay },
    },
  });
  const seq = String(issuedToday + 1).padStart(2, "0");
  return `Q${ddmmyyyy(when)}${initials}${seq}`;
}

/** Revision suffix on the base reference (Q-21): "Q07082026DG01" → "Q07082026DG01-R2". */
export function withRevisionSuffix(baseRef: string, revision: number): string {
  return revision <= 1 ? baseRef : `${baseRef}-R${revision}`;
}
