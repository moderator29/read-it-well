import type { AlertNotice, AlertPlan, AlertSubject } from "./search-alerts";

/**
 * V-15: NEW-MATCH ALERTS IN MINUTES, AND THE CAP THAT KEEPS THEM KIND.
 *
 * The five-minute job reuses the daily job's own planner (`planAlerts`), so a
 * match means exactly what it means in the morning digest, and it moves the
 * same per-search watermark, so nothing is ever announced twice. What it adds
 * is the rule in this file: at most `INSTANT_ALERTS_PER_DAY` instant alerts
 * per person per Lagos day. Anybody over the cap is DEFERRED: no notice now
 * and, crucially, no watermark moved, so the morning digest still has every
 * one of their matches to tell them about in a single notice.
 *
 * Pure, so the arithmetic of "who is told now and whose searches move" is
 * tested without a database.
 */

export const INSTANT_ALERTS_PER_DAY = 3;

/** The Lagos calendar day of an instant, which is when the cap resets. */
export function lagosDay(at: number): string {
  return new Date(at + 3_600_000).toISOString().slice(0, 10);
}

export type InstantSplit = {
  /** Told now. */
  send: AlertNotice[];
  /** Left for the morning digest. */
  defer: AlertNotice[];
  /** The searches whose watermark may move: only those of people told now. */
  advance: string[];
  matched: string[];
};

export function splitByQuota(
  plan: AlertPlan,
  subjects: readonly AlertSubject[],
  sentToday: ReadonlyMap<string, number>,
  cap: number = INSTANT_ALERTS_PER_DAY,
): InstantSplit {
  const send: AlertNotice[] = [];
  const defer: AlertNotice[] = [];
  const told = new Set<string>();
  for (const notice of plan.notices) {
    if ((sentToday.get(notice.userId) ?? 0) < cap) {
      send.push(notice);
      told.add(notice.userId);
    } else {
      defer.push(notice);
    }
  }
  const owner = new Map(subjects.map((subject) => [subject.id, subject.userId]));
  const deferred = new Set(defer.map((notice) => notice.userId));
  /* A search moves unless it belongs to somebody deferred. A search that
     matched nothing may move (there was nothing to tell); a deferred person's
     searches may not, or the digest would lose what they were not told. */
  const advance = plan.advance.filter((id) => !deferred.has(owner.get(id) ?? ""));
  const matched = plan.matchedIds.filter((id) => told.has(owner.get(id) ?? ""));
  return { send, defer, advance, matched };
}
