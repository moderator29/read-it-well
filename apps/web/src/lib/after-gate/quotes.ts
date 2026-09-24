import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import { resolveSession } from "../actions/session";
import { formatMoneyDate } from "../money/dates";
import { readMoveInQuote } from "./rows";

/**
 * V-13. The frozen quotes behind a list of inspections, as the one line each
 * card prints: "Quoted at ₦3,900,000 on Thu 1 Oct".
 *
 * Read under the caller's own RLS (tenant and lister each see their own), in
 * one query for the whole list. A failed read returns an empty map, so every
 * card simply prints no quote line: a missing quote is never drawn as a zero.
 */
export async function readQuoteLinesFor(inspectionIds: string[], locale: Locale): Promise<Map<string, string>> {
  const lines = new Map<string, string>();
  if (inspectionIds.length === 0) return lines;
  const session = await resolveSession();
  if (session.state !== "signed-in") return lines;
  try {
    const loose = session.supabase as unknown as SupabaseClient;
    const { data, error } = await loose
      .from("move_in_quotes")
      .select("*")
      .in("inspection_id", inspectionIds.slice(0, 200));
    if (error || !Array.isArray(data)) return lines;
    const template = getDictionary(locale).afterTheGate.quote.frozenShort;
    for (const raw of data) {
      const quote = readMoveInQuote(raw);
      if (!quote) continue;
      const date = formatMoneyDate(quote.quoted_at, locale);
      if (!date) continue;
      lines.set(
        quote.inspection_id,
        template
          .replace("{amount}", formatMoney(quote.total_minor, locale, quote.currency))
          .replace("{date}", date),
      );
    }
  } catch {
    return lines;
  }
  return lines;
}
