import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_LOCALE, getDictionary, isLocale } from "@vallo/i18n";

import type { Database } from "../supabase/database.types";
import type { MailLanguage } from "./messages";

/**
 * THE LANGUAGE A MEMBER'S MAIL IS WRITTEN IN (recommendation A11).
 *
 * The one source is the member's own setting, `profiles.settings.locale`,
 * which the language row in /settings writes. Nothing is inferred from a
 * browser, an IP or a name: a person reads their mail in the language they
 * chose, and in English until they choose one.
 *
 * English is the empty answer on purpose. A builder handed no copy writes
 * exactly what it wrote before this existed, and a translated dictionary
 * falls back to English key by key (`withFallback`), so a missing string is
 * English rather than a blank.
 */
export function mailLanguageOf(locale: unknown): MailLanguage {
  if (typeof locale !== "string" || !isLocale(locale) || locale === DEFAULT_LOCALE) return {};
  return { locale, copy: getDictionary(locale).mail };
}

/**
 * Read the member's setting and answer with their mail language.
 *
 * Every failure is English: a missing row, a malformed document or an
 * unreachable database must never stop a transactional email, so the
 * direction to fail in is the language every string exists in.
 */
export async function mailLanguageFor(
  client: SupabaseClient<Database>,
  userId: string | null | undefined,
): Promise<MailLanguage> {
  if (!userId) return {};
  try {
    const { data } = await client.from("profiles").select("settings").eq("id", userId).maybeSingle();
    const settings = data?.settings;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
    return mailLanguageOf((settings as Record<string, unknown>)["locale"]);
  } catch {
    return {};
  }
}
