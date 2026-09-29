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
import { NigeriaMap } from "./NigeriaMap";
import { PlacesBand } from "@/components/cinema/LandingCinema";

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
 * supplies. `app/page.tsx` passes the live read; `app/(dev)/preview/f2`
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
  const first = data.cards[0] ?? null;
  return (
    <main id="main">
      {/*
        HOW THE PAGE GOT HERE, oldest first. The founder's render of 19
        September set the first order (hero, feature band, community, how it
        works, category, stays, app). Track M (25 September) added rooms on
        "make the landing page expand": protection, the AI showcase, the
        FAQ, the closing call, then the journey, the bento, the two worlds,
        the map and a cinema kit. The launch pass (29 September) cut the
        cinema kit's Truchet band, cities marquee, kinetic words, sideways
        day and film HUD, each of which repeated a neighbour, and removed the
        phone mockups. The clean pass below is the current order.
      */}
      {/* THE CLEAN PASS (29 September, the founder: "so clean"). Every room
          left has one job and says it once:

            - the six-chip feature band listed the same six things the bento
              lists as doors, one screen apart, so the bento keeps them;
            - "how Vallo protects you" printed the agreement gate and the
              inspection fee, which the journey prints as steps two and
              three; the Guarantee keeps its bento card and its FAQ answer;
            - the Stays band retold the category grid's stay kinds and the
              two worlds band's Stays side, so both of those keep them;
            - the page-wide pointer effects (magnetic buttons, the hero
              card's tilt, the bento's spotlight and tilt) and the light
              sweep across buttons are gone with LandingFx and BentoFx.

          The hero now carries the headline, one line, one action and the
          search (Hero.tsx says where the rest went). */}
      <Hero t={t} />
      <Journey t={t} />
      <Bento t={t} />
      <PlacesBand t={t} />
      <AiBand t={t} locale={locale} cards={data.showcase ?? data.cards} />
      <WorldsBand t={t} locale={locale} cards={data.showcase ?? data.cards} />
      <CategoryGrid t={t} counts={data.counts} />
      <NigeriaMap t={t} />
      <CommunityBand t={t} locale={locale} listing={first} stats={data.stats} />
      {native ? null : <AppBand t={t} native={native} />}
      <LandingFaq t={t} nonce={nonce} />
      <FinalCta t={t} />
    </main>
  );
}
