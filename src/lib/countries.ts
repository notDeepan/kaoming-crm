// The subset of ISO 3166-1 alpha-2 codes in play for KAO MING's overseas markets. Labels are
// resolved from the i18n message files (country.<code>), so this is codes only.
export const COUNTRY_CODES = [
  "TR", "IN", "PL", "TH", "MX", "VN", "DE", "ID",
  "TW", "US", "IT", "ES", "BR", "JP", "KR", "CN", "GB", "FR", "RU", "MY",
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];
