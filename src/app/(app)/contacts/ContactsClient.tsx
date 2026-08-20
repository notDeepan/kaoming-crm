"use client";

import { useTranslations } from "next-intl";
import { ListView } from "@/components/list/ListView";
import { StatusPill } from "@/components/ui";
import type { Column, SavedViewData } from "@/components/list/types";
import type { ContactRow } from "@/server/contacts";
import { CONTACT_PARENTS, ROLES_IN_DEAL } from "@/lib/enums";

export function ContactsClient({
  rows,
  savedViews,
  canExport,
  createHref,
  importHref,
}: {
  rows: ContactRow[];
  savedViews: SavedViewData[];
  canExport: boolean;
  createHref?: string;
  importHref?: string;
}) {
  const t = useTranslations();

  const columns: Column<ContactRow>[] = [
    {
      key: "fullName",
      header: t("contact.fullName"),
      sortable: true,
      value: (r) => r.fullName,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="font-medium text-ink">{r.fullName}</span>
            {r.nameLocal && <span className="text-2xs text-grey-mute">{r.nameLocal}</span>}
          </div>
          {r.isPrimary && <StatusPill tone="active">{t("contact.isPrimary")}</StatusPill>}
        </div>
      ),
    },
    {
      key: "jobTitle",
      header: t("contact.jobTitle"),
      value: (r) => r.jobTitle,
      render: (r) => <span className="text-grey-mute">{r.jobTitle ?? "—"}</span>,
    },
    {
      key: "roleInDeal",
      header: t("contact.roleInDeal"),
      filterable: true,
      visibleByDefault: false,
      value: (r) => (r.roleInDeal ? t(`enums.roleInDeal.${r.roleInDeal}`) : ""),
      filterOptions: ROLES_IN_DEAL.map((v) => ({ value: t(`enums.roleInDeal.${v}`), label: t(`enums.roleInDeal.${v}`) })),
      render: (r) => <span className="text-grey-mute">{r.roleInDeal ? t(`enums.roleInDeal.${r.roleInDeal}`) : "—"}</span>,
    },
    {
      key: "parentType",
      header: t("contact.parentType"),
      filterable: true,
      value: (r) => t(`enums.contactParent.${r.parentType}`),
      filterOptions: CONTACT_PARENTS.map((v) => ({ value: t(`enums.contactParent.${v}`), label: t(`enums.contactParent.${v}`) })),
      render: (r) => <StatusPill tone="neutral">{t(`enums.contactParent.${r.parentType}`)}</StatusPill>,
    },
    {
      key: "parent",
      header: t("contact.parent"),
      sortable: true,
      value: (r) => r.parentName,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-ink">{r.parentName}</span>
          <span className="text-2xs text-grey-mute mono">{r.parentCode}</span>
        </div>
      ),
    },
    {
      key: "email",
      header: t("contact.email"),
      mono: true,
      value: (r) => r.email,
      render: (r) => <span className="text-grey-mute">{r.email ?? "—"}</span>,
    },
    {
      key: "phone",
      header: t("contact.phone"),
      mono: true,
      visibleByDefault: false,
      value: (r) => r.phone ?? r.mobile,
      render: (r) => <span className="text-grey-mute">{r.phone ?? r.mobile ?? "—"}</span>,
    },
  ];

  return (
    <ListView<ContactRow>
      entityType="contact"
      sheetName="Contacts"
      title={t("nav.contacts")}
      columns={columns}
      rows={rows}
      rowHref={(r) => `/contacts/${r.id}`}
      savedViews={savedViews}
      canExport={canExport}
      createHref={createHref}
      importHref={importHref}
      createLabel={t("contact.newContact")}
      emptyTitle={t("empty.contactsTitle")}
      emptyHint={t("empty.contactsHint")}
    />
  );
}
