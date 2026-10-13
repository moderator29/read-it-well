/**
 * THE SENDER IDS REGISTERED ON THE TERMII ACCOUNT (the founder, 13 October
 * 2026: "I cannot find our Termii sender ID"). Pure, so a node test holds it.
 *
 * Termii's public docs (developers.termii.com/sender-id, "Fetch Sender ID"):
 *
 *   GET {base}/api/sender-id?api_key=...        optional `page`, `name`, `status`
 *
 * Every request authenticates with `api_key` as a query parameter. The answer
 * is a page of the account's sender IDs, each with `sender_id`, `status`
 * (the docs call them active, pending and blocked; the live API has also
 * answered `unblock` for an approved one), `company`, `usecase`, `country` and
 * a created date. The page wrapper has been seen in two shapes, the Laravel
 * one (`data` and `last_page`) and the newer one (`content` and `totalPages`),
 * so the reader takes either. Nothing here reads, returns or prints the key.
 */

export type SenderStatus = "approved" | "pending" | "blocked" | "unknown";

export type SenderIdRow = {
  senderId: string;
  status: SenderStatus;
  /** What Termii said, as it said it, for a status this file does not know. */
  rawStatus: string;
  company: string;
  createdAt: string;
};

const APPROVED = new Set(["active", "unblock", "unblocked", "approved", "verified", "enabled"]);
const PENDING = new Set(["pending", "processing", "in_review", "review", "submitted"]);
const BLOCKED = new Set(["blocked", "block", "rejected", "declined", "suspended", "disabled", "inactive"]);

export function senderStatusOf(raw: unknown): SenderStatus {
  const word = typeof raw === "string" ? raw.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
  if (APPROVED.has(word)) return "approved";
  if (PENDING.has(word)) return "pending";
  if (BLOCKED.has(word)) return "blocked";
  return "unknown";
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** One page of Termii's answer, narrowed. `pages` is how many pages Termii says there are (at least 1). */
export function readSenderIdPage(body: unknown): { rows: SenderIdRow[]; pages: number } {
  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const list = Array.isArray(body) ? body : Array.isArray(root.data) ? root.data : Array.isArray(root.content) ? root.content : [];
  const rows: SenderIdRow[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const senderId = text(r.sender_id ?? r.senderId ?? r.name);
    if (!senderId) continue;
    const rawStatus = text(r.status);
    rows.push({
      senderId,
      status: senderStatusOf(rawStatus),
      rawStatus,
      company: text(r.company),
      createdAt: text(r.created_at ?? r.createdAt),
    });
  }
  const pages = Number(root.last_page ?? root.totalPages ?? 1);
  return { rows, pages: Number.isFinite(pages) && pages >= 1 ? Math.floor(pages) : 1 };
}

export type SenderIdVerdict = {
  ok: boolean;
  /** One plain sentence about TERMII_SENDER_ID against the account's approved IDs. */
  line: string;
};

/**
 * Whether the configured TERMII_SENDER_ID is one the account has approved.
 * The comparison is exact: a sender ID that differs only by case is reported
 * as a mismatch, because that is what Termii would see.
 */
export function senderIdVerdict(configured: string, rows: readonly SenderIdRow[]): SenderIdVerdict {
  const set = configured.trim();
  const approved = rows.filter((row) => row.status === "approved");
  const list = approved.length > 0 ? approved.map((row) => row.senderId).join(", ") : "none";
  if (!set) {
    return { ok: false, line: `TERMII_SENDER_ID is not set. Approved on the account: ${list}.` };
  }
  const exact = rows.find((row) => row.senderId === set);
  if (exact && exact.status === "approved") {
    return { ok: true, line: `TERMII_SENDER_ID is ${set}, and it is approved on the account.` };
  }
  if (exact) {
    const word = exact.status === "unknown" ? `"${exact.rawStatus || "no status"}"` : exact.status;
    return { ok: false, line: `TERMII_SENDER_ID is ${set}, which is on the account but is ${word}, not approved. Approved: ${list}.` };
  }
  const caseOnly = rows.find((row) => row.senderId.toLowerCase() === set.toLowerCase());
  if (caseOnly) {
    return { ok: false, line: `TERMII_SENDER_ID is ${set}, but the account has ${caseOnly.senderId} (${caseOnly.status}). Match the spelling exactly.` };
  }
  return { ok: false, line: `TERMII_SENDER_ID is ${set}, which is not registered on the account. Approved: ${list}.` };
}
