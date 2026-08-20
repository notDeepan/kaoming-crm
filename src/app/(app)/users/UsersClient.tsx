"use client";

import { useTranslations } from "next-intl";
import { ListView } from "@/components/list/ListView";
import { StatusPill } from "@/components/ui";
import type { Column, SavedViewData } from "@/components/list/types";
import type { UserRow } from "@/server/usersAdmin";
import { ROLES, USER_STATUSES } from "@/lib/enums";
import { fmtDateTime } from "@/lib/format";

export function UsersClient({
  rows,
  createHref,
  locale,
}: {
  rows: UserRow[];
  createHref?: string;
  locale: string;
}) {
  const t = useTranslations();
  const savedViews: SavedViewData[] = [];

  const columns: Column<UserRow>[] = [
    {
      key: "username",
      header: t("user.username"),
      mono: true,
      sortable: true,
      value: (r) => r.username,
      render: (r) => <span className="font-medium text-ink">{r.username}</span>,
    },
    {
      key: "fullName",
      header: t("user.fullName"),
      sortable: true,
      value: (r) => r.fullName,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-ink">{r.fullName}</span>
          {r.fullNameZh && <span className="text-2xs text-grey-mute">{r.fullNameZh}</span>}
        </div>
      ),
    },
    {
      key: "email",
      header: t("user.email"),
      mono: true,
      value: (r) => r.email,
      render: (r) => <span className="text-grey-mute">{r.email}</span>,
    },
    {
      key: "role",
      header: t("user.role"),
      filterable: true,
      value: (r) => t(`enums.role.${r.role}`),
      filterOptions: ROLES.map((v) => ({ value: t(`enums.role.${v}`), label: t(`enums.role.${v}`) })),
      render: (r) => <span className="text-ink">{t(`enums.role.${r.role}`)}</span>,
    },
    {
      key: "status",
      header: t("user.status"),
      filterable: true,
      value: (r) => t(`enums.userStatus.${r.status}`),
      filterOptions: USER_STATUSES.map((v) => ({ value: t(`enums.userStatus.${v}`), label: t(`enums.userStatus.${v}`) })),
      render: (r) => (
        <StatusPill tone={r.status === "active" ? "active" : r.status === "suspended" ? "warn" : "muted"}>
          {t(`enums.userStatus.${r.status}`)}
        </StatusPill>
      ),
    },
    {
      key: "lastLogin",
      header: t("user.lastLogin"),
      mono: true,
      align: "right",
      sortable: true,
      value: (r) => (r.lastLoginAt ? r.lastLoginAt.getTime() : null),
      render: (r) => <span className="text-grey-mute">{r.lastLoginAt ? fmtDateTime(r.lastLoginAt, locale) : "—"}</span>,
    },
  ];

  return (
    <ListView<UserRow>
      entityType="user"
      sheetName="Users"
      title={t("nav.users")}
      columns={columns}
      rows={rows}
      rowHref={(r) => (createHref ? `/users/${r.id}/edit` : "#")}
      savedViews={savedViews}
      canExport={false}
      createHref={createHref}
      createLabel={t("user.newUser")}
      emptyTitle={t("empty.usersTitle")}
      emptyHint={t("empty.usersHint")}
    />
  );
}
