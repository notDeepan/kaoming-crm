"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { KmcMark } from "./KmcMark";
import { cx } from "./ui";
import type { Role } from "@/lib/enums";

// Minimal line icons — no emoji anywhere (design rule). 16px stroke glyphs.
function Icon({ path }: { path: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path} />
    </svg>
  );
}
const ICONS = {
  agents: "M4 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M17 13a3 3 0 1 0-2-5",
  customers: "M3 21V8l7-4 7 4v13M9 21v-5h2v5M14 11h.01M14 14h.01M6 11h.01M6 14h.01",
  contacts: "M4 4h16v16H4zM8 9h8M8 13h5M8 17h3",
  quotations: "M7 3h7l5 5v13H7zM14 3v5h5M9 13h6M9 16h6M9 10h3",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2l-.3-2.6H10l-.3 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.3 2.6h4l.3-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2Z",
  users: "M16 21v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
};

interface NavItem {
  href: string;
  key: "agents" | "customers" | "contacts" | "quotations" | "settings" | "users";
  icon: keyof typeof ICONS;
}

export function Rail({ role }: { role: Role }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const channel: NavItem[] = [
    { href: "/agents", key: "agents", icon: "agents" },
    { href: "/customers", key: "customers", icon: "customers" },
    { href: "/contacts", key: "contacts", icon: "contacts" },
    { href: "/quotations", key: "quotations", icon: "quotations" },
  ];
  const admin: NavItem[] = [];
  if (role === "admin") admin.push({ href: "/settings", key: "settings", icon: "settings" });
  if (role === "admin" || role === "sales_manager")
    admin.push({ href: "/users", key: "users", icon: "users" });

  const item = (n: NavItem) => {
    const active = pathname === n.href || pathname.startsWith(n.href + "/");
    return (
      <Link
        key={n.href}
        href={n.href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "group flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm transition-colors",
          active
            ? "bg-surface font-medium text-ink"
            : "text-grey-mute hover:bg-surface/60 hover:text-ink"
        )}
      >
        <span className={cx(active ? "text-kmc" : "text-grey-mute group-hover:text-ink")}>
          <Icon path={ICONS[n.icon]} />
        </span>
        {t(n.key)}
      </Link>
    );
  };

  return (
    <nav className="flex h-full w-56 shrink-0 flex-col gap-6 border-r border-grey-line bg-paper px-3 py-4">
      <Link href="/agents" className="flex items-center gap-2 px-1.5">
        <KmcMark size={26} />
        <div className="leading-none">
          <div className="text-sm font-semibold tracking-tight">{t("agents") && "KAO MING"}</div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-grey-mute mono">
            Sales &amp; Channel
          </div>
        </div>
      </Link>

      <div className="flex flex-col gap-0.5">
        <div className="label px-2.5 pb-1">{t("sectionChannel")}</div>
        {channel.map(item)}
      </div>

      {admin.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="label px-2.5 pb-1">{t("sectionAdmin")}</div>
          {admin.map(item)}
        </div>
      )}
    </nav>
  );
}
