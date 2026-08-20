import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { KmcMark } from "@/components/KmcMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/agents");
  const t = await getTranslations();

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[1.05fr_1fr]">
      {/* Left — the plate. Dark, engraved, the identity block of the whole system. */}
      <aside className="relative hidden flex-col justify-between bg-ink px-10 py-9 text-paper md:flex">
        <div className="h-[3px] w-16 bg-kmc" />
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <KmcMark size={44} />
            <div className="leading-tight">
              <div className="text-2xl font-semibold tracking-tight">{t("app.name")}</div>
              <div className="text-2xs uppercase tracking-[0.2em] text-paper/50 mono">
                {t("app.system")}
              </div>
            </div>
          </div>
          {/* title-block grid — true facts about the system, set like a spec plate */}
          <dl className="grid max-w-sm grid-cols-2 gap-x-8 gap-y-3 border-t border-paper/15 pt-6">
            {[
              ["Machinery", "CNC double-column · 5-axis · VMC"],
              ["Since", "1968 · Houli, Taichung"],
              ["Coverage", "Overseas agents & dealers"],
              ["Languages", "English · 繁體中文"],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <dt className="text-[10px] uppercase tracking-wider text-paper/45 mono">{k}</dt>
                <dd className="text-xs text-paper/85 mono">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-xs italic text-script">{t("app.tagline")}</p>
      </aside>

      {/* Right — the form. */}
      <main className="relative flex flex-col items-center justify-center bg-paper px-6 py-12">
        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>
        <div className="flex w-full items-center justify-center md:hidden">
          <div className="mb-8 flex items-center gap-2">
            <KmcMark size={32} />
            <span className="text-lg font-semibold">{t("app.name")}</span>
          </div>
        </div>
        <LoginForm />
      </main>
    </div>
  );
}
