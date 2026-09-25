import type { Dictionary, Locale } from "@vallo/i18n/core";
import type { Listing } from "@/lib/listings/types";
import { Amount } from "@/components/ui/Amount";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { TYPE } from "@/components/app/Screen";
import { purchaseLines } from "./purchase-lines";

/**
 * WHAT IT WILL ACTUALLY COST TO BUY.
 *
 * The sale side's twin of `ListingMoveIn`, and the last half of the promise on
 * the front of this platform. A tenant has been able to see every cost they
 * meet, declared or not, since Track H. A buyer could see an asking price and
 * nothing else, which is the same silence in a much bigger currency: agency
 * and legal are conventionally five per cent each, and Governor's consent,
 * stamp duty and registration run to several per cent more of the value of the
 * land, so a Lagos buyer who plans around the asking price meets a figure they
 * had not budgeted for after they are committed. Buying is where a Nigerian is
 * most often surprised by a number and it was the one place this platform
 * could not show them one.
 *
 * IT SHARES `ListingMoveIn`'s ANATOMY AND ITS CLASSES ON PURPOSE. That is the
 * `GOVERNING-08` screen two row, recorded in the ledger as a register
 * extension: one row per cost, a glass object on a rounded plate, the cost's
 * name with its basis beneath, the figure on the right and a quiet note saying
 * who keeps it, with the total in its own lit panel under them. A second look
 * invented for the sale side would be a second pattern where one already
 * exists.
 *
 * WHAT IT WILL NOT DO.
 *
 *   - It never recomputes a stated total from the parts. The database holds
 *     the lister's own total at or above the price plus whatever parts they
 *     named, precisely because sellers fold these into each other. With no
 *     total stated, the sum of the named parts is the honest FLOOR and the
 *     figure is labelled "from" so it cannot read as a quote.
 *   - IT NEVER DRAWS AN UNDECLARED COST AS ZERO. An undeclared line is still
 *     LISTED, because the buyer will meet it whether or not the lister named
 *     it, and it is drawn with the words "Not declared" and never with a
 *     figure. It contributes nothing to the total.
 *   - A STATED ZERO IS A DIFFERENT FACT AND IS DRAWN AS ONE. "No agency fee"
 *     on an owner's own listing is the direct model's whole argument in one
 *     line, so a declared zero gets the words rather than a nought nobody
 *     reads.
 *   - IT STATES NO PERCENTAGE OF ITS OWN. Four of these six have a
 *     conventional rate and none of it is printed: a rate that is usually five
 *     per cent is not five per cent, and a figure the database cannot produce
 *     is not printed.
 *   - It renders nothing at all when the lister named neither a total nor a
 *     single part.
 *
 * THE THREE STATUTORY LINES ARE NAMED AS THE STATE'S. Vallo charges nothing
 * here and takes no share of any of them, and the note under the block says
 * so, because a buyer reading a government charge on a marketplace page is
 * entitled to know whose money it is.
 */
export function ListingPurchase({
  listing,
  locale,
  t,
}: {
  listing: Listing;
  locale: Locale;
  t: Dictionary;
}) {
  const copy = t.purchase;
  const lines = purchaseLines(listing, copy);
  const declared = lines.filter((line) => line.minor !== undefined && line.minor !== null);
  const stated = listing.purchaseCostStated === true;
  const total =
    listing.purchaseCostMinor ?? declared.reduce((sum, line) => sum + (line.minor ?? 0), 0);

  // Nobody named a total and nobody named a part. There is no honest figure to
  // print, so none is printed.
  if (total <= 0 && declared.length === 0) return null;

  const undeclared = lines.length - declared.length;
  /* A declared zero agency fee is the direct-from-owner argument in one line,
     so it gets said in words rather than left as a nought in a column. */
  const noAgencyFee = listing.saleAgencyFeeMinor === 0;

  return (
    <div data-testid="purchase-cost" className="nf-movein">
      <ul className="nf-movein__list">
        {lines.map((line) => {
          const isDeclared = line.minor !== undefined && line.minor !== null;
          return (
            <li
              key={line.key}
              className="nf-movein__row"
              data-declared={isDeclared || undefined}
              data-testid={`purchase-line-${line.key}`}
            >
              <span className="nf-movein__plate" aria-hidden="true">
                <BrandIcon name={line.icon} fill />
              </span>
              <span className="nf-movein__name">
                <span className="nf-movein__label">
                  {line.label}
                  {line.basis && <span className="nf-movein__basis"> ({line.basis})</span>}
                </span>
                {/* A declared ZERO does not also say who keeps it: "No agency
                    fee" over "Paid to the agent" is two halves of a sentence
                    that contradict each other, and the zero is the whole point
                    of the line. */}
                {isDeclared && line.minor !== 0 && line.keeper && (
                  <span className="nf-movein__keeper">{line.keeper}</span>
                )}
              </span>
              <span className="nf-movein__figure">
                {isDeclared ? (
                  line.key === "agency" && line.minor === 0 ? (
                    <span className="nf-movein__free">{copy.noAgencyFee}</span>
                  ) : (
                    <Amount
                      minorUnits={line.minor as number}
                      locale={locale}
                      currency={listing.currency}
                    />
                  )
                ) : (
                  <span className="nf-movein__undeclared">{copy.notDeclared}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="nf-movein__total" data-testid="purchase-total">
        <span className="nf-movein__plate nf-movein__plate--total" aria-hidden="true">
          <BrandIcon name="naira-coins" fill />
        </span>
        <span className="min-w-0">
          <span className="nf-movein__total-label">
            {stated ? copy.totalStated : copy.totalFrom}
          </span>
          <span className="nf-movein__total-figure">
            <Amount minorUnits={total} locale={locale} currency={listing.currency} />
          </span>
        </span>
      </div>

      <p className={`mt-row ${TYPE.caption} leading-relaxed`}>
        {stated ? copy.statedNote : copy.summedNote}
      </p>
      <p
        className={`mt-inline-tight ${TYPE.caption} leading-relaxed`}
        data-testid="purchase-statutory"
      >
        {copy.statutoryNote}
      </p>
      {undeclared > 0 && (
        <p
          className={`mt-inline-tight ${TYPE.caption} leading-relaxed`}
          data-testid="purchase-gaps"
        >
          {(undeclared === 1 ? copy.undeclaredOne : copy.undeclaredMany).replace(
            "{count}",
            String(undeclared),
          )}
        </p>
      )}
      {noAgencyFee && (
        <p
          className={`mt-inline-tight ${TYPE.caption} leading-relaxed`}
          data-testid="purchase-direct"
        >
          {copy.noAgencyFeeNote}
        </p>
      )}
    </div>
  );
}
