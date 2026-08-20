"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/i18n/cookie";
import type { Language } from "@/lib/enums";

// Switch interface language per user without re-login (LO-01).
export async function setLocale(locale: Language): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
