import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { activeUsers } from "@/server/users";
import { getSettingNumber } from "@/server/settings";
import { AgentForm } from "../AgentForm";
import { EMPTY_AGENT } from "../empty";
import { createAgent } from "../actions";

export default async function NewAgentPage() {
  const user = await requireUser();
  if (!can(user.role, "c", "agent")) redirect("/agents");

  const [users, defaultCadence] = await Promise.all([
    activeUsers(),
    getSettingNumber("agent_cadence_default_days", 30),
  ]);

  return (
    <AgentForm
      mode="create"
      action={createAgent}
      initial={{ ...EMPTY_AGENT, ownerUserId: user.id }}
      users={users}
      defaultCadence={defaultCadence}
    />
  );
}
