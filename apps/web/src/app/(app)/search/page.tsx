import type { Metadata } from "next";
import { readListingFactsFor } from "@/lib/landlord/queries";
import { collapseByProperty, ownerConfirmedLine, requestNow, sinkNotReconfirmed } from "@/lib/landlord/facts";
import { LandlordCardLine } from "@/components/app/listing/LandlordCardLine";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatMoney, formatNumber, getDictionary, type Locale } from "@vallo/i18n";
import { RealMap } from "@/components/app/search/RealMap";
import { ShelfBar } from "@/components/app/search/ShelfBar";
import { ShelfCount } from "@/components/app/search/ShelfCount";
import {
  clearedShelf,
  parseShelfQuery,
  applyWords,
  wordsHref,
  SAID_PARAM,
  staySideHref,
  shelfActiveCount,
  shelfFilter,
  shelfPoolFilter,
  toShelfHref,
  type ShelfQuery,
} from "@/components/app/search/shelf-query";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { factsOf } from "@/lib/listings/filter";
import {
  hasOwnRequest,
  intentKindsPresent,
  orderByStatedIntent,
} from "@/lib/listings/intent";
import { readIntentTuning } from "@/lib/interests/queries";
import { getSavedListings } from "@/lib/saved/queries";
import { canonicalSearch } from "@/lib/saved/searches";
import { findSavedSearch } from "@/lib/saved/searches-queries";
import { SaveSearchControl } from "@/components/app/saved-searches/SaveSearchControl";
import { KIND_NOUN, type SortKey } from "@/lib/listings/search-params";
import { rankRecommended } from "@/lib/listings/ranking";
import { feeSortKey } from "@/lib/listings/fee-share";
import { readListingReference } from "@/lib/listings/reference";
import { readRecordCode } from "@/lib/trust/record";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { ListingCard } from "@/components/app/ListingCard";
import { BackButton } from "@/components/site/BackButton";
import { Reveal } from "@/components/site/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/app/Screen";
import { LastVisitProvider } from "@/components/app/search/LastVisit";
import { RecordViews } from "@/components/app/search/RecordViews";
import { ReadAs } from "@/components/app/search/ReadAs";
import { parseWords } from "@/lib/listings/query-parse";
import { looksCheckable } from "@/lib/doors/agent-check";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: false },
};

/**
 * Discovery results, to 3EB3E2A9.
 *
 * Everything visible here is real behaviour, and all of it lives in the
 * address bar (`lib/listings/search-params.ts` is the contract, plus the
 * market the shelf adds in `shelf-query.ts`): free text, category, market,
 * sort, view, budget, bedrooms, bathrooms, party size, amenities, instant
 * book, verified only, light and water. A filtered hunt is therefore a link,
 * the back button walks it backwards, and a reload lands on the same results.
 */

function sentenceCase(value: string): string {
  return value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);
}

function byVerification(a: Listing, b: Listing): number {
  return Number(b.verified) - Number(a.verified);
}

/**
 * The honest move-in figure for ordering, or null when there is none.
 *
 * A listing whose lister declared no total and no part has not said it is
 * cheap, it has said nothing, so it can never be given a number here. The
 * caller sorts those to the end rather than to the front, which is the same
 * ruling `nullsFirst: false` makes in the SQL.
 */
function moveInFigure(listing: Listing): number | null {
  const stated = listing.moveInCostMinor;
  if (stated !== undefined && stated !== null && stated > 0) return stated;
  const parts = [
    listing.priceMinor,
    listing.cautionDepositMinor,
    listing.serviceChargeMinor,
    listing.agencyFeeMinor,
    listing.legalFeeMinor,
    listing.agreementFeeMinor,
  ].filter((part): part is number => part !== undefined && part !== null);
  if (parts.length === 0) return null;
  const sum = parts.reduce((total, part) => total + part, 0);
  return sum > 0 ? sum : null;
}

