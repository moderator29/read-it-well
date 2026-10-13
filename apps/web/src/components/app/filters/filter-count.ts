import { countOf, type Locale } from "@vallo/i18n/core";
import { matchesFacts, type ListingFacts } from "@/lib/listings/filter";
import type { ListingSearchFilter } from "@/lib/listings/types";

/**
 * THE NUMBER ON THE SHEET'S BUTTON, AND ITS WORDS.
 *
 * "See 231 homes" is a promise about the next screen, so it is counted by
 * the same `matchesFacts` the server's shelf runs, over the pool the sheet
 * holds, with the commute limit the sheet can judge. Lifted out of the panel
 * so the count and its sentence can be tested without a browser.
 */
export function liveMatchCount(
  facts: readonly ListingFacts[],
  filter: ListingSearchFilter,
  commutePasses: (amHigh: number | undefined) => boolean = () => true,
): number {
  let count = 0;
  for (const fact of facts) {
    if (matchesFacts(fact, filter) && commutePasses(fact.commuteAmHigh)) count += 1;
  }
  return count;
}

/** "See 12 homes", "See 1 home", or the sheet's none line. Plurals through `countOf`. */
export function seeHomesLabel(
  count: number,
  locale: Locale,
  copy: { seeHomes: string; seeNone: string },
): string {
  if (count <= 0) return copy.seeNone;
  return copy.seeHomes.replace("{homes}", countOf(count, "homes", locale));
}
