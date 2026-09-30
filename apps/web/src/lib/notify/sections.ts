/**
 * THE NOTIFICATION LIST, SORTED BY WHAT NEEDS YOU (recommendation B11).
 *
 *   Needs you   action rows that are still open, newest first
 *   New         everything else unread
 *   Earlier     everything else
 *
 * A row LEAVES "Needs you" WHEN THE RECORD SAYS IT IS DONE, not when it is
 * read, where the record can say so: a message row is open while its
 * conversation still has an unread message for you (`my_unread_counts`), read
 * or not. For every other action (a request to review, details to add, a
 * payment that could not complete) the platform has no per-record "done"
 * this screen can read yet, so tapping it (opening the record) is what
 * closes it. An action older than 14 days is no longer "needs you", it is
 * history, and moves down with the rest.
 *
 * Pure: no React, no reads.
 */
import { readSeverity, type SeverityVerdict } from "./severity";

export const NEEDS_YOU_DAYS = 14;

/** The request's clock, read once by the server page (outside render purity). */
export function sectionClock(): number {
  return Date.now();
}

export type SectionRow = {
  id: string;
  kind: string;
  title: string;
  href: string | null;
  read: boolean;
  createdAt: string;
  severity?: string | null;
};

/** The conversation a message notification points at, or null. */
export function threadOf(href: string | null): string | null {
  if (!href) return null;
  const m = /^\/(?:agent\/)?messages\/([^/?#]+)/.exec(href);
  return m && m[1] !== "new" ? m[1]! : null;
}

export function isOpenAction(
  row: SectionRow,
  verdict: SeverityVerdict,
  openThreads: ReadonlySet<string>,
  now: number,
): boolean {
  if (verdict.severity !== "action") return false;
  const at = Date.parse(row.createdAt);
  if (Number.isFinite(at) && now - at > NEEDS_YOU_DAYS * 86_400_000) return false;
  const thread = row.kind === "message" ? threadOf(row.href) : null;
  if (thread) return openThreads.has(thread);
  return !row.read;
}

export type Sectioned<T> = {
  needsYou: { row: T; verdict: SeverityVerdict }[];
  fresh: { row: T; verdict: SeverityVerdict }[];
  earlier: { row: T; verdict: SeverityVerdict }[];
};

export function sectionRows<T extends SectionRow>(
  rows: readonly T[],
  openThreads: ReadonlySet<string>,
  now: number,
): Sectioned<T> {
  const out: Sectioned<T> = { needsYou: [], fresh: [], earlier: [] };
  for (const row of rows) {
    const verdict = readSeverity(row);
    if (isOpenAction(row, verdict, openThreads, now)) out.needsYou.push({ row, verdict });
    else if (!row.read) out.fresh.push({ row, verdict });
    else out.earlier.push({ row, verdict });
  }
  return out;
}
