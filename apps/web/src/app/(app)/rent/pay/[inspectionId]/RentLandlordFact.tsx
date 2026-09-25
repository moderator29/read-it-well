import { formatDate, type Dictionary, type Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { readRentFactFor } from "@/lib/landlord/queries";
import type { RentFact } from "@/lib/landlord/facts";

/**
 * V-32 ON THE TENANT'S SIDE: ONE OF THREE DATED FACTS, OR NOTHING.
 *
 *   "The landlord, Adebayo, confirmed these figures on 2 November"
 *   "The landlord has not answered yet"  (with the day we sent them)
 *   "The landlord disputes these figures" (and that our team is on it)
 *
 * Nothing at all when no question was ever sent: no mandate, no consent, or the
 * landlord line switched off. A null is not a negative, so the tenant is never
 * told "no landlord confirmed this", which would read as an accusation of the
 * agent that the platform cannot support.
 *
 * The landlord's FIRST NAME only, past any title, as the database returns it,
 * and never a number. The dispute line is drawn in the attention colour with
 * an icon and words, never colour alone.
 */
export async function RentLandlordFact({
  inspectionId,
  copy,
  locale,
}: {
  inspectionId: string;
  copy: Dictionary["landlord"]["rentFact"];
  locale: Locale;
}) {
  return <RentLandlordFactView fact={await readRentFactFor(inspectionId)} copy={copy} locale={locale} />;
}

/** The drawing alone, so the preview harness can show all three facts. */
export function RentLandlordFactView({
  fact,
  copy,
  locale,
}: {
  fact: RentFact | null;
  copy: Dictionary["landlord"]["rentFact"];
  locale: Locale;
}) {
  if (!fact) return null;

  const day = (iso: string) =>
    formatDate(new Date(iso), locale, { day: "numeric", month: "long", timeZone: "Africa/Lagos" });

  if (fact.state === "confirmed") {
    const line = fact.firstName
      ? copy.confirmed.replace("{name}", fact.firstName).replace("{date}", day(fact.answeredAt))
      : copy.confirmedNoName.replace("{date}", day(fact.answeredAt));
    return (
      <p className="mt-sm flex items-center justify-center gap-xs text-[var(--nf-content-secondary)]" data-testid="rent-landlord-confirmed">
        <UiIcon name="verified" size={16} className="shrink-0 text-[var(--nf-status-verified)]" />
        {line}
      </p>
    );
  }

  if (fact.state === "disputed") {
    return (
      <p className="mt-sm text-[var(--nf-state-warning)]" data-testid="rent-landlord-disputed">
        <span className="inline-flex items-center gap-xs font-semibold">
          <UiIcon name="info" size={16} className="shrink-0" />
          {copy.disputed}
        </span>{" "}
        <span className="text-[var(--nf-content-secondary)]">{copy.disputedBody}</span>
      </p>
    );
  }

  return (
    <p className="mt-sm text-[var(--nf-content-muted)]" data-testid="rent-landlord-waiting">
      {copy.waiting}. {copy.waitingBody.replace("{date}", day(fact.askedAt))}
    </p>
  );
}
