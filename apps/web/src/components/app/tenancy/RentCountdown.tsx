import Link from "next/link";
import { formatMoney, plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import { SummaryCard } from "@/components/ui/SummaryCard";
import type { Countdown } from "@/lib/tenancy/countdown";

/**
 * B10: THE RENT COUNTDOWN CARD, for a sitting tenant on the tenancy page and
 * on Plans. The days count up once as the hero figure; the sentence is the
 * figure and the day it is due, and (with two or more whole months left) the
 * arithmetic of spreading it. The note under it says in words that Vallo
 * holds and saves nothing: this is a calendar and a division.
 */
export function RentCountdown({
  countdown,
  endsOnLabel,
  copy,
  locale,
  href,
  testId = "rent-countdown",
}: {
  countdown: Countdown;
  endsOnLabel: string;
  copy: Dictionary["memberKit"]["rentCountdown"];
  locale: Locale;
  /** On Plans, the card opens the tenancy. */
  href?: string;
  testId?: string;
}) {
  const amount = formatMoney(countdown.dueMinor, locale);
  const due = withStrongAmount((countdown.fromOffer ? copy.dueLineOffer : copy.dueLine).replace("{date}", endsOnLabel), amount);
  const unit = plural(countdown.daysLeft, copy.unit, locale);
  return (
    <div data-testid={testId} className="nf-rent-countdown">
      <SummaryCard
        label={countdown.daysLeft === 0 ? copy.dueToday : copy.label}
        figure={countdown.daysLeft}
        suffix={` ${unit}`}
        sentence={
          <>
            <span className="nf-numeric">{due}</span>
            {countdown.perMonthMinor !== null ? (
              <>
                {" "}
                {/* Only the monthly figure is strong; a whole bold sentence
                    reads as a second headline under the counted days. */}
                <span className="nf-numeric">
                  {withStrongAmount(copy.perMonth, formatMoney(countdown.perMonthMinor, locale))}
                </span>
              </>
            ) : null}
          </>
        }
        footer={
          <div className="grid gap-2xs">
            {countdown.perMonthMinor !== null ? <p className="nf-caption text-[var(--nf-content-muted)]">{copy.perMonthNote}</p> : null}
            {href ? (
              <Link href={href} className="nf-tap nf-caption font-semibold text-[var(--nf-content-link)] underline underline-offset-4">
                {copy.open}
              </Link>
            ) : null}
          </div>
        }
      />
    </div>
  );
}

/** The sentence with its `{amount}` set in the strong ink, the rest as written. */
function withStrongAmount(template: string, amount: string) {
  const at = template.indexOf("{amount}");
  if (at < 0) return template;
  return (
    <>
      {template.slice(0, at)}
      <strong className="text-[var(--nf-content-primary)]">{amount}</strong>
      {template.slice(at + "{amount}".length)}
    </>
  );
}
