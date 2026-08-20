import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { Rail } from "@/components/Rail";
import { TopBar } from "@/components/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations("enums.role");

  return (
    <div className="flex h-screen overflow-hidden">
      <Rail role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar userName={user.fullName} roleLabel={t(user.role)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
