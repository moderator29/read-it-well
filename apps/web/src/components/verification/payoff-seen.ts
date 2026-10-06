/**
 * WHETHER THIS DEVICE HAS ALREADY BEEN SHOWN A VERIFICATION LEVEL ARRIVE.
 *
 * The payoff on the approved plate is CSS-driven and starts on the first
 * painted frame, before any script has run (a member on a slow link must not
 * see "verified", then "in review", then "verified" again). So the server has
 * to know, before it renders, whether this device has seen this level: the
 * plate's own script writes one small cookie, scoped to `/verification` so it
 * rides on no other request, holding the level it showed. The server plays
 * the payoff only when a rung passed recently (`approvedRecently`) AND the
 * cookie does not already name this level.
 *
 * The browser keys (`lib/ui/seen-once.ts`) are written too, and read on the
 * client, so a level celebrated through the other door (`/agent/verification`,
 * whose sheet uses `verification-approved:tier-N`) is not celebrated twice.
 */
export const VPASS_COOKIE = "nf_vpass";
/** The news window (`APPROVAL_NEWS_DAYS`, 14) and a day: after it nothing plays anyway. */
export const VPASS_COOKIE_MAX_AGE_S = 15 * 24 * 60 * 60;

/** The `seen-once` keys of one level: this plate's own and the other door's sheet. */
export function vpassKeys(tier: number): string[] {
  return [`verification-passed:tier-${tier}`, `verification-approved:tier-${tier}`];
}

/** The server's half: has this device's cookie already shown this level? */
export function vpassSeen(cookie: string | undefined, tier: number): boolean {
  return cookie === String(tier);
}
