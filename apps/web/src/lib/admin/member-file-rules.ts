/**
 * THE MEMBER DESK'S RULES, KEPT PURE.
 *
 * What the people search does with what an operator typed, how a person is
 * named when their profile has no display name, and how the member file's
 * rows are tallied. No database, no React: the reads in `member-queries.ts`
 * and the pages compose these, and `member-file-rules.test.ts` pins them.
 * Client-safe.
 */

import { CONSENTS } from "@/components/verification/kyc";

export type PeopleTerm =
  | { by: "id"; value: string }
  | { by: "email"; value: string }
  | { by: "handle"; value: string }
  /**
   * A name, or part of one. Searched over display name, first name and
   * surname. `raw` is what was typed, trimmed: the name search strips `_`
   * (a LIKE wildcard), and a handle such as `tunde_b` still has to be found.
   */
  | { by: "name"; value: string; raw: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUserId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** The shortest name fragment the search will run on: one letter matches half the platform. */
export const NAME_TERM_MIN = 2;
export const NAME_TERM_MAX = 60;

/**
 * What kind of thing the operator typed.
 *
 * A uuid is an id; something shaped like an address is an email; a leading
 * `@` is a handle; anything else is a name. A bare single word could be a
 * handle or a first name, so it is searched as a NAME and the handle is tried
 * as well (see `alsoHandle`). The name is stripped of the characters
 * PostgREST's filter grammar treats as structure (`,()*"\` and `%`, `_` which
 * `ilike` treats as wildcards), so a search for "a,b" looks for "ab" rather
 * than producing a filter the database rejects or one that matches everybody.
 */
export function classifyPeopleTerm(raw: string): PeopleTerm | null {
  const term = raw.trim();
  if (term.length === 0) return null;
  if (UUID_RE.test(term)) return { by: "id", value: term.toLowerCase() };
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(term)) return { by: "email", value: term.toLowerCase() };
  if (term.startsWith("@")) {
    const handle = term.slice(1).toLowerCase();
    return /^[a-z0-9_.-]{2,40}$/.test(handle) ? { by: "handle", value: handle } : null;
  }
  const name = term
    .replace(/[,()*"\\%_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_TERM_MAX);
  return name.length >= NAME_TERM_MIN ? { by: "name", value: name, raw: term.slice(0, NAME_TERM_MAX) } : null;
}

/** A single-word name search also tries it as a handle, since "tunde_b" is both. */
export function alsoHandle(term: PeopleTerm): string | null {
  if (term.by !== "name") return null;
  const lower = term.raw.toLowerCase();
  return /^[a-z0-9_.-]{2,40}$/.test(lower) ? lower : null;
}

/**
 * How a person is named on the desk. The display name they chose, then the
 * names they registered with, then nothing: the page says "No name given"
 * rather than inventing one. `/verification` submitters often have first and
 * surname but no display name, which is why the KYC queue uses this too.
 */
export function personName(p: {
  display_name?: string | null;
  first_name?: string | null;
  surname?: string | null;
} | null | undefined): string | null {
  if (!p) return null;
  const display = p.display_name?.trim();
  if (display) return display;
  const full = [p.first_name?.trim(), p.surname?.trim()].filter(Boolean).join(" ");
  return full.length > 0 ? full : null;
}

/** Counts by a status column, largest first, ties by name, so a tally reads the same every load. */
export function tallyBy<T>(rows: readonly T[], key: (row: T) => string | null | undefined): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row) ?? "unknown";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([k, count]) => ({ key: k, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/* ------------------------------------------------------------------ notes */

export const NOTE_MIN = 3;
export const NOTE_MAX = 2000;

/**
 * A staff note, checked the way `public.member_notes` checks it
 * (`char_length(btrim(body)) between 3 and 2000`), so the screen refuses what
 * the database would refuse, in words, before a round trip.
 */
export function checkNote(body: unknown): { ok: true; body: string } | { ok: false; error: string } {
  const text = typeof body === "string" ? body.trim() : "";
  if (text.length < NOTE_MIN) return { ok: false, error: "Write the note: a few words at least." };
  if (text.length > NOTE_MAX) return { ok: false, error: `Keep a note under ${NOTE_MAX} characters.` };
  return { ok: true, body: text };
}

/* -------------------------------------------------------------- KYC state */

export type KycDocState = { kind: string; reviewStatus: string; uploadedAt: string };

/**
 * One line of where a person stands on verification, from their documents:
 * "Not started" with none, "Waiting on a reviewer" while any is pending,
 * otherwise the newest decision per kind. Documents are grouped by kind and
 * only the newest of each kind counts, because a resubmission supersedes the
 * one it replaces.
 */
export function kycState(docs: readonly KycDocState[]): "none" | "pending" | "approved" | "rejected" | "partial" {
  if (docs.length === 0) return "none";
  const newest = new Map<string, KycDocState>();
  for (const d of docs) {
    const prior = newest.get(d.kind);
    if (!prior || d.uploadedAt > prior.uploadedAt) newest.set(d.kind, d);
  }
  const states = [...newest.values()].map((d) => d.reviewStatus);
  if (states.includes("pending")) return "pending";
  if (states.every((s) => s === "approved")) return "approved";
  if (states.every((s) => s === "rejected")) return "rejected";
  return "partial";
}

export const KYC_STATE_WORD: Record<ReturnType<typeof kycState>, string> = {
  none: "Not started",
  pending: "Waiting on a reviewer",
  approved: "Documents approved",
  rejected: "Documents sent back",
  partial: "Some documents sent back",
};

/* ----------------------------------------------------------- consent receipt */

/**
 * The three agreements `/verification` records, in the order the form asks
 * them, worded exactly as the person read them: the labels come from the
 * form's own list, so the receipt cannot drift from what was agreed to.
 */
export const KYC_CONSENT_WORDS: Record<string, string> = Object.fromEntries(
  CONSENTS.map((c) => [c.id, c.label]),
);

export type ConsentRow = { consent: string; consentedAt: string };

/**
 * The receipt a reviewer reads: the latest time each of the three agreements
 * was given, and which are missing. A person who submitted twice agreed twice;
 * the latest counts, the earlier ones stay in the table.
 */
export function consentReceipt(rows: readonly ConsentRow[]): {
  given: { consent: string; words: string; at: string }[];
  /** The agreements not given, in words. */
  missing: string[];
} {
  const latest = new Map<string, string>();
  for (const r of rows) {
    const prior = latest.get(r.consent);
    if (!prior || r.consentedAt > prior) latest.set(r.consent, r.consentedAt);
  }
  const order = Object.keys(KYC_CONSENT_WORDS);
  return {
    given: order
      .filter((c) => latest.has(c))
      .map((c) => ({ consent: c, words: KYC_CONSENT_WORDS[c]!, at: latest.get(c)! })),
    /* In the words the person was shown, never the stored id. */
    missing: order.filter((c) => !latest.has(c)).map((c) => KYC_CONSENT_WORDS[c]!),
  };
}
