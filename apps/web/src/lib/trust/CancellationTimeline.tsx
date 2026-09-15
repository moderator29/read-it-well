import type { Locale } from "@naijafinds/i18n";
import { Amount } from "@/components/ui/Amount";
import { CANCELLATION_STOPS, FULL_REFUND_HOURS, refundAtStop } from "./cancellation";

/**
 * The cancellation policy as a timeline instead of a paragraph.
 *
 * A paragraph about refunds is read by nobody and disputed by everybody. The
 * same three rules laid out in order, against the guest's own dates and the
 * guest's own money, are read in about four seconds and are very hard to
 * argue with afterwards.
 *
 * Every figure on it is computed, never typed: the boundary dates come from
 * the listing's check-in date and `FULL_REFUND_HOURS`, and the amounts come
 * from `refundAtStop` in integer kobo. Given no dates and no total it still
 * renders, as the plain platform policy, which is what the safety centre and a
 * listing with no dates chosen yet both need.
 *
 * Presentation is deliberately plain and built only from classes that already
 * exist. The shape is the product decision; the polish belongs to whoever owns
 * the visual layer.
 */

/** The Lagos day a stop closes on, given the stay's check-in date. */
function closesOn(checkInIso: string, hoursBefore: number, locale: Locale): string | null {
  const stamp = checkInIso.length <= 10 ? `${checkInIso}T15:00:00+01:00` : checkInIso;
  const checkIn = new Date(stamp).getTime();
  if (Number.isNaN(checkIn)) return null;
  const boundary = new Date(checkIn - hoursBefore * 3_600_000);
  return new Intl.DateTimeFormat(locale === "en" ? "en-NG" : locale, {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(boundary);
}

export function CancellationTimeline({
  checkIn,
  totalMinor,
  locale = "en",
  headingLevel = "h3",
}: {
  /** The stay's check-in date, `YYYY-MM-DD` or a full timestamp. Optional. */
  checkIn?: string | null;
  /** What the stay costs, in kobo. Optional: without it the policy shows as shares. */
  totalMinor?: number | null;
  locale?: Locale;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const hasMoney = typeof totalMinor === "number" && totalMinor > 0;

  return (
    <div data-testid="cancellation-timeline">
      <Heading className="nf-h3 text-[1.0625rem]">Cancelling this stay</Heading>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        Before you pay, you can let a hold go at any time and nothing is taken.
        Once a stay is paid for, this is the schedule, and it is the same on
        every listing on Vallo.
      </p>

      <ol className="mt-4 space-y-3">
        {CANCELLATION_STOPS.map((stop, index) => {
          const boundary =
            checkIn && stop.closesHoursBeforeCheckIn !== null
              ? closesOn(checkIn, stop.closesHoursBeforeCheckIn, locale)
              : null;

          return (
            <li key={stop.tier} className="nf-card p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="nf-overline">
                  Step <span className="nf-numeric">{index + 1}</span>
                </span>
                <span className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                  {stop.label}
                </span>
                {hasMoney ? (
                  <Amount
                    minorUnits={refundAtStop(stop, totalMinor)}
                    locale={locale}
                    suffix="back to you"
                    className="text-[1rem] font-semibold"
                  />
                ) : (
                  <span className="nf-numeric text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                    {stop.refundBasisPoints / 100}%
                  </span>
                )}
              </div>

              <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                {stop.detail}
              </p>

              {boundary && (
                <p className="mt-2 text-[0.8125rem] text-[var(--nf-content-muted)]">
                  This window closes <span className="nf-numeric">{boundary}</span>.
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
        Refunds return to your Vallo wallet, which is the fastest route, and
        you can move wallet money to your bank from there. The{" "}
        <span className="nf-numeric">{FULL_REFUND_HOURS}</span> hour window is
        measured to check-in at <span className="nf-numeric">3pm</span> Lagos
        time.
      </p>
    </div>
  );
}
