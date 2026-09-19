import type { Dictionary, Locale } from "@vallo/i18n";
import { getListingRepository } from "@/lib/listings/repository";
import type { ListingKind } from "@/lib/listings/types";
import { getPlatformStats, type PlatformStats } from "@/lib/platform-stats";
import { toMiniListing, type MiniListing } from "@/lib/site/listing-card";
import { Hero } from "./Hero";
import { FeatureChips } from "./FeatureChips";
import { CommunityBand } from "./CommunityBand";
import { HowVallo } from "./HowVallo";
import { CategoryGrid } from "./CategoryGrid";
import { StaysBand } from "./StaysBand";
import { AppBand } from "./AppBand";

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
};

export async function landingData(t: Dictionary): Promise<LandingData> {
  const repo = getListingRepository();
  const [featured, catalogue, stats] = await Promise.all([
    repo.recommended(5),
    repo.search(),
    getPlatformStats(),
  ]);
  const tally = new Map<ListingKind, number>();
  for (const l of catalogue) tally.set(l.kind, (tally.get(l.kind) ?? 0) + 1);
  const complete = stats !== null && catalogue.length > 0 && catalogue.length === stats.listings;
  return {
    cards: featured.map((l) => toMiniListing(l, t)),
    stats,
    counts: complete ? tally : null,
  };
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
}: {
  t: Dictionary;
  locale: Locale;
  data: LandingData;
}) {
  const first = data.cards[0] ?? null;
  return (
    <main id="main">
      {/*
        THE RENDER'S ORDER, on the founder's ruling of 19 September: hero,
        feature band, community, how it works, category, stays, app.

        Two sections stood between the hero and the feature band and neither
        is in his render. The stats band printed the three platform figures
        that the community band prints again two screens later, so a reader
        met the same three numbers twice; the community band is where the
        render puts them and it already takes `stats`. The ten-tile
        "Everything you need in one platform" grid was navigation the render
        does not carry, and every destination in it is reachable from the
        category grid below or the footer's Product column, so removing it
        costs the reader no door.
      */}
      <Hero t={t} locale={locale} cards={data.cards} />
      <FeatureChips t={t} />
      <CommunityBand t={t} locale={locale} listing={first} stats={data.stats} />
      <HowVallo t={t} />
      <CategoryGrid t={t} counts={data.counts} />
      <StaysBand t={t} />
      <AppBand t={t} locale={locale} listing={first} />
    </main>
  );
}
