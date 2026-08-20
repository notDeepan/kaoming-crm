import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { ImportPanel } from "@/components/ImportPanel";

export default async function ImportAgentsPage() {
  const user = await requireUser();
  if (!can(user.role, "c", "agent")) redirect("/agents");
  const t = await getTranslations("nav");
  return <ImportPanel entity="agent" title={t("agents")} backHref="/agents" />;
}
