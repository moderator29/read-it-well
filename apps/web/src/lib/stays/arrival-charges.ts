/**
 * V-57. "NOTHING AT THE DOOR." The five charges a guest can be asked for on
 * arrival, each declared in kobo or as none, from a closed key set. The twin
 * of `private.arrival_charges_valid` (migration 20260924141200): an answer
 * set is complete only when all five are answered and every amount is a whole
 * positive number of kobo with a unit.
 */
export const ARRIVAL_KEYS = ["caution", "power", "cleaning", "extra_guest", "visitor"] as const;
export type ArrivalKey = (typeof ARRIVAL_KEYS)[number];

export const ARRIVAL_UNITS = ["stay", "night", "guest", "unit"] as const;
export type ArrivalUnit = (typeof ARRIVAL_UNITS)[number];

export type ArrivalAnswer = { none: true } | { minor: number; per: ArrivalUnit };
export type ArrivalCharges = Record<ArrivalKey, ArrivalAnswer>;

function isAnswer(value: unknown): value is ArrivalAnswer {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  const keys = Object.keys(row);
  if (keys.length === 1 && row.none === true) return true;
  return (
    keys.length === 2 &&
    typeof row.minor === "number" &&
    Number.isSafeInteger(row.minor) &&
    row.minor > 0 &&
    (ARRIVAL_UNITS as readonly string[]).includes(String(row.per))
  );
}

/** A complete declaration read back from the database, or null. */
export function readArrivalCharges(raw: unknown): ArrivalCharges | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  if (Object.keys(row).length !== ARRIVAL_KEYS.length) return null;
  for (const key of ARRIVAL_KEYS) if (!isAnswer(row[key])) return null;
  return row as ArrivalCharges;
}

/** The keys still unanswered in a partial set of answers. */
export function unanswered(partial: Partial<Record<ArrivalKey, ArrivalAnswer | null>>): ArrivalKey[] {
  return ARRIVAL_KEYS.filter((key) => !isAnswer(partial[key]));
}

/** The charges a guest may be asked for, in key order; "none" answers are left out. */
export function declaredCharges(charges: ArrivalCharges): { key: ArrivalKey; minor: number; per: ArrivalUnit }[] {
  return ARRIVAL_KEYS.flatMap((key) => {
    const answer = charges[key];
    return "minor" in answer ? [{ key, minor: answer.minor, per: answer.per }] : [];
  });
}
