import type { WalletEntry } from "@/lib/wallet/types";

/**
 * The "+12.5% this week" line on the balance card, computed or absent.
 *
 * The governing render carries it, and the rule for this product is that a
 * figure is drawn only when it is computed from the person's own ledger.
 * So: the net of every COMPLETED movement in the last seven days, and the
 * percentage that net is of the balance the week started on. No entries in
 * the window means no line at all rather than a zero; a week that started
 * from nothing (a first deposit) has no honest percentage, so the caller is
 * handed the net amount and draws that instead.
 *
 * Integer kobo throughout. The percentage is a ratio of two kobo sums and is
 * the one figure here that is not money.
 */

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export type WeekChange = {
  /** Net movement in the window, integer kobo, signed. */
  netMinor: number;
  /** One decimal place, signed. Null when the week began at or below zero. */
  percent: number | null;
};

export function weekChange(
  entries: WalletEntry[],
  balanceMinor: number,
  now: number = Date.now(),
): WeekChange | null {
  const cutoff = now - WEEK_MS;
  let net = 0;
  let any = false;
  for (const entry of entries) {
    if (entry.status !== "COMPLETED") continue;
    const at = new Date(entry.createdAt).getTime();
    if (Number.isNaN(at) || at < cutoff || at > now) continue;
    any = true;
    net += entry.direction === "credit" ? entry.amountMinor : -entry.amountMinor;
  }
  if (!any) return null;
  const start = balanceMinor - net;
  const percent = start > 0 ? Math.round((net / start) * 1000) / 10 : null;
  return { netMinor: net, percent };
}
