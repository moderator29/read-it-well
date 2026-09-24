import { getDictionary, type Locale } from "@vallo/i18n";
import { Amount } from "@/components/ui/Amount";
import { formatMoneyDate, formatMoneyTime } from "@/lib/money/dates";
import {
  CANCELLATION_STOPS,
  PLATFORM_TERMS_V1,
  checkInInstant,
  refundAtStop,
  termsWindows,
  type CancellationTerms,
} from "./cancellation";

/**
 * The cancellation policy as a timeline instead of a paragraph.
 *
 * A paragraph about refunds is read by nobody and disputed by everybody. The
 * same rules laid out in order, against the guest's own dates and the guest's
 * own money, are read in about four seconds and are very hard to argue with
 * afterwards.
 *
 * V-24: WITH A CHECK-IN, THE WINDOWS ARE DATES. "Step 1, 72 hours before
 * check-in" became "Until Wed 14 Oct, 3pm: everything back", because a person
 * about to pay should not be doing calendar arithmetic. Without a check-in (the
 * cancellations page, the safety centre, a listing with no dates chosen) the
 * platform schedule still renders as its three stops in words.
 *
 * V-20: THE TERMS ARE AN ARGUMENT. A paid booking passes the terms frozen onto
 * it at payment (`booking_cancellation_terms`); everything else is priced under
 * the platform schedule, which is the only schedule a catalogue booking has.
 * The sentence "it is the same on every listing on Vallo" is gone: the stays
 * shelf carries per-property policies, so it was false a tap away.
 *
 * Every figure is computed, never typed: the boundaries from `termsWindows`,
 * the amounts in integer kobo from the basis points.
 */
export function CancellationTimeline({
  checkIn,
  totalMinor,
  locale = "en",
  headingLevel = "h3",
  terms = null,
  frozenAt = null,
}: {
  /** The stay's check-in date, `YYYY-MM-DD` or a full timestamp. Optional. */
  checkIn?: string | null;
  /** What the stay costs, in kobo. Optional: without it the policy shows as shares. */
  totalMinor?: number | null;
  locale?: Locale;
  headingLevel?: "h2" | "h3";
  /** The booking's frozen terms, when it has been paid. */
  terms?: CancellationTerms | null;
  /** When the terms were frozen, for the line that says so. */
  frozenAt?: string | null;
}) {
  const Heading = headingLevel;
  const copy = getDictionary(locale).afterTheGate.cancel;
  const total = typeof totalMinor === "number" && totalMinor > 0 ? Math.trunc(totalMinor) : null;
  const priced = terms ?? PLATFORM_TERMS_V1;
  const windows = checkIn ? termsWindows(priced, checkIn) : [];
  const checkInAt = checkIn ? checkInInstant(checkIn, priced.checkInHour) : null;
  const frozenOn = frozenAt ? formatMoneyDate(frozenAt, locale) : null;

  const share = (bps: number) =>
    bps >= 10_000 ? copy.everything : bps <= 0 ? copy.nothing : copy.share.replace("{percent}", String(bps / 100));

  return (
    <div data-testid="cancellation-timeline">
      <Heading className="nf-h3">{copy.heading}</Heading>
      <p className="nf-body-sm mt-xs text-[var(--nf-content-secondary)]">{copy.intro}</p>

      {windows.length > 0 ? (
        <ol className="mt-md grid gap-sm" data-testid="cancellation-windows">
          {windows.map((window, index) => {
            const from = window.from ? formatMoneyDate(window.from, locale, { withTime: true }) : null;
            const until = window.until ? formatMoneyDate(window.until, locale, { withTime: true }) : null;
            const when =
              from && until
                ? copy.windowBetween.replace("{from}", from).replace("{until}", until)
                : until
                  ? copy.windowUntil.replace("{until}", until)
                  : from
                    ? copy.windowFrom.replace("{from}", from)
                    : "";
            return (
              <li key={index} className="nf-card p-card" data-refund-bps={window.refundBps}>
                <p className="nf-body-sm nf-numeric font-semibold text-[var(--nf-content-primary)]">{when}</p>
                <p className="mt-2xs flex flex-wrap items-baseline gap-x-sm gap-y-2xs">
                  <span className="nf-body-sm text-[var(--nf-content-secondary)]">{share(window.refundBps)}</span>
                  {total !== null && window.refundBps > 0 && (
                    <Amount
                      minorUnits={Math.round((total * window.refundBps) / 10_000)}
                      locale={locale}
                      suffix="back to you"
                      className="nf-body font-semibold"
                    />
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      ) : (
        <ol className="mt-md grid gap-sm">
          {CANCELLATION_STOPS.map((stop) => (
            <li key={stop.tier} className="nf-card p-card">
              <div className="flex flex-wrap items-baseline gap-x-sm gap-y-2xs">
                <span className="nf-body-sm font-semibold text-[var(--nf-content-primary)]">{stop.label}</span>
                {total !== null ? (
                  <Amount
                    minorUnits={refundAtStop(stop, total)}
                    locale={locale}
                    suffix="back to you"
                    className="nf-body font-semibold"
                  />
                ) : (
                  <span className="nf-body-sm nf-numeric font-semibold text-[var(--nf-content-primary)]">
                    {stop.refundBasisPoints / 100}%
                  </span>
                )}
              </div>
              <p className="nf-body-sm mt-xs text-[var(--nf-content-secondary)]">{stop.detail}</p>
            </li>
          ))}
        </ol>
      )}

      <p className="nf-caption mt-md">
        {copy.refundsTo}{" "}
        {copy.measured.replace("{hour}", checkInAt ? formatMoneyTime(checkInAt, locale) : "3pm")}
      </p>
      {frozenOn && (
        <p
          className="nf-caption mt-xs"
          data-testid="cancellation-frozen"
        >
          {copy.frozenAt.replace("{date}", frozenOn)}
        </p>
      )}
    </div>
  );
}
