import { requireUser } from "@/lib/session";
import { can, canExport } from "@/lib/rbac";
import { listAgents } from "@/server/agents";
import { userNameMap } from "@/server/users";
import { loadSavedViews } from "@/server/savedViews";
import { AgentsClient } from "./AgentsClient";

export default async function AgentsPage() {
  const user = await requireUser();
  const [names, savedViews] = await Promise.all([
    userNameMap(),
    loadSavedViews(user.id, "agent"),
  ]);
  const rows = await listAgents(names);

  return (
    <AgentsClient
      rows={rows}
      savedViews={savedViews}
      canExport={canExport(user.role)}
      createHref={can(user.role, "c", "agent") ? "/agents/new" : undefined}
      importHref={can(user.role, "c", "agent") ? "/agents/import" : undefined}
    />
  );
}
