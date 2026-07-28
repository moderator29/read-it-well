import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@naijafinds/i18n";
import { LOCALE_COOKIE } from "./locale.constants";

export { LOCALE_COOKIE };

/**
 * Resolve the active locale for the current request.
 *
 * Cookie first, because an explicit user choice must beat a browser default.
 * Falls back to English, which the brief sets as the default language.
 * Accept-Language negotiation is deliberately not wired yet, see KNOWN_GAPS.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
