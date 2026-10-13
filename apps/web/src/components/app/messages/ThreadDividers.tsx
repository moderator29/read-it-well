import type { Dictionary } from "@vallo/i18n/core";
import { plural, type Locale } from "@vallo/i18n/core";

/**
 * The two dividers a thread draws between messages (north star 15.4).
 *
 * DAY: a hairline-flanked label ("Today", "Yesterday", "Fri 26 Sep") where the
 * Lagos day changes, so a thread read after a week away says where one day
 * ended. It is a separator with a name, not a heading: it sits in the flow
 * and a screen reader meets it as a quiet landmark.
 *
 * UNREAD: where the first message you had not read begins, with how many
 * there are, and in the count colour (cyan, never red). It is a status, and
 * says its count in words, so it never relies on colour. `forwardRef`-free on
 * purpose: the thread finds it by its id to scroll the reader to it on arrival.
 */
export function DayDivider({ label }: { label: string }) {
  return (
    <div className="nf-divider-day" role="separator" aria-label={label} data-testid="day-divider">
      <span aria-hidden="true">{label}</span>
    </div>
  );
}

export const UNREAD_DIVIDER_ID = "thread-unread-divider";

export function UnreadDivider({
  count,
  copy,
  locale,
}: {
  count: number;
  copy: Dictionary["experienceInbox"]["thread"]["unreadDivider"];
  locale: Locale;
}) {
  return (
    <div
      id={UNREAD_DIVIDER_ID}
      className="nf-divider-unread"
      role="status"
      data-testid="unread-divider"
    >
      <span className="nf-numeric">{plural(count, copy, locale)}</span>
    </div>
  );
}
