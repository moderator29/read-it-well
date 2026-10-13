import type { DirEntry } from "@/lib/directory/model";
import type { BadgeTier } from "@/lib/trust/badge-tier";

/**
 * THE PEOPLE PAGE'S SECTIONS, FROM REAL METRICS ONLY.
 *
 * Four rows of profile cards (Top landlords, Top agents, Top hotels, Most
 * followed) and a list under them. Pure, so the one rule that matters is a
 * test: a rank is never invented. Every figure on a card is a number the
 * database holds (`social_profiles.follower_count`, the directory's completed
 * deals, stays and live listings), and a figure that is zero or missing is not
 * drawn as "0": it is absent. A section with nobody in it is not drawn at all.
 *
 * Where each ranking comes from:
 *   Top landlords / Top agents  `public.directory('property')`, the same
 *                               order the directory page uses (approved and
 *                               verified first, then completed deals, then
 *                               live listings), with follower count as the
 *                               tie-break before the name.
 *   Top hotels                  `public.directory('stays')`, hotels and resorts
 *                               that are published, in the directory's order
 *                               (completed stays, then live rooms).
 *   Most followed               `social_profiles.follower_count`, highest
 *                               first, nobody with none.
 */
export type DiscoverySection = "top-landlords" | "top-agents" | "top-hotels" | "most-followed";

export const DISCOVERY_ORDER: readonly DiscoverySection[] = [
  "top-landlords",
  "top-agents",
  "top-hotels",
  "most-followed",
];

/** The most cards a row shows. A row is a shelf, not a list. */
export const ROW_LIMIT = 10;

/** The fact a card leads with, always a count the database holds. */
export type CardMetric = { kind: "deals" | "stays" | "listings" | "rooms"; count: number };

export type DiscoveryCard = {
  key: string;
  /** The word under the name: Landlord, Agent, Hotel, or none for a plain member. */
  role: "landlord" | "agent" | "hotel" | null;
  name: string;
  handle: string | null;
  /** Where the card opens. A profile for a person, the stay page for a hotel. */
  href: string;
  avatarUrl: string | null;
  /** The published badge (`person_badge`), never inferred. */
  tier: BadgeTier;
  /** Null when nobody follows them or it was not read: the card then shows no number. */
  followers: number | null;
  metric: CardMetric | null;
  /** A person can be followed; a hotel page has no account to follow. */
  followable: boolean;
  viewerFollows: boolean;
  isViewer: boolean;
};

export type DiscoveryRow = { id: DiscoverySection; cards: DiscoveryCard[] };

/** A whole number above zero, or null. Never a negative, never NaN, never "0". */
export function realCount(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/** What a profile read adds to a directory entry, keyed by handle. */
export type ProfileFacts = {
  userId: string;
  followers: number;
  tier: BadgeTier;
  viewerFollows: boolean;
  isViewer: boolean;
  avatarUrl: string | null;
  displayLabel: string | null;
};

/** The directory's own order, restated so the tie-break is in one tested place. */
function directoryOrder(a: DirEntry, b: DirEntry, followers: (e: DirEntry) => number): number {
  return (
    Number(b.verified) - Number(a.verified) ||
    b.completed - a.completed ||
    b.liveListings - a.liveListings ||
    followers(b) - followers(a) ||
    a.name.localeCompare(b.name, "en-NG")
  );
}

/** An entry that earned a place on a "Top" shelf by some real figure at all. */
function hasSignal(e: DirEntry, followers: number): boolean {
  return e.verified || e.completed > 0 || e.liveListings > 0 || followers > 0;
}

function metricOf(e: DirEntry): CardMetric | null {
  const stays = e.kind === "hotel" || e.kind === "host" || e.kind === "shortlet";
  const done = realCount(e.completed);
  if (done) return { kind: stays ? "stays" : "deals", count: done };
  const live = realCount(e.liveListings);
  if (live) return { kind: stays ? "rooms" : "listings", count: live };
  return null;
}

function hrefOf(e: DirEntry): string | null {
  if (!e.ref) return null;
  const ref = encodeURIComponent(e.ref);
  return e.kind === "agent" || e.kind === "landlord" ? `/u/${ref}` : `/stay/${ref}`;
}

/** One shelf of the directory: the entries of one kind, in rank order, with a real signal. */
export function directoryRow(
  id: Extract<DiscoverySection, "top-landlords" | "top-agents" | "top-hotels">,
  entries: readonly DirEntry[],
  facts: ReadonlyMap<string, ProfileFacts>,
): DiscoveryRow {
  const kind = id === "top-landlords" ? "landlord" : id === "top-agents" ? "agent" : "hotel";
  const people = kind !== "hotel";
  const followersOf = (e: DirEntry) => (people && e.ref ? (facts.get(e.ref)?.followers ?? 0) : 0);

  const cards = entries
    .filter((e) => e.kind === kind && hrefOf(e) !== null)
    /* A person is a card only with a handle to open, which `hrefOf` checks. */
    .filter((e) => hasSignal(e, followersOf(e)))
    .sort((a, b) => directoryOrder(a, b, followersOf))
    .slice(0, ROW_LIMIT)
    .map((e): DiscoveryCard => {
      const f = people && e.ref ? facts.get(e.ref) : undefined;
      return {
        key: `${kind}:${e.ref}`,
        role: kind,
        name: e.name,
        handle: people ? e.ref : null,
        href: hrefOf(e) as string,
        avatarUrl: e.avatarUrl ?? f?.avatarUrl ?? null,
        tier: f?.tier ?? "none",
        followers: realCount(f?.followers),
        metric: metricOf(e),
        followable: people && Boolean(e.ref) && Boolean(f),
        viewerFollows: f?.viewerFollows ?? false,
        isViewer: f?.isViewer ?? false,
      };
    });
  return { id, cards };
}

export type FollowedProfile = ProfileFacts & { handle: string; supplyRole: "owner" | "agent" | null };

/** Most followed: real follower counts, highest first, and nobody with none. */
export function mostFollowedRow(profiles: readonly FollowedProfile[]): DiscoveryRow {
  const cards = profiles
    .filter((p) => realCount(p.followers) !== null && p.handle !== "")
    .sort((a, b) => b.followers - a.followers || a.handle.localeCompare(b.handle, "en-NG"))
    .slice(0, ROW_LIMIT)
    .map(
      (p): DiscoveryCard => ({
        key: `followed:${p.userId}`,
        role: p.supplyRole === "owner" ? "landlord" : p.supplyRole === "agent" ? "agent" : null,
        name: p.displayLabel || `@${p.handle}`,
        handle: p.handle,
        href: `/u/${encodeURIComponent(p.handle)}`,
        avatarUrl: p.avatarUrl,
        tier: p.tier,
        followers: realCount(p.followers),
        metric: null,
        followable: true,
        viewerFollows: p.viewerFollows,
        isViewer: p.isViewer,
      }),
    );
  return { id: "most-followed", cards };
}

/** The rows in their fixed order, with every empty one left out. */
export function visibleRows(rows: readonly DiscoveryRow[]): DiscoveryRow[] {
  return DISCOVERY_ORDER.flatMap((id) => {
    const row = rows.find((r) => r.id === id);
    return row && row.cards.length > 0 ? [row] : [];
  });
}
