/**
 * THE "STILL AVAILABLE?" SWEEP FOR A LISTER'S OWN LISTINGS (C5), pure and tested.
 *
 * A live listing the lister has not confirmed in 14 days goes on the weekly
 * card on the agent home, answerable in one tap per row or all at once. A
 * listing that went live within the last 14 days counts as fresh: going live
 * is itself a statement that it is available.
 *
 * This is the LISTER's confirmation (`listings.lister_confirmed_at`), never
 * the owner's (`availability_confirmed_at`, "Owner confirmed available").
 */
export const CONFIRM_EVERY_DAYS = 14;
const DAY_MS = 86_400_000;

export type FreshnessRow = {
  id: string;
  title: string;
  publishedAt: string | null;
  listerConfirmedAt: string | null;
};

/** The newest of going live and the last confirmation, in ms, or null. */
function lastSaidAvailable(row: FreshnessRow): number | null {
  const times = [row.publishedAt, row.listerConfirmedAt]
    .map((t) => (t ? Date.parse(t) : Number.NaN))
    .filter((t) => Number.isFinite(t));
  return times.length > 0 ? Math.max(...times) : null;
}

/** Live listings due a "still available?", oldest statement first. */
export function dueForConfirmation(rows: readonly FreshnessRow[], now: number, days = CONFIRM_EVERY_DAYS): FreshnessRow[] {
  const cutoff = now - days * DAY_MS;
  return rows
    .map((row) => ({ row, at: lastSaidAvailable(row) }))
    .filter(({ at }) => at === null || at < cutoff)
    .sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
    .map(({ row }) => row);
}

/** Whole days since the listing was last said to be available, or null. */
export function daysSinceConfirmed(row: FreshnessRow, now: number): number | null {
  const at = lastSaidAvailable(row);
  return at === null ? null : Math.max(0, Math.floor((now - at) / DAY_MS));
}
