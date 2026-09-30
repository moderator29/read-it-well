/**
 * B9: WHAT CHANGED SINCE YOU CONFIRMED. Pure, client-safe.
 *
 * An agreement's terms move as a whole: any change bumps the version and
 * lapses both confirmations. The person asked to confirm again should see
 * the one line that moved, not reread the sheet. This compares the snapshot
 * of the version this party last confirmed (`deal_agreement_versions`) with
 * the current terms, line by line, in the page's own order and labels.
 *
 * A line that appears or disappears is a change (the old or new side reads
 * null, which the card prints as "Not stated"). The total is compared too,
 * because the total is what gets paid.
 */

export type TermLine = { key: string; label: string; kind: "money" | "date" | "text" };

/** The agreement page's lines, in its order. Money keys are kobo. */
export const TERM_LINES: TermLine[] = [
  { key: "move_in", label: "Move in", kind: "date" },
  { key: "handover_on", label: "Keys handed over", kind: "date" },
  { key: "check_in", label: "Check in", kind: "date" },
  { key: "check_out", label: "Check out", kind: "date" },
  { key: "rent_minor", label: "Rent", kind: "money" },
  { key: "caution_minor", label: "Caution deposit", kind: "money" },
  { key: "service_minor", label: "Service charge", kind: "money" },
  { key: "agency_minor", label: "Agency fee", kind: "money" },
  { key: "legal_minor", label: "Legal fee", kind: "money" },
  { key: "agreement_fee_minor", label: "Agreement fee", kind: "money" },
  { key: "price_per_night_minor", label: "Per night", kind: "money" },
  { key: "cleaning_fee_minor", label: "Cleaning", kind: "money" },
  { key: "notes", label: "Also agreed", kind: "text" },
];

export type TermValue = number | string | null;

export type TermChange = {
  key: string;
  label: string;
  kind: TermLine["kind"];
  before: TermValue;
  after: TermValue;
};

function valueOf(terms: Record<string, unknown>, line: TermLine): TermValue {
  const v = terms[line.key];
  if (line.kind === "money") return typeof v === "number" && Number.isFinite(v) ? v : null;
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/**
 * The lines that differ, in order, then the total when it differs. An empty
 * list means the terms read the same (a version moved with no visible
 * change, which the card then says in words).
 */
export function termsDiff(
  before: { terms: Record<string, unknown>; amountMinor: number },
  after: { terms: Record<string, unknown>; amountMinor: number },
  lines: TermLine[] = TERM_LINES,
): TermChange[] {
  const changes: TermChange[] = [];
  for (const line of lines) {
    const b = valueOf(before.terms, line);
    const a = valueOf(after.terms, line);
    if (b !== a) changes.push({ key: line.key, label: line.label, kind: line.kind, before: b, after: a });
  }
  if (before.amountMinor !== after.amountMinor) {
    changes.push({ key: "total", label: "Total", kind: "money", before: before.amountMinor, after: after.amountMinor });
  }
  return changes;
}

/**
 * The version this party last confirmed, from the agreement's own events.
 * The agreement row forgets it on an amendment (both confirmations lapse),
 * but the "confirmed" event keeps the actor and the version. Null when they
 * never confirmed, or when that is the current version (nothing to show).
 */
export function lastConfirmedVersion(
  events: { action: string; actorId: string | null; termsVersion: number | null }[],
  me: string,
  current: number,
): number | null {
  let best: number | null = null;
  for (const e of events) {
    if (e.action !== "confirmed" || e.actorId !== me || e.termsVersion === null) continue;
    if (best === null || e.termsVersion > best) best = e.termsVersion;
  }
  return best !== null && best < current ? best : null;
}
