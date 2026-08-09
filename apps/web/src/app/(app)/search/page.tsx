import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney, formatNumber, getDictionary, type Locale } from "@naijafinds/i18n";
import { CategoryRail } from "@/components/app/search/CategoryRail";
import { RealMap } from "@/components/app/search/RealMap";
import { ActiveFilters } from "@/components/app/filters/ActiveFilters";
import { FilterDrawer } from "@/components/app/filters/FilterDrawer";
import { ViewToggle } from "@/components/app/filters/ViewToggle";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { factsOf } from "@/lib/listings/filter";
import {
  hasOwnRequest,
  intentKindsPresent,
  orderByStatedIntent,
} from "@/lib/listings/intent";
import { readIntentTuning } from "@/lib/interests/queries";
import {
  KIND_NOUN,
  SORTS,
  activeFilterCount,
  clearedFilters,
  parseDiscoveryQuery,
  toFilter,
  toPoolFilter,
  toSearchHref,
  type DiscoveryQuery,
  type SortKey,
} from "@/lib/listings/search-params";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { ListingCard } from "@/components/app/ListingCard";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { EmptyState, ICON } from "@/components/app/Screen";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: false },
};

/**
 * Discovery results.
 *
 * Everything visible here is real behaviour, and all of it lives in the
 * address bar (`lib/listings/search-params.ts` is the contract): free text,
 * category, sort, view, budget, bedrooms, bathrooms, party size, amenities,
 * instant book and verified only. A filtered hunt is therefore a link, the
 * back button walks it backwards, and a reload lands on the same results.
 *
 * The filters themselves are not implemented on this page. They are the shared
 * matcher in `lib/listings/filter.ts` plus the SQL predicates in the Supabase
 * repository, so the seed catalogue, the platform catalogue and partner stock
 * all answer one definition of the request. This page asks the repository a
 * question and renders the answer.
 *
 * Sorting works on integer kobo, so no float maths.
 */

/**
 * First letter up, nothing else touched.
 *
 * `KIND_NOUN` holds lower-case nouns because they are read mid-sentence
 * everywhere else on this page. The stated-intent line is the one place a noun
 * starts a sentence, and a sentence starting "rentals, hotels first" reads as a
 * bug. Capitalising here rather than adding a second cased copy of every noun
 * keeps one list of nouns in the codebase.
 */
function sentenceCase(value: string): string {
  return value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);
}

/** Destination quick picks. Each chip is a shareable link, not client state. */

/**
 * The tiebreaker: at EQUAL relevance, a verified place goes first.
 *
 * Verification on this platform is first-party inventory that a human reviewer
 * admitted, so it is the single strongest signal discovery has about whether a
 * place is real. It was not being used at all. Two stays at the same price, or
 * the same rating and the same number of reviews, came back in whatever order
 * the repository happened to hand over, and an unverified listing routinely sat
 * above a verified one for no reason anybody could name. That is the whole of
 * the defect: not that ranking was wrong, but that a fact we already hold was
 * being thrown away at exactly the moment it decides something.
 *
 * A TIEBREAKER, DELIBERATELY, AND NOT MORE THAN THAT. Verification does not
 * outrank a better price on a price sort or a better rating on a rating sort,
 * because the person chose that sort and it is not ours to overrule. It only
 * settles the cases the chosen sort leaves genuinely equal, which is the exact
 * wording of the requirement.
 */
function byVerification(a: Listing, b: Listing): number {
  return Number(b.verified) - Number(a.verified);
}

