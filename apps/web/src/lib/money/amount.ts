/**
 * Naira typed by a person, turned into integer kobo exactly once.
 *
 * Amounts arrive as naira text from a form and are converted here, at the
 * input boundary, with Math.round(naira * 100) (Master Rule 50). Beyond this
 * point money is integer kobo only.
 */

/** The smallest amount a form accepts, in kobo. */
export const MIN_MOVE_KOBO = 100_00;
/** The largest single amount a form accepts, in kobo. */
export const MAX_MOVE_KOBO = 10_000_000_00;

// Naira as typed: digits, optional thousands commas, at most two decimals.
const NAIRA_RE = /^\d{1,3}(,\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/;

/** Parse a naira string to integer kobo, or null when it is not a well-formed amount. */
export function parseNairaToKobo(raw: string): number | null {
  const trimmed = raw.trim().replace(/^₦/, "").trim();
  if (!NAIRA_RE.test(trimmed)) return null;
  const naira = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(naira)) return null;
  return Math.round(naira * 100);
}
