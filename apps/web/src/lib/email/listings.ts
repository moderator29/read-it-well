import "server-only";

import { getListingRepository } from "../listings/repository";
import { SYNDICATION_FILTER, syndicatable } from "../listings/syndication";
import type { Listing, ListingSearchFilter, ListingSearchOptions } from "../listings/types";

/**
 * The only door between the catalogue and an outbound email.
 *
 * WHY THIS EXISTS BEFORE ANY EMAIL USES IT. Nothing in the message catalogue
 * enumerates listings today: every live send site hangs off a booking, an
 * escrow movement, a wallet ledger row or a support ticket, and the database
 * refuses a booking against an example listing, so email is covered
 * transitively at the same chokepoint that covers payment. That is a property
 * of what has been built so far, not a rule, and it stops being true the first
 * time somebody writes a saved-search alert, a weekly digest or a
 * recommendation rail in an email. Those are all named as wanted in
 * `RECOMMENDATIONS.md`.
 *
 * The rule they must obey is that an email is the one surface with no
 * corrective. A page can be edited, a sitemap re-crawled, a card re-scraped.
 * A message that has landed in somebody's inbox saying a property is available
 * has landed, and no such property exists. So the door is here, it is narrow,
 * and it applies the same gate the sitemap and the structured data read.
 *
 * `email/recipients.ts` makes exactly this argument about notification
 * settings: there are nine send sites and there will be more, and a rule that
 * has to be remembered at every one of them is a rule that will be forgotten
 * at one.
 */

/**
 * Listings that may be named in an email.
 *
 * Two independent refusals, and the redundancy is the design. The filter is
 * pushed down to SQL so the example rows are never read, which is what keeps a
 * row cap honest; `syndicatable` then re-checks in code, because the SQL
 * predicate is one line in one file that a refactor can drop with no test
 * noticing, and the cost of dropping it is an advertisement for a property
 * that does not exist arriving in somebody's inbox.
 *
 * `SYNDICATION_FILTER` is spread LAST so a caller cannot pass
 * `excludeDemo: false` and win.
 *
 * The repository is a parameter with a default rather than a lookup, so a test
 * can hand this a source that ignores the filter entirely and prove the second
 * refusal actually refuses.
 */
export async function listingsForEmail(
  filter: ListingSearchFilter = {},
  opts: ListingSearchOptions = {},
  repository = getListingRepository(),
): Promise<Listing[]> {
  const rows = await repository.search({ ...filter, ...SYNDICATION_FILTER }, opts);
  return syndicatable(rows);
}
