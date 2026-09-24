/**
 * When a fee rate starts, in words.
 *
 * The launch rates were seeded with `effective_from = 1970-01-01`, the epoch,
 * meaning "from the very beginning". Printed as a date, the fees desk said
 * "In force since 1 Jan 1970", which is a date nobody chose and reads as a bug.
 * Any start before the platform existed is the seed's "always", so it is said
 * as "from launch" rather than as a date.
 */
const PLATFORM_EPOCH_MS = Date.parse("2026-01-01T00:00:00Z");

export function isFromLaunch(effectiveFrom: string): boolean {
  const at = Date.parse(effectiveFrom);
  return Number.isFinite(at) && at < PLATFORM_EPOCH_MS;
}

/** The caption under the rate in force. */
export function inForceCaption(effectiveFrom: string, when: (iso: string) => string): string {
  return isFromLaunch(effectiveFrom) ? "In force from launch" : `In force since ${when(effectiveFrom)}`;
}

/** The start column in the rate history. */
export function rateStartLabel(effectiveFrom: string, when: (iso: string) => string): string {
  return isFromLaunch(effectiveFrom) ? "From launch" : when(effectiveFrom);
}
