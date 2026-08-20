"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const STRING_KEYS = [
  "default_incoterms",
  "default_named_place",
  "default_payment_terms",
  "warranty_basis",
  "default_currency",
  "quote_number_format",
];
const NUMBER_KEYS = [
  "default_validity_days",
  "default_warranty_months",
  "agent_cadence_default_days",
  "opportunity_inactivity_days",
];

export interface SettingsState {
  saved?: boolean;
  error?: string;
}

export async function updateSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  if (!isAdmin(user.role)) return { error: "Only an administrator can change settings." };

  const entries: Array<[string, unknown]> = [];
  for (const k of STRING_KEYS) {
    const v = formData.get(k);
    if (v != null) entries.push([k, String(v)]);
  }
  for (const k of NUMBER_KEYS) {
    const v = formData.get(k);
    if (v != null && v !== "") entries.push([k, Number(v)]);
  }

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { valueJson: value as object, updatedById: user.id },
        create: { key, valueJson: value as object, updatedById: user.id },
      })
    )
  );

  await writeAudit({ userId: user.id, action: "update", entityType: "system_setting", summary: `${entries.length} settings` });
  revalidatePath("/settings");
  return { saved: true };
}
