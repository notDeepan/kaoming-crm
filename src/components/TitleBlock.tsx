import * as React from "react";
import { cx } from "./ui";

export interface TitleBlockField {
  label: string;
  value: React.ReactNode;
}

/**
 * A drawing's title block — identity fields in a fixed bordered mono grid at the head of a record.
 * Lighter than the dark nameplate (which is reserved for the machine itself); used for customer
 * and contact records so the hierarchy stays honest: the plate is the machine, the title block is
 * the company.
 */
export function TitleBlock({
  eyebrow,
  title,
  subtitle,
  fields,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  fields: TitleBlockField[];
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-ink/80 bg-surface">
      <div className="flex items-baseline justify-between gap-3 border-b border-grey-line px-4 py-3">
        <div>
          <div className="text-2xs uppercase tracking-wider text-grey-mute mono">{eyebrow}</div>
          <h1 className="text-xl font-semibold leading-tight text-ink">{title}</h1>
          {subtitle && <div className="text-sm text-grey-mute">{subtitle}</div>}
        </div>
      </div>
      <dl className="grid grid-cols-2 divide-grey-line sm:grid-cols-4">
        {fields.map((f, i) => (
          <div
            key={i}
            className={cx(
              "border-grey-line px-4 py-2.5",
              "border-t",
              i % 4 !== 0 && "sm:border-l",
              i % 2 !== 0 && "border-l sm:border-l"
            )}
          >
            <dt className="text-[10px] uppercase tracking-wider text-grey-mute mono">{f.label}</dt>
            <dd className="mt-0.5 text-sm text-ink mono tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
