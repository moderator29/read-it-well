import { getDictionary, type Locale } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { IconPlate } from "@/components/ui/IconPlate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { runPriceCheck } from "@/lib/price-check/queries";
import { priceCheckOutcome } from "@/lib/price-check/gate";
import { priceCheckHref, subjectForListing } from "@/lib/price-check/listing-context";

/**
 * B8: ONE QUIET ROW UNDER THE MOVE-IN CARD, "How does this price compare?",
 * opening Price Check with this listing's own area, pin, type, intent, period
 * and beds filled in.
 *
 * HIDDEN WHEN THE DATA IS THIN. The row runs the tool's own gate first and is
 * drawn only when the gate would ANSWER: an example listing, no pin, a type
 * or period the tool does not price, too few similar listings nearby, or a
 * read that failed all draw nothing. Nothing about the answer is painted
 * here; the row names only how many similar listings the tool would compare
 * with, which is the tool's own count.
 */
export async function PriceContextRow({ listing, locale }: { listing: Listing; locale: Locale }) {
  const subject = subjectForListing(listing);
  if (!subject) return null;
  let count: number | null = null;
  try {
    const check = await runPriceCheck(subject);
    if (!check.reachable) return null;
    const outcome = priceCheckOutcome(subject, check.verdict, check.supply);
    if (outcome.kind !== "answered") return null;
    count = Number.isInteger(outcome.comparableCount) ? outcome.comparableCount : null;
  } catch {
    return null;
  }
  const copy = getDictionary(locale).memberKit.priceContext;
  return (
    <PriceContextView
      href={priceCheckHref(subject)}
      title={copy.title}
      sub={count !== null && count > 0 ? copy.sub.replace("{count}", String(count)) : copy.subNoCount}
    />
  );
}

/** The row itself, split out so the preview can draw it from a fixture. */
export function PriceContextView({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <ListGroup className="mt-row" data-testid="price-context">
      <ListRow
        href={href}
        leading={
          <IconPlate size="sm" shape="round" tone="info">
            <UiIcon name="coins" size={20} />
          </IconPlate>
        }
        title={title}
        sub={sub}
        chevron
      />
    </ListGroup>
  );
}
