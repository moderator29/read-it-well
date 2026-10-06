import Link from "next/link";
import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n/core";
import { cashAtDoor, upfrontDuration, upfrontText } from "@/lib/listings/upfront";
import type { Listing } from "@/lib/listings/types";
import { PERIOD_SUFFIX_SLASH, type RentPeriod } from "@/lib/listings/pricing";
import { Amount } from "@/components/ui/Amount";
import { SummaryCard } from "@/components/ui/SummaryCard";
import type { StatusSegment } from "@/components/ui/charts/StatusBar";
import { moveInLines } from "./move-in-lines";
import { unexplainedRemainder } from "@/lib/rent/ledger";
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
 *
 * THE HERO FIGURE, AND THE RENT DIRECTLY BENEATH IT (Session 3, Stage 5).
 * The total is the screen's one figure: hero size, counting up once on
 * arrival (`Amount count`, never again on a re-render). The rent used to sit
 * in the footer under the parts bar, two rows away from the figure it
 * explains; it now reads as the figure's own second line, so the eye takes
 * "what it costs to move in, of which this is rent" in one look. There is no
 * example badge any more (D24): an example row draws the same block with no
 * label, and it never carries a trust mark here because this block draws none.
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

  /* The bar's parts are the listing's own lines (`moveInLines`, the same
     builder the full breakdown draws), only the ones the lister declared,
     so the segments add up to the figure above them and nothing is guessed. */
  const TONES: Record<string, StatusSegment["tone"]> = {
    rent: "brand",
    caution: "success",
    agency: "warning",
    legal: "neutral",
    agreement: "info",
    service: "error",
  };
  const declared = hasTotal
    ? moveInLines(listing, t.moveIn).filter((part) => typeof part.minor === "number" && part.minor > 0)
    : [];
  const segments: StatusSegment[] = declared.map((part) => ({
    key: part.key,
    label: part.label,
    count: part.minor as number,
    display: formatMoney(part.minor as number, locale, listing.currency),
    tone: TONES[part.key] ?? "neutral",
  }));
  /* V-13's gap: a stated total above its parts keeps its own named part, as
     the full breakdown does, so the bar never pretends the parts add up. */
  const remainder = hasTotal
    ? unexplainedRemainder(
        total,
        declared.map((part) => part.minor ?? 0),
        stated,
      )
    : 0;
  if (remainder > 0) {
    segments.push({
      key: "remainder",
      label: t.afterTheGate.remainder.line,
      count: remainder,
      display: formatMoney(remainder, locale, listing.currency),
      tone: "warning",
    });
  }

  return (
    <div data-testid="move-in-block">
      {/* The move-in total as a summary card (plan item 18, spec 9): the
          label, the figure, one sentence, and a bar whose parts are the real
          lines. Beds and baths live in the spec chips, not here. */}
      <SummaryCard
        as="div"
        className="nf-detail-movein-card nf-movein-hero"
        label={hasTotal ? (stated ? copy.moveInTotal : copy.moveInFrom) : t.catalogue.card.rent}
        figure={
          <>
            <Amount
              minorUnits={hasTotal ? total : listing.priceMinor}
              locale={locale}
              currency={listing.currency}
              secondaryClassName="text-[0.5em] font-semibold opacity-70"
              count
            />
            {!hasTotal && <span className="nf-detail-movein__suffix">{PERIOD_SUFFIX_SLASH[period]}</span>}
            {hasTotal && (
              <span className="nf-movein-hero__rent" data-testid="move-in-rent">
                {t.catalogue.card.rent}{" "}
                <Amount
                  minorUnits={listing.priceMinor}
                  locale={locale}
                  currency={listing.currency}
                  className="nf-movein-hero__rent-figure"
                />{" "}
                {PERIOD_SUFFIX_SLASH[period]}
              </span>
            )}
          </>
        }
        sentence={copy.moveInInfo}
        segments={segments.length > 1 ? segments : undefined}
        barLabel={copy.moveInTotal}
        footer={
          <div className="grid gap-2xs">
            {cash && cash.upfrontMonths !== null && (
              <p className="nf-caption break-words text-[var(--nf-content-primary)]" data-testid="move-in-upfront">
                {/* The lister's DEMAND, labelled as theirs: the move-in charge on
                    Vallo still takes one rent period (audit-owned), so this is
                    not a figure Vallo collects. */}
                {cash.restated ? (
                  t.shape.cash.listerAsks
                    .replace("{duration}", upfrontDuration(cash.upfrontMonths, t.shape.cash))
                    .replace("{amount}", formatMoney(cash.minor, locale, listing.currency))
                ) : (
                  <strong>{upfrontText(cash.upfrontMonths, t.shape.cash)}</strong>
                )}
              </p>
            )}
            <Link href={`/rent/move-in/${listing.id}`} className="nf-link-quiet nf-caption inline-flex items-center gap-2xs font-semibold text-[var(--nf-content-link)]">
              {copy.calculateBreakdown}
              <UiIcon name="chevron-right" size={16} />
            </Link>
          </div>
        }
      />
    </div>
  );
}
