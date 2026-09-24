/**
 * UX-20: when an inspection may be asked for, and whose clock it is on.
 *
 * Properties are in Nigeria, so the time a person picks is read as Lagos
 * time (WAT, UTC+1 all year; Nigeria keeps no summer time), whatever zone
 * the phone is set to. The earliest time is two hours from now, so whoever
 * listed the place has a chance to answer before it passes; the server
 * holds the same rule.
 */
export const LEAD_MS = 2 * 60 * 60 * 1000;
const LAGOS_OFFSET = "+01:00";
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

/** `2026-10-10T14:30` typed into the picker, as the instant it means in Lagos. */
export function lagosWallClockToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const at = Date.parse(`${local}:00${LAGOS_OFFSET}`);
  return Number.isNaN(at) ? null : new Date(at).toISOString();
}

/** The picker's `min`: two hours from now, on the Lagos clock, to the minute. */
export function earliestLagosInput(now: number = Date.now()): string {
  return new Date(now + LEAD_MS + LAGOS_OFFSET_MS).toISOString().slice(0, 16);
}

/** True when an instant is far enough ahead to be asked for. */
export function farEnoughAhead(iso: string, now: number = Date.now()): boolean {
  const at = Date.parse(iso);
  return !Number.isNaN(at) && at >= now + LEAD_MS - 60_000;
}
