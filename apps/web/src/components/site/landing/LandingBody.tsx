import type { Dictionary, Locale } from "@vallo/i18n/core";
import { getListingRepository } from "@/lib/listings/repository";
import { landingCatalogue } from "@/lib/listings/landing-catalogue";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { getPlatformStats, type PlatformStats } from "@/lib/platform-stats";
import { toMiniListing, type MiniListing } from "@/lib/site/listing-card";
import { Hero } from "./Hero";
import { FeatureChips } from "./FeatureChips";
import { CommunityBand } from "./CommunityBand";
import { CategoryGrid } from "./CategoryGrid";
import { StaysBand } from "./StaysBand";
import { AppBand } from "./AppBand";
import { ProtectBand } from "./ProtectBand";
import { AiBand } from "./AiBand";
import { LandingFaq } from "./LandingFaq";
import { FinalCta } from "./FinalCta";
import { storeBadges } from "./store-badges";
import { Journey } from "./Journey";
import { Bento } from "./Bento";
import { WorldsBand } from "./WorldsBand";
import { CitiesMarquee } from "./CitiesMarquee";
import { NigeriaMap } from "./NigeriaMap";
import { LandingFx } from "./LandingFx";
import { DayBand, KineticBand, PlacesBand, SystemBand } from "@/components/cinema/LandingCinema";
import { ReelHud } from "@/components/cinema/ReelHud";

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
  const badges = storeBadges({
    appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL,
    playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL,
    native,
  });
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
      {/*
        TRACK M, 25 September 2026: the page grew rooms, on the founder's
        "make the landing page expand". The render's order above still holds
        for the sections it drew; the new rooms sit between them where each
        argument lands best: how Vallo protects you straight after the
        feature band, the AI showcase after how it works, the figures after
        stays, and the FAQ and a closing call to action at the foot.
      */}
      {/* THE SECOND PASS (the founder's "expand, impress me"): the journey
          takes the four-step slot the render gave How Vallo works, since it
          tells the same four steps with the phone beside them, and the
          bento, the two worlds, the cities and the map join the rooms. */}
      {/* THE CINEMA KIT (Track M, the founder's showreel reference): the
          kinetic words as a title sequence under the hero, the Truchet field
          between the promise and the journey, the wall of places drifting
          on the vertical axis, and a day told sideways between the two
          worlds and the categories. The HUD frames the whole page as a film. */}
      <LandingFx />
      <ReelHud />
      <Hero t={t} locale={locale} cards={data.cards} badges={badges} />
      <KineticBand t={t} />
      <FeatureChips t={t} />
      <CitiesMarquee t={t} />
      <ProtectBand t={t} />
      <SystemBand t={t} />
      <Journey t={t} />
      <Bento t={t} />
      <PlacesBand t={t} />
      <AiBand t={t} locale={locale} cards={data.showcase ?? data.cards} />
      <WorldsBand t={t} locale={locale} cards={data.showcase ?? data.cards} />
      <DayBand t={t} />
      <CategoryGrid t={t} counts={data.counts} />
      <StaysBand t={t} />
      <NigeriaMap t={t} />
      <CommunityBand t={t} locale={locale} listing={first} stats={data.stats} />
      {native ? null : <AppBand t={t} locale={locale} listing={first} native={native} />}
      <LandingFaq t={t} nonce={nonce} />
      <FinalCta t={t} />
    </main>
  );
}
