import { getDictionary, type Locale } from "@vallo/i18n";

/**
 * A panel sentence from `admin.shell.text` in the reader's language, English
 * where a locale has not translated it yet (the dictionary's own fallback).
 */
export function tx(locale: Locale, key: keyof ReturnType<typeof getDictionary>["admin"]["shell"]["text"]): string {
  return getDictionary(locale).admin.shell.text[key];
}
