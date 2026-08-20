import * as React from "react";
import { cx } from "./ui";

export interface Stat {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "alert";
}

/**
 * The derived-performance readout — a compact mono stat strip, deliberately not a row of big
 * decorative stat cards. Numbers are tabular so they line up.
 */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div
      className={cx(
        "flex flex-wrap divide-x divide-grey-line overflow-hidden rounded-sm border border-grey-line bg-surface",
        className
      )}
    >
      {stats.map((s, i) => (
        <div key={i} className="flex min-w-[7rem] flex-1 flex-col gap-0.5 px-3.5 py-2">
          <span className="text-[10px] uppercase tracking-wider text-grey-mute mono">{s.label}</span>
          <span
            className={cx(
              "text-base mono tabular-nums",
              s.tone === "alert" ? "text-alert" : "text-ink"
            )}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}
