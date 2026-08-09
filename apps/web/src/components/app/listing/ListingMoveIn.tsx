import type { Locale } from "@naijafinds/i18n";
import type { Listing } from "@/lib/listings/types";
import { RENT_PERIOD_LABEL, type RentPeriod } from "@/lib/listings/pricing";
import { Amount } from "@/components/ui/Amount";
import { Disclosure } from "@/components/app/Disclosure";
import { TYPE } from "@/components/app/Screen";

/**
 * What it actually costs to move in.
 *
 * THE NUMBER EVERY NIGERIAN RENTER SHOPS ON, and until now the page did not
 * show it at all. A 4.5m yearly rent routinely means 7m at the door once
 * caution, agency, legal, agreement and service charge are counted, so a
 * listing page that leads with the rent alone is quoting a figure nobody
 * actually pays. The schema has carried these columns for a while
 * (`total_move_in_cost_minor` and the five parts); this is the first surface to
 * print them.
 *
 * THE SHAPE IS THE REFERENCE PLATFORM'S BALANCE SURFACE: one number and one
 * action, with the full breakdown behind a details sheet. The total leads at
 * heading size, and the six lines that compose it are one tap away rather than
 * six more rows competing with the price above them. Nothing is removed; the
 * breakdown is in the product, it is simply not the first thing shouted.
 *
 * WHAT IT WILL NOT DO.
 *
 *   - It never recomputes the total from the parts. The database holds the
 *     lister's own total at or above the sum of whatever parts they named,
 *     precisely because agents fold fees into each other. When no total was
 *     stated the sum of the named parts is the honest FLOOR, and the figure is
 *     labelled "from" so it cannot read as a quote.
 *   - It never prints a fee nobody stated. A stated zero and an unstated fee
 *     are different facts: "no agency fee" is a selling point, "we did not say"
 *     is not, and only the first is rendered as a number.
 *   - It renders nothing at all when the lister named neither a total nor a
 *     single part, rather than showing a zero or an empty breakdown.
 */

type Part = { key: string; label: string; minor: number };

/**
 * The parts, in the order a tenant meets them.
 *
 * Deliberately built from the `Listing` view rather than by calling
 * `moveInParts`, which takes raw Postgres columns. Same order, same rule that
 * an absent value is skipped and a stated zero is kept.
 */
function partsOf(listing: Listing): Part[] {
  const parts: Part[] = [];
  const push = (key: string, label: string, minor: number | undefined) => {
    if (minor === undefined || minor === null) return;
    parts.push({ key, label, minor });
  };

  const rentPeriod: RentPeriod =
    listing.pricePeriod === "month" || listing.pricePeriod === "quarter"
      ? listing.pricePeriod
      : "year";

  push("rent", `Rent (${RENT_PERIOD_LABEL[rentPeriod].toLowerCase()})`, listing.priceMinor || undefined);
  push("caution", "Caution deposit", listing.cautionDepositMinor);
  push(
    "service",
    listing.serviceChargePeriod
      ? `Service charge (${RENT_PERIOD_LABEL[listing.serviceChargePeriod].toLowerCase()})`
      : "Service charge",
    listing.serviceChargeMinor,
  );
  push("agency", "Agency fee", listing.agencyFeeMinor);
  push("legal", "Legal fee", listing.legalFeeMinor);
  push("agreement", "Agreement fee", listing.agreementFeeMinor);
  return parts;
}

export function ListingMoveIn({
  listing,
  locale,
}: {
  listing: Listing;
  locale: Locale;
}) {
  const parts = partsOf(listing);
  const stated = listing.moveInCostStated === true;
  const total =
    listing.moveInCostMinor ?? parts.reduce((sum, part) => sum + part.minor, 0);

  // Nobody named a total and nobody named a part. There is no honest figure to
  // print, so none is printed.
  if (total <= 0 && parts.length === 0) return null;

  /*
   * The breakdown is only worth a tap when it has more than the rent in it. A
   * sheet whose entire content restates the price above it is a control that
   * does nothing, which is worse than no control.
   */
  const breakdownWorthOpening = parts.length > 1;

  return (
    <div data-testid="move-in-cost">
      <p className={TYPE.label}>
        {stated ? "Total to move in" : "Move in from"}
      </p>
      <p className="mt-1.5">
        <Amount
          minorUnits={total}
          locale={locale}
          currency={listing.currency}
          className="text-[1.75rem] font-bold leading-none tracking-[-0.025em] text-[var(--nf-content-primary)] sm:text-[2rem]"
        />
      </p>
      <p className={`mt-2 ${TYPE.body}`}>
        {stated
          ? "The figure the agent says you need at the door, rent included."
          : "The parts the agent has named so far, added up. Ask about anything not listed before you commit."}
      </p>

      {breakdownWorthOpening && (
        <div className="nf-hairline mt-4">
          <Disclosure
            label="What makes up this figure"
            hint={`${parts.length} ${parts.length === 1 ? "line" : "lines"}`}
            title="Move-in breakdown"
            data-testid="move-in-breakdown"
          >
            <dl className="divide-y divide-[var(--nf-border-subtle)]">
              {parts.map((part) => (
                <div key={part.key} className="flex items-baseline justify-between gap-6 py-3.5">
                  <dt className={TYPE.body}>{part.label}</dt>
                  <dd className="shrink-0">
                    <Amount
                      minorUnits={part.minor}
                      locale={locale}
                      currency={listing.currency}
                      className="text-[1rem] font-semibold text-[var(--nf-content-primary)]"
                    />
                  </dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-6 py-4">
                <dt className={TYPE.rowTitle}>{stated ? "Total" : "Named so far"}</dt>
                <dd className="shrink-0">
                  <Amount
                    minorUnits={total}
                    locale={locale}
                    currency={listing.currency}
                    className="text-[1.25rem] font-bold text-[var(--nf-content-primary)]"
                  />
                </dd>
              </div>
            </dl>
            <p className={`mt-2 ${TYPE.caption} leading-relaxed`}>
              {stated
                ? "Stated by the agent. Anything not listed here is not part of their quote, so ask before you pay."
                : "The agent has not given one total, so this is the sum of the parts they named. There may be more; ask before you pay."}
            </p>
          </Disclosure>
        </div>
      )}
    </div>
  );
}
