import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getAgent, agentPerformance, territoryConflicts } from "@/server/agents";
import { userNameMap } from "@/server/users";
import { getLocale } from "@/i18n/locale";
import { fmtDate, fmtMoney, daysBetween } from "@/lib/format";
import { Nameplate, type PlateRow } from "@/components/Nameplate";
import { StatStrip } from "@/components/StatStrip";
import { StatusPill, Button } from "@/components/ui";
import { DeleteAgentButton } from "./DeleteAgentButton";

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const t = await getTranslations();
  const locale = await getLocale();

  const agent = await getAgent(id);
  if (!agent) notFound();

  const codes = agent.territories.map((x) => x.countryCode);
  const [perf, conflicts, names] = await Promise.all([
    agentPerformance(agent.id, codes),
    territoryConflicts(codes, agent.id),
    userNameMap(),
  ]);

  const overdue =
    !!agent.lastContactDate &&
    !!agent.contactCadenceDays &&
    daysBetween(agent.lastContactDate) > agent.contactCadenceDays;
  const agreementDays = agent.agreementEndDate
    ? daysBetween(new Date(), agent.agreementEndDate)
    : null;
  const agreementSoon = agreementDays != null && agreementDays <= 90 && agreementDays >= 0;

  const exclusiveConflicts = conflicts.filter((c) => c.exclusive);
  const overlaps = conflicts.filter((c) => !c.exclusive);

  const plateRows: PlateRow[] = [
    { label: t("agent.status"), value: t(`enums.agentStatus.${agent.status}`) },
    { label: t("agent.agentType"), value: t(`enums.agentType.${agent.agentType}`) },
    {
      label: t("agent.territories"),
      value: codes.length ? codes.join(" · ") : "—",
    },
    { label: t("agent.owner"), value: names.get(agent.ownerUserId) ?? "—" },
    {
      label: t("agent.cadenceDays"),
      value: agent.contactCadenceDays ? `${agent.contactCadenceDays}` : "—",
    },
    { label: t("agent.lastContact"), value: fmtDate(agent.lastContactDate, locale) },
  ];

  const openValue = Object.entries(perf.openOppValueByCurrency)
    .map(([cur, v]) => fmtMoney(v, cur))
    .join(" · ");

  return (
    <div className="mx-auto max-w-6xl px-5 py-5">
      {/* action bar */}
      <div className="mb-4 flex items-center gap-2">
        <Link href="/agents" className="text-xs text-grey-mute hover:text-ink mono">
          ← {t("nav.agents")}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {can(user.role, "u", "agent") && (
            <Link href={`/agents/${agent.id}/edit`}>
              <Button variant="secondary" size="sm">{t("common.edit")}</Button>
            </Link>
          )}
          {can(user.role, "d", "agent") && (
            <DeleteAgentButton id={agent.id} name={agent.companyNameEn} />
          )}
        </div>
      </div>

      {/* signature nameplate */}
      <Nameplate
        eyebrow={`${t("agent.one")} · ${agent.agentCode}`}
        title={agent.companyNameEn}
        subtitle={agent.companyNameLocal ?? undefined}
        rows={plateRows}
      />

      {/* alerts — amber for warnings, honest and plain */}
      {(overdue || agreementSoon || exclusiveConflicts.length > 0 || overlaps.length > 0) && (
        <div className="mt-3 flex flex-col gap-2">
          {overdue && (
            <Banner tone="alert">
              {t("agent.overdue")} — {t("agent.overdueBy", { days: daysBetween(agent.lastContactDate!) - (agent.contactCadenceDays ?? 0) })}
            </Banner>
          )}
          {agreementSoon && (
            <Banner tone="alert">{t("agent.agreementExpiring", { days: agreementDays! })}</Banner>
          )}
          {exclusiveConflicts.map((c) => (
            <Banner key={`x-${c.agentId}-${c.countryCode}`} tone="alert">
              {t("agent.exclusiveConflict", { name: c.agentName, country: t(`country.${c.countryCode}`) })}
            </Banner>
          ))}
          {overlaps.map((c) => (
            <Banner key={`o-${c.agentId}-${c.countryCode}`} tone="warn">
              {t("agent.overlapWarning", { name: c.agentName, country: t(`country.${c.countryCode}`) })}
            </Banner>
          ))}
        </div>
      )}

      {/* derived performance (AG-03) */}
      <div className="mt-4">
        <h2 className="label mb-2">{t("agent.sectionPerformance")}</h2>
        <StatStrip
          stats={[
            { label: t("agent.openOpps"), value: perf.openOppCount },
            { label: t("agent.openOppValue"), value: openValue || "—" },
            { label: t("agent.quotes12m"), value: perf.quotes12m },
            { label: t("agent.machines12m"), value: perf.machines12m },
            { label: t("agent.machinesLifetime"), value: perf.machinesLifetime },
            { label: t("agent.machinesInTerritory"), value: perf.installedInTerritory },
            {
              label: t("agent.daysSinceContact"),
              value: perf.daysSinceContact ?? "—",
              tone: overdue ? "alert" : "default",
            },
          ]}
        />
      </div>

      {/* terms + relationship detail */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DetailCard title={t("agent.sectionTerritory")}>
          <DL
            items={[
              [t("agent.exclusivity"), agent.exclusivity ? t(`enums.exclusivity.${agent.exclusivity}`) : "—"],
              [t("agent.commissionPercent"), agent.commissionPercent ? `${agent.commissionPercent}%` : "—"],
              [t("agent.standardDiscountPercent"), agent.standardDiscountPercent ? `${agent.standardDiscountPercent}%` : "—"],
              [t("agent.pricingBasis"), agent.pricingBasis ? t(`enums.pricingBasis.${agent.pricingBasis}`) : "—"],
              [t("agent.preferredCurrency"), agent.preferredCurrency ? t(`enums.currency.${agent.preferredCurrency}`) : "—"],
              [t("agent.paymentTerms"), agent.paymentTerms ?? "—"],
              [t("agent.preferredIncoterms"), agent.preferredIncoterms ?? "—"],
              [t("agent.agreementStart"), fmtDate(agent.agreementStartDate, locale)],
              [t("agent.agreementEnd"), fmtDate(agent.agreementEndDate, locale)],
            ]}
          />
          {agent.territoryNotes && <p className="mt-3 text-sm text-grey-mute">{agent.territoryNotes}</p>}
        </DetailCard>

        <DetailCard title={t("contact.many")} count={agent.contacts.length}>
          {agent.contacts.length === 0 ? (
            <p className="text-sm text-grey-mute">{t("empty.contactsHint")}</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {agent.contacts.map((c) => (
                  <tr key={c.id} className="border-b border-grey-line/60 last:border-0">
                    <td className="py-1.5 pr-3">
                      <Link href={`/contacts/${c.id}`} className="font-medium text-ink hover:text-kmc-ink">
                        {c.fullName}
                      </Link>
                      {c.isPrimary && <span className="ml-1.5"><StatusPill tone="active">{t("contact.isPrimary")}</StatusPill></span>}
                    </td>
                    <td className="py-1.5 pr-3 text-grey-mute">{c.jobTitle ?? "—"}</td>
                    <td className="py-1.5 text-grey-mute mono">{c.email ?? c.phone ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DetailCard>
      </div>

      {agent.notes && (
        <DetailCard title={t("agent.notes")} className="mt-4">
          <p className="whitespace-pre-wrap text-sm text-ink">{agent.notes}</p>
        </DetailCard>
      )}
    </div>
  );
}

function Banner({ tone, children }: { tone: "alert" | "warn"; children: React.ReactNode }) {
  const cls =
    tone === "alert"
      ? "border-alert/40 bg-alert-wash text-alert"
      : "border-grey-line bg-surface text-ink";
  return (
    <div className={`rounded-sm border px-3 py-2 text-xs ${cls}`} role="status">
      {children}
    </div>
  );
}

function DetailCard({
  title,
  count,
  className,
  children,
}: {
  title: string;
  count?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-sm border border-grey-line bg-surface p-4 ${className ?? ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="label">{title}</h2>
        {count != null && <span className="text-2xs text-grey-mute mono">{count}</span>}
      </div>
      {children}
    </section>
  );
}

function DL({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
      {items.map(([k, v], i) => (
        <div key={i} className="flex flex-col gap-0.5">
          <dt className="text-[10px] uppercase tracking-wider text-grey-mute mono">{k}</dt>
          <dd className="text-sm text-ink mono">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
