/**
 * "Was something approved RECENTLY enough to be news?"
 *
 * The approvals shown once per device (docs/SUCCESS_MOMENTS.md) would
 * otherwise greet every existing member with a celebration on the first
 * visit after the sheet shipped, and on every new phone for years after. A
 * passed rung decided in the last fortnight is news; one from March is a
 * standing fact the page already states.
 */
export const APPROVAL_NEWS_DAYS = 14;

export function approvedRecently(
  decisions: readonly { status: string; decidedAt: string }[],
  now: number,
  days: number = APPROVAL_NEWS_DAYS,
): boolean {
  const since = now - days * 24 * 60 * 60 * 1000;
  return decisions.some((d) => {
    if (d.status !== "passed") return false;
    const at = Date.parse(d.decidedAt);
    return Number.isFinite(at) && at >= since && at <= now + 60_000;
  });
}
