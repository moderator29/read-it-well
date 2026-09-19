import Image from "next/image";
import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import { DAYPART_GREETING, type HomeOverview } from "@/lib/app/home-queries";
import { ListingCard } from "@/components/app/ListingCard";
import { AiAssistantBanner } from "@/components/app/AiAssistantBanner";
import { CityRow } from "@/components/app/home/CityRow";
import { TrendingStrip } from "@/components/app/home/TrendingStrip";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { FilterLink } from "@/components/app/filters/FilterLink";
import { LogoMark } from "@/design-system/brand/Logo";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { VerifyPrompt } from "@/components/roles/VerifyPrompt";
import type { RoleState } from "@/components/roles/roles";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyActions } from "@/components/app/EmptyActions";
import { EmptyState, ICON } from "@/components/app/Screen";

/**
 * The in-app home, to the dimmed home behind the flip
 * (`docs/design/references/GOVERNING-flip-mid-turn.png`).
 *
 * Top to bottom, in the render's order: the search field, the four glass
 * browse tiles, the verified cards stacked full width, Popular Cities as
 * photo tiles, then a second run of cards. Above the render's fold this
 * product keeps two things the render has no room for and the founder
 * does: the greeting, which is the one line on the screen that is the
 * reader's own, and the location chip from the feed render, which is where
 * every fact below it comes from.
 *
 * PURE. This is the screen and nothing else: the route reads the overview,
 * the listings and the role facts and hands them in, and the preview harness
 * hands in fixtures, so the look proven in the harness is the look that
 * ships. Every number here is one the database holds; the only copy that is
 * not the dictionary's is the greeting, which `DAYPART_GREETING` decides by
 * the clock in Lagos.
 *
 * THE FOURTH TILE IS LAND, NOT "NEW BUILD". The render's fourth tile has no
 * filter behind it in the search vocabulary, and a tile that leads nowhere
 * real is the same defect as a Reserve button on a listing nobody can book.
 * The dictionary note says the same. The three city tiles are free-text
 * searches, which is what the search page matches a city name against.
 */

type CityTile = {
  name: string;
  href: string;
  /** The skyline plate, sized and compressed through next/image. */
  src: string;
  position: string;
};

const CITIES: CityTile[] = [
  {
    name: "Lagos",
    href: "/search?q=Lagos",
    src: "/brand/photos/skyline-bridge-dusk.jpg",
    position: "center",
  },
  {
    name: "Abuja",
    href: "/search?q=Abuja",
    src: "/brand/photos/villa-exterior-sunset.jpg",
    position: "center",
  },
  {
    name: "Port Harcourt",
    href: "/search?q=Port%20Harcourt",
    src: "/brand/photos/skyline-waterfront-dusk.jpg",
    position: "left center",
  },
];

export function HomeScreen({
  t,
  locale,
  overview,
  listings,
  roles,
}: {
  t: Dictionary;
  locale: Locale;
  overview: HomeOverview;
  listings: Listing[];
  /** The seller or agent roles with verification outstanding; empty for a renter. */
  roles: RoleState[];
}) {
  const greeting = DAYPART_GREETING[overview.daypart];
  const name = overview.firstName || (overview.signedIn ? "there" : "");

  /*
   * The four tiles, in the render's order with the render's objects: the
   * key for renting, the ticked house for buying, the beach set for a
   * shortlet, the plot for land. Each is a real search.
   */
  const tiles: { icon: BrandIconName; label: string; href: string }[] = [
    { icon: "home-check", label: t.home.browse.buy, href: "/search?intent=sale" },
    { icon: "keys-home", label: t.home.browse.rent, href: "/search?intent=rent" },
    { icon: "shortlet", label: t.home.browse.shortlet, href: "/search?type=shortlet" },
    { icon: "land-plot", label: t.home.browse.land, href: "/search?type=land" },
  ];

  const [first, ...rest] = listings;
  const lead = first ? [first, ...rest.slice(0, 1)] : [];
  const more = rest.slice(1);

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
        The one thing somebody opens Vallo to do, first. One glass well with
        the glyph in it, the filters beside it, at the large button's height
        so the two agree; the same control as the landing hero so a person
        who searched before they signed up finds the same thing afterwards.
      */}
      <div className="nf-rise nf-rise-3 mt-md flex items-center gap-inline">
        <form action="/search" method="get" role="search" className="nf-home__search nf-focus-well min-w-0 flex-1">
          <label htmlFor="home-q" className="sr-only">
            {t.landing.hero.searchLabel}
          </label>
          <UiIcon name="search" size={ICON.inline} className="nf-home__search-glyph" />
          <input
            id="home-q"
            name="q"
            type="search"
            autoComplete="off"
            placeholder={t.home.searchProperties}
            className="nf-home__search-input"
          />
          <button
            type="submit"
            aria-label={t.common.search}
            className="nf-btn nf-btn--primary nf-btn--md nf-btn--icon shrink-0"
          >
            <UiIcon name="arrow-right" size={20} />
          </button>
        </form>
        <FilterLink label={t.common.search} />
      </div>

      {/* -------------------------------------------------------- tiles */}
      <nav aria-label="Browse by type" className="nf-rise nf-rise-4 mt-md">
        <ul className="nf-home__tiles">
          {tiles.map((tile) => (
            <li key={tile.href} className="min-w-0">
              <Link href={tile.href} className="nf-home__tile nf-tap">
                <span className="nf-home__tile-art">
                  <BrandIcon name={tile.icon} fill />
                </span>
                <span className="nf-home__tile-label">{tile.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

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
          <ul className="nf-home__cards">
            {lead.map((l, i) => (
              <li
                key={l.id}
                className="nf-card-in min-w-0"
                style={{ "--card-i": Math.min(i, 5) } as React.CSSProperties}
              >
                <ListingCard listing={l} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        )}
      </Reveal>

      {/* ---------------------------------------------------- cities */}
      <Reveal as="section" className="mt-section-tight">
        <div className="nf-home__head">
          <h2 className="nf-h3">{t.home.popularCities}</h2>
          <Link href="/search" className="nf-home__more nf-tap">
            {t.common.seeAll}
            <UiIcon name="arrow-right" size={ICON.inline} />
          </Link>
        </div>
        <ul className="nf-home__cities">
          {CITIES.map((city) => (
            <li key={city.name} className="min-w-0">
              <Link href={city.href} className="nf-home__city nf-tap">
                <Image
                  src={city.src}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 33vw, 240px"
                  style={{ objectPosition: city.position }}
                />
                <span className="nf-home__city-name">{city.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* The second run of cards, as the render continues below the cities. */}
      {more.length > 0 && (
        <Reveal as="section" className="mt-section-tight">
          <ul className="nf-home__cards">
            {more.map((l, i) => (
              <li
                key={l.id}
                className="nf-card-in min-w-0"
                style={{ "--card-i": Math.min(i, 5) } as React.CSSProperties}
              >
                <ListingCard listing={l} locale={locale} t={t} />
              </li>
            ))}
          </ul>
          <div className="mt-heading">
            <ButtonLink href="/search" variant="secondary" full>
              {t.common.viewAll}
            </ButtonLink>
          </div>
        </Reveal>
      )}

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
