import "server-only";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  isLocale,
  localeFromAcceptLanguage,
  type Locale,
} from "@vallo/i18n";
import { LOCALE_COOKIE } from "./locale.constants";

export { LOCALE_COOKIE };

/**
 * Resolve the active locale for the current request.
 *
 * Three steps, in this order, and the order is the whole design:
 *
 * 1. The stored cookie. An explicit choice from the language switcher must beat
 *    a browser default every time, including the case where the two disagree.
 *    Somebody whose phone is set to English and who deliberately picked Yorùbá
 *    is telling us something the header cannot.
 * 2. `Accept-Language`. A first-time visitor has made no choice yet, and their
 *    browser has already told us which of our four languages they read. Sending
 *    them English anyway, as this function used to, threw that away and made
 *    three of the four translations unreachable without a manual switch.
 * 3. English, which the brief sets as the platform default.
 *
 * The negotiation itself is `localeFromAcceptLanguage` in `@vallo/i18n`,
 * which is a pure function of the header string and the supported list. It is
 * there rather than here so it can be unit tested without a request; this
 * module cannot be imported outside one, because `next/headers` throws.
 *
 * Reading headers does not cost anything this function was not already paying.
 * `cookies()` has already opted the caller into dynamic rendering by the time
 * `headers()` is reached, so no page becomes uncacheable that was not.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const chosen = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  const requestHeaders = await headers();
  return localeFromAcceptLanguage(requestHeaders.get("accept-language")) ?? DEFAULT_LOCALE;
}
