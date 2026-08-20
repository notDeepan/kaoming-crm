/**
 * Unit conversion service (addendum A5).
 *
 * Specification values are stored as { value, unit } in the unit the catalogue uses, never
 * pre-formatted. This module converts for display/print only — the stored value never changes
 * (Q-14). Conversion happens within a physical dimension; the Metric/Imperial selector maps each
 * unit to its peer in the chosen system. Output always carries its unit (Q-17) and rounds to a
 * sensible precision, never six decimals on a customer quotation (Q-16).
 */

export type UnitSystem = "metric" | "imperial";
type Dimension = "length" | "mass" | "areal_load" | "power" | "torque" | "speed";

interface UnitDef {
  symbol: string;
  dimension: Dimension;
  /** multiply by this to reach the dimension's base unit */
  toBase: number;
  /** decimals to show when this unit is the display unit */
  decimals: number;
  metric: string;
  imperial: string;
}

// Base units: length=mm, mass=kg, areal_load=kg/m², power=kW, torque=Nm, speed=rpm.
const UNITS: Record<string, UnitDef> = {
  mm: { symbol: "mm", dimension: "length", toBase: 1, decimals: 0, metric: "mm", imperial: "inch" },
  inch: { symbol: "inch", dimension: "length", toBase: 25.4, decimals: 2, metric: "mm", imperial: "inch" },
  kg: { symbol: "kg", dimension: "mass", toBase: 1, decimals: 0, metric: "kg", imperial: "lb" },
  t: { symbol: "t", dimension: "mass", toBase: 1000, decimals: 2, metric: "t", imperial: "lb" },
  lb: { symbol: "lb", dimension: "mass", toBase: 0.45359237, decimals: 0, metric: "kg", imperial: "lb" },
  "kg/m²": { symbol: "kg/m²", dimension: "areal_load", toBase: 1, decimals: 0, metric: "kg/m²", imperial: "lb/ft²" },
  "lb/ft²": { symbol: "lb/ft²", dimension: "areal_load", toBase: 4.88242764, decimals: 1, metric: "kg/m²", imperial: "lb/ft²" },
  kW: { symbol: "kW", dimension: "power", toBase: 1, decimals: 1, metric: "kW", imperial: "HP" },
  HP: { symbol: "HP", dimension: "power", toBase: 0.745699872, decimals: 1, metric: "kW", imperial: "HP" },
  Nm: { symbol: "Nm", dimension: "torque", toBase: 1, decimals: 0, metric: "Nm", imperial: "ft-lb" },
  "ft-lb": { symbol: "ft-lb", dimension: "torque", toBase: 1.35581795, decimals: 1, metric: "Nm", imperial: "ft-lb" },
  rpm: { symbol: "rpm", dimension: "speed", toBase: 1, decimals: 0, metric: "rpm", imperial: "rpm" },
};

// Tolerate common spellings from imported data.
const ALIASES: Record<string, string> = {
  in: "inch", '"': "inch", tonne: "t", tonnes: "t", "kg/m2": "kg/m²", "lb/ft2": "lb/ft²",
  hp: "HP", kw: "kW", nm: "Nm", ftlb: "ft-lb", "ft·lb": "ft-lb", RPM: "rpm",
};

export function normalizeUnit(unit: string): string {
  const u = unit.trim();
  if (UNITS[u]) return u;
  if (ALIASES[u]) return ALIASES[u];
  const lower = u.toLowerCase();
  return ALIASES[lower] ?? u;
}

export function knownUnit(unit: string): boolean {
  return !!UNITS[normalizeUnit(unit)];
}

/** Round to the given decimals without trailing-float noise. */
function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/**
 * Convert a value between two units of the same dimension. Returns null if the units are
 * incompatible (e.g. mass → areal load) — the caller keeps the original rather than printing junk.
 */
export function convert(value: number, from: string, to: string): number | null {
  const f = UNITS[normalizeUnit(from)];
  const t = UNITS[normalizeUnit(to)];
  if (!f || !t || f.dimension !== t.dimension) return null;
  const base = value * f.toBase;
  return round(base / t.toBase, t.decimals);
}

/** The peer unit for `unit` in the target system (e.g. mm→inch in imperial). */
export function peerUnit(unit: string, system: UnitSystem): string {
  const def = UNITS[normalizeUnit(unit)];
  if (!def) return unit;
  return system === "imperial" ? def.imperial : def.metric;
}

export interface Measure {
  value: number;
  unit: string;
}

/** Express a stored measure in the chosen system. No-op if the unit is already right or unknown. */
export function toSystem(m: Measure, system: UnitSystem): Measure {
  const target = peerUnit(m.unit, system);
  if (target === normalizeUnit(m.unit)) return { value: m.value, unit: normalizeUnit(m.unit) };
  const converted = convert(m.value, m.unit, target);
  return converted == null ? { value: m.value, unit: normalizeUnit(m.unit) } : { value: converted, unit: target };
}

export function decimalsFor(unit: string): number {
  return UNITS[normalizeUnit(unit)]?.decimals ?? 2;
}

/** "45 kW", "118.11 inch" — the unit always prints alongside the number (Q-17). */
export function formatMeasure(m: Measure): string {
  const dec = decimalsFor(m.unit);
  const n = round(m.value, dec);
  const str = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dec }).format(n);
  return `${str} ${normalizeUnit(m.unit)}`;
}

/** Format a stored measure directly in the requested system — the common print path. */
export function formatInSystem(m: Measure, system: UnitSystem): string {
  return formatMeasure(toSystem(m, system));
}
