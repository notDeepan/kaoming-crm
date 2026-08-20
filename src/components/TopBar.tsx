"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "./ui";
import { signOut } from "@/app/(auth)/login/actions";

export function TopBar({ userName, roleLabel }: { userName: string; roleLabel: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-grey-line bg-paper px-5">
      <form onSubmit={submit} className="relative w-full max-w-md">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-grey-mute">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("nav.search")}
          aria-label={t("nav.search")}
          className="h-9 w-full rounded-sm border border-grey-line bg-surface pl-8 pr-3 text-sm text-ink placeholder:text-grey-mute/70 focus:border-kmc focus:outline-none"
        />
      </form>

      <div className="ml-auto flex items-center gap-3">
        <LanguageSwitcher />
        <div className="hidden items-center gap-2 border-l border-grey-line pl-3 sm:flex">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-xs font-medium text-ink">{userName}</span>
            <span className="text-[10px] uppercase tracking-wide text-grey-mute mono">{roleLabel}</span>
          </div>
        </div>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">
            {t("auth.signOut")}
          </Button>
        </form>
      </div>
    </header>
  );
}
