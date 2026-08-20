import { requireUser } from "@/lib/session";
import { can, canExport } from "@/lib/rbac";
import { listCustomers } from "@/server/customers";
import { userNameMap } from "@/server/users";
import { loadSavedViews } from "@/server/savedViews";
import { CustomersClient } from "./CustomersClient";

export default async function CustomersPage() {
  const user = await requireUser();
  const [names, savedViews] = await Promise.all([
    userNameMap(),
    loadSavedViews(user.id, "customer"),
  ]);
  const rows = await listCustomers(names);

  return (
    <CustomersClient
      rows={rows}
      savedViews={savedViews}
      canExport={canExport(user.role)}
      createHref={can(user.role, "c", "customer") ? "/customers/new" : undefined}
      importHref={can(user.role, "c", "customer") ? "/customers/import" : undefined}
    />
  );
}
