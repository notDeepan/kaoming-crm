import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getContact, contactParentOptions } from "@/server/contacts";
import { ContactForm } from "../../ContactForm";
import type { ContactInitial } from "../../empty";
import { updateContact } from "../../actions";

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user.role, "u", "contact")) redirect(`/contacts/${id}`);

  const [contact, { agents, customers }] = await Promise.all([getContact(id), contactParentOptions()]);
  if (!contact) notFound();

  const initial: ContactInitial = {
    id: contact.id,
    parentType: contact.parentType,
    agentId: contact.agentId ?? "",
    customerId: contact.customerId ?? "",
    fullName: contact.fullName,
    nameLocal: contact.nameLocal ?? "",
    jobTitle: contact.jobTitle ?? "",
    roleInDeal: contact.roleInDeal ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    mobile: contact.mobile ?? "",
    messagingHandle: contact.messagingHandle ?? "",
    preferredLanguage: contact.preferredLanguage ?? "",
    isPrimary: contact.isPrimary,
    notes: contact.notes ?? "",
  };

  return <ContactForm mode="edit" action={updateContact.bind(null, id)} initial={initial} agents={agents} customers={customers} />;
}
