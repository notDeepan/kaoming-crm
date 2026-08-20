import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";
import { getUser } from "@/server/usersAdmin";
import { UserForm } from "../../UserForm";
import type { UserInitial } from "../../empty";
import { updateUser } from "../../actions";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireUser();
  if (!isAdmin(admin.role)) redirect("/users");

  const user = await getUser(id);
  if (!user) notFound();

  const initial: UserInitial = {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    fullNameZh: user.fullNameZh ?? "",
    role: user.role,
    languagePreference: user.languagePreference,
    jobTitle: user.jobTitle ?? "",
    phone: user.phone ?? "",
    status: user.status,
  };

  return <UserForm mode="edit" action={updateUser.bind(null, id)} initial={initial} />;
}
