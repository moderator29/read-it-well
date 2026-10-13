import { formatDate, type Locale } from "@vallo/i18n/core";

/**
 * THE EXACT DAY SOMEBODY JOINED (the founder, 13 October 2026): "On Vallo
 * since 9 October 2026", not "On Vallo since October 2026".
 *
 * A month says too little when the month is this one: everybody who joined in
 * it reads the same, and a person met this week looks as old as one met three
 * weeks ago. The day is the fact, and it is a fact the database already holds
 * (`created_at`, `claimed_at`).
 *
 * Reckoned on the LAGOS calendar, because that is where a day on Vallo is
 * counted: a sign-up at 23:30 UTC on the 8th is the 9th here, and the reader
 * must see the 9th wherever their phone thinks it is. Worded in the reader's
 * own locale (`intlTag`, so en gives "9 October 2026"). The month is written
 * out in full, not abbreviated: a join date is read once, slowly, and the
 * short month is for dense lists.
 *
 * An unreadable or missing stamp gives "" and the caller draws nothing: a line
 * that says "since" with no date after it is a claim the page cannot make.
 *
 * One function for every surface that says it (the thread header, the
 * profile's header, the Record's lines) so they cannot disagree about the day.
 */
export function joinDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return formatDate(date, locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
}
