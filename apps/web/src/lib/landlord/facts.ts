/**
 * WHAT A RENTER IS TOLD, AS PURE DECISIONS OVER DATED FACTS.
 *
 * Every function here answers one question the claims rule asks of a screen:
 * can the code prove this sentence? When it cannot, the answer is null and the
 * screen draws nothing. There is no "not confirmed", no grey cross and no
 * "waiting for the owner" on a listing: a landlord who has not answered yet
 * has said nothing, and saying nothing is not a negative until the 21 days in
 * `private.sweep_not_reconfirmed` have passed.
 *
 * `availability_confirmed_at` is written only by the principal's own answer,
 * from their own number or their own single-use link, so "Owner confirmed
 * available" is a sentence the database proves. It is shown for 45 days and
 * then dropped rather than aged forever: a confirmation that old says less than
 * the fortnightly question that has been asked since, and the sweep, not a
 * stale line, is what speaks for silence.
 */

/** Days a confirmation stays on screen. */
export const OWNER_CONFIRMED_SHOWN_DAYS = 45;

const LAGOS_OFFSET_MS = 60 * 60 * 1000;

/** The Lagos calendar day of an instant, as a day number. Lagos keeps no DST. */
function lagosDay(ms: number): number {
  return Math.floor((ms + LAGOS_OFFSET_MS) / 86_400_000);
}

export type OwnerLineCopy = {
  ownerConfirmedToday: string;
  ownerConfirmedDay: string;
  ownerConfirmedDays: string;
};

/**
 * "Owner confirmed available 3 days ago", or null.
 *
 * Null for no date, an unreadable date, a date in the future (a clock we do
 * not trust is not a fact) and a date older than the window above.
 */
export function ownerConfirmedLine(
  copy: OwnerLineCopy,
  confirmedAt: string | null | undefined,
  nowMs: number,
): string | null {
  if (!confirmedAt) return null;
  const at = Date.parse(confirmedAt);
  if (Number.isNaN(at)) return null;
  if (at > nowMs + 5 * 60 * 1000) return null;
  const days = lagosDay(nowMs) - lagosDay(at);
  if (days < 0 || days > OWNER_CONFIRMED_SHOWN_DAYS) return null;
  if (days === 0) return copy.ownerConfirmedToday;
  if (days === 1) return copy.ownerConfirmedDay;
  return copy.ownerConfirmedDays.replace("{n}", String(days));
}

/**
 * The listings a renter sees, with the not-reconfirmed ones moved to the end.
 *
 * STABLE: whatever order the page chose (recommended, cheapest to move in,
 * price) is kept inside each half, so this sorts last and does nothing else.
 * A listing with no fact at all is not "not reconfirmed"; it stays where it was.
 */
export function sinkNotReconfirmed<T extends { id: string }>(
  listings: readonly T[],
  notReconfirmed: ReadonlySet<string>,
): T[] {
  if (notReconfirmed.size === 0) return [...listings];
  const kept: T[] = [];
  const sunk: T[] = [];
  for (const listing of listings) {
    (notReconfirmed.has(listing.id) ? sunk : kept).push(listing);
  }
  return [...kept, ...sunk];
}

export type RentFact =
  | { state: "confirmed"; answeredAt: string; askedAt: string; firstName: string | null }
  | { state: "disputed"; answeredAt: string; askedAt: string; firstName: string | null }
  | { state: "waiting"; answeredAt: null; askedAt: string; firstName: string | null };

/** Read the `rent_landlord_fact` jsonb, or null when there is nothing to say. */
export function readRentFact(raw: unknown): RentFact | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const askedAt = typeof row.asked_at === "string" ? row.asked_at : null;
  const answeredAt = typeof row.answered_at === "string" ? row.answered_at : null;
  const firstName = typeof row.first_name === "string" && row.first_name.trim() ? row.first_name.trim() : null;
  if (!askedAt) return null;
  if (row.state === "confirmed" && answeredAt) return { state: "confirmed", answeredAt, askedAt, firstName };
  if (row.state === "disputed" && answeredAt) return { state: "disputed", answeredAt, askedAt, firstName };
  if (row.state === "waiting") return { state: "waiting", answeredAt: null, askedAt, firstName };
  return null;
}

export type ListingFacts = {
  ownerConfirmedAt: string | null;
  notReconfirmed: boolean;
  offerCount: number;
};

/** Read `listing_landlord_facts` rows into a map, dropping anything malformed. */
export function readListingFacts(rows: unknown): Map<string, ListingFacts> {
  const out = new Map<string, ListingFacts>();
  if (!Array.isArray(rows)) return out;
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    if (typeof row.listing_id !== "string") continue;
    out.set(row.listing_id, {
      ownerConfirmedAt: typeof row.owner_confirmed_at === "string" ? row.owner_confirmed_at : null,
      notReconfirmed: row.not_reconfirmed === true,
      offerCount: typeof row.offer_count === "number" && row.offer_count > 0 ? row.offer_count : 1,
    });
  }
  return out;
}

/**
 * The clock, read outside a component body. A server component is rendered
 * once per request, so "now" is the request's moment; reading it through a
 * named function keeps the render itself pure in the linter's eyes, which is
 * the pattern the admin pages already use.
 */
export function requestNow(): number {
  return Date.now();
}
