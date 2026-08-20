import { requireUser } from "@/lib/session";
import { can, canExport } from "@/lib/rbac";
import { listContacts } from "@/server/contacts";
import { loadSavedViews } from "@/server/savedViews";
import { ContactsClient } from "./ContactsClient";

export default async function ContactsPage() {
  const user = await requireUser();
  const [rows, savedViews] = await Promise.all([
    listContacts(),
    loadSavedViews(user.id, "contact"),
  ]);

  return (
    <ContactsClient
      rows={rows}
      savedViews={savedViews}
      canExport={canExport(user.role)}
      createHref={can(user.role, "c", "contact") ? "/contacts/new" : undefined}
      importHref={can(user.role, "c", "contact") ? "/contacts/import" : undefined}
    />
  );
}
