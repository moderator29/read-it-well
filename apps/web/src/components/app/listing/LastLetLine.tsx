import type { SupabaseClient } from "@supabase/supabase-js";
import { formatMoney, getDictionary, intlTag, type Locale } from "@vallo/i18n";
import { resolveSession } from "@/lib/actions/session";

/**
 * V-38. What a relisted flat was last let at through Vallo, and what the last
 * tenant said about it. One dated line from `listing_last_let`, which answers
 * only for a published successor whose predecessor settled a rent payment
 * through Vallo and was not refunded. Anything else, including a failed read
 * or a signed-out reader, renders nothing: no line is better than a guess.
 * Month and year only; never who.
 */
function monthYear(iso: unknown, locale: Locale): string | null {
  if (typeof iso !== "string") return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(intlTag[locale], { month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(date);
}

export async function LastLetLine({ listingId, locale }: { listingId: string; locale: Locale }) {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const copy = getDictionary(locale).afterTheGate.lastLet;
  let row: Record<string, unknown> | null = null;
  try {
    const { data, error } = await (session.supabase as unknown as SupabaseClient).rpc("listing_last_let", { p_listing: listingId });
    if (error || typeof data !== "object" || data === null) return null;
    row = data as Record<string, unknown>;
  } catch {
    return null;
  }
  const rent = typeof row.rent_minor === "number" ? row.rent_minor : Number(row.rent_minor);
  const month = monthYear(row.paid_month, locale);
  const period = row.rent_period === "month" || row.rent_period === "quarter" || row.rent_period === "year" ? row.rent_period : null;
  if (!Number.isInteger(rent) || rent <= 0 || !month || !period) return null;
  const exit = typeof row.exit === "object" && row.exit !== null ? (row.exit as Record<string, unknown>) : null;
  const light = exit ? copy.light[exit.light as keyof typeof copy.light] : undefined;
  const water = exit ? copy.water[exit.water as keyof typeof copy.water] : undefined;
  const flooding = exit ? copy.flooding[exit.flooding as keyof typeof copy.flooding] : undefined;
  const exitMonth = exit ? monthYear(exit.answered_month, locale) : null;
  return (
    <div className="mt-md" data-testid="listing-last-let">
      <p className="nf-body-sm nf-numeric">
        {copy.line
          .replace("{month}", month)
          .replace("{rent}", formatMoney(rent, locale))
          .replace("{period}", copy.periods[period])}
      </p>
      {light && water && flooding && exitMonth && (
        <p className="nf-caption mt-2xs">
          {copy.exit
            .replace("{light}", light)
            .replace("{water}", water)
            .replace("{flooding}", flooding)
            .replace("{month}", exitMonth)}
        </p>
      )}
    </div>
  );
}
