import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { activeUsers } from "@/server/users";
import { agentOptions } from "@/server/customers";
import { CustomerForm } from "../CustomerForm";
import { EMPTY_CUSTOMER } from "../empty";
import { createCustomer } from "../actions";

export default async function NewCustomerPage() {
  const user = await requireUser();
  if (!can(user.role, "c", "customer")) redirect("/customers");
  const [users, agents] = await Promise.all([activeUsers(), agentOptions()]);

  return (
    <CustomerForm
      mode="create"
      action={createCustomer}
      initial={{ ...EMPTY_CUSTOMER, ownerUserId: user.id }}
      users={users}
      agents={agents}
    />
  );
}
