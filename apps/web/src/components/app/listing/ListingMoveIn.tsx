import type { Dictionary, Locale } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import { Amount } from "@/components/ui/Amount";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { TYPE } from "@/components/app/Screen";
import { moveInLines } from "./move-in-lines";

/**
 * What it actually costs to move in.
 *
 * THE NUMBER EVERY NIGERIAN RENTER SHOPS ON, and until 22 September 2026 the
 * listing page did not show it at all. A 4.5m yearly rent routinely means 7m at
 * the door once caution, agency, legal, agreement and service charge are
 * counted, so a listing page that leads with the rent alone is quoting a figure
 * nobody actually pays. The schema has carried these columns for a while
 * (`total_move_in_cost_minor` and the five parts); this is the first surface to
 * print them.
 *
 * THIS COMPONENT EXISTED, WAS CORRECT, AND NOTHING IMPORTED IT. HANDOFF 09
 * section 4.1 calls that the cheapest win in the whole brief. It is on the
 * screen now, at `listing/[id]/page.tsx`, and the disclosure it used to hide
 * behind is gone: the breakdown is the point, so the breakdown is open.
 *
 * THE ANATOMY IS `GOVERNING-08` SCREEN TWO, "What will a tenant actually pay?":
 * one row per cost, each carrying a glass object on a rounded plate, the cost's
 * name with its period or basis beneath, the figure on the right, and a quiet
 * note saying who keeps it. The total sits in its own lit panel under them with
 * the coin-stack object beside it. Every capsule in that render ships as a
 * rounded rectangle on `--nf-radius-control`, per the roles README.
 *
 * WHAT IT WILL NOT DO.
 *
 *   - It never recomputes the total from the parts. The database holds the
 *     lister's own total at or above the sum of whatever parts they named,
 *     precisely because agents fold fees into each other. When no total was
 *     stated the sum of the named parts is the honest FLOOR, and the figure is
 *     labelled "from" so it cannot read as a quote.
 *   - IT NEVER DRAWS AN UNDECLARED COST AS ZERO. HANDOFF 09 section 4.3:
 *     "a cost the lister has not declared is drawn as not declared, with the
 *     words, never as zero. Zero is a claim." So an undeclared line is still
 *     LISTED, because the tenant will meet it whether or not the lister named
 *     it, and it is drawn with the words "Not declared" and never with a
 *     figure. It contributes nothing to the total.
 *   - A STATED ZERO IS A DIFFERENT FACT AND IS DRAWN AS ONE. "No agency fee"
 *     on an owner's own listing is the entire argument of this handoff made
 *     visible in one line, so a declared zero agency fee gets the words rather
 *     than a ₦0 nobody reads.
 *   - It renders nothing at all when the lister named neither a total nor a
 *     single part, rather than showing a zero or an empty breakdown.
 */

export function ListingMoveIn({
  listing,
  locale,
  t,
}: {
  listing: Listing;
  locale: Locale;
  t: Dictionary;
}) {
  const copy = t.moveIn;
  const lines = moveInLines(listing, copy);
  const declared = lines.filter((line) => line.minor !== undefined && line.minor !== null);
  const stated = listing.moveInCostStated === true;
  const total =
    listing.moveInCostMinor ?? declared.reduce((sum, line) => sum + (line.minor ?? 0), 0);

  // Nobody named a total and nobody named a part. There is no honest figure to
  // print, so none is printed.
  if (total <= 0 && declared.length === 0) return null;

  const undeclared = lines.length - declared.length;
  /* A declared zero agency fee is the direct-from-owner argument in one line,
     so it gets said in words rather than left as a ₦0 in a column. */
  const noAgencyFee = listing.agencyFeeMinor === 0;

  return (
    <div data-testid="move-in-cost" className="nf-movein">
      <ul className="nf-movein__list">
        {lines.map((line) => {
          const isDeclared = line.minor !== undefined && line.minor !== null;
          return (
            <li
              key={line.key}
              className="nf-movein__row"
              data-declared={isDeclared || undefined}
              data-testid={`move-in-line-${line.key}`}
            >
              <span className="nf-movein__plate" aria-hidden="true">
                <BrandIcon name={line.icon} fill />
              </span>
              <span className="nf-movein__name">
                <span className="nf-movein__label">
                  {line.label}
                  {line.basis && <span className="nf-movein__basis"> ({line.basis})</span>}
                </span>
                {isDeclared && line.keeper && (
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

      <div className="nf-movein__total" data-testid="move-in-total">
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
      {undeclared > 0 && (
        <p className={`mt-inline-tight ${TYPE.caption} leading-relaxed`} data-testid="move-in-gaps">
          {(undeclared === 1 ? copy.undeclaredOne : copy.undeclaredMany).replace(
            "{count}",
            String(undeclared),
          )}
        </p>
      )}
      {noAgencyFee && (
        <p className={`mt-inline-tight ${TYPE.caption} leading-relaxed`} data-testid="move-in-direct">
          {copy.noAgencyFeeNote}
        </p>
      )}
    </div>
  );
}
