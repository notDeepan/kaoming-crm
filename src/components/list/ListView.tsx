"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, cx } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";
import { exportRows, saveView, deleteView } from "@/app/actions/list";
import type { Column, SavedViewData } from "./types";

interface Props<Row extends { id: string }> {
  entityType: string; // "agent" | "customer" | "contact"
  sheetName: string;
  columns: Column<Row>[];
  rows: Row[];
  rowHref: (row: Row) => string;
  savedViews: SavedViewData[];
  canExport: boolean;
  createHref?: string;
  createLabel?: string;
  importHref?: string;
  title: string;
  emptyTitle: string;
  emptyHint: string;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

export function ListView<Row extends { id: string }>({
  entityType,
  sheetName,
  columns,
  rows,
  rowHref,
  savedViews,
  canExport,
  createHref,
  createLabel,
  importHref,
  title,
  emptyTitle,
  emptyHint,
}: Props<Row>) {
  const t = useTranslations();
  const router = useRouter();

  const defaultView = savedViews.find((v) => v.isDefault);
  const [visible, setVisible] = useState<Set<string>>(
    () =>
      new Set(
        defaultView?.config.columns ??
          columns.filter((c) => c.visibleByDefault !== false).map((c) => c.key)
      )
  );
  const [sort, setSort] = useState<SortState>(defaultView?.config.sort ?? null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(defaultView?.config.filters ?? {});
  const [showFilters, setShowFilters] = useState(
    () => Object.keys(defaultView?.config.filters ?? {}).length > 0
  );
  const [busy, setBusy] = useState(false);

  const shownColumns = columns.filter((c) => visible.has(c.key));
  const filterableCols = columns.filter((c) => c.filterable && c.filterOptions);

  const processed = useMemo(() => {
    let out = rows;
    const term = search.trim().toLowerCase();
    if (term) {
      out = out.filter((row) =>
        columns.some((c) => String(c.value(row) ?? "").toLowerCase().includes(term))
      );
    }
    for (const [key, val] of Object.entries(filters)) {
      if (!val) continue;
      const col = columns.find((c) => c.key === key);
      if (!col) continue;
      out = out.filter((row) => String(col.value(row) ?? "") === val);
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        out = [...out].sort((a, b) => {
          const av = col.value(a);
          const bv = col.value(b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          const cmp =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv));
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, columns, search, filters, sort]);

  function toggleSort(key: string) {
    setSort((s) =>
      s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null
    );
  }

  function toggleColumn(key: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleExport() {
    setBusy(true);
    try {
      const headers = shownColumns.map((c) => c.header);
      const data = processed.map((row) => shownColumns.map((c) => c.value(row)));
      const res = await exportRows({ entityType, sheetName, headers, rows: data });
      if ("error" in res) return;
      const bytes = Uint8Array.from(atob(res.base64), (ch) => ch.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveView() {
    const name = window.prompt(t("list.viewName"));
    if (!name) return;
    await saveView({
      entityType,
      name,
      config: { columns: [...visible], sort: sort ?? undefined, filters },
      makeDefault: false,
    });
    router.refresh();
  }

  function applyView(v: SavedViewData) {
    setVisible(new Set(v.config.columns));
    setSort(v.config.sort ?? null);
    setFilters(v.config.filters ?? {});
    setShowFilters(Object.keys(v.config.filters ?? {}).length > 0);
  }

  const totalRows = rows.length;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-grey-line px-5 py-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        <span className="text-2xs text-grey-mute mono">
          {t("list.resultCount", { count: processed.length, total: totalRows })}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {importHref && (
            <Button variant="secondary" size="sm" onClick={() => router.push(importHref)}>
              {t("common.importFromExcel")}
            </Button>
          )}
          {createHref && (
            <Button variant="primary" size="sm" onClick={() => router.push(createHref)}>
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-grey-line bg-paper px-5 py-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.search")}
          aria-label={t("common.search")}
          autoComplete="off"
          spellCheck={false}
          className="h-8 w-56 rounded-sm border border-grey-line bg-surface px-2.5 text-sm focus:border-kmc focus:outline-none"
        />

        {filterableCols.length > 0 && (
          <Button
            variant={showFilters ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
          >
            {t("common.filters")}
          </Button>
        )}

        {/* columns menu */}
        <details className="relative">
          <summary className="flex h-8 cursor-pointer list-none items-center rounded-sm px-2.5 text-sm text-grey-mute hover:bg-surface hover:text-ink">
            {t("common.columns")}
          </summary>
          <div className="absolute z-20 mt-1 w-56 rounded-sm border border-grey-line bg-surface p-1.5 shadow-pop">
            {columns.map((c) => (
              <label
                key={c.key}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-paper"
              >
                <input
                  type="checkbox"
                  checked={visible.has(c.key)}
                  onChange={() => toggleColumn(c.key)}
                  className="accent-kmc"
                />
                {c.header}
              </label>
            ))}
          </div>
        </details>

        {/* saved views menu */}
        <details className="relative">
          <summary className="flex h-8 cursor-pointer list-none items-center rounded-sm px-2.5 text-sm text-grey-mute hover:bg-surface hover:text-ink">
            {t("common.savedViews")}
          </summary>
          <div className="absolute z-20 mt-1 w-60 rounded-sm border border-grey-line bg-surface p-1.5 shadow-pop">
            {savedViews.length === 0 && (
              <p className="px-2 py-1 text-xs text-grey-mute">{t("list.noSavedViews")}</p>
            )}
            {savedViews.map((v) => (
              <div key={v.id} className="flex items-center gap-1">
                <button
                  onClick={() => applyView(v)}
                  className="flex-1 rounded-sm px-2 py-1 text-left text-sm hover:bg-paper"
                >
                  {v.name}
                  {v.isDefault && <span className="ml-1 text-2xs text-grey-mute mono">default</span>}
                </button>
                <button
                  onClick={async () => {
                    await deleteView(v.id);
                    router.refresh();
                  }}
                  aria-label={t("common.delete")}
                  className="rounded-sm px-1.5 py-1 text-grey-mute hover:text-alert"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={handleSaveView}
              className="mt-1 w-full rounded-sm border-t border-grey-line px-2 py-1 text-left text-sm text-kmc-ink hover:bg-paper"
            >
              {t("common.saveView")}
            </button>
          </div>
        </details>

        <div className="ml-auto">
          {canExport && (
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={busy}>
              {t("common.export")}
            </Button>
          )}
        </div>
      </div>

      {/* filter row */}
      {showFilters && filterableCols.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-grey-line bg-paper px-5 py-2">
          {filterableCols.map((c) => (
            <label key={c.key} className="flex items-center gap-1.5 text-xs text-grey-mute">
              <span className="label">{c.header}</span>
              <select
                value={filters[c.key] ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                className="h-7 rounded-sm border border-grey-line bg-surface px-1.5 text-xs focus:border-kmc focus:outline-none"
              >
                <option value="">{t("common.all")}</option>
                {c.filterOptions!.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {Object.values(filters).some(Boolean) && (
            <button
              onClick={() => setFilters({})}
              className="text-xs text-kmc-ink hover:underline"
            >
              {t("common.clear")}
            </button>
          )}
        </div>
      )}

      {/* table */}
      <div className="min-h-0 flex-1 overflow-auto">
        {processed.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title={totalRows === 0 ? emptyTitle : t("empty.listEmptyTitle")}
              hint={totalRows === 0 ? emptyHint : t("empty.listEmptyFiltered")}
              actionHref={totalRows === 0 ? createHref : undefined}
              actionLabel={createLabel}
            />
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-paper">
              <tr className="border-b border-grey-line">
                {shownColumns.map((c) => (
                  <th
                    key={c.key}
                    style={{ width: c.width }}
                    className={cx(
                      "label whitespace-nowrap px-4 py-2 text-left font-medium",
                      c.align === "right" && "text-right"
                    )}
                  >
                    {c.sortable ? (
                      <button
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 uppercase hover:text-ink"
                      >
                        {c.header}
                        <span className="text-grey-mute">
                          {sort?.key === c.key ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                        </span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processed.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => router.push(rowHref(row))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(rowHref(row));
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={String(shownColumns[0]?.value(row) ?? "")}
                  className="group h-row cursor-pointer border-b border-grey-line/70 hover:bg-kmc-wash/40 focus-visible:bg-kmc-wash/40"
                >
                  {shownColumns.map((c) => (
                    <td
                      key={c.key}
                      className={cx(
                        "whitespace-nowrap px-4 py-1.5",
                        c.mono && "mono tabular-nums",
                        c.align === "right" && "text-right"
                      )}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
