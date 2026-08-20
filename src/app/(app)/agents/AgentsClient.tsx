"use client";

import { useTranslations } from "next-intl";
import { ListView } from "@/components/list/ListView";
import { StatusPill } from "@/components/ui";
import type { Column, SavedViewData } from "@/components/list/types";
import type { AgentRow } from "@/server/agents";
import { AGENT_TYPES, AGENT_STATUSES, type AgentStatus } from "@/lib/enums";

function statusTone(s: string): "active" | "warn" | "neutral" | "muted" {
  if (s === "active") return "active";
  if (s === "probation" || s === "prospective") return "warn";
  if (s === "dormant" || s === "terminated") return "muted";
  return "neutral";
}

export function AgentsClient({
  rows,
  savedViews,
  canExport,
  createHref,
  importHref,
}: {
  rows: AgentRow[];
  savedViews: SavedViewData[];
  canExport: boolean;
  createHref?: string;
  importHref?: string;
}) {
  const t = useTranslations();

  const owners = Array.from(new Map(rows.map((r) => [r.ownerUserId, r.ownerName])).entries()).map(
    ([value, label]) => ({ value: label, label })
  );

  const columns: Column<AgentRow>[] = [
    {
      key: "agentCode",
      header: t("agent.code"),
      mono: true,
      sortable: true,
      width: "6rem",
      value: (r) => r.agentCode,
      render: (r) => <span className="font-medium text-ink">{r.agentCode}</span>,
    },
    {
      key: "companyNameEn",
      header: t("agent.companyNameEn"),
      sortable: true,
      value: (r) => r.companyNameEn,
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink">{r.companyNameEn}</span>
          {r.companyNameLocal && (
            <span className="text-2xs text-grey-mute">{r.companyNameLocal}</span>
          )}
        </div>
      ),
    },
    {
      key: "agentType",
      header: t("agent.agentType"),
      filterable: true,
      value: (r) => t(`enums.agentType.${r.agentType}`),
      filterOptions: AGENT_TYPES.map((v) => ({ value: t(`enums.agentType.${v}`), label: t(`enums.agentType.${v}`) })),
      render: (r) => <span className="text-grey-mute">{t(`enums.agentType.${r.agentType}`)}</span>,
    },
    {
      key: "status",
      header: t("agent.status"),
      filterable: true,
      value: (r) => t(`enums.agentStatus.${r.status}`),
      filterOptions: AGENT_STATUSES.map((v) => ({ value: t(`enums.agentStatus.${v}`), label: t(`enums.agentStatus.${v}`) })),
      render: (r) => (
        <StatusPill tone={statusTone(r.status)}>{t(`enums.agentStatus.${r.status as AgentStatus}`)}</StatusPill>
      ),
    },
    {
      key: "territories",
      header: t("agent.territories"),
      mono: true,
      value: (r) => r.territories.join(" "),
      render: (r) => (
        <span className="text-ink">
          {r.territories.map((c) => t(`country.${c}`)).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "owner",
      header: t("agent.owner"),
      sortable: true,
      value: (r) => r.ownerName,
      filterable: true,
      filterOptions: owners,
      render: (r) => <span className="text-grey-mute">{r.ownerName}</span>,
    },
    {
      key: "lastContact",
      header: t("agent.lastContact"),
      mono: true,
      sortable: true,
      align: "right",
      value: (r) => (r.lastContactDate ? r.lastContactDate.getTime() : null),
      render: (r) =>
        r.daysSinceContact == null ? (
          <span className="text-grey-mute">—</span>
        ) : (
          <span className={r.overdue ? "text-alert" : "text-ink"}>
            {r.daysSinceContact} {t("common.days")}
            {r.overdue && <span className="ml-1" title={t("agent.overdue")}>▲</span>}
          </span>
        ),
    },
    {
      key: "cadence",
      header: t("agent.cadenceDays"),
      mono: true,
      align: "right",
      visibleByDefault: false,
      value: (r) => r.contactCadenceDays,
      render: (r) => <span className="text-grey-mute">{r.contactCadenceDays ?? "—"}</span>,
    },
    {
      key: "commission",
      header: t("agent.commissionPercent"),
      mono: true,
      align: "right",
      visibleByDefault: false,
      value: (r) => (r.commissionPercent ? Number(r.commissionPercent) : null),
      render: (r) => <span>{r.commissionPercent ? `${r.commissionPercent}%` : "—"}</span>,
    },
    {
      key: "openOpps",
      header: t("agent.openOpps"),
      mono: true,
      align: "right",
      sortable: true,
      value: (r) => r.openOppCount,
      render: (r) => <span className="text-ink">{r.openOppCount}</span>,
    },
  ];

  return (
    <ListView<AgentRow>
      entityType="agent"
      sheetName="Agents"
      title={t("nav.agents")}
      columns={columns}
      rows={rows}
      rowHref={(r) => `/agents/${r.id}`}
      savedViews={savedViews}
      canExport={canExport}
      createHref={createHref}
      importHref={importHref}
      createLabel={t("agent.newAgent")}
      emptyTitle={t("empty.agentsTitle")}
      emptyHint={t("empty.agentsHint")}
    />
  );
}
