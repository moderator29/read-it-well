import { State, type StateAction } from "@/components/ui/State";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import { HISTORY_UNAVAILABLE_BODY, HISTORY_UNAVAILABLE_TITLE } from "@/lib/money/copy";

/**
 * The two states a money history can be in when it has no rows to draw.
 *
 * THEY ARE NEVER THE SAME PICTURE. "You have no payments" is a fact about the
 * reader's money; "we could not read your payments" is a fact about our
 * servers. A failed read that fell through to the empty state would tell
 * somebody who paid last week that they never paid, on the one screen they
 * opened to check. So the error state is its own kind, with its own mark
 * and its own words, and it says plainly that nothing happened to the money.
 *
 * Both offer a way onward, as every stuck state in the kit must
 * (`scripts/design/state-sweep.mjs`): the error reloads the same page, and the
 * empty state names the place where the first payment would come from.
 */
export function HistoryUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <State
      kind="error"
      title={HISTORY_UNAVAILABLE_TITLE}
      body={HISTORY_UNAVAILABLE_BODY}
      primary={{ href: retryHref, label: "Try loading it again" }}
      data-testid="history-unavailable"
    />
  );
}

export function HistoryEmpty({
  title,
  body,
  next,
  icon = "receipt-check",
}: {
  title: string;
  body: string;
  /** Where the first payment on this history would begin. */
  next: StateAction;
  icon?: BrandIconName;
}) {
  return <State kind="empty" icon={icon} title={title} body={body} primary={next} data-testid="history-empty" />;
}
