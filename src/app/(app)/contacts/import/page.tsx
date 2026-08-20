import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { ImportPanel } from "@/components/ImportPanel";

export default async function ImportContactsPage() {
  const user = await requireUser();
  if (!can(user.role, "c", "contact")) redirect("/contacts");
  const t = await getTranslations("nav");
  return <ImportPanel entity="contact" title={t("contacts")} backHref="/contacts" />;
}
