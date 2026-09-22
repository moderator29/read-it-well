import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import { DAYPART_GREETING, type HomeOverview } from "@/lib/app/home-queries";
import { ListingCard } from "@/components/app/ListingCard";
import { CityRow } from "@/components/app/home/CityRow";
import { CategoryRow, type HomeCategory } from "@/components/app/home/CategoryRow";
import { FeaturedBand } from "@/components/app/home/FeaturedBand";
import { HomeHero } from "@/components/app/home/HomeHero";
import { LogoMark } from "@/design-system/brand/Logo";
import { VerifyPrompt } from "@/components/roles/VerifyPrompt";
import type { RoleState } from "@/components/roles/roles";
import { EmptyActions } from "@/components/app/EmptyActions";
import { EmptyState } from "@/components/app/Screen";

/**
 * The property home page, to `GOVERNING-01` SCREEN ONE.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS KEPT, WHAT WAS REPLACED, AND WHY EACH.
 *
 * KEPT, on the founder's instruction, because they are the reader's own facts
 * and the one thing on this screen that cannot be a marketing line: the
 * greeting decided by the clock in Lagos, their name, and the location
 * selector. The header above (hamburger, lockup, bell, avatar) is the shell's
 * and is untouched.
 *
 * REPLACED, and this is everything below the selector:
 *
 *   1. THE HERO CONTAINER. A photographed property plate carrying the place
 *      chip, "Find your next home" in heavy type, one supporting line, and THE
 *      SEARCH FIELD INSIDE THE CONTAINER with a filter control in its right
 *      end. This takes the place of the bare wide search well that stood here.
 *   2. THE FOUR CATEGORY TILES: Buy, Rent, Manage, Invest. Four, not the
 *      render's five: "Short Let" is the Stays side and does not ship here.
 *      Not nine: `MarketTiles` drew nine markets with counts, and both the
 *      render and rule 15 say a tile carries a name rather than a figure.
 *   3. FEATURED PROPERTIES, with a "See all", as a row of cards that scrolls
 *      sideways.
 *
 * FIVE BLOCKS CAME OFF THIS SCREEN AND NONE OF THEM BECAME UNREACHABLE, which
 * is the same standard the dock's "More" slot was held to. `MarketTiles` ->
 * the four tiles and `/search?type=`. `InvestBand` -> the Invest tile, which
 * is that band's own destination. `FeaturedCities` -> `/search` and the
 * location selector kept above. `TrendingStrip` -> the Feed slot in the dock.
 * `AiAssistantBanner` -> `/assistant`, which is a row in the side drawer and
 * always was. The agents card -> `/agents`, also a drawer row, and the switch
 * in the centre of the dock, which is now the real door to supply. Every one
 * of the six is listed in `BUILD_07_LEDGER.md` section 6 with its new home.
 *
 * ---------------------------------------------------------------------------
 * THE TWO CATEGORIES THAT NEEDED A RULING AND HAVE ONE.
 *
 * INVEST is a BROWSE FILTER over properties presented for their yield, and
 * nothing else. Never a financial product, never a fund, never a promise of
 * return. The Invest segment was taken out of the landing search control once
 * already and the comment at the top of `SearchPill.tsx` records why: Vallo
 * sells no investment product. That ruling stands and this tile does not
 * reopen it, because a tile that filters the catalogue is not an instrument.
 * The supporting line under it says so in the product, not only here.
 *
 * MANAGE RESOLVES BY WHO IS ASKING. Somebody who holds a supplier workspace
 * lands on their own properties; somebody who holds none lands on the "Add a
 * workspace" chooser, which is `GOVERNING-02`. It needs no new product and it
 * is honest in both states. The page decides which and hands the href in, so
 * this component never has to know about roles.
 *
 * PURE. The route reads the overview, the listings and the role facts and
 * hands them in; the preview harness hands in fixtures, so the look proven in
 * the harness is the look that ships.
 */
