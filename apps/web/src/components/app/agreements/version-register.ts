import { termsDiff, type TermChange } from "@/lib/agreements/terms-diff";

/**
 * M2: AN AGREEMENT AS A DOCUMENT WITH ITS VERSIONS. Pure and client-safe, so
 * it is tested rather than trusted.
 *
 * WHERE THE VERSIONS COME FROM. B9's `deal_agreement_versions` keeps one
 * immutable snapshot (terms and total) per version, written only by the
 * database's own trigger and readable by the two parties. B9 began keeping
 * them on 30 September 2026 and backfilled the CURRENT version only, so an
 * older agreement can stand at version 3 with versions 1 and 2 gone. This
 * file never fills that gap: a version with no snapshot is said to be
 * unkept, and a change it would need is said to be unshowable.
 *
 * WHO DID WHAT comes from `deal_agreement_events`, which records the actor,
 * the action and the version it produced or confirmed. A confirmation is
 * bound to the version it names, so a confirmation of version 2 is never
 * drawn against version 3.
 *
 * WHEN a version was made is the event that made it (the opening for the
 * first, the amendment for every later one), never the snapshot's own
 * `created_at`: the backfill stamped every pre-existing current version with
 * the day the migration ran, which is not when anybody made it.
 */

export type PartySide = "renter" | "owner";

/** One kept snapshot, as `deal_agreement_versions` holds it. */
export type StoredVersion = { version: number; terms: Record<string, unknown>; amountMinor: number };

/** One event, with its actor already resolved to a side of the agreement. */
export type RecordEvent = {
  at: string;
  action: string;
  note: string | null;
  /** The renter, the owner, Vallo (a review decision), or nobody we can name. */
  side: PartySide | "vallo" | null;
  /** The version the event produced or confirmed, when the record holds it. */
  version: number | null;
};

export type VersionEntry = {
  version: number;
  current: boolean;
  /** A snapshot of this version exists. */
  kept: boolean;
  /** How it came to be: drawn up (the first), changed by a side, or unknown. */
  made: { kind: "drawn"; at: string | null } | { kind: "changed"; by: PartySide | null; at: string | null } | null;
  /**
   * Each side's confirmation OF THIS VERSION, as an instant, or null when they
   * did not confirm it (or the event that would date it is missing: then
   * `confirmedUndated` says so for the current version).
   */
  confirmed: Record<PartySide, string | null>;
  /** The current version is confirmed per the agreement row, but no event dates it. */
  confirmedUndated: Record<PartySide, boolean>;
};

function lastEvent(events: readonly RecordEvent[], test: (e: RecordEvent) => boolean): RecordEvent | null {
  let found: RecordEvent | null = null;
  for (const e of events) if (test(e) && (found === null || Date.parse(e.at) >= Date.parse(found.at))) found = e;
  return found;
}

/**
 * Every version from the current one down to the first, newest first.
 *
 * `confirmedNow` is the agreement row's own word on the CURRENT version
 * (`renter_confirmed_version` and `owner_confirmed_version` equal to
 * `terms_version`), which outranks the event log: a confirmation event that
 * the row no longer honours is not drawn as standing.
 */
export function versionRegister(input: {
  current: number;
  stored: readonly number[];
  events: readonly RecordEvent[];
  confirmedNow: Record<PartySide, boolean>;
}): VersionEntry[] {
  const { current, events, confirmedNow } = input;
  if (!Number.isInteger(current) || current < 1) return [];
  const kept = new Set(input.stored);
  const opened = lastEvent(events, (e) => e.action === "opened") ?? null;
  const out: VersionEntry[] = [];
  for (let v = current; v >= 1; v -= 1) {
    const isCurrent = v === current;
    const amended = lastEvent(events, (e) => e.action === "amended" && e.version === v);
    let made: VersionEntry["made"] = null;
    if (v === 1) made = { kind: "drawn", at: opened?.at ?? null };
    else if (amended) made = { kind: "changed", by: amended.side === "renter" || amended.side === "owner" ? amended.side : null, at: amended.at };
    const confirmedAt = (side: PartySide): string | null =>
      lastEvent(events, (e) => e.action === "confirmed" && e.side === side && e.version === v)?.at ?? null;
    const confirmed: Record<PartySide, string | null> = { renter: confirmedAt("renter"), owner: confirmedAt("owner") };
    const confirmedUndated: Record<PartySide, boolean> = { renter: false, owner: false };
    if (isCurrent) {
      for (const side of ["renter", "owner"] as const) {
        if (!confirmedNow[side]) confirmed[side] = null;
        else if (confirmed[side] === null) confirmedUndated[side] = true;
      }
    }
    out.push({ version: v, current: isCurrent, kept: kept.has(v), made, confirmed, confirmedUndated });
  }
  return out;
}

export type VersionDiff =
  | { state: "first" }
  | { state: "unkept"; previous: number }
  | { state: "ready"; from: number; to: number; changes: TermChange[] };

/**
 * The current version against the one before it, built ONLY from the two
 * kept snapshots. The first version has nothing before it; a version whose
 * predecessor (or itself) was never kept cannot be compared, and says so.
 */
export function previousVersionDiff(input: { current: number; versions: readonly StoredVersion[] }): VersionDiff {
  const { current } = input;
  if (!Number.isInteger(current) || current <= 1) return { state: "first" };
  const byVersion = new Map(input.versions.map((v) => [v.version, v]));
  const before = byVersion.get(current - 1);
  const after = byVersion.get(current);
  if (!before || !after) return { state: "unkept", previous: current - 1 };
  return {
    state: "ready",
    from: current - 1,
    to: current,
    changes: termsDiff(
      { terms: before.terms, amountMinor: before.amountMinor },
      { terms: after.terms, amountMinor: after.amountMinor },
    ),
  };
}

/**
 * The register row's version line: the version the terms stand at and how
 * many earlier ones are kept. Null when nothing is kept for this reader
 * (staff are not a party, so the snapshots are not theirs to read).
 */
export function versionIndex(stored: readonly number[]): { current: number; earlierKept: number } | null {
  const versions = stored.filter((v) => Number.isInteger(v) && v >= 1);
  if (versions.length === 0) return null;
  const current = Math.max(...versions);
  return { current, earlierKept: versions.filter((v) => v < current).length };
}
