import type * as React from "react";

/**
 * A column in the reusable list framework (SL-02). Every list view in the system is built from
 * these — the framework provides column selection, sorting, multi-field filtering, saved views
 * and one-action Excel export, so no list screen re-implements them.
 */
export interface Column<Row> {
  key: string;
  header: string;
  /** Rich cell for the screen. */
  render: (row: Row) => React.ReactNode;
  /** Plain value used for sorting, filtering and Excel export. */
  value: (row: Row) => string | number | null;
  /** Options for a select-type filter; omit for free-text/no filter. */
  filterOptions?: Array<{ value: string; label: string }>;
  sortable?: boolean;
  filterable?: boolean;
  visibleByDefault?: boolean;
  mono?: boolean;
  align?: "left" | "right";
  /** Column width hint. */
  width?: string;
}

export interface SavedViewData {
  id: string;
  name: string;
  isDefault: boolean;
  config: { columns: string[]; sort?: { key: string; dir: "asc" | "desc" }; filters?: Record<string, string> };
}
