import { dueBy, gradeForReportCategory, type ResponseGrade } from "@/lib/trust/standards";
import { gradeForTopic } from "@/lib/trust/support-topics";

/**
 * THE QUEUE AS A DESK, AS PURE RULES. V-89.
 *
 * Everything the queue page decides about a row that is not a database read:
 * which promise it is under, when that promise falls due, how a report is
 * weighted inside its clock and why, whether a support ticket is probably not
 * a person, and whether a claim is still live. Kept pure so the tests can pin
 * each rule and the page only composes.
 */

export type QueueKind = "listing" | "application" | "report" | "ticket" | "flag";
export const QUEUE_KINDS: readonly QueueKind[] = ["listing", "application", "report", "ticket", "flag"];

/** A claim is live for this long after it was last touched. */
export const CLAIM_IDLE_MS = 30 * 60 * 1000;

export function claimIsLive(touchedAt: string | null, now: number): boolean {
  if (!touchedAt) return false;
  const at = Date.parse(touchedAt);
  return Number.isFinite(at) && now - at < CLAIM_IDLE_MS;
}

/**
 * The promise a row is under, from `lib/trust/standards.ts`, the same numbers
 * /standards prints. Listings and agent applications are judgement calls
 * (routine); a message flag naming an account number is urgent, the rest
 * standard; a report by its category; a ticket by its topic.
 */
export function gradeFor(kind: QueueKind, signal: { category?: string | null; topic?: string | null; reason?: string | null }): ResponseGrade {
  if (kind === "report") return gradeForReportCategory(signal.category ?? null);
  if (kind === "ticket") return gradeForTopic(signal.topic ?? null);
  if (kind === "flag") return signal.reason === "account_number" ? "urgent" : "standard";
  return "routine";
}

export type Clock = { grade: ResponseGrade; dueAt: number; hoursLeft: number; overdue: boolean };

export function clockFor(openedAt: string, grade: ResponseGrade, now: Date): Clock {
  const due = dueBy(openedAt, grade, now);
  return { grade, dueAt: due.dueAt.getTime(), hoursLeft: due.hoursLeft, overdue: due.overdue };
}

/* ----------------------------------------------------------------- weight */

export type ReportSignals = {
  phoneConfirmed: boolean;
  /** ISO time of a completed inspection of the reported listing, by the reporter. */
  attendedAt: string | null;
  pastClosed: number;
  pastUpheld: number;
};

export type Weight = { score: number; reasons: WeightReason[] };
export type WeightReason =
  | { kind: "attended"; at: string }
  | { kind: "phone" }
  | { kind: "record"; upheld: number; closed: number };

/**
 * How much a report's reporter has shown, never whether to believe it. The
 * score only orders reports INSIDE the same clock: a first report from a new
 * account is never hidden or held back, it is simply read after the one from
 * somebody who stood in the room. Each point is a fact the console prints.
 */
export function reportWeight(signals: ReportSignals | null): Weight {
  if (!signals) return { score: 0, reasons: [] };
  const reasons: WeightReason[] = [];
  let score = 0;
  if (signals.attendedAt) {
    score += 3;
    reasons.push({ kind: "attended", at: signals.attendedAt });
  }
  if (signals.phoneConfirmed) {
    score += 1;
    reasons.push({ kind: "phone" });
  }
  if (signals.pastClosed > 0) {
    /* A record counts both ways: upheld reports add, dismissed ones do not. */
    score += Math.min(3, signals.pastUpheld);
    reasons.push({ kind: "record", upheld: signals.pastUpheld, closed: signals.pastClosed });
  }
  return { score, reasons };
}

/** Due first; inside the same hour of due, the heavier report first; then oldest. */
export function byDue<T extends { clock: Clock; weight?: number; openedAt: string }>(a: T, b: T): number {
  const hourA = Math.floor(a.clock.dueAt / 3_600_000);
  const hourB = Math.floor(b.clock.dueAt / 3_600_000);
  if (hourA !== hourB) return hourA - hourB;
  const w = (b.weight ?? 0) - (a.weight ?? 0);
  if (w !== 0) return w;
  return a.openedAt.localeCompare(b.openedAt);
}

/* ------------------------------------------------------------- spam lane */

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:com|net|org|io|co|ng|xyz|info|biz|shop|site|online)\b/i;
const DOMAIN_SALE = /\b(?:domain|backlinks?|seo|guest post|for sale|buy this|expired|traffic|ranking)\b/i;

/**
 * "Probably not a person": a ticket from somebody with no account whose body
 * carries a link or a domain-sale pitch. Classified at read time, so no
 * ticket row changes, and off the clock, so a squatter's pitch no longer
 * shares a promise with a person who needs help. Somebody with an account is
 * never put here.
 */
export function probablyNotAPerson(ticket: { hasAccount: boolean; body: string; topic?: string | null }): boolean {
  if (ticket.hasAccount) return false;
  const text = `${ticket.topic ?? ""} ${ticket.body}`;
  const link = URL_PATTERN.test(text);
  const pitch = DOMAIN_SALE.test(text);
  /* A link with a sales pitch; a bare link and little else; or a domain
     offered for sale without a link. */
  if (link && pitch) return true;
  if (link && ticket.body.trim().length < 200) return true;
  return /\bdomain\b/i.test(text) && /\b(?:for sale|buy|price|offer)\b/i.test(text);
}

/* ----------------------------------------------------------- saved views */

export type ViewFilters = { tab?: string; q?: string; lane?: string };

/** A saved view's filters, read back from jsonb and checked. */
export function readViewFilters(value: unknown): ViewFilters {
  if (!value || typeof value !== "object") return {};
  const v = value as Record<string, unknown>;
  const out: ViewFilters = {};
  for (const key of ["tab", "q", "lane"] as const) {
    const item = v[key];
    if (typeof item === "string" && item.length > 0 && item.length <= 80) out[key] = item;
  }
  return out;
}

export function viewHref(filters: ViewFilters): string {
  const params = new URLSearchParams();
  if (filters.tab) params.set("tab", filters.tab);
  if (filters.q) params.set("q", filters.q);
  if (filters.lane) params.set("lane", filters.lane);
  const query = params.toString();
  return query ? `/admin/queue?${query}` : "/admin/queue";
}

/** "kind:uuid", as the bulk form posts it. */
export function readItemKey(value: unknown): { kind: QueueKind; id: string } | null {
  if (typeof value !== "string") return null;
  const [kind, id] = value.split(":");
  if (!kind || !id || !(QUEUE_KINDS as readonly string[]).includes(kind)) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return { kind: kind as QueueKind, id };
}
