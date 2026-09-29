import { countOf, formatMoney, type Dictionary, type Locale } from "@vallo/i18n/core";
import { cashAtDoor, upfrontDuration, upfrontText } from "@/lib/listings/upfront";
import type { Listing } from "@/lib/listings/types";
import { PERIOD_SUFFIX_SLASH, type RentPeriod } from "@/lib/listings/pricing";
import { Amount } from "@/components/ui/Amount";
import { DetailGlyph } from "./DetailGlyph";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The Move-in Total block of 9E8B56ED, translated per DESIGN_DIRECTION 1.3.
 *
 * The render prints the yearly rent under the words "Move-in Total", which
 * is the one figure this product exists to get right. Here the block prints
 * the true move-in total (the agent's stated figure, or the sum of the parts
 * they named, marked "from"), with the rent and its period beneath it, and
 * the rooms tile on the right. A listing that names neither a total nor a
 * part shows the rent alone, honestly labelled.
 */
export function ListingMoveInBlock({
  listing,
  locale,
  t,
}: {
  listing: Listing;
  locale: Locale;
  t: Dictionary;
}) {
  const copy = t.catalogue.detail;
  const total = listing.moveInCostMinor ?? 0;
  const stated = listing.moveInCostStated === true;
  const period: RentPeriod =
    listing.pricePeriod === "month" || listing.pricePeriod === "quarter"
      ? listing.pricePeriod
      : "year";
  const hasTotal = total > 0;
  /* V-65: the rent asked for at the start, restated at the door when it is
     several whole periods. */
  const cash = cashAtDoor(listing);

  return (
    <div className="nf-detail-movein" data-testid="move-in-block">
      <div className="min-w-0">
        <p className="nf-detail-movein__label">
          {hasTotal ? (stated ? copy.moveInTotal : copy.moveInFrom) : t.catalogue.card.rent}
          <UiIcon name="info" size={16} className="text-[var(--nf-content-muted)]" />
        </p>
        <p className="nf-detail-movein__figure mt-inline-tight">
          <Amount
            minorUnits={hasTotal ? total : listing.priceMinor}
            locale={locale}
            currency={listing.currency}
            secondaryClassName="text-[0.5em] font-semibold opacity-70"
          />
          {!hasTotal && (
            <span className="nf-detail-movein__suffix">{PERIOD_SUFFIX_SLASH[period]}</span>
          )}
        </p>
        {hasTotal && (
          <p className="nf-caption mt-inline-tight text-[var(--nf-content-secondary)]">
            {t.catalogue.card.rent}{" "}
            <Amount
              minorUnits={listing.priceMinor}
              locale={locale}
              currency={listing.currency}
              className="font-semibold text-[var(--nf-content-primary)]"
            />{" "}
            {PERIOD_SUFFIX_SLASH[period]}
          </p>
        )}
        {cash && cash.upfrontMonths !== null && (
          <p className="nf-caption mt-inline-tight break-words text-[var(--nf-content-primary)]" data-testid="move-in-upfront">
            {/* The lister's DEMAND, labelled as theirs: the move-in charge on
                Vallo still takes one rent period (audit-owned), so this is not
                a figure Vallo collects. */}
            {cash.restated ? (
              t.shape.cash.listerAsks
                .replace("{duration}", upfrontDuration(cash.upfrontMonths, t.shape.cash))
                .replace("{amount}", formatMoney(cash.minor, locale, listing.currency))
            ) : (
              <strong>{upfrontText(cash.upfrontMonths, t.shape.cash)}</strong>
            )}
          </p>
        )}
        <p className="nf-caption mt-inline-tight text-[var(--nf-content-muted)]">{copy.moveInInfo}</p>
      </div>
      {(listing.bedrooms > 0 || listing.bathrooms > 0) && (
        <div className="nf-detail-movein__rooms">
          <DetailGlyph name="bed" />
          <span className="nf-numeric">
            {listing.bedrooms > 0 && (
              <span className="block">
                {countOf(listing.bedrooms, "beds", locale)}
                {listing.bathrooms > 0 && (
                  <>
                    {" · "}
                    {countOf(listing.bathrooms, "baths", locale)}
                  </>
                )}
              </span>
            )}
            {listing.toilets !== undefined && listing.toilets > 0 && (
              <span className="block text-[var(--nf-content-muted)]">
                {countOf(listing.toilets, "toilets", locale)}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
