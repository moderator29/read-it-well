import { APPROVAL_NEWS_DAYS } from "@/lib/ui/recent-approval";

/**
 * THE LISTER'S PAYOFF: WHICH LISTING, IF ANY, JUST WENT LIVE (round 5).
 *
 * The pop and the one heavy haptic belong to one moment in the supply loop:
 * the listing is in search. Not "sent", which is a person's queue, and not
 * "approved", which is a decision that has not been published yet. So the
 * answer here is read only from what the SERVER says about the row:
 *
 *   status        PUBLISHED, and nothing else
 *   publishedAt   set, and recent enough to be news (the same fortnight the
 *                 other approvals use, lib/ui/recent-approval.ts), so a
 *                 lister on a new phone is not greeted with a payoff for every
 *                 listing that went live in March
 *   seen          not yet on this device. The key carries the publication
 *                 time, so a listing taken down and published again is news
 *                 again, and a refresh is not.
 *
 * At most one per visit, the most recent: two pops at once is a celebration,
 * not a payoff. Pure, so every branch is tested without a browser.
 */
export type LiveFacts = { id: string; status: string; publishedAt?: string | null | undefined };

export function liveSeenKey(row: Pick<LiveFacts, "id" | "publishedAt">): string {
  return `listing-live:${row.id}:${row.publishedAt ?? ""}`;
}

export function livePayoffFor<T extends LiveFacts>(
  rows: readonly T[],
  now: number,
  seen: (key: string) => boolean,
  days: number = APPROVAL_NEWS_DAYS,
): T | null {
  const since = now - days * 24 * 60 * 60 * 1000;
  let best: { row: T; at: number } | null = null;
  for (const row of rows) {
    if (row.status !== "PUBLISHED" || !row.publishedAt) continue;
    const at = Date.parse(row.publishedAt);
    /* A minute of clock skew is allowed; a publication from the future is not. */
    if (!Number.isFinite(at) || at < since || at > now + 60_000) continue;
    if (seen(liveSeenKey(row))) continue;
    if (!best || at > best.at) best = { row, at };
  }
  return best?.row ?? null;
}
