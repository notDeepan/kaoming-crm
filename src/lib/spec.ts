/**
 * Machine specification resolution (addendum A2, A5, A10 Q-35).
 *
 * A model inherits constant fields from its series and overrides the size-varying ones. This
 * flattens the two into the exactly ten lines that print on a quotation, formatted in the chosen
 * unit system. Everything else the catalogue holds stays off the quotation (Q-02A). The output is
 * plain text per line so the salesperson can edit any line afterwards (Q-02) and so it can be
 * snapshotted verbatim at issue (§16.6).
 */
import { formatInSystem, type UnitSystem, type Measure } from "./units";

/** Every spec field, numeric ones as value+unit, text ones as strings. Nulls allowed throughout. */
export interface SpecSource {
  travelXValue?: number | null; travelXUnit?: string | null;
  travelYValue?: number | null; travelYUnit?: string | null;
  travelZValue?: number | null; travelZUnit?: string | null;
  distanceColumnsValue?: number | null; distanceColumnsUnit?: string | null;
  spindleTaper?: string | null;
  spindleNoseToTable?: string | null;
  spindleMotorTorqueValue?: number | null; spindleMotorTorqueUnit?: string | null;
  spindleMotorPowerValue?: number | null; spindleMotorPowerUnit?: string | null;
  spindleSpeedVValue?: number | null; spindleSpeedVUnit?: string | null;
  spindleSpeedHValue?: number | null; spindleSpeedHUnit?: string | null;
  toolMagazine?: string | null;
  tableAreaXValue?: number | null; tableAreaXUnit?: string | null;
  tableAreaYValue?: number | null; tableAreaYUnit?: string | null;
  maxTableLoadingValue?: number | null; maxTableLoadingUnit?: string | null;
  splashGuardText?: string | null;
  standardAccessories?: string | null;
}

const SPEC_KEYS: (keyof SpecSource)[] = [
  "travelXValue", "travelXUnit", "travelYValue", "travelYUnit", "travelZValue", "travelZUnit",
  "distanceColumnsValue", "distanceColumnsUnit", "spindleTaper", "spindleNoseToTable",
  "spindleMotorTorqueValue", "spindleMotorTorqueUnit", "spindleMotorPowerValue", "spindleMotorPowerUnit",
  "spindleSpeedVValue", "spindleSpeedVUnit", "spindleSpeedHValue", "spindleSpeedHUnit",
  "toolMagazine", "tableAreaXValue", "tableAreaXUnit", "tableAreaYValue", "tableAreaYUnit",
  "maxTableLoadingValue", "maxTableLoadingUnit", "splashGuardText", "standardAccessories",
];

/** Merge model over series, field by field (Q-34/Q-35). Model value wins when present. */
export function mergeSpec(series: SpecSource | null, model: SpecSource | null): SpecSource {
  const out: SpecSource = {};
  for (const k of SPEC_KEYS) {
    const mv = model?.[k];
    const sv = series?.[k];
    // @ts-expect-error indexed assignment across the union is safe here
    out[k] = mv ?? sv ?? null;
  }
  return out;
}

/** The ten printed spec lines, in fixed order (A2). `labelKey` resolves via i18n `spec.*`. */
export interface SpecLine {
  key: string;
  labelKey: string;
  text: string;
}

function fmt(value: number | null | undefined, unit: string | null | undefined, system: UnitSystem): string | null {
  if (value == null || !unit) return null;
  return formatInSystem({ value, unit } as Measure, system);
}

/** Join non-null parts with " / " (travels, spindle speed V/H, motor torque/power). */
function slash(...parts: (string | null)[]): string {
  const kept = parts.filter((p): p is string => !!p);
  return kept.join(" / ");
}

export function resolveSpecLines(spec: SpecSource, system: UnitSystem): SpecLine[] {
  const lines: SpecLine[] = [];
  const push = (key: string, labelKey: string, text: string | null | undefined) => {
    if (text && text.trim()) lines.push({ key, labelKey, text: text.trim() });
  };

  push(
    "travel",
    "spec.travel",
    slash(
      fmt(spec.travelXValue, spec.travelXUnit, system),
      fmt(spec.travelYValue, spec.travelYUnit, system),
      fmt(spec.travelZValue, spec.travelZUnit, system)
    ) || null
  );
  push("distanceColumns", "spec.distanceColumns", fmt(spec.distanceColumnsValue, spec.distanceColumnsUnit, system));
  push("spindleTaper", "spec.spindleTaper", spec.spindleTaper);
  push("spindleNoseToTable", "spec.spindleNoseToTable", spec.spindleNoseToTable);
  push(
    "spindleMotor",
    "spec.spindleMotor",
    slash(
      fmt(spec.spindleMotorTorqueValue, spec.spindleMotorTorqueUnit, system),
      fmt(spec.spindleMotorPowerValue, spec.spindleMotorPowerUnit, system)
    ) || null
  );
  push(
    "spindleSpeed",
    "spec.spindleSpeed",
    slash(
      fmt(spec.spindleSpeedVValue, spec.spindleSpeedVUnit, system),
      fmt(spec.spindleSpeedHValue, spec.spindleSpeedHUnit, system)
    ) || null
  );
  push("toolMagazine", "spec.toolMagazine", spec.toolMagazine);
  {
    const x = fmt(spec.tableAreaXValue, spec.tableAreaXUnit, system);
    const y = fmt(spec.tableAreaYValue, spec.tableAreaYUnit, system);
    push("tableArea", "spec.tableArea", x && y ? `${x} × ${y}`.replace(/ (mm|inch) ×/, " ×") : x || y);
  }
  push("maxTableLoading", "spec.maxTableLoading", fmt(spec.maxTableLoadingValue, spec.maxTableLoadingUnit, system));
  push("splashGuard", "spec.splashGuard", spec.splashGuardText);

  return lines;
}

/** The i18n label keys for the ten spec lines, in print order — used for headers/forms. */
export const SPEC_LINE_ORDER = [
  "travel", "distanceColumns", "spindleTaper", "spindleNoseToTable", "spindleMotor",
  "spindleSpeed", "toolMagazine", "tableArea", "maxTableLoading", "splashGuard",
] as const;
