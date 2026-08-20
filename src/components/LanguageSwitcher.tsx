"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocale } from "@/app/actions/locale";
import { cx } from "./ui";
import type { Language } from "@/lib/enums";

// Switches interface language per user without re-login (LO-01). Compact segmented control.
export function LanguageSwitcher() {
  const current = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  function choose(next: Language) {
    if (next === current) return;
    start(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  const opts: Array<{ code: Language; label: string }> = [
    { code: "en", label: "EN" },
    { code: "zh-TW", label: "繁中" },
  ];

  return (
    <div
      className="inline-flex items-center rounded-sm border border-grey-line bg-surface"
      role="group"
      aria-label="Language"
    >
      {opts.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => choose(o.code)}
          disabled={pending}
          aria-pressed={current === o.code}
          className={cx(
            "h-7 px-2.5 text-2xs font-medium mono transition-colors",
            current === o.code ? "bg-ink text-paper" : "text-grey-mute hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
