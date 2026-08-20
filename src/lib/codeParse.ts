/**
 * Per-series model-code parsing for the add-variant prefill (A10 Q-37).
 *
 * Codes encode size: `[X-travel digit][distance digits][series][variant]`, but the digit→mm
 * mapping differs between series (GM 4→4000, GN 4→4500), so this is ALWAYS driven by the series'
 * own mapping, never a global rule (Q-37). It is convenience only — it prefills, never blocks a
 * code that doesn't fit the pattern, because one eventually won't.
 */

export interface Measure {
  value: number;
  unit: string;
}

export interface SeriesCodeMapping {
  /** how many leading digits are the X-travel group, then the distance group */
  xDigits: number;
  distanceDigits: number;
  /** digit-group string → millimetre value */
  xMap: Record<string, number>;
  distanceMap: Record<string, number>;
  unit?: string; // default "mm"
}

export interface ParsedCode {
  xTravel?: Measure;
  distanceColumns?: Measure;
  seriesCode?: string;
  variant?: string;
}

/** Split a code like "318HMA15" into groups using the series mapping's digit widths. */
export function parseModelCode(code: string, mapping: SeriesCodeMapping | null | undefined): ParsedCode {
  const out: ParsedCode = {};
  if (!mapping) return out;
  const m = /^(\d+)([A-Za-z]+)(\d*)$/.exec(code.trim());
  if (!m) return out;
  const digits = m[1]!;
  out.seriesCode = m[2]!.toUpperCase();
  out.variant = m[3] || undefined;

  const unit = mapping.unit ?? "mm";
  const xPart = digits.slice(0, mapping.xDigits);
  const distPart = digits.slice(mapping.xDigits, mapping.xDigits + mapping.distanceDigits);

  if (xPart && mapping.xMap[xPart] != null) out.xTravel = { value: mapping.xMap[xPart]!, unit };
  if (distPart && mapping.distanceMap[distPart] != null)
    out.distanceColumns = { value: mapping.distanceMap[distPart]!, unit };

  return out;
}
