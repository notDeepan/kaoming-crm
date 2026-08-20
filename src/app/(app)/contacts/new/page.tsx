import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { contactParentOptions } from "@/server/contacts";
import { ContactForm } from "../ContactForm";
import { EMPTY_CONTACT, type ContactInitial } from "../empty";
import { createContact } from "../actions";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string; customerId?: string }>;
}) {
  const user = await requireUser();
  if (!can(user.role, "c", "contact")) redirect("/contacts");
  const { agents, customers } = await contactParentOptions();
  const sp = await searchParams;

  // Allow pre-linking when created from within an agent or customer (CU-01).
  const initial: ContactInitial = sp.agentId
    ? { ...EMPTY_CONTACT, parentType: "agent", agentId: sp.agentId }
    : sp.customerId
      ? { ...EMPTY_CONTACT, parentType: "customer", customerId: sp.customerId }
      : EMPTY_CONTACT;

  return <ContactForm mode="create" action={createContact} initial={initial} agents={agents} customers={customers} />;
}
