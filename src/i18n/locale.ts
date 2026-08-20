import { cookies } from "next/headers";
import { LANGUAGES, type Language } from "@/lib/enums";
import { LOCALE_COOKIE } from "./cookie";

export const DEFAULT_LOCALE: Language = "en";

export async function getLocale(): Promise<Language> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return (LANGUAGES as readonly string[]).includes(value ?? "")
    ? (value as Language)
    : DEFAULT_LOCALE;
}