export function HomeScreen({
  t,
  locale,
  overview,
  listings,
  roles,
  manageHref,
}: {
  t: Dictionary;
  locale: Locale;
  overview: HomeOverview;
  listings: Listing[];
  /** The seller or agent roles with verification outstanding; empty for a renter. */
  roles: RoleState[];
  /**
   * Where the Manage tile goes for THIS reader: their own properties when they
   * hold a supplier workspace, the "Add a workspace" chooser when they do not.
   * Decided by the route, because only the route may read the account.
   */
  manageHref: string;
}) {
  const greeting = DAYPART_GREETING[overview.daypart];
  const name = overview.firstName || (overview.signedIn ? "there" : "");
  const copy = t.directHome;

  /*
   * THE PARAMETER IS `market`, AND IT IS NOT THE ONE THE OLD TILES SPENT.
   *
   * `MarketTiles` linked at `/search?intent=rent` and `/search?intent=sale`.
   * `parseShelfQuery` reads `market=buy|rent` and reads NOTHING called
   * `intent`, so both of those tiles have been landing on the unfiltered
   * catalogue since the day the market parameter was introduced. Recorded here
   * rather than quietly corrected, because the same dead parameter is spelled
   * in four other places that belong to other scopes.
   *
   * BUY AND INVEST REACH THE SAME SHELF TODAY, ON PURPOSE AND SAID OUT LOUD.
   * Invest is a browse filter over properties presented for their yield, and
   * this platform holds no yield fact to filter on: no rental income, no
   * service charge history, no occupancy. So Invest is the for-sale market
   * with its own framing, which is exactly what `InvestBand` already resolved
   * it to and for the same stated reason. It narrows the day there is
   * something honest to narrow on, and until then the supporting line under
   * the tile says what it is and what it is not.
   */
  const categories: HomeCategory[] = [
    { key: "buy", label: copy.buy, href: "/search?market=buy", icon: "keys-handover" },
    { key: "rent", label: copy.rent, href: "/search?market=rent", icon: "keys-home" },
    { key: "manage", label: copy.manage, href: manageHref, icon: "manage-ring" },
    {
      key: "invest",
      label: copy.invest,
      meaning: copy.investNote,
      href: "/search?market=buy",
      icon: "chart-growth",
    },
  ];

  return (
    <div className="nf-home">
      {/*
        THE VERIFICATION PROMPT, on the seller's or agent's own home surface.
        One row: an icon, a headline, a sentence, one action. Persistent but
        calm, above the greeting because it is the one outstanding thing on
        the account, and gone the moment verification lands.
      */}
      {roles.map((role) => (
        <VerifyPrompt key={role.id} role={role} className="mb-heading" />
      ))}

      {/* ---------------------------------------------------- the greeting */}
      <section className="nf-rise">
        <p className="nf-body-sm font-medium text-[var(--nf-content-secondary)]">{greeting}</p>
        {name ? (
          <h1 className="nf-rise nf-rise-2 mt-inline-tight flex items-center gap-inline">
            <span className="nf-h1">{name}</span>
            <span className="inline-block shrink-0 translate-y-[2px]">
              <LogoMark size={26} title="Vallo" />
            </span>
          </h1>
        ) : (
          <h1 className="nf-rise nf-rise-2 mt-inline-tight">
            <span className="nf-h1">Welcome to Vallo</span>
          </h1>
        )}
        {!overview.signedIn && (
          <p className="nf-body mt-row text-[var(--nf-content-secondary)]">
            <Link href="/sign-in" className="nf-link-quiet text-[var(--nf-content-link)]">
              Sign in
            </Link>{" "}
            and this screen becomes yours: your city, your places, your name.
          </p>
        )}

        <CityRow
          label={overview.place.label}
          context={overview.place.context}
          isOwn={overview.place.isOwn}
          signedIn={overview.signedIn}
        />
      </section>

      {/* ------------------------------------------------ 1. the hero plate */}
      <div className="mt-md">
        <HomeHero
          id="home-q"
          place={overview.place.label || null}
          title={copy.heroTitle}
          lede={copy.heroLede}
          searchPlaceholder={copy.heroSearch}
          searchAction="/search"
          filtersHref="/search?filters=open"
          filtersLabel={copy.filters}
          searchLabel={t.landing.hero.searchLabel}
          kind="home"
        />
      </div>

      {/* ------------------------------------------------ 2. the categories */}
      <CategoryRow categories={categories} label={t.home.markets.label} />

      {/* ------------------------------------------- 3. featured properties */}
      <FeaturedBand
        title={copy.featured}
        seeAllHref="/search"
        seeAllLabel={t.common.seeAll}
        count={listings.length}
        testId="featured-properties"
        empty={
          /*
            THE ONE PLATFORM EMPTY STATE, and it ends somewhere. The only thing
            that resolves an empty shelf is supply, so that is the action.
          */
          <EmptyState
            icon="home-search"
            title="Nothing to show here yet"
            body="Nobody has published a property in your city yet. The shelf fills the minute somebody does."
            action={
              <EmptyActions primary={{ label: "List a property", href: "/profile?switch=owner" }} />
            }
            secondary={
              <p className="nf-caption text-[var(--nf-content-muted)]">
                Listing is free, and it stays free.
              </p>
            }
          />
        }
      >
        {listings.map((listing, index) => (
          <li key={listing.id} className="nf-feature-row__item">
            {/* The catalogue's card is F3's and is never forked here, so home
                and search show one object. */}
            <ListingCard listing={listing} locale={locale} t={t} index={index} />
          </li>
        ))}
      </FeaturedBand>
    </div>
  );
}
