import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { DAYPART_GREETING, getHomeOverview } from "@/lib/app/home-queries";
import { getListingRepository } from "@/lib/listings/repository";
import { ListingCard } from "@/components/app/ListingCard";
import { AiAssistantBanner } from "@/components/app/AiAssistantBanner";
import { CityRow } from "@/components/app/home/CityRow";
import { TrendingStrip } from "@/components/app/home/TrendingStrip";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { FilterLink } from "@/components/app/filters/FilterLink";
import { LogoMark } from "@/design-system/brand/Logo";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { getAgentContext } from "@/lib/agent/listings-queries";
import { getMode } from "@/lib/mode";
import { VerifyPrompt } from "@/components/roles/VerifyPrompt";
import { roleStateFrom, type AgentFacts } from "@/components/roles/roles";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

/**
 * Home: the overview.
 *
 * The first screen anybody sees, and the one place where every fact has to be
 * the reader's own. The greeting is decided by the clock in Lagos, not by the
 * server's timezone. The name is theirs. The city is theirs, read from their
 * profile, and the chevron beside it goes to the screen that changes it. The
 * hero is the supplied city artwork with a lit pin for every open place inside
 * that city, each one carrying its real post count from `public.areas`. The
 * strip under it is what people are actually reading there.
 *
 * Rendered per request rather than cached, because a page that says "Good
 * morning" cannot be served from a build that ran last night.
 *
 * What used to be here and is not any more: a "Top experiences" row of five
 * tiles whose five links were the same URL. Five different names leading to one
 * identical destination is a promise the product cannot keep, and the category
 * row above it already covers experiences honestly.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const overview = await getHomeOverview();

  /*
   * The first-run question, gated here and nowhere else.
   *
   * Home is where sign-up redirects and where the OAuth callback returns, so
   * this is the honest meaning of "first entry to the app". Putting the gate in
   * the shell layout instead would have made every consumer route a trapdoor,
   * including the welcome screen's own way out.
   *
   * `askIntent` is false unless the person is signed in, has stated nothing,
   * and has never been asked - so a skip is permanent and a returning user
   * never sees this branch again. It comes from the profile read the overview
   * already did, not a second query.
   */
  if (overview.askIntent) redirect("/welcome");

  const repo = getListingRepository();
  const listings = await repo.recommended(6);

  /*
   * The same five as the landing page, in the same order, with the same
   * objects.
   *
   * They were different, and the difference was not a decision. This row led
   * with Hotels, labelled Restaurants with a GIFT BOX, labelled Experiences
   * with a suitcase, and pointed at ?type= for things that are now an intent
   * rather than a type. So the shortcuts a stranger saw before signing up and
   * the shortcuts they saw afterwards were five different links wearing two
   * different sets of pictures, and two of those pictures did not depict the
   * thing they sat under.
   */
  const categories: { icon: BrandIconName; label: string; href: string }[] = [
    { icon: "keys-home", label: t.nav.rent, href: "/search?intent=rent" },
    { icon: "home-check", label: t.nav.buy, href: "/search?intent=sale" },
    { icon: "hotel-star", label: t.nav.shortlets, href: "/search?type=shortlet" },
    { icon: "map-spot", label: t.nav.land, href: "/search?type=land" },
    { icon: "keys-tag", label: t.nav.commercial, href: "/search?type=office" },
  ];

  const greeting = DAYPART_GREETING[overview.daypart];
  const name = overview.firstName || (overview.signedIn ? "there" : "");

  /*
   * Whether this person is a seller or an agent who has not finished verifying.
   *
   * Read here rather than inside `VerifyPrompt` because the prompt is a server
   * component that takes a fact, not a component that goes and finds one: the
   * same fact drives the sheet on `/profile`, and two independent reads of it
   * are two chances for the two surfaces to disagree about whether somebody is
   * verified.
   *
   * A renter or buyer never produces a prompt. `needsVerification` is false for
   * them by construction, so nothing here has to remember that rule.
   */
  const [agentContext, mode] = await Promise.all([getAgentContext(), getMode()]);
  const agentFacts: AgentFacts =
    agentContext.state === "agent"
      ? {
          type: agentContext.agent.type,
          status: agentContext.agent.status,
          verified: agentContext.agent.verified,
        }
      : null;
  const roles = roleStateFrom(agentFacts, mode).roles;

  return (
    <>
      {/*
        THE VERIFICATION PROMPT, on the seller's or agent's own home surface.

        One row: an icon, a headline, a sentence, one action. Persistent but
        calm - not a modal, no dismiss cross, and it blocks nothing. It is above
        the greeting because it is the one outstanding thing on the account, and
        it disappears the moment verification lands rather than when somebody
        closes it.
      */}
      {roles.map((role) => (
        <VerifyPrompt key={role.id} role={role} className="mb-6" />
      ))}

      {/* ---------------------------------------------------- the greeting */}
      <section className="nf-rise">
        <p className="text-[0.875rem] font-medium text-[var(--nf-content-secondary)]">
          {greeting}
        </p>
        {name ? (
          <h1 className="mt-0.5 flex items-center gap-2.5">
            <span className="nf-h1 max-sm:text-[1.875rem]">{name}</span>
            <span className="inline-block shrink-0 translate-y-[2px]">
              <LogoMark size={26} title="RentMe" />
            </span>
          </h1>
        ) : (
          <h1 className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="nf-h1 max-sm:text-[1.75rem]">Welcome to RentMe</span>
            <span className="inline-block shrink-0 translate-y-[2px]">
              <LogoMark size={26} title="RentMe" />
            </span>
          </h1>
        )}
        {!overview.signedIn && (
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
            <Link
              href="/sign-in"
              className="font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
            >
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

      {/*
        ------------------------------------------------------------- search

        THE ONE THING SOMEBODY OPENS RENTME TO DO, AND IT WAS NOT ON THIS
        SCREEN.

        The in-product home had no search field anywhere. It opened with a
        greeting, then a photograph of the reader's city, then a strip of what
        people were reading, and the first way to look for a property was a
        category object most of the way down. Meanwhile the signed-out landing
        page put a search bar directly under its headline. So the page that
        greets a stranger let them search, and the page that greets somebody
        who has already signed in did not.

        It is the same control as the landing hero on purpose, down to the 48px
        field and the filter button beside it, because a person who searched
        before they signed up should find the same thing in the same shape
        afterwards.
      */}
      <div className="mt-6 flex items-start gap-2 sm:items-center">
        <form
          action="/search"
          method="get"
          role="search"
          className="nf-card nf-card--live nf-focus-well flex min-w-0 flex-1 flex-col gap-2 p-2 sm:flex-row sm:items-center"
        >
          <label htmlFor="home-q" className="sr-only">
            {t.landing.hero.searchLabel}
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
            <UiIcon name="search" size={20} className="text-[var(--nf-content-muted)]" />
            <input
              id="home-q"
              name="q"
              type="search"
              autoComplete="off"
              placeholder={t.landing.hero.searchPlaceholder}
              className="w-full bg-transparent py-3 text-[1rem] text-[var(--nf-content-primary)] outline-none placeholder:text-[var(--nf-content-muted)]"
            />
          </div>
          <Button type="submit" variant="primary" size="lg">
            {t.common.search}
          </Button>
        </form>
        <FilterLink label={t.common.search} />
      </div>

      {/* -------------------------------------------------------- categories */}
      {/*
        Straight after search, because these ARE search: five prefilled
        queries. They used to sit below a city photograph and a trending strip,
        which put two blocks of atmosphere between a person and the five
        shortcuts they most likely wanted.
      */}
      <Reveal as="section" className="mt-9 sm:mt-11">
        {/* Was "Find a place to stay". Nobody stays in a property they are
            renting for a year, and nobody buys one to stay in it. */}
        <h2 className="nf-h3 mb-4">Browse by type</h2>
        {/*
          NO BOXES. The objects sit on the page.

          Every one of these used to be an `nf-card` - a bordered, blurred,
          shadowed container with a 48px object inside it and 13px type under
          that. Five cards in a row is five borders and five shadows competing
          with the object each one exists to present, and the object is
          commissioned artwork with its own light: a plate behind it flattens
          precisely the depth it was drawn for.

          What replaces the box is SIZE and AIR. The object is 76px on a phone
          and 88px from `sm`, the label is 15px, and the gaps are wider than the
          cards were. Nothing is drawn around any of it.
        */}
        <ul className="nf-scroll-x -mx-5 flex snap-x snap-mandatory gap-6 px-5 pb-1 scroll-pl-5 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-7 sm:px-0 sm:pb-0 lg:grid-cols-5">
          {categories.map((c) => (
            <li key={c.href} className="w-[6rem] shrink-0 snap-start sm:w-auto">
              <Link
                href={c.href}
                className="nf-tap flex h-full flex-col items-center gap-3 text-center"
              >
                <span className="nf-story-art block h-19 w-19 sm:h-22 sm:w-22">
                  <BrandIcon name={c.icon} fill />
                </span>
                <span className="text-[0.9375rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
                  {c.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* -------------------------------------------------- recommended */}
      <Reveal as="section" className="mt-12 sm:mt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="nf-h2">{t.home.recommended}</h2>
          <Link
            href="/search"
            className="nf-tap shrink-0 text-[0.875rem] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
          >
            {t.common.viewAll}
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="nf-card p-10 text-center">
            <span className="mx-auto block h-16 w-16">
              <BrandIcon name="home-search" fill />
            </span>
            <p className="mt-4 font-semibold">Nothing to show here yet</p>
            <p className="mt-1 text-[0.875rem] text-[var(--nf-content-muted)]">
              Once listings are approved they will appear in this space.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        )}
      </Reveal>

      {/*
        --------------------------------------------- what is live near you

        MOVED DOWN, AND ONE HALF OF IT DELETED.

        This used to sit between the greeting and everything a person can act
        on. A photograph of the reader's city, then a strip of what people were
        reading in it, and only after both of those the first way to look for a
        property. Two blocks of atmosphere in front of the purpose of the
        screen.

        The photograph is gone. CityHero drew a large city render with a lit
        pin per open area, which is beautiful and tells somebody nothing they
        can do anything with; the city is already named directly under the
        greeting by CityRow, in one line, with the control that changes it.

        The strip stayed, because unlike the render it is real content: what
        people are actually posting where this reader lives. It reads far
        better here, as something to browse once the properties have been
        looked at, than as a toll gate in front of them.
      */}
      <Reveal as="section" className="mt-12 sm:mt-14">
        <TrendingStrip
          items={overview.trending}
          cityLabel={overview.place.label}
          hasPlaces={overview.areas.length > 0}
        />
      </Reveal>


      {/* ----------------------------------------------------------- ai card */}
      <Reveal className="mt-12 sm:mt-14" delay={60}>
        <AiAssistantBanner t={t} />
      </Reveal>

      {/* -------------------------------------------------- agent promo */}
      <Reveal as="section" className="mt-12 sm:mt-14" delay={60}>
        <div className="nf-card relative flex flex-col gap-5 overflow-hidden p-6 sm:p-7 md:flex-row md:items-center">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
            style={{ background: "var(--nf-gradient-agent)", opacity: 0.24 }}
            aria-hidden="true"
          />
          <span className="block h-16 w-16 shrink-0 sm:h-[3.75rem] sm:w-[3.75rem]">
            <BrandIcon name="homes-sparkle" fill />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="nf-h3">{t.home.agentCard.title}</h2>
            <p className="mt-1.5 max-w-[58ch] text-[0.9375rem] text-[var(--nf-content-secondary)]">
              {t.home.agentCard.body}
            </p>
          </div>
          <ButtonLink href="/agents" variant="secondary" className="shrink-0">
            {t.home.agentCard.action}
          </ButtonLink>
        </div>
      </Reveal>
    </>
  );
}
