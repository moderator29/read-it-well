import { formatMoney, type Locale } from "@vallo/i18n/core";
import { TIMELINE_SENTENCE } from "./copy";
import { formatMoneyDate } from "./dates";
import type { MoneyViewer, TimelineEvent } from "./vallo";

/**
 * A payment's history as sentences a person reads (D50: never
 * `ESCROW_STATUS = OPENED`). Only what happened is a step: an event with no
 * time is not drawn as if it had, and the steps are in the order they
 * happened, whatever order the record listed them in. Pure.
 */
export type TimelineStep = { key: string; sentence: string; when: string | null; tone: "done" | "attention" };

const ATTENTION = new Set(["payment_failed", "review_opened", "cancelled"]);

export function timelineSteps(
  events: readonly TimelineEvent[],
  viewer: MoneyViewer,
  locale: Locale,
  currency = "NGN",
): TimelineStep[] {
  return events
    .filter((e) => e.at !== null && Number.isFinite(Date.parse(e.at)))
    .map((e, index) => ({ e, index, t: Date.parse(e.at as string) }))
    .sort((a, b) => a.t - b.t || a.index - b.index)
    .map(({ e, index }) => {
      const template = TIMELINE_SENTENCE[e.kind][viewer];
      const amount = typeof e.amountMinor === "number" ? formatMoney(e.amountMinor, locale, currency) : null;
      /* A sentence that needs a figure it was not given drops the figure's
         phrase rather than printing a placeholder or a zero. */
      const sentence = amount
        ? template.replace("{amount}", amount)
        : template.replace(/ of \{amount\}/, "").replace(/ \{amount\}/, "");
      return {
        key: `${e.kind}-${index}`,
        sentence,
        when: formatMoneyDate(e.at, locale, { withTime: true }),
        tone: ATTENTION.has(e.kind) ? "attention" : "done",
      };
    });
}