function sortListings(listings: Listing[], sort: SortKey): Listing[] {
  const out = [...listings];
  switch (sort) {
    case "top-rated":
      out.sort(
        (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount || byVerification(a, b),
      );
      break;
    case "price-asc":
      out.sort((a, b) => a.priceMinor - b.priceMinor || byVerification(a, b));
      break;
    case "price-desc":
      out.sort((a, b) => b.priceMinor - a.priceMinor || byVerification(a, b));
      break;
    default:
      /*
       * Recommended has no numeric relevance score of its own: the repository's
       * order IS the relevance, first-party inventory ahead of partner stock.
       * So every position in it is a tie as far as this page can tell, and
       * verification settles all of them. `Array.prototype.sort` is stable, so
       * the repository's order survives intact inside each group.
       */
      out.sort(byVerification);
      break;
  }
  return out;
}

/**
 * Everything except the text box, as hidden fields, so submitting the search
 * form keeps the filters the traveller already set. Serialised by the same
 * function that writes every link on the page, so there is one contract.
 */
function carriedParams(query: DiscoveryQuery): [string, string][] {
  const href = toSearchHref(query);
  const index = href.indexOf("?");
  if (index === -1) return [];
  return [...new URLSearchParams(href.slice(index + 1))].filter(([key]) => key !== "q");
}

/** Real coordinates for the covered cities. */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Ibadan: { lat: 7.3775, lng: 3.947 },
  Abuja: { lat: 9.0765, lng: 7.3986 },
  Enugu: { lat: 6.4584, lng: 7.5464 },
  "Port Harcourt": { lat: 4.8156, lng: 7.0498 },
  Calabar: { lat: 4.9757, lng: 8.3417 },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const raw = await searchParams;
  const parsed = parseDiscoveryQuery(raw);

  /*
   * THE LIST IS THE DEFAULT, ALWAYS, AND THE COOKIE NO LONGER OVERRULES IT.
   *
   * A stored view preference was read here, so somebody who had once opened the
   * map got the map every time they tapped Explore afterwards, including on a
   * bare `/search` from the tab bar. That is defensible as a preference and it
   * is wrong as a default: Explore exists to show properties, the map shows
   * five city pins and a price floor, and arriving at a country outline when
   * you meant to browse is the wrong first screen however faithfully it
   * remembers what you did last week.
   *
   * The address bar still decides completely. `?view=map` is a link somebody
   * sent or a control somebody just tapped, and it wins as it always did. What
   * is gone is the invisible third opinion.
   */
  const query: DiscoveryQuery = parsed;

  const repo = getListingRepository();
  /*
   * Three questions, asked together:
   *
   *   results  the full request, with every filter applied by the repository.
   *   pool     the same TEXT with no structured bounds and no category. This is
   *            what the drawer counts against, so the number on its button is
   *            produced by the same matcher the server just ran, not guessed.
   *            The category left this read when the category rail left the
   *            search bar: the drawer owns the category now, and a pool already
   *            narrowed to one market would answer every other market with
   *            zero. See `toPoolFilter`.
   *   whole    the catalogue, for the map's per-city floor.
   */
  const [rawResults, pool, whole] = await Promise.all([
    repo.search(toFilter(query)),
    repo.search(toPoolFilter(query)),
    /*
     * `whole` feeds the map's per-city price floor.
     *
     * This used to pass `{ partners: false }` to keep a billed Google Places
     * request off a page that discarded every row it returned, because Places
     * reports a price LEVEL rather than an amount. That inventory is gone and
     * the flag has been ignored for some time, so the last thing keeping it
     * alive was this call site. Both are removed together, which is the only
     * way a compatibility shim ever actually leaves a codebase.
     */
    repo.search({}),
  ]);
  const sorted = sortListings(rawResults, query.sort);

  /*
   * Stated intent. One read of the row, answering two different questions.
   *
   * RANKING. `hasOwnRequest` is the gate: if the address bar carries ANYTHING
   * the person chose - a search term, a category, a sort, the map, a budget, a
   * bedroom count, an amenity, instant book, verified only - the stored answer
   * is not applied at all. An explicit choice outranks a remembered one,
   * always.
   *
   * What it then does is reorder, never filter. The count below the heading is
   * the same number either way and every card that matched is still on the
   * page; the markets somebody named are simply the ones they meet first. A
   * personalisation that removed inventory would be the platform deciding what
   * a person is allowed to see, which is not what they agreed to when they
   * answered one question at the door.
   *
   * THE CONTROL. The per-card "more like this / not for me" is a different
   * question and is NOT gated on the address bar. Somebody who has just
   * filtered to Lekki still has an opinion about rentals, and refusing to
   * record it because they typed something would throw away the signal at
   * exactly the moment it is strongest. So the row is read on every request
   * now, where it used to be skipped whenever a parameter was present - the
   * cost is one indexed read of the caller's own profile row, and what it buys
   * is a control that can be honest about whether there is an account behind
   * it. `signedIn` decides whether the control exists at all: signed out, it is
   * not rendered, because there is no anonymous store for this.
   */
  const tuning = await readIntentTuning();
  const statedIntent = hasOwnRequest(query) ? [] : tuning.interests;
  const listings = orderByStatedIntent(sorted, statedIntent);
  const intentApplied = listings !== sorted;
  const intentKinds = intentApplied ? intentKindsPresent(listings, statedIntent) : [];

  /*
   * How much stock each market holds, for the browse-by-type rail.
   *
   * Counted from `whole`, the catalogue read the map already needed, so the
   * rail costs nothing extra and its numbers cannot disagree with the grid.
   * Deliberately NOT counted from `listings`: the rail is how somebody moves
   * BETWEEN markets, so a Shortlets tile that read zero because the reader is
   * currently filtered to hotels under two million would be telling them the
   * shelf is empty when it is the filter that is narrow.
   */
  const kindCount = new Map<ListingKind, number>();
  for (const l of whole) kindCount.set(l.kind, (kindCount.get(l.kind) ?? 0) + 1);

  // The map reads the whole catalogue: every covered city keeps its pin and
  // lowest nightly price regardless of the current text filter.
  const cityFloor = new Map<string, { count: number; minMinor: number; currency: string }>();
  for (const l of whole) {
    // A floor needs a real price. Partner venues that come with a price level
    // rather than an amount carry 0 and must not become a city's "from" figure.
    if (l.priceMinor <= 0) continue;
    const entry = cityFloor.get(l.city);
    if (!entry) {
      cityFloor.set(l.city, { count: 1, minMinor: l.priceMinor, currency: l.currency });
    } else {
      entry.count += 1;
      entry.minMinor = Math.min(entry.minMinor, l.priceMinor);
    }
  }

  const noun = query.kind ? KIND_NOUN[query.kind] : { one: "stay", many: "stays" };
  const narrowed = activeFilterCount(query) > 0;

  /*
   * How many places the applied category holds without the structured bounds,
   * for the "waiting without them" line under the empty state.
   *
   * `pool` spans every category now, so reading its length under a category
   * noun would have told somebody filtering hotels that four hundred hotels
   * were waiting when the number was the whole catalogue. Filtered in memory
   * rather than asked for separately: the rows are already here, and a third
   * catalogue read to recover a figure we are holding would be a query bought
   * to undo a query.
   */
  const poolInKind = query.kind ? pool.filter((l) => l.kind === query.kind) : pool;

  return (
    <>
      {/* ------------------------------------------------ sticky search bar */}
      {/* The bar bleeds to the screen edges by cancelling the shell's gutter,
          so the cancel and the restore are one decision and take one value.
          They were -mx-5/px-5 stepping to -mx-8/px-8 at md, which is the
          gutter's OLD fixed pair written out by hand: the gutter is a clamp
          now, so those four numbers agreed with it at two widths and were
          wrong at every width in between. */}
      <div className="nf-glass -mx-gutter -mt-group border-b border-[var(--nf-border-subtle)] px-gutter py-row">
        {/* The bar and its filter control are siblings: the pill holds the
            query and its submit, the filter control sits beside it as its own
            glass square, which is how the reference reads and keeps the typing
            area uncluttered. */}
        <div className="mx-auto flex max-w-3xl items-center gap-inline">
        <form
          action="/search"
          method="get"
          role="search"
          className="flex min-w-0 flex-1 items-center gap-inline"
        >
          {/* One field build, shared with every other search bar on the
              platform. The label is the placeholder's own copy, hidden but
              present, so the control is named rather than relying on a
              placeholder that vanishes the moment somebody types.

              `clearable` is plain English on purpose: the dictionaries have no
              word for "clear" yet, and inventing one across four locales here
              would put a guess into the translation files. Wants `common.clear`. */}
          <TextField
            label={t.home.searchPlaceholder}
            hideLabel
            leadingIcon="search"
            clearable="Clear search"
            name="q"
            type="search"
            autoComplete="off"
            defaultValue={query.q ?? ""}
            placeholder={t.home.searchPlaceholder}
            className="min-w-0 flex-1"
          />
          {/* Typing a new search must not silently drop the filters already set. */}
          {carriedParams(query).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          {/* At 390px the word plus the filter square left the field reading
              "Search places, ho...", so on phones the submit is its glyph and
              the words return once there is room for them. The accessible name
              is the word either way. */}
          <Button
            type="submit"
            variant="primary"
            aria-label={t.common.search}
            className="shrink-0"
          >
            <UiIcon name="search" size={ICON.row} className="sm:hidden" />
            <span className="hidden sm:inline">{t.common.search}</span>
          </Button>
        </form>
        <FilterDrawer
          query={query}
          facts={pool.map(factsOf)}
          locale={locale}
          openOnMount={raw.filters === "open"}
        />
        </div>

        {/*
          ONE ROW ABOVE THE FIRST RESULT. IT WAS FIVE.

          The sticky bar carried, in order: the search field with its filter
          button, twelve category tiles, five city chips, and a rail of sort
          chips. Below it came the results heading, a view toggle and an active
          filter row. Six control surfaces stacked between somebody and the
          first property, on a screen whose entire job is to show properties.
          On a phone that is most of the viewport spent on controls.

          None of the three that left lost its function, they went where they
          belong:

          CITY CHIPS were a location filter drawn as navigation. Five hardcoded
          cities cannot serve a country with 774 local governments, and the
          filter drawer already has a real location control that can. Somebody
          wanting Lagos types Lagos, which is the field directly above, or opens
          filters and picks it properly.

          SORT is not a filter and it is not navigation. It orders a result set,
          so it belongs beside the result count where the count it reorders is
          visible, and that is where it now is. As a chip rail up here it was
          four permanent options taking a row of a phone screen to answer a
          question most people never ask.

          CATEGORY TILES were the last sub-navigation on the platform, and they
          could not leave until there was somewhere for them to go: the filter
          drawer had no category control at all, so deleting the rail would have
          deleted the only way to choose a market. The drawer has one now, at
          the top of its own list, and the pool it counts against spans every
          category so the number on its Apply button is right for a market the
          reader has picked but not yet applied. The current category is still
          visible and still one tap from gone, on the active filter row below.
        */}
      </div>

      {/*
        Browse by type: nine markets, each a link, each carrying its own live
        count. This is the category control BACK ON THE PAGE, and it is not the
        rail that was removed from the sticky bar: that one was twelve tiles
        inside the sticky header, above four more control rows, with no counts
        and no way to tell an empty market from a full one. This sits below the
        bar, scrolls away with the page, and every tile says how much is behind
        it. The filter drawer still owns the category as well, for somebody who
        is already inside it.
      */}
      <CategoryRail query={query} counts={kindCount} locale={locale} />

      {/*
        RECENT SEARCHES AND RECENTLY VIEWED ARE GONE FROM THIS SCREEN.

        Two full rows of chips between the market rail and the first property,
        and on a real device they filled with "Abuja, Abuja, Abuja, Abuja"
        because every keystroke through the search box recorded another hunt.
        Even working perfectly they are a history of what you already did on a
        screen whose job is to show you what is there now.

        Nothing is lost that anybody was using: a search is a URL, so the
        browser's own back button and history already hold every one of them,
        and a place you opened is one tap from the Saved screen if you kept it.
      */}

      {/* ---------------------------------------------------- results header */}
      <Reveal as="section" className="mt-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-inline">
          <div className="min-w-0">
            <h1 className="nf-h3">
              {query.q ? (
                <>
                  Results for <span className="nf-gradient-text">&ldquo;{query.q}&rdquo;</span>
                </>
              ) : query.kind ? (
                `Explore ${KIND_NOUN[query.kind].many}`
              ) : (
                "Explore properties"
              )}
            </h1>
            {/*
             * The count is the number of cards below it, never a rounded or
             * inflated figure, and it says plainly whether filters produced it.
             *
             * Announced, because applying a filter is a full server navigation
             * that replaces the grid in place. Sighted readers see the number
             * change; without a live region a screen reader user got silence
             * and had to hunt for the heading again to find out whether their
             * filter had matched forty places or none. `polite` rather than
             * `assertive`: it is the outcome of something they just did, so it
             * should wait its turn rather than interrupt.
             *
             * `atomic` because the sentence only means anything whole. Reading
             * out a changed digit without "places match your filters" is worse
             * than reading nothing.
             */}
            <p
              data-testid="results-count"
              data-count={listings.length}
              aria-live="polite"
              aria-atomic="true"
              className="nf-body-sm mt-inline-tight text-[var(--nf-content-muted)]"
            >
              {formatNumber(listings.length, locale)}{" "}
              {listings.length === 1 ? noun.one : noun.many}{" "}
              {narrowed ? "match your filters" : "across Nigeria"}
            </p>
            {/*
              Says why the order is what it is, and only when it really is.
              `intentApplied` is false whenever the reorder was a no-op, so this
              line can never claim a personalisation that did not happen, and
              the kinds it names are the ones actually on the page. Nothing was
              removed, so it says "first" rather than "only".
            */}
            {intentApplied && intentKinds.length > 0 && (
              <p
                data-testid="intent-note"
                data-intent={intentKinds.join(",")}
                className="nf-body-sm mt-inline-tight text-[var(--nf-content-muted)]"
              >
                {sentenceCase(intentKinds.map((kind) => KIND_NOUN[kind].many).join(", "))}{" "}
                first, because that is what you said you came for. Search or
                filter and this stops.
              </p>
            )}
          </div>

          {/*
            Sort and view, together, beside the count they act on.

            Sort was a rail of four chips in the sticky bar, permanently taking
            a row of a phone screen to answer a question most people never ask.
            Here it sits next to the number it reorders, which is the only place
            it means anything, and it stays links rather than a control so an
            ordering is still shareable and still survives a back button.

            The active option is the one shown; the rest are one tap away and
            marked with aria-current so a screen reader is told which ordering
            it is reading.
          */}
          {/*
            `min-w-0` and NOT `shrink-0`, and the difference is a phone screen.

            `shrink-0` told this row to keep its natural width, which is the four
            sort chips laid end to end at about 667px. On a 390px phone that is
            not a rail that scrolls, it is a page that is 667px wide: the whole
            document gained a horizontal scrollbar and every screen edge went
            ragged. `nf-scroll-x` on the nav below is what makes the chips
            reachable, and it can only do that if this parent is allowed to be
            narrower than its contents, which is exactly what `min-w-0` permits.
          */}
          {/*
            The view toggle sits with the count. The sort rail does NOT.

            They were siblings in one flex row, and on a 390px phone that put
            four scrolling sort chips and a two-segment toggle in the same
            track: the rail's overflow was clipped exactly where the toggle
            began, so "Top rated" appeared cut in half BEHIND the List control.
            It read as two controls overlapping, which is the specific kind of
            broken the owner has been pointing at.

            They are different things and they now sit on different lines. The
            toggle is a two-state choice that always fits, so it stays beside
            the count. Sort is a rail that has to be allowed to run the full
            width of the screen, so it gets the row below and nothing to
            collide with.
          */}
          <ViewToggle query={query} />
        </div>

        <nav aria-label="Sort results" className="nf-scroll-x mt-row -mx-gutter px-gutter">
          <ul className="flex items-center gap-inline-tight">
            {SORTS.map((srt) => {
              const active = query.sort === srt.key;
              return (
                <li key={srt.key}>
                  <Link
                    href={toSearchHref({ ...query, sort: srt.key })}
                    prefetch
                    aria-current={active ? "true" : undefined}
                    className={`nf-chip whitespace-nowrap ${active ? "nf-chip--active" : ""}`}
                  >
                    {srt.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Everything narrowing the results, each one removable in one tap. */}
        <ActiveFilters query={query} locale={locale} />
      </Reveal>

      {/* -------------------------------------------------------- map view */}
      {query.view === "map" && (
        <Reveal className="mt-heading" delay={60}>
          {/*
            Skip to the map itself.

            The filter rail, the sort control and the active-filter chips all
            sit above it, so reaching the map with a keyboard means tabbing
            through every one of them on every visit. The same argument as the
            skip-to-content link in the root layout, applied to the one region
            on this page that a person came here to use. Hidden until focused,
            using the platform's own skip-link treatment.
          */}
          <a href="#map-view" className="nf-skip-link">
            Skip to the map
          </a>
          <div className="nf-card relative overflow-hidden p-0">
            <RealMap
              active={query.q?.trim()}
              pins={Object.entries(CITY_COORDS).flatMap(([city, at]) => {
                const floor = cityFloor.get(city);
                if (!floor) return [];
                return [
                  {
                    city,
                    ...at,
                    count: floor.count,
                    price: formatMoney(floor.minMinor, locale, floor.currency),
                  },
                ];
              })}
            />
          </div>
        </Reveal>
      )}

      {/* ------------------------------------------------------ results grid */}
      {query.view === "list" && (
        <Reveal className="mt-heading" delay={60}>
          {listings.length === 0 ? (
            /*
             * Three different nothings, and telling them apart is the whole
             * job of this block.
             *
             * A filter that matched nothing is the reader's own doing and one
             * tap undoes it. A search term that matched nothing is nearly the
             * same. But a catalogue with nothing in it at all is not a search
             * problem, and answering it with "try a different search" sends
             * somebody to type the same query again and get the same page. It
             * also used to point at the home screen, which is fed by the same
             * empty catalogue, so the one offered way out led straight back
             * here.
             *
             * `pool` is this text with no structured bounds and no category, so
             * an empty pool and no query means the shelves themselves are bare.
             * That happens before supply arrives, and the honest answer is to
             * say so and offer the thing that would change it.
             *
             * IT IS THE PLATFORM EMPTY STATE NOW, AND A CONTAINER LEAVES THE
             * SCREEN. It was an `nf-card` padded to 10 wrapping an 80px object
             * - a bordered, blurred, shadowed box drawn around a message whose
             * entire job is to report an absence. `EmptyState` is the one shape
             * every other screen in the product already uses for this, at 112px
             * and with the copy a tier larger, and it draws nothing at all.
             *
             * TWO BUTTONS BECAME ONE AND A QUIET LINK. On the bare-catalogue
             * branch this offered "List your place" and "How RentMe works" as
             * two filled peers, which is two primary actions on a screen whose
             * whole state is that it has nothing to show. Listing a place is
             * the one that changes anything; the explanation is a text link
             * beside it, which is what `secondary` is for.
             */
            <EmptyState
              icon="search-home"
              title={narrowed || query.q ? "No places matched" : "Nothing on the shelves yet"}
              body={
                narrowed
                  ? "Your filters are narrower than the catalogue right now. Widen them and the results come straight back."
                  : query.q
                    ? "Nothing here matches those words yet. Try a place name, or a state."
                    : "Agents are still listing. When a place goes live it appears here the same minute, and there is nothing to wait for on your side."
              }
              action={
                narrowed ? (
                  <ButtonLink
                    href={toSearchHref(clearedFilters(query))}
                    prefetch
                    data-testid="empty-clear"
                    variant="primary"
                  >
                    Clear filters
                  </ButtonLink>
                ) : query.q ? (
                  <ButtonLink
                    href="/search"
                    prefetch
                    data-testid="empty-clear-search"
                    variant="primary"
                  >
                    Clear this search
                  </ButtonLink>
                ) : (
                  /* A real next action, not a lap of the same empty shelves:
                     the person reading this may be the one with a place to let.
                     Straight into the switch-profile sheet, on the Seller
                     explanation. There is no "Become an agent" page left to
                     send anybody to: listing is a PROFILE you switch into, and
                     the sheet both explains it and starts the setup. */
                  <ButtonLink
                    href="/profile?switch=owner"
                    variant="primary"
                    data-testid="empty-list-place"
                  >
                    List your place
                  </ButtonLink>
                )
              }
              secondary={
                narrowed && poolInKind.length > 0 ? (
                  <span className="nf-body-sm text-[var(--nf-content-muted)]">
                    {formatNumber(poolInKind.length, locale)}{" "}
                    {poolInKind.length === 1 ? noun.one : noun.many} waiting without them
                  </span>
                ) : !narrowed && !query.q ? (
                  <Link href="/docs" className="nf-link-quiet nf-body text-[var(--nf-content-link)]">
                    How RentMe works
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <ul
              key={toSearchHref(query)}
              data-testid="results-grid"
              /*
                TWO ACROSS ON A PHONE, and it was one.
                A single column of full-width cards shows ONE property per
                screen on a 390px device, so browsing sixty four of them is
                sixty four scrolls. Two across shows four in the same space and
                is what every property app on this market does, because the
                decision a person is making here is a COMPARISON and you cannot
                compare things you can only see one at a time.
                The card was written to survive it: the photo is a ratio, the
                price never wraps, and the facts row is already a wrapping list.
              */
              className="grid grid-cols-2 gap-md sm:gap-lg lg:grid-cols-4"
            >
              {listings.map((l, i) => (
                <li key={l.id}>
                  {/* `intent` is both the current answer and the permission to
                      change it. Undefined for a signed-out visitor, so the card
                      carries no control rather than one that can only fail. */}
                  <ListingCard
                    listing={l}
                    locale={locale}
                    t={t}
                    index={i}
                    intent={tuning.signedIn ? tuning.interests : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      )}

      {/* --------------------------------------------------------- load more */}
      {query.view === "list" && listings.length > 0 && (
        <Reveal className="mt-block text-center" delay={90}>
          {/*
           * A disabled button is not an explanation.
           *
           * The comment here used to say the control "is disabled and says why
           * instead of pretending more exists". It did not say why. It was a
           * greyed-out "Load more" with nothing next to it, which reads as
           * broken rather than as finished, and it is the last thing on the
           * page so it is what somebody is left looking at.
           *
           * It never showed at all while the shelves were empty, because this
           * whole block needs `listings.length > 0`. That is exactly why it
           * has to be right now: the moment a partner key lands and results
           * appear, this is the first new thing anybody sees, and a dead
           * button under a first page of hotels reads as the page having
           * failed halfway.
           *
           * So when there is no cursor behind it, there is no button. A
           * sentence says the shelf is fully shown, which is true and is the
           * end of a list rather than a control that refuses.
           */}
          {repo.isSeed ? (
            <p className="nf-body-sm text-[var(--nf-content-muted)]">
              That is everything matching this search.
            </p>
          ) : (
            <Button variant="secondary">Load more</Button>
          )}
        </Reveal>
      )}
    </>
  );
}
