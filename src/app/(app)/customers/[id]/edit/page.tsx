import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getCustomer, agentOptions } from "@/server/customers";
import { activeUsers } from "@/server/users";
import { CustomerForm } from "../../CustomerForm";
import type { CustomerInitial } from "../../empty";
import { updateCustomer } from "../../actions";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user.role, "u", "customer")) redirect(`/customers/${id}`);

  const [customer, users, agents] = await Promise.all([getCustomer(id), activeUsers(), agentOptions()]);
  if (!customer) notFound();

  const initial: CustomerInitial = {
    id: customer.id,
    customerCode: customer.customerCode,
    companyNameEn: customer.companyNameEn,
    companyNameLocal: customer.companyNameLocal ?? "",
    country: customer.country,
    city: customer.city ?? "",
    addressEn: customer.addressEn ?? "",
    addressLocal: customer.addressLocal ?? "",
    industry: customer.industry ?? "",
    customerType: customer.customerType,
    primaryAgentId: customer.primaryAgentId ?? "",
    ownerUserId: customer.ownerUserId,
    website: customer.website ?? "",
    employeeCount: customer.employeeCount?.toString() ?? "",
    existingMachinesNotes: customer.existingMachinesNotes ?? "",
    notes: customer.notes ?? "",
  };

  return (
    <CustomerForm mode="edit" action={updateCustomer.bind(null, id)} initial={initial} users={users} agents={agents} />
  );
}
