import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { ImportPanel } from "@/components/ImportPanel";

export default async function ImportCustomersPage() {
  const user = await requireUser();
  if (!can(user.role, "c", "customer")) redirect("/customers");
  const t = await getTranslations("nav");
  return <ImportPanel entity="customer" title={t("customers")} backHref="/customers" />;
}
