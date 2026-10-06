import "@/app/css/landing-3d.css";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { getListingRepository } from "@/lib/listings/repository";
import { landingCatalogue } from "@/lib/listings/landing-catalogue";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { getPlatformStats, type PlatformStats } from "@/lib/platform-stats";
import { toMiniListing, type MiniListing } from "@/lib/site/listing-card";
import { Hero } from "./Hero";
import { MoveInBand } from "./MoveInBand";
import { SpaceOsBand } from "./SpaceOsBand";
import { CommunityBand } from "./CommunityBand";
import { CategoryGrid } from "./CategoryGrid";
import { AppBand } from "./AppBand";
import { LandingFaq } from "./LandingFaq";
import { FinalCta } from "./FinalCta";
import { Journey } from "./Journey";
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
        the launch pass and the clean pass (29 September) cut the repeats;
        the unified pass (29 September, evening) made ten rooms with one job
        each.

        THE SESSION 3 PASS (6 October; the handoff's Stage 3 and north star
        10 A) is the current order, eight rooms, the brand's story told in
        the order a person meets it:

          Hero        the governing composition: night, the villa, the slogan,
                      the explanation, two doors, the example card, the
                      search capsule, three facts
          Move-in     the argument the platform was built on, as its own band:
                      the example flat's whole cost, counted up and itemised
          Platform    the operating system for physical spaces, six layers
                      (trust, discover, intelligence, transactions, operations,
                      ecosystem), one at a time, each with a moment drawn from
                      the product's own components and a Space Passport
          Journey     find, inspect, agree, move in
          Categories  eight kinds of place, then the cities on the drawn map
          Community   who it is for, real figures only, the Third party label,
                      and "Check before you pay" with the check in the card
          App, FAQ    on your phone; the short answers in one grouped card
          Close       the final card: sign up, or sign in

        Folded into the platform band, which says them as one system in one
        screen (the four rooms measured 3,387px at 1440 before this pass):
        the hands-on deck (its moments are the
        layers' moments), the bento (its doors are the ecosystem layer), the
        AI room (its truths and its first example exchange are the
        intelligence layer) and the Property and Stays switch (the hero's
        second door and the ecosystem layer). Their components are no longer
        rendered here.
      */}
      <Hero t={t} locale={locale} door={door} />
      <MoveInBand t={t} locale={locale} door={door} />
      <SpaceOsBand t={t} locale={locale} door={door} />
      <Journey t={t} />
      <CategoryGrid t={t} counts={data.counts} door={door} />
      <CommunityBand t={t} locale={locale} stats={data.stats} />
      {native ? null : <AppBand t={t} native={native} />}
      <LandingFaq t={t} nonce={nonce} />
      <FinalCta t={t} />
    </main>
  );
}
