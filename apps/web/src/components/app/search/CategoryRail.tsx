import Link from "next/link";
import { formatNumber, type Locale } from "@naijafinds/i18n";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { toSearchHref, type DiscoveryQuery } from "@/lib/listings/search-params";
import type { ListingKind } from "@/lib/listings/types";

/**
 * Browse by type: the top of Explore.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT THE REFERENCE'S CATEGORY LIST.
 *
 * The platform we are measuring against puts its categories inside the filter
 * sheet, as a checkbox list of ten words: Mansionettes, Mansions, Terrace,
 * Land/Plots, Studio Apartment, and so on. It works, and it has two problems we
 * are not copying.
 *
 * First, it is BEHIND A SHEET. The single most common thing anybody does on a
 * property marketplace is narrow to the kind of place they want, and it costs
 * two taps and a scroll before the first word of it is on screen.
 *
 * Second, every row is a WORD WITH A CHECKBOX and none of them says how much is
 * there. A person tapping Mansions has no idea whether they are about to see
 * four hundred places or none until the sheet closes, and finding out costs
 * another two taps to get back.
 *
 * So this rail is on the page, above the results, and every tile carries three
 * things the reference's rows do not: the OBJECT, in the platform's own 3D
 * icon pack, so the eye can find "land" without reading; the LIVE COUNT, read
 * from the same catalogue query that renders the grid below, so nobody taps
 * into an empty market by surprise; and its own state, so the market you are in
 * is visible without opening anything.
 *
 * A tile is a LINK, not a checkbox. That means the market is in the address
 * bar, the back button walks it backwards, and a category can be sent to
 * somebody. The filter drawer still owns the category too, because a person who
 * is already deep in a filter should not have to close the sheet to change
 * market. Two doors, one truth, and the truth is the URL.
 *
 * ---------------------------------------------------------------------------
 * TAPPING THE MARKET YOU ARE IN TAKES YOU OUT OF IT.
 *
 * There is no separate "All" tile competing for the first slot. The selected
 * tile's href clears the category, which is the behaviour a segmented control
 * has and the one people try first. `aria-pressed` says which it is, because to
 * a screen reader a link whose meaning flips is otherwise silent about it.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT HERE, AND WHY.
 *
 * `restaurant` and `experience` are real values of `ListingKind` and they are
 * not offered as tiles. Neither is a place somebody rents, both arrived by the
 * enum growing rather than by being designed for, and there is no object in the
 * icon pack for either. A tile with a borrowed picture and no stock behind it
 * is decoration. They stay reachable in the filter drawer, which lists every
 * value the catalogue can hold.
 */

/**
 * The nine markets, in the order they are offered, with the object that stands
 * for each and the name RentMe uses for it.
 *
 * THE NAMES ARE OURS AND THEY ARE NOT THE NOUNS. `KIND_NOUN` holds lower-case
 * mid-sentence nouns ("rentals", "plots") because that is what a result count
 * needs. A tile is a destination rather than a sentence fragment, so it gets a
 * name that says what the market IS: "Yearly rent" rather than "Rentals",
 * because the thing that separates that market from the four above it is the
 * term, not the building.
 *
 * AND EVERY ONE OF THEM FITS ON ONE LINE at 84px. "Whole homes" and "Land &
 * plots" were the first draft, and both wrapped to two lines, which made those
 * two tiles taller than the seven beside them and the rail read as ragged. A
 * name that does not fit is a layout bug wearing a word.
 *
 * Ordered by how people arrive: somewhere to sleep tonight, then somewhere to
 * live, then somewhere to trade, then the ground itself.
 */
const CATEGORY_TILES: { kind: ListingKind; label: string; icon: BrandIconName }[] = [
  { kind: "shortlet", label: "Shortlets", icon: "studio-apartment" },
  { kind: "apartment", label: "Apartments", icon: "serviced-apartment" },
  { kind: "home", label: "Homes", icon: "modern-house" },
  { kind: "villa", label: "Villas", icon: "villa" },
  { kind: "hotel", label: "Hotels", icon: "hotel" },
  { kind: "rental", label: "Yearly rent", icon: "terrace-house" },
  { kind: "shop", label: "Shops", icon: "shop-retail" },
  { kind: "office", label: "Offices", icon: "office-space" },
  { kind: "land", label: "Land", icon: "land-plot" },
];

export function CategoryRail({
  query,
  counts,
  locale,
}: {
  query: DiscoveryQuery;
  /**
   * How many published places each market holds RIGHT NOW.
   *
   * Passed in rather than fetched here, and that is the whole reason the
   * numbers can be trusted: they are counted from the catalogue read the page
   * already made to draw the results below. A separate query would be a second
   * answer to the same question, and the two would disagree the first time
   * somebody published a flat between them.
   */
  counts: Map<ListingKind, number>;
  locale: Locale;
}) {
  return (
    <section aria-labelledby="browse-by-type" className="nf-market">
      <h2 id="browse-by-type" className="nf-market__head">
        Browse by type
      </h2>

      {/*
        A rail on a phone and a nine-across row from `lg`.

        NOT A GRID ON A PHONE. Three columns of nine tiles is three rows of
        chrome above the first property, on the screen whose entire job is to
        show properties. One row that scrolls shows the same nine, costs one
        row of height, and the overflow is discoverable because the ninth tile
        is deliberately cut off at the screen edge rather than fitting neatly.
      */}
      <ul className="nf-market__rail nf-scroll-x">
        {CATEGORY_TILES.map(({ kind, label, icon }) => {
          const on = query.kind === kind;
          const count = counts.get(kind) ?? 0;
          return (
            <li key={kind}>
              <Link
                href={toSearchHref({ ...query, kind: on ? undefined : kind })}
                prefetch
                aria-pressed={on}
                aria-label={on ? `${label}, selected. Show every type` : label}
                data-testid={`category-${kind}`}
                className={`nf-market__tile${on ? " nf-market__tile--on" : ""}`}
              >
                <BrandIcon name={icon} size={40} />
                <span className="nf-market__name">{label}</span>
                {/*
                  The number, and nothing dressed up as one.

                  Zero is rendered rather than hidden, because a market with
                  nothing in it is a fact somebody is better off learning here
                  than after a tap. The tile stays enabled: an empty result page
                  on this platform says which filters produced it and offers the
                  way out, so arriving there is not a dead end.
                */}
                <span className="nf-market__count nf-numeric">{formatNumber(count, locale)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
