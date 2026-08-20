import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getAgent } from "@/server/agents";
import { activeUsers } from "@/server/users";
import { getSettingNumber } from "@/server/settings";
import { toDateInput } from "@/lib/format";
import { AgentForm } from "../../AgentForm";
import type { AgentInitial } from "../../empty";
import { updateAgent } from "../../actions";

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user.role, "u", "agent")) redirect(`/agents/${id}`);

  const [agent, users, defaultCadence] = await Promise.all([
    getAgent(id),
    activeUsers(),
    getSettingNumber("agent_cadence_default_days", 30),
  ]);
  if (!agent) notFound();

  const initial: AgentInitial = {
    id: agent.id,
    agentCode: agent.agentCode,
    companyNameEn: agent.companyNameEn,
    companyNameLocal: agent.companyNameLocal ?? "",
    agentType: agent.agentType,
    status: agent.status,
    website: agent.website ?? "",
    ownerUserId: agent.ownerUserId,
    exclusivity: agent.exclusivity ?? "",
    pricingBasis: agent.pricingBasis ?? "",
    preferredCurrency: agent.preferredCurrency ?? "",
    workingLanguage: agent.workingLanguage ?? "",
    commissionPercent: agent.commissionPercent?.toString() ?? "",
    standardDiscountPercent: agent.standardDiscountPercent?.toString() ?? "",
    contactCadenceDays: agent.contactCadenceDays?.toString() ?? "",
    paymentTerms: agent.paymentTerms ?? "",
    preferredIncoterms: agent.preferredIncoterms ?? "",
    territoryNotes: agent.territoryNotes ?? "",
    notes: agent.notes ?? "",
    agreementStartDate: toDateInput(agent.agreementStartDate),
    agreementEndDate: toDateInput(agent.agreementEndDate),
    firstAppointedDate: toDateInput(agent.firstAppointedDate),
    territories: agent.territories.map((t) => t.countryCode),
    exclusiveProductFamilies: (agent.exclusiveProductFamilies as string[] | null) ?? [],
  };

  return (
    <AgentForm
      mode="edit"
      action={updateAgent.bind(null, id)}
      initial={initial}
      users={users}
      defaultCadence={defaultCadence}
    />
  );
}
