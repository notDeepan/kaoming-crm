import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";
import { getAllSettings } from "@/server/settings";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!isAdmin(user.role)) redirect("/agents");
  const values = await getAllSettings();
  return <SettingsForm values={values} />;
}