function sortListings(listings: Listing[], sort: SortKey): Listing[] {
  const out = [...listings];
  switch (sort) {
    /* V-22. Newest first by the date the listing went live; a row with no
       date sorts last, because an unknown age is not a young one. */
    case "newest":
      out.sort((a, b) => {
        const left = a.publishedAt ? Date.parse(a.publishedAt) : Number.NEGATIVE_INFINITY;
        const right = b.publishedAt ? Date.parse(b.publishedAt) : Number.NEGATIVE_INFINITY;
        if (left === right) return byVerification(a, b);
        return right > left ? 1 : -1;
      });
      break;
    /*
     * THE NUMBER A NIGERIAN TENANT ACTUALLY SHOPS ON.
     *
     * The repository has already ordered the read on
     * `listings_move_in_cost_idx`, so the cheapest rows are the ones that got
     * under the row ceiling; this pass is the authority over whatever came
     * back, the same division of labour the budget predicate and
     * `matchesFilter` already have. A listing with no declared cost sorts
     * LAST: it is unstated, not free.
     */
    case "move-in-asc":
      out.sort((a, b) => {
        const left = moveInFigure(a);
        const right = moveInFigure(b);
        if (left === null && right === null) return byVerification(a, b);
        if (left === null) return 1;
        if (right === null) return -1;
        return left - right || byVerification(a, b);
      });
      break;
    /* V-12: the fees paid to the agent, as one share of a year's rent.
       A listing that stated no fee is unstated, not cheap: it sorts last. */
    case "fees-asc":
      out.sort((a, b) => {
        const left = feeSortKey(a);
        const right = feeSortKey(b);
        if (left === null && right === null) return byVerification(a, b);
        if (left === null) return 1;
        if (right === null) return -1;
        return left - right || byVerification(a, b);
      });
      break;
    case "price-asc":
      out.sort((a, b) => a.priceMinor - b.priceMinor || byVerification(a, b));
      break;
    case "price-desc":
      out.sort((a, b) => b.priceMinor - a.priceMinor || byVerification(a, b));
      break;
    default:
      /* V-06: Recommended is the published formula in `ranking.ts` (real
         before example, then points for facts about the listing, then
         newest), the same constants /standards prints in words. It still
         lifts a checked lister, as one point among four, never above
         everything. Nobody can pay to be higher. */
      return rankRecommended(out);
  }
  return out;
}

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
  const query: ShelfQuery = parseShelfQuery(raw);
  /* A stay typed on the Property side is sent to the Stays side, words kept (V-67). */
  const staySide = staySideHref(query.kind, raw);
  if (staySide) redirect(staySide);
  /* V-66: WhatsApp shorthand becomes filters, once. What is left over reads
     nothing, so this never redirects twice. */
  if (query.q) {
    const words = parseWords(query.q);
    if (words.recognised) redirect(wordsHref(applyWords(query, words), query.q));
  }
  const saidRaw = raw[SAID_PARAM];
  const said = typeof saidRaw === "string" && saidRaw.trim() ? saidRaw.trim().slice(0, 120) : null;

  const repo = getListingRepository();
  /* Three reads: the results, the pool the sheet counts against (the whole
     catalogue for the current text), and the whole catalogue for the map. */
  const [rawResults, pool, whole] = await Promise.all([
    /* The move-in ordering is pushed into the read, because the read has a row
       ceiling: sorting afterwards alone would order the newest rows rather
       than the cheapest ones to move into. See `ListingSearchOptions.order`. */
    repo.search(
      shelfFilter(query),
      query.sort === "move-in-asc" ? { order: "move-in" } : query.sort === "newest" ? { order: "newest" } : {},
    ),
    repo.search(shelfPoolFilter(query)),
    /* The Property side's catalogue, never its stays: a nightly rate must
       not become a city's "from" price on this map (V-67 review). */
    repo.search({ propertySide: true }),
  ]);
  const sorted = sortListings(rawResults, query.sort);

  /*
   * WHICH OF THESE ARE ALREADY ON THE SHORTLIST.
   *
   * The card used to draw its heart from the device store alone, so a
   * signed-in reader whose save went to `saved_items` came back to an empty
   * heart on every result. The stored ids are read here, once, and handed to
   * each card; the device half is still resolved inside the control, so a
   * guest is unaffected. (R2 finding 4.)
   *
   * `getSavedListings` with no argument returns the account's rows only and
   * resolves them to listings, which is more work than an id set needs. It is
   * what the three detail pages already call for exactly this answer, so this
   * uses the same door rather than adding a second one; a cheap
   * `getSavedListingIds` in `lib/saved/queries.ts` would be the better read
   * and belongs to whoever owns that module.
   */
  const savedIds = new Set((await getSavedListings()).map((entry) => entry.listing.id));

  /*
   * WHETHER THIS EXACT SEARCH IS ALREADY KEPT.
   *
   * `canonicalSearch` is the same address the control would write, built from
   * the same parsed query these results were fetched with, so the control
   * cannot save one thing and the page show another. The read is the account's
   * own rows under its own policy in this request, which is what makes the
   * control honest after a reload rather than only after a tap.
   */
  const canonical = canonicalSearch(raw);
  const savedSearch = canonical.key.length > 0 ? await findSavedSearch(canonical.key) : null;

  /*
   * SEARCH BY LISTING CODE.
   *
   * A person reads a code down the phone, "Vee El, seven kay four em queue
   * pee", and the listener types it into the box they already have. There is
   * no second screen and no "enter a code here" field nobody would find.
   *
   * `readListingReference` guesses NOTHING, because guessing a code is how
   * somebody lands on the wrong house. It returns one of three answers: this
   * is a code, this is the shape of a code but carries a character we never
   * mint, or this is ordinary text.
   *
   * AND IT ONLY EXPLAINS ITSELF WHEN THEY TYPED THE `VL`. Six letters is a
   * common length for a Nigerian place name and several of the commonest
   * carry a character we never mint, so a search for Ibadan would otherwise
   * be answered with "that code has a character we do not use". A bare six
   * characters is still looked up, because a hit is unambiguous; a miss falls
   * through to ordinary results in silence.
   *
   * A code that matches replaces the results rather than redirecting, because
   * GOVERNING-12 screen four draws the found listing under a line saying how
   * it was found, and a redirect has nowhere to put that line.
   */
  /* V-34: a Record code (`VR-`) is a person, not a listing, and has its own
     page. Only with the prefix, so a six-letter place name is never taken
     for one. */
  const recordCode = readRecordCode(query.q ?? "");
  if (recordCode) redirect(`/record/${recordCode}`);

  const codeRead = readListingReference(query.q ?? "");
  const codeHit = codeRead.state === "code" ? await repo.byReference(codeRead.value) : null;

  /* A stated interest reorders an unfiltered shelf and nothing else. */
  const tuning = await readIntentTuning();
  const statedIntent = hasOwnRequest(query) ? [] : tuning.interests;
  const ordered = orderByStatedIntent(sorted, statedIntent);
  /*
   * V-31: WHAT THE OWNER SAID, beside each card, and "Not reconfirmed" sorted
   * last. Read in one call beside the catalogue rather than inside it, so a
   * failed read changes nothing: no line on any card and the order untouched.
   * Only a listing whose owner let a question go 21 days unanswered moves,
   * and it moves to the end of whatever order the page chose, not out of it.
   */
  const shelf = codeHit ? [codeHit] : ordered;
  const landlordFacts = await readListingFactsFor(shelf.map((l) => l.id));
  const notReconfirmed = new Set(
    [...landlordFacts].filter(([, facts]) => facts.notReconfirmed).map(([id]) => id),
  );
  /* V-37: the copies of one property become one card that says how many
     offers it carries. A code hit is the one listing the person asked for and
     is never collapsed. */
  const collapsed = codeHit ? { listings: shelf, offerCounts: new Map<string, number>() } : collapseByProperty(shelf, landlordFacts);
  /* The one listing the code named, or the ordinary shelf. */
  const listings = sinkNotReconfirmed(collapsed.listings, notReconfirmed);
  const landlordNow = requestNow();
  const intentApplied = !codeHit && ordered !== sorted;
  const intentKinds: ListingKind[] = intentApplied
    ? intentKindsPresent(ordered, statedIntent)
    : [];

  // The map reads the whole catalogue: every covered city keeps its pin and
  // lowest price regardless of the current text filter.
  const cityFloor = new Map<string, { count: number; minMinor: number; currency: string }>();
  for (const l of whole) {
    if (l.priceMinor <= 0) continue;
    const entry = cityFloor.get(l.city);
    if (!entry) {
      cityFloor.set(l.city, { count: 1, minMinor: l.priceMinor, currency: l.currency });
    } else {
      entry.count += 1;
      entry.minMinor = Math.min(entry.minMinor, l.priceMinor);
    }
  }

  const noun = query.kind ? KIND_NOUN[query.kind] : { one: "place", many: "places" };
  const narrowed = shelfActiveCount(query) > 0 || Boolean(query.kind);
  const poolInKind = query.kind ? pool.filter((l) => l.kind === query.kind) : pool;

  return (
    <>
      {/*
        THE WAY BACK, ON THE BAR'S OWN ROW.

        `/search` declares `/home` above it in `lib/nav/route-parents.ts` and
        drew no back control at all, which is the whole defect in miniature: the
        hierarchy said where the screen sits and the screen said nothing. It
        goes here rather than above the bar because `nf-shelf-bar` is sticky at
        `top: 0` and pulls itself up over the shell's padding, so a control
        placed before it would scroll away under the header on the first flick.

        `BackButton` and not `PageHeader`: this screen's title is a `sr-only`
        h1 and its visible head is the search field, so a second drawn title
        would be a duplicate of the field's own job.
      */}
      <ShelfBar
        query={query}
        facts={pool.map(factsOf)}
        locale={locale}
        t={t}
        openFilters={raw.filters === "open"}
        leading={<BackButton fallback="/" />}
      />
      <ReadAs query={query} said={said} locale={locale} copy={t.shape.unit} />

      <h1 className="sr-only">
        {query.q ? `Results for ${query.q}` : query.kind ? `Explore ${noun.many}` : "Explore properties"}
      </h1>

      <ShelfCount query={query} count={listings.length} narrowed={narrowed || Boolean(query.q)} locale={locale} t={t} />

      {/* HOW A CODE ANSWERED. A hit always says so, because a single result
          under no explanation looks like a strangely lucky search. A miss and
          a malformed code say so only when the person typed the VL and
          therefore plainly meant a code: somebody holding a piece of paper is
          owed the sentence, and somebody searching for a city is not. */}
      {codeHit && (
        <p data-testid="found-by-reference" className="nf-caption mt-inline text-[var(--nf-content-muted)]">
          {t.listingReference.foundById}
        </p>
      )}
      {/* A MISS IS ONLY WORTH A SENTENCE WHEN THEY TYPED THE VL. A bare six
          characters could be a place name, and answering a search for a
          place with "no listing carries that code" is worse than saying
          nothing. `explicit` is the field that knows the difference. */}
      {codeRead.state === "code" && codeRead.explicit && !codeHit && (
        <p data-testid="reference-miss" className="nf-caption mt-inline text-[var(--nf-content-muted)]">
          {t.listingReference.noneCarry}
        </p>
      )}
      {/* V-61: A NUMBER OR A VALLO AGENT CODE IN THE SEARCH BOX is somebody
          holding an advert. One line sends them to the check, carrying what
          they typed; the results underneath are untouched. */}
      {looksCheckable(query.q) && (
        <p data-testid="search-check-agent" className="nf-caption mt-inline">
          <Link
            href={`/check?q=${encodeURIComponent((query.q ?? "").slice(0, 40))}`}
            className="inline-flex min-h-11 items-center text-[var(--nf-content-secondary)] underline underline-offset-2"
          >
            {t.trustDoors.check.inSearch.replace("{query}", (query.q ?? "").trim().slice(0, 40))}
          </Link>
        </p>
      )}
      {codeRead.state === "impossible" && (
        <p data-testid="reference-impossible" className="nf-caption mt-inline text-[var(--nf-content-muted)]">
          {t.listingReference.impossible}
        </p>
      )}

      {/* Keeping the hunt, beside the count of what it found. It is drawn only
          when there is something to keep: an unfiltered /search is every place
          on the platform and saving that is a subscription to the catalogue
          rather than to a search. */}
      {savedSearch && savedSearch.state !== "unconfigured" && (
        <SaveSearchControl
          params={canonical.params}
          saved={savedSearch.state === "signed-in" ? savedSearch.saved : null}
          signedIn={savedSearch.state === "signed-in" || savedSearch.state === "unavailable"}
          signInHref={`/sign-in?next=${encodeURIComponent(canonical.href)}`}
        />
      )}

      {/* Says why the order is what it is, and only when it really is. */}
      {intentApplied && intentKinds.length > 0 && (
        <p
          data-testid="intent-note"
          data-intent={intentKinds.join(",")}
          className="nf-caption mt-inline text-[var(--nf-content-muted)]"
        >
          {sentenceCase(intentKinds.map((kind) => KIND_NOUN[kind].many).join(", "))} first,
          because that is what you said you came for. Search or filter and this stops.
        </p>
      )}

      {/* -------------------------------------------------------- map view */}
      {query.view === "map" && (
        <Reveal className="mt-md" delay={60}>
          <a href="#map-view" className="nf-skip-link">
            Skip to the map
          </a>
          <div className="nf-panel nf-panel--card relative overflow-hidden p-0">
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
        <div className="mt-md">
          {listings.length === 0 ? (
            <EmptyState
              className="pb-4xl"
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
                    href={toShelfHref(clearedShelf(query))}
                    prefetch
                    data-testid="empty-clear"
                    variant="primary"
                  >
                    Clear filters
                  </ButtonLink>
                ) : query.q ? (
                  <ButtonLink href="/search" prefetch data-testid="empty-clear-search" variant="primary">
                    Clear this search
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/profile?switch=owner" variant="primary" data-testid="empty-list-place">
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
                    How Vallo works
                  </Link>
                ) : undefined
              }
            />
          ) : (
            /* Two across on a phone, four from `lg`: the decision a person is
               making here is a comparison, and you cannot compare things you
               can only see one at a time. */
            /* The New mark reads the reader's previous visit on this device
               (V-22); the provider records this one. */
            <LastVisitProvider>
            {/* V-73: the first twenty cards drawn were seen. */}
            <RecordViews seen={listings.slice(0, 20).map((l) => l.id)} />
            <ul
              key={toShelfHref(query)}
              data-testid="results-grid"
              className="grid grid-cols-2 gap-sm sm:gap-md lg:grid-cols-4"
            >
              {listings.map((l, i) => (
                <li key={l.id}>
                  <ListingCard
                    listing={l}
                    locale={locale}
                    t={t}
                    index={i}
                    dense
                    saved={savedIds.has(l.id)}
                    intent={tuning.signedIn ? tuning.interests : undefined}
                    messageAgent
                  />
                  <LandlordCardLine
                    notReconfirmed={notReconfirmed.has(l.id)}
                    confirmed={ownerConfirmedLine(t.landlord.listing, landlordFacts.get(l.id)?.ownerConfirmedAt, landlordNow)}
                    copy={t.landlord.listing}
                    offerCount={collapsed.offerCounts.get(l.id) ?? 1}
                    offersCopy={t.landlord.offers.card}
                  />
                </li>
              ))}
            </ul>
            </LastVisitProvider>
          )}
        </div>
      )}

      {query.view === "list" && listings.length > 0 && repo.isSeed && (
        <p className="nf-caption mt-block text-center text-[var(--nf-content-muted)]">
          That is everything matching this search.
        </p>
      )}
    </>
  );
}
