import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { globalSearch, type SearchHit } from "@/server/search";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/ui";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const t = await getTranslations();
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const hits = query ? await globalSearch(query) : [];

  const groups: Array<{ type: SearchHit["type"]; label: string }> = [
    { type: "agent", label: t("agent.many") },
    { type: "customer", label: t("customer.many") },
    { type: "contact", label: t("contact.many") },
    { type: "installed_machine", label: t("agent.machinesInTerritory") },
  ];

  return (
    <div className="mx-auto max-w-4xl px-5 py-6">
      <h1 className="text-xl font-semibold">{t("nav.search")}</h1>
      {query && (
        <p className="mt-1 text-sm text-grey-mute">
          <span className="mono">{hits.length}</span> · “{query}”
        </p>
      )}

      {!query ? (
        <div className="mt-8">
          <EmptyState title={t("empty.searchTitle")} hint={t("empty.searchHint")} />
        </div>
      ) : hits.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={t("empty.searchTitle")} hint={t("empty.noResults", { query })} />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {groups.map((g) => {
            const groupHits = hits.filter((h) => h.type === g.type);
            if (groupHits.length === 0) return null;
            return (
              <section key={g.type}>
                <h2 className="label mb-2">{g.label} · {groupHits.length}</h2>
                <ul className="divide-y divide-grey-line overflow-hidden rounded-sm border border-grey-line bg-surface">
                  {groupHits.map((h) => (
                    <li key={`${h.type}-${h.id}`}>
                      <Link href={h.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-kmc-wash/40">
                        {h.code && <span className="w-24 shrink-0 text-sm text-ink mono">{h.code}</span>}
                        <span className="flex-1 text-sm font-medium text-ink">{h.primary}</span>
                        <StatusPill tone="muted">{h.secondary}</StatusPill>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
