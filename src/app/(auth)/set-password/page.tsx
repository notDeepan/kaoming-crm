import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { KmcMark } from "@/components/KmcMark";
import { SetPasswordForm } from "./SetPasswordForm";

export default async function SetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect("/agents");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6">
      <div className="mb-8 flex items-center gap-2">
        <KmcMark size={32} />
        <span className="text-lg font-semibold">KAO MING</span>
      </div>
      <SetPasswordForm />
    </main>
  );
}
