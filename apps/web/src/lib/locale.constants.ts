/**
 * Locale constants shared by server and client.
 *
 * Kept apart from `locale.ts` on purpose. That module imports `next/headers`,
 * which cannot be pulled into a client bundle, and the language switcher needs
 * the cookie name on the client.
 */
export const LOCALE_COOKIE = "nf_locale";
