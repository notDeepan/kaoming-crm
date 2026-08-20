import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Button, Field, Select } from "@/components/ui";
import { createQuotation } from "../actions";

export default async function NewQuotationPage() {
  const user = await requireUser();
  if (!can(user.role, "c", "quotation")) redirect("/quotations");

  const [customers, models] = await Promise.all([
    prisma.customer.findMany({ where: { deletedAt: null }, select: { id: true, customerCode: true, companyNameEn: true }, orderBy: { customerCode: "asc" } }),
    prisma.machineModel.findMany({ where: { deletedAt: null }, select: { id: true, modelCode: true, modelName: true }, orderBy: { modelCode: "asc" } }),
  ]);
  const t = await getTranslations();

  return (
    <form action={createQuotation} className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="mb-1 text-xl font-semibold">{t("quotation.newQuotation")}</h1>
      <p className="mb-5 text-sm text-grey-mute">{t("quotation.newSub")}</p>

      {models.length === 0 && (
        <p className="mb-4 rounded-sm border border-alert/30 bg-alert-wash px-3 py-2 text-xs text-alert">
          {t("quotation.noModels")}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t("quotation.customer")} htmlFor="customerId" required>
            <Select id="customerId" name="customerId" required defaultValue="">
              <option value="" disabled>{t("common.notSet")}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.customerCode} · {c.companyNameEn}</option>)}
            </Select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={t("quotation.machine")} htmlFor="machineModelId" required>
            <Select id="machineModelId" name="machineModelId" required defaultValue="">
              <option value="" disabled>{t("common.notSet")}</option>
              {models.map((m) => <option key={m.id} value={m.id}>{m.modelCode} — {m.modelName}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={t("quotation.currency")} htmlFor="currency" required>
          <Select id="currency" name="currency" defaultValue="USD">
            <option value="USD">USD</option>
            <option value="TWD">TWD</option>
          </Select>
        </Field>
        <Field label={t("quotation.unitSystem")} htmlFor="unitSystem" required>
          <Select id="unitSystem" name="unitSystem" defaultValue="metric">
            <option value="metric">{t("quotation.metric")}</option>
            <option value="imperial">{t("quotation.imperial")}</option>
          </Select>
        </Field>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" variant="primary" size="md" disabled={models.length === 0}>{t("quotation.startDraft")}</Button>
      </div>
    </form>
  );
}
