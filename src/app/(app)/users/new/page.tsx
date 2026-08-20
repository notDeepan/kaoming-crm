import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";
import { UserForm } from "../UserForm";
import { EMPTY_USER } from "../empty";
import { createUser } from "../actions";

export default async function NewUserPage() {
  const user = await requireUser();
  if (!isAdmin(user.role)) redirect("/users");
  return <UserForm mode="create" action={createUser} initial={EMPTY_USER} />;
}
