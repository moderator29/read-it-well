/**
 * The whole of @vallo/i18n: the light helpers in `core.ts`, and the four
 * dictionaries. Client code that needs no dictionary imports
 * `@vallo/i18n/core` instead, and ships none of this file's locales (see the
 * note at the top of `core.ts`).
 */
import { en, type Dictionary } from "./locales/en";
import { yo } from "./locales/yo";
import { ha } from "./locales/ha";
import { ig } from "./locales/ig";
import { suppliedKeys } from "./locales/fallback";
import { DEFAULT_LOCALE, type Locale } from "./core";

export * from "./core";
export { suppliedKeys };

const dictionaries: Record<Locale, Dictionary> = { en, yo, ha, ig };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}
