import "@/app/css/landing-3d.css";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { getListingRepository } from "@/lib/listings/repository";
import { landingCatalogue } from "@/lib/listings/landing-catalogue";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { isSocialEnabled } from "@/lib/social/flag";
import { getPlatformStats, type PlatformStats } from "@/lib/platform-stats";
import { toMiniListing, type MiniListing } from "@/lib/site/listing-card";
import { Hero } from "./Hero";
import { Bento } from "./Bento";
import { AiBand } from "./AiBand";
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
 * `stats` is `platform_stats()`; `counts` is the per-kind tally off one
 * catalogue page, kept ONLY when that page provably held the whole
 * catalogue. The read is capped, so the check is the platform's own total:
 * when the tally adds up to `stats.listings` the page was complete and the
 * category tiles may print numbers; otherwise they print none.
 *
 * `showcase` is back with the AI room (7 October, at the founder's request):
 * up to three real listings of each kind off the same catalogue page, which
 * the example conversation may put under a reply only when two of the kind
 * it asks about exist. No extra read: it is the page already fetched.
 */
export type LandingData = {
  /** Unused by the landing; the preview fixtures still pass it. */
  cards?: MiniListing[];
  stats: PlatformStats | null;
  counts: ReadonlyMap<ListingKind, number> | null;
  /** Real listings the AI room's example conversation may show under a
      reply. Optional, so a fixture that leaves it out plays only the script
      that needs no cards. */
  showcase?: MiniListing[];
  /** Whether Around is switched on (the `social` flag, which fails open). The
      ecosystem layer drops its Around door when it is off, as the app does. */
  social?: boolean;
  /** Whether a stranger may open the catalogue (`VALLO_PUBLIC_CATALOGUE`).
      Left out, it is read from the environment; the preview harness may
      pass either answer to prove both sets of doors. */
  open?: boolean;
};

export async function landingData(
  /** The words the showcase cards are labelled in (market, suffix). */
  t?: Dictionary,
): Promise<LandingData> {
  /* OPS-11: the shared five-minute read when there is a database; the
     repository (empty or API-backed) otherwise. Only the catalogue is
     needed, for the per-kind counts. */
  const [shared, stats, social] = await Promise.all([landingCatalogue(), getPlatformStats(), isSocialEnabled()]);
  const catalogue: Listing[] = shared ? shared.catalogue : await getListingRepository().search();
  const tally = new Map<ListingKind, number>();
  for (const l of catalogue) tally.set(l.kind, (tally.get(l.kind) ?? 0) + 1);
  const complete = stats !== null && catalogue.length > 0 && catalogue.length === stats.listings;
  return {
    stats,
    counts: complete ? tally : null,
    showcase: t ? showcaseCandidates(catalogue).map((l) => toMiniListing(l, t)) : [],
    social,
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

        THE 3D PASS (7 October; the founder: "my landing page is even still
        the same, no upgrade... do animations"). Two rooms that carried his
        3D objects come back, ten rooms in all:

          Bento       "Everything the move needs": seven doors, each with one
                      of the founder's 3D objects, straight after the hero
                      so the art is the first thing under the fold
          AI          the assistant's three rules, each with its object,
                      beside the example conversation that types itself

        The hands-on deck and the Property and Stays switch stay folded into
        the platform band: they carried no 3D art. Every room rises in as it
        enters the viewport (MotionReveal; landing-3d.css, "the 3D pass").
      */}
      <Hero t={t} locale={locale} door={door} />
      <Bento t={t} door={door} social={data.social !== false} />
      <MoveInBand t={t} locale={locale} door={door} />
      <SpaceOsBand t={t} locale={locale} door={door} social={data.social !== false} />
      <Journey t={t} />
      <AiBand t={t} locale={locale} cards={data.showcase ?? data.cards ?? []} door={door} />
      <CategoryGrid t={t} counts={data.counts} door={door} />
      <CommunityBand t={t} locale={locale} stats={data.stats} />
      {native ? null : <AppBand t={t} native={native} />}
      <LandingFaq t={t} nonce={nonce} />
      <FinalCta t={t} />
    </main>
  );
}
