import type { Dictionary, Locale } from "@vallo/i18n/core";
import { getListingRepository } from "@/lib/listings/repository";
import { landingCatalogue } from "@/lib/listings/landing-catalogue";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { getPlatformStats, type PlatformStats } from "@/lib/platform-stats";
import { toMiniListing, type MiniListing } from "@/lib/site/listing-card";
import { Hero } from "./Hero";
import { CommunityBand } from "./CommunityBand";
import { CategoryGrid } from "./CategoryGrid";
import { AppBand } from "./AppBand";
import { AiBand } from "./AiBand";
import { LandingFaq } from "./LandingFaq";
import { FinalCta } from "./FinalCta";
import { Journey } from "./Journey";
import { Bento } from "./Bento";
import { WorldsBand } from "./WorldsBand";
import { StackRoom } from "./StackRoom";
import { landingDoor } from "./doors";

/**
 * Everything the landing prints that comes from the platform, read once.
 *
 * `cards` is the same `recommended` read the old featured rail made, five
 * listings; `stats` is `platform_stats()`; `counts` is the per-kind tally
 * off one catalogue page, kept ONLY when that page provably held the whole
 * catalogue. The read is capped, so the check is the platform's own total:
 * when the tally adds up to `stats.listings` the page was complete and the
 * category tiles may print numbers; otherwise they print none.
 */
export type LandingData = {
  cards: MiniListing[];
  stats: PlatformStats | null;
  counts: ReadonlyMap<ListingKind, number> | null;
  /** Real listings the AI showcase may put under its example replies: a few
      of each kind from the same catalogue page. Optional, so a fixture that
      leaves it out simply plays the script that needs no cards. */
  showcase?: MiniListing[];
  /** Whether a stranger may open the catalogue (`VALLO_PUBLIC_CATALOGUE`).
      Left out, it is read from the environment; the preview harness may
      pass either answer to prove both sets of doors. */
  open?: boolean;
};

export async function landingData(t: Dictionary): Promise<LandingData> {
  /* OPS-11: the shared five-minute read when there is a database; the
     repository (empty or API-backed) otherwise. */
  const [shared, stats] = await Promise.all([landingCatalogue(), getPlatformStats()]);
  let featured: Listing[];
  let catalogue: Listing[];
  if (shared) {
    ({ featured, catalogue } = shared);
  } else {
    const repo = getListingRepository();
    [featured, catalogue] = await Promise.all([repo.recommended(5), repo.search()]);
  }
  const tally = new Map<ListingKind, number>();
  for (const l of catalogue) tally.set(l.kind, (tally.get(l.kind) ?? 0) + 1);
  const complete = stats !== null && catalogue.length > 0 && catalogue.length === stats.listings;
  return {
    cards: featured.map((l) => toMiniListing(l, t)),
    stats,
    counts: complete ? tally : null,
    showcase: showcaseCandidates(catalogue).map((l) => toMiniListing(l, t)),
  };
}

/** Up to three listings of each kind, photographed first, for the AI room. */
function showcaseCandidates(catalogue: Listing[]): Listing[] {
  const byKind = new Map<ListingKind, Listing[]>();
  const ordered = [...catalogue].sort((a, b) => Number(b.photos.length > 0) - Number(a.photos.length > 0));
  for (const l of ordered) {
    const list = byKind.get(l.kind) ?? [];
    if (list.length < 3) list.push(l);
    byKind.set(l.kind, list);
  }
  return [...byKind.values()].flat();
}

/**
 * The landing's sections in the fullpage render's order, on data the caller
 * supplies. `app/(landing)/page.tsx` passes the live read; `app/(dev)/preview/f2`
 * passes fixtures so the look can be proven in a sandbox that cannot reach
 * the catalogue. Both render this same tree.
 */
export function LandingBody({
  t,
  locale,
  data,
  native = false,
  nonce,
}: {
  t: Dictionary;
  locale: Locale;
  data: LandingData;
  /** The CSP nonce, for the FAQ's structured data block. */
  nonce?: string;
  /** Rendering for a native shell: the "take Vallo with you" band, with its
      store badges and its "installs from your browser" line, is left out
      (STORE-06, App Store 2.3.10). */
  native?: boolean;
}) {
  const door = landingDoor(data.open);
  return (
    <main id="main">
      {/*
        HOW THE PAGE GOT HERE, oldest first. The founder's render of 19
        September set the first order; Track M (25 September) added rooms;
        the launch pass and the clean pass (29 September) cut the repeats.
        THE UNIFIED PASS (29 September, evening; UIUX items 6 to 12 and the
        founder's references 39 to 41) is the current order, ten rooms, each
        with one job:

          Hero        the grid stage, the eyebrow capsule, the headline, the
                      one honest action, the search, three facts
          Hands on    four product moments in a deck you move by hand
          Journey     find, inspect, agree, move in
          Bento       the doors into the product, flat plates
          Worlds      Property and Stays, with Example-tagged listings
          AI          the assistant's rules beside an example conversation
          Categories  eight kinds of place, then the cities
          Community   who it is for, real figures only, the Third party label
          App, FAQ    on your phone; the short answers in one grouped card
          Close       the final card: sign up, or sign in

        Gone from this pass: the wall of photographs (PlacesBand, which
        repeated the category tiles' photographs; the component stays for
        any other caller), the map as a room of its own (its cities are the
        category room's chips now, and the drawing shows beside them from
        64rem only), and the listing card over the community photograph.
      */}
      <Hero t={t} door={door} />
      <StackRoom t={t} locale={locale} />
      <Journey t={t} />
      <Bento t={t} door={door} />
      <WorldsBand t={t} locale={locale} cards={data.showcase ?? data.cards} door={door} />
      <AiBand t={t} locale={locale} cards={data.showcase ?? data.cards} door={door} />
      <CategoryGrid t={t} counts={data.counts} door={door} />
      <CommunityBand t={t} locale={locale} stats={data.stats} />
      {native ? null : <AppBand t={t} native={native} />}
      <LandingFaq t={t} nonce={nonce} />
      <FinalCta t={t} />
    </main>
  );
}
