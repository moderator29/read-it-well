import { countOf, formatDate, type Locale } from "@vallo/i18n/core";

/**
 * WHAT A DAY IN THE STRIP OR THE GRID SAYS, to the eye and to a screen
 * reader. The eye gets the short weekday, the date and the count; the reader
 * gets the same words with the month and the count spelled out ("Mon 12
 * October, 1 visit"). It is one name built from the visible text plus hidden
 * words, never an `aria-label` that replaces what is drawn, so a voice user
 * saying what they see still reaches the button. No hooks: the lister's
 * calendar (client) and the console's (server) both draw it.
 */
export function DayFace({
  day,
  count,
  locale,
  variant,
}: {
  day: string;
  count: number;
  locale: Locale;
  /** `strip`: weekday over date over count. `cell`: date and count. */
  variant: "strip" | "cell";
}) {
  const at = new Date(`${day}T12:00:00Z`);
  const date = formatDate(at, locale, { day: "numeric" });
  const hidden = (
    <span className="sr-only">
      {` ${formatDate(at, locale, { month: "long" })}, ${countOf(count, "visits", locale)}`}
    </span>
  );
  if (variant === "strip") {
    return (
      <>
        <span className="nf-vcal-day__week">{formatDate(at, locale, { weekday: "short" })}</span>
        <span className="nf-vcal-day__date nf-numeric">{date}</span>
        {hidden}
        <span className="nf-vcal-day__count nf-numeric" aria-hidden="true">
          {count > 0 ? count : ""}
        </span>
      </>
    );
  }
  return (
    <>
      <span className="nf-vcal-cell__date nf-numeric">{date}</span>
      {hidden}
      {count > 0 && (
        <span className="nf-vcal-cell__count nf-numeric" aria-hidden="true">
          {count}
        </span>
      )}
    </>
  );
}
