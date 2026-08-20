"use client";

import { useTranslations } from "next-intl";
import { ListView } from "@/components/list/ListView";
import { StatusPill } from "@/components/ui";
import type { Column, SavedViewData } from "@/components/list/types";
import type { CustomerRow } from "@/server/customers";
import { INDUSTRIES, CUSTOMER_TYPES } from "@/lib/enums";
import { COUNTRY_CODES } from "@/lib/countries";

function typeTone(x: string): "active" | "warn" | "muted" {
  if (x === "active") return "active";
  if (x === "prospect") return "warn";
  return "muted";
}

export function CustomersClient({
  rows,
  savedViews,
  canExport,
  createHref,
  importHref,
}: {
  rows: CustomerRow[];
  savedViews: SavedViewData[];
  canExport: boolean;
  createHref?: string;
  importHref?: string;
}) {
  const t = useTranslations();

  const columns: Column<CustomerRow>[] = [
    {
      key: "customerCode",
      header: t("customer.code"),
      mono: true,
      sortable: true,
      width: "6rem",
      value: (r) => r.customerCode,
      render: (r) => <span className="font-medium text-ink">{r.customerCode}</span>,
    },
    {
      key: "companyNameEn",
      header: t("customer.companyNameEn"),
      sortable: true,
      value: (r) => r.companyNameEn,
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-ink">{r.companyNameEn}</span>
          {r.companyNameLocal && <span className="text-2xs text-grey-mute">{r.companyNameLocal}</span>}
        </div>
      ),
    },
    {
      key: "country",
      header: t("customer.country"),
      filterable: true,
      value: (r) => t(`country.${r.country}`),
      filterOptions: COUNTRY_CODES.map((c) => ({ value: t(`country.${c}`), label: t(`country.${c}`) })),
      render: (r) => (
        <span className="text-ink">
          <span className="mono text-grey-mute">{r.country}</span> {t(`country.${r.country}`)}
        </span>
      ),
    },
    {
      key: "city",
      header: t("customer.city"),
      value: (r) => r.city,
      visibleByDefault: false,
      render: (r) => <span className="text-grey-mute">{r.city ?? "—"}</span>,
    },
    {
      key: "industry",
      header: t("customer.industry"),
      filterable: true,
      value: (r) => (r.industry ? t(`enums.industry.${r.industry}`) : ""),
      filterOptions: INDUSTRIES.map((v) => ({ value: t(`enums.industry.${v}`), label: t(`enums.industry.${v}`) })),
      render: (r) => <span className="text-grey-mute">{r.industry ? t(`enums.industry.${r.industry}`) : "—"}</span>,
    },
    {
      key: "customerType",
      header: t("customer.customerType"),
      filterable: true,
      value: (r) => t(`enums.customerType.${r.customerType}`),
      filterOptions: CUSTOMER_TYPES.map((v) => ({ value: t(`enums.customerType.${v}`), label: t(`enums.customerType.${v}`) })),
      render: (r) => <StatusPill tone={typeTone(r.customerType)}>{t(`enums.customerType.${r.customerType}`)}</StatusPill>,
    },
    {
      key: "primaryAgent",
      header: t("customer.primaryAgent"),
      mono: true,
      value: (r) => r.primaryAgentCode ?? "",
      render: (r) => <span className="text-ink">{r.primaryAgentCode ?? "—"}</span>,
    },
    {
      key: "owner",
      header: t("customer.owner"),
      sortable: true,
      value: (r) => r.ownerName,
      render: (r) => <span className="text-grey-mute">{r.ownerName}</span>,
    },
    {
      key: "contacts",
      header: t("contact.many"),
      mono: true,
      align: "right",
      value: (r) => r.contactCount,
      render: (r) => <span className="text-ink">{r.contactCount}</span>,
    },
  ];

  return (
    <ListView<CustomerRow>
      entityType="customer"
      sheetName="Customers"
      title={t("nav.customers")}
      columns={columns}
      rows={rows}
      rowHref={(r) => `/customers/${r.id}`}
      savedViews={savedViews}
      canExport={canExport}
      createHref={createHref}
      importHref={importHref}
      createLabel={t("customer.newCustomer")}
      emptyTitle={t("empty.customersTitle")}
      emptyHint={t("empty.customersHint")}
    />
  );
}
