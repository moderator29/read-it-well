import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import { DAYPART_GREETING, type HomeOverview } from "@/lib/app/home-queries";
import { ListingCard } from "@/components/app/ListingCard";
import { AiAssistantBanner } from "@/components/app/AiAssistantBanner";
import { CityRow } from "@/components/app/home/CityRow";
import { FeaturedCities } from "@/components/app/home/FeaturedCities";
import { InvestBand } from "@/components/app/home/InvestBand";
import { MarketTiles } from "@/components/app/home/MarketTiles";
import type { HomeCity, InvestFeature, MarketCounts } from "@/components/app/home/markets";
import { TrendingStrip } from "@/components/app/home/TrendingStrip";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { LogoMark } from "@/design-system/brand/Logo";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { VerifyPrompt } from "@/components/roles/VerifyPrompt";
import type { RoleState } from "@/components/roles/roles";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyActions } from "@/components/app/EmptyActions";
import { EmptyState, ICON } from "@/components/app/Screen";

/**
 * The in-app home, to the founder's target render
 * (`docs/design/references/founder/GOVERNING-home-markets-target.png`).
 *
 * Top to bottom, in the target's order: the search field as ONE wide well
 * with the magnifier in its left end and the brand arrow inside its right,
 * the nine market tiles three to a row, the investment band, the featured
 * cities rail, and the recommendations two up beneath them.
 *
 * WHAT THE TARGET HAS THAT THIS SCREEN DOES NOT, on the founder's ruling:
 * the render's "EXPLORE MARKETS / Everything you need, in one place." block
 * is replaced by the three things that are the reader's own and cannot be a
 * marketing line: the shell's hamburger header above, the greeting with their
 * name, and the location chip. Everything else on the screen comes from the
 * target.
 *
 * PURE. The route reads the overview, the listings, the market counts and the
 * role facts and hands them in; the preview harness hands in fixtures, so the
 * look proven in the harness is the look that ships. Every number on this
 * screen is one the database holds: see `markets.ts` for why a market with no
 * count draws its name alone rather than a figure.
 */
export function HomeScreen({
  t,
  locale,
  overview,
  listings,
  roles,
  counts = {},
  cities = [],
  invest = null,
}: {
  t: Dictionary;
  locale: Locale;
  overview: HomeOverview;
  listings: Listing[];
  /** The seller or agent roles with verification outstanding; empty for a renter. */
  roles: RoleState[];
  /** Published listings per market, for the tiles. Absent keys show no count. */
  counts?: MarketCounts;
  /** The busiest cities the catalogue holds a plate for. Empty renders no rail. */
  cities?: HomeCity[];
  /** The for-sale listing behind the investment band, or null to omit the band. */
  invest?: InvestFeature | null;
}) {
  const greeting = DAYPART_GREETING[overview.daypart];
  const name = overview.firstName || (overview.signedIn ? "there" : "");

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

      {/* ------------------------------------------------------- search */}
      {/*
        ONE WELL, NOT A ROW OF CONTROLS. The target draws a single wide field
        with the glyph in its left end and the arrow inside its right, and the
        shipped screen had a fat submit in the middle of the field and a
        separate filter box outside it, which squeezed the field until the
        placeholder truncated mid-word. The filters live on the search page,
        one tap further in, where the whole drawer is.
      */}
      <form
        action="/search"
        method="get"
        role="search"
        className="nf-glass nf-glass--well nf-home__search nf-rise nf-rise-3 mt-md"
      >
        <label htmlFor="home-q" className="sr-only">
          {t.landing.hero.searchLabel}
        </label>
        <UiIcon name="search" size={ICON.inline} className="nf-home__search-glyph" />
        <input
          id="home-q"
          name="q"
          type="search"
          autoComplete="off"
          placeholder={t.home.searchMarkets}
          className="nf-home__search-input"
        />
        <button
          type="submit"
          aria-label={t.common.search}
          className="nf-btn nf-btn--primary nf-btn--sm nf-btn--icon nf-home__search-go"
        >
          <UiIcon name="arrow-right" size={18} />
        </button>
      </form>

      {/* -------------------------------------------------- market tiles */}
      <MarketTiles t={t} locale={locale} counts={counts} />

      {/* ------------------------------------------------- the investment band */}
      {invest && (
        <Reveal className="mt-section-tight">
          <InvestBand t={t} feature={invest} />
        </Reveal>
      )}

      {/* ---------------------------------------------------- cities */}
      <Reveal className="mt-section-tight">
        <FeaturedCities t={t} locale={locale} cities={cities} />
      </Reveal>

      {/* -------------------------------------------------- the cards */}
      <Reveal as="section" className="mt-section-tight">
        <div className="nf-home__head">
          <h2 className="nf-h3">{t.home.recommended}</h2>
          <Link href="/search" className="nf-home__more nf-tap">
            {t.common.seeAll}
            <UiIcon name="arrow-right" size={ICON.inline} />
          </Link>
        </div>

        {listings.length === 0 ? (
          /*
            THE ONE PLATFORM EMPTY STATE, and it ends somewhere. The only thing
            that resolves an empty shelf is supply, so that is the action.
          */
          <EmptyState
            icon="home-search"
            title="Nothing to show here yet"
            body="No agent has published a property in your city yet. The shelf fills the minute one does."
            action={
              <EmptyActions primary={{ label: "List a property", href: "/profile?switch=owner" }} />
            }
            secondary={
              <p className="nf-caption text-[var(--nf-content-muted)]">
                Listing is free, and it stays free.
              </p>
            }
          />
        ) : (
          <>
            {/* Two up, on the shared card: the catalogue's card is F3's and is
                never forked here, so home and search show one object. */}
            <ul className="nf-home__cards">
              {listings.map((l, i) => (
                <li
                  key={l.id}
                  className="nf-card-in min-w-0"
                  style={{ "--card-i": Math.min(i, 5) } as React.CSSProperties}
                >
                  <ListingCard listing={l} locale={locale} t={t} index={i} />
                </li>
              ))}
            </ul>
            <div className="mt-heading">
              <ButtonLink href="/search" variant="secondary" full>
                {t.common.viewAll}
              </ButtonLink>
            </div>
          </>
        )}
      </Reveal>

      {/* --------------------------------------------- what is live near you */}
      <Reveal as="section" className="mt-section-tight">
        <TrendingStrip
          items={overview.trending}
          cityLabel={overview.place.label}
          hasPlaces={overview.areas.length > 0}
        />
      </Reveal>

      {/* ----------------------------------------------------------- ai card */}
      <Reveal className="mt-section-tight" delay={60}>
        <AiAssistantBanner t={t} />
      </Reveal>

      {/* -------------------------------------------------- agent promo */}
      <Reveal as="section" className="mt-section-tight" delay={60}>
        <div className="nf-card relative flex flex-col gap-lg overflow-hidden p-card sm:p-cell md:flex-row md:items-center">
          <span className="block h-16 w-16 shrink-0">
            <BrandIcon name="homes-sparkle" fill />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="nf-h3">{t.home.agentCard.title}</h2>
            <p className="nf-body mt-row max-w-[58ch] text-[var(--nf-content-secondary)]">
              {t.home.agentCard.body}
            </p>
          </div>
          <ButtonLink href="/agents" variant="secondary" className="shrink-0">
            {t.home.agentCard.action}
          </ButtonLink>
        </div>
      </Reveal>
    </div>
  );
}
