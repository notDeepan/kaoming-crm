/**
 * Descriptor for the catalogue's specification fields, driving the series/model admin forms and
 * the resolver generically instead of forty bespoke inputs. `level` places a field on the series
 * (constant, A10 Q-33) or the model/variant (size-varying, Q-34); resolution still merges model
 * over series, so any field can be overridden on a model when it genuinely departs.
 */
export interface SpecFieldDef {
  key: string;
  kind: "measure" | "text";
  labelKey: string; // i18n catalogue.spec.*
  level: "series" | "model";
  printed: boolean; // one of the ten A2 lines
  valueCol?: string;
  unitCol?: string;
  textCol?: string;
  defaultUnit?: string;
  units?: string[];
}

const m = (
  key: string, labelKey: string, level: "series" | "model", printed: boolean,
  defaultUnit: string, units?: string[]
): SpecFieldDef => ({
  key, kind: "measure", labelKey, level, printed,
  valueCol: `${key}Value`, unitCol: `${key}Unit`, defaultUnit, units: units ?? [defaultUnit],
});
const t = (key: string, labelKey: string, level: "series" | "model", printed: boolean, textCol = key): SpecFieldDef =>
  ({ key, kind: "text", labelKey, level, printed, textCol });

export const SPEC_FIELDS: SpecFieldDef[] = [
  // ── printed (A2), in print order ──
  m("travelX", "catalogue.spec.travelX", "model", true, "mm", ["mm", "inch"]),
  m("travelY", "catalogue.spec.travelY", "model", true, "mm", ["mm", "inch"]),
  m("travelZ", "catalogue.spec.travelZ", "series", true, "mm", ["mm", "inch"]),
  m("distanceColumns", "catalogue.spec.distanceColumns", "model", true, "mm", ["mm", "inch"]),
  t("spindleTaper", "catalogue.spec.spindleTaper", "series", true),
  t("spindleNoseToTable", "catalogue.spec.spindleNoseToTable", "series", true),
  m("spindleMotorTorque", "catalogue.spec.spindleMotorTorque", "series", true, "Nm", ["Nm", "ft-lb"]),
  m("spindleMotorPower", "catalogue.spec.spindleMotorPower", "series", true, "kW", ["kW", "HP"]),
  m("spindleSpeedV", "catalogue.spec.spindleSpeedV", "series", true, "rpm"),
  m("spindleSpeedH", "catalogue.spec.spindleSpeedH", "series", true, "rpm"),
  t("toolMagazine", "catalogue.spec.toolMagazine", "series", true),
  m("tableAreaX", "catalogue.spec.tableAreaX", "model", true, "mm", ["mm", "inch"]),
  m("tableAreaY", "catalogue.spec.tableAreaY", "model", true, "mm", ["mm", "inch"]),
  m("maxTableLoading", "catalogue.spec.maxTableLoading", "model", true, "t", ["t", "kg", "kg/m²"]),
  t("splashGuard", "catalogue.spec.splashGuard", "series", true, "splashGuardText"),
  // ── internal, stored not printed (Q-02A) ──
  m("rapidTraverse", "catalogue.spec.rapidTraverse", "model", false, "m/min"),
  t("positioningAccuracy", "catalogue.spec.positioningAccuracy", "series", false),
  t("repeatability", "catalogue.spec.repeatability", "series", false),
  m("machineHeight", "catalogue.spec.machineHeight", "model", false, "mm", ["mm", "inch"]),
  t("floorSpace", "catalogue.spec.floorSpace", "model", false),
  m("netWeight", "catalogue.spec.netWeight", "model", false, "kg", ["kg", "lb"]),
  t("controller", "catalogue.spec.controller", "series", false),
  t("electricalSupply", "catalogue.spec.electricalSupply", "series", false),
  t("airPressure", "catalogue.spec.airPressure", "series", false),
  t("toolShankShape", "catalogue.spec.toolShankShape", "series", false),
];

export const SERIES_FIELDS = SPEC_FIELDS.filter((f) => f.level === "series");
export const MODEL_FIELDS = SPEC_FIELDS.filter((f) => f.level === "model");

/** All DB columns a spec field touches, for building form defaults + payloads. */
export function fieldColumns(f: SpecFieldDef): string[] {
  return f.kind === "measure" ? [f.valueCol!, f.unitCol!] : [f.textCol!];
}
