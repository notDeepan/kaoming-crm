import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";
import { listUsers } from "@/server/usersAdmin";
import { getLocale } from "@/i18n/locale";
import { UsersClient } from "./UsersClient";

export default async function UsersPage() {
  const user = await requireUser();
  // Admin and Sales Manager can read the user list (§26.2); only admin can create/edit.
  if (user.role !== "admin" && user.role !== "sales_manager") redirect("/agents");

  const [rows, locale] = await Promise.all([listUsers(), getLocale()]);
  return (
    <UsersClient rows={rows} locale={locale} createHref={isAdmin(user.role) ? "/users/new" : undefined} />
  );
}
