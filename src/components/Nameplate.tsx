import * as React from "react";
import { cx } from "./ui";

export interface PlateRow {
  label: string;
  value: React.ReactNode;
  /** span both columns */
  wide?: boolean;
}

/**
 * The signature element — a machine nameplate. Dark anodized plate, engraved mono text, one
 * thin brand-red rule across the top, dense framed grid. Echoes the plate riveted to every
 * KAO MING machine. Used for the installed-machine and quotation config blocks, and — in
 * Phase 1 — the agent record header.
 */
export function Nameplate({
  eyebrow,
  title,
  subtitle,
  rows,
  className,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rows: PlateRow[];
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-sm border border-ink bg-ink text-paper shadow-plate",
        className
      )}
    >
      {/* the red rule — the only brand colour on the plate */}
      <div className="h-[3px] w-full bg-kmc" />
      <div className="px-4 py-3">
        {eyebrow && (
          <div className="mb-0.5 text-2xs uppercase tracking-wider text-paper/50 mono">
            {eyebrow}
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-lg font-semibold leading-tight mono">{title}</div>
          {subtitle && <div className="text-xs text-paper/60">{subtitle}</div>}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          {rows.map((r, i) => (
            <div key={i} className={cx("flex flex-col gap-0.5", r.wide && "col-span-2 sm:col-span-3")}>
              <span className="text-[10px] uppercase tracking-wider text-paper/45 mono">
                {r.label}
              </span>
              <span className="text-sm text-paper mono tabular-nums">{r.value}</span>
            </div>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
