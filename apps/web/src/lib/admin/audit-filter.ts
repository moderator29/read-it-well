/**
 * How the audit desk's address bar becomes a query.
 *
 * Pure on purpose, so it can be tested without a database: the QueueFilters
 * frame puts `q`, `status`, `from`, `to` and `offset` in the URL, and this
 * decides what each one means for `audit_log`, which has no status column
 * and three different things a person might be searching for.
 *
 * THE ONE BOX SEARCHES THREE COLUMNS, BY SHAPE. An operator pastes what they
 * have: a user id from a ticket, a Paystack reference from a dispute, or a
 * fragment of an action name. A UUID is matched exactly against the actor
 * AND the target, because the same id is one on some rows and the other on
 * others (an admin who was later the subject of a decision). Anything else is
 * a substring of the action or of the target id, so "wallet." finds the
 * money history and "rm-wd-" finds every withdrawal line.
 *
 * THE CHIPS ARE TARGET TYPES. `entity_type` is free text written by a dozen
 * call sites, so the list below is the vocabulary those call sites actually
 * use, read from the codebase rather than invented. A value in the URL that
 * is not in the list is dropped, exactly as `pickStatus` drops an unknown
 * status: the queue answers with everything and the chip shows unselected.
 */

import type { UiIconName } from "../../design-system/icons/UiIcon";
import {
  QUEUE_PAGE_SIZE,
  lagosDayEnd,
  lagosDayStart,
  orSafe,
  pageRange,
  type AdminQueueFilter,
} from "./queue-filter";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Every `entity_type` a writer in this codebase uses, with a word for it and
 * the glyph its row wears on the console table's tile (278CC66A reads by the
 * tile before the word). The icon is a type-only import, so this file stays
 * pure and testable; a wrong name fails the typecheck, not the desk.
 */
export const AUDIT_ENTITY_TYPES = [
  { value: "wallet_entry", label: "Money", icon: "wallet" },
  { value: "paystack_webhook", label: "Webhook delivery", icon: "link" },
  /*
   * THE CHIP THAT WAS MISSING, AND IT WAS THE ONE THE ALERTING STORY DEPENDS
   * ON. `lib/cron/report.ts` writes one `audit_log` row per scheduled run,
   * clean or not, under `entity_type = 'cron_job'`, precisely so that a job
   * which has quietly STOPPED firing is visible: its last clean row has a
   * date on it. That is the only way to see it, because a job that does not
   * run raises no alert, and the desk had no way to ask for those rows. Four
   * of the vocabulary's types were absent from this list, so the chips were
   * telling an operator the log holds eighteen kinds of thing when it holds
   * twenty-two. `audit-filter.test.ts` now holds the writer vocabulary beside
   * this list and fails when the two drift apart.
   */
  { value: "cron_job", label: "Scheduled job", icon: "history" },
  { value: "booking", label: "Booking", icon: "calendar-booking" },
  { value: "reservation", label: "Reservation", icon: "calendar-booking" },
  { value: "room_type", label: "Room type", icon: "building-hotel" },
  { value: "inventory_drift", label: "Inventory drift", icon: "shield-stop" },
  { value: "listing", label: "Listing", icon: "house" },
  { value: "business", label: "Business", icon: "building-hotel" },
  { value: "agent", label: "Agent", icon: "user" },
  { value: "agent_application", label: "Agent application", icon: "document" },
  { value: "report", label: "Report", icon: "flag" },
  { value: "risk_alert", label: "Alert", icon: "bell" },
  { value: "message", label: "Message", icon: "chat-bubble" },
  { value: "message_flag", label: "Message flag", icon: "flag" },
  { value: "support_ticket", label: "Support ticket", icon: "ticket" },
  { value: "user_badge", label: "Badge", icon: "verified" },
  { value: "area", label: "Area", icon: "map" },
  { value: "area_moderator_application", label: "Area moderator", icon: "document" },
  { value: "local_government", label: "Local government", icon: "location" },
  { value: "occupation", label: "Occupation", icon: "document" },
  { value: "feature_flag", label: "Switch", icon: "sliders" },
  /*
   * THE TWO NEWEST WRITERS, AND THE REASON THEY EXIST AT ALL.
   * `app/api/documents/[id]/route.ts` writes one row every time an operator
   * opens somebody's identity or business document. It could not write one
   * before, because the desks opened those documents on `supabase.co` and a
   * read that happens on somebody else's origin leaves no trace on ours. The
   * chips are what turn that trail into a question an operator can actually
   * ask: who has been reading whose passport.
   */
  { value: "agent_documents", label: "Identity document", icon: "document" },
  { value: "business_documents", label: "Business document", icon: "document" },
] as const satisfies readonly { value: string; label: string; icon: UiIconName }[];

/** The tile glyph for a target type; a type this list has never met gets the plain mark. */
export function entityTypeIcon(value: string): UiIconName {
  const hit = AUDIT_ENTITY_TYPES.find((type) => type.value === value);
  return hit ? hit.icon : "info";
}

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number]["value"];

/** The shape a query needs, decided once. */
export type AuditQueryPlan = {
  /** Exact id matched against actor_id and entity_id. */
  exactId: string | null;
  /** Substring matched against action and entity_id, already `orSafe`. */
  textLike: string | null;
  entityType: AuditEntityType | null;
  fromIso: string | null;
  toIso: string | null;
  range: { from: number; to: number };
  pageSize: number;
};

const MAX_TERM = 120;

export function pickAuditEntityType(value: string | undefined): AuditEntityType | null {
  const hit = AUDIT_ENTITY_TYPES.find((type) => type.value === value);
  return hit ? hit.value : null;
}

/** The `.or()` expression for a free-text term, safe to hand to PostgREST. */
export function auditTextExpression(term: string): string {
  const safe = orSafe(`%${term}%`);
  return `action.ilike.${safe},entity_id.ilike.${safe}`;
}

export function planAuditQuery(filter: AdminQueueFilter | undefined): AuditQueryPlan {
  const term = (filter?.q ?? "").trim().slice(0, MAX_TERM);
  const exactId = term.length > 0 && UUID_RE.test(term) ? term.toLowerCase() : null;
  const textLike = term.length > 0 && exactId === null ? term : null;
  return {
    exactId,
    textLike,
    entityType: pickAuditEntityType(filter?.status),
    fromIso: filter?.from ? lagosDayStart(filter.from) : null,
    toIso: filter?.to ? lagosDayEnd(filter.to) : null,
    range: pageRange(filter),
    pageSize: QUEUE_PAGE_SIZE,
  };
}

/** The `.or()` expression for an exact id, matched on either side of the row. */
export function auditIdExpression(id: string): string {
  const safe = orSafe(id);
  return `actor_id.eq.${safe},entity_id.eq.${safe}`;
}

/** "wallet.funding.posted" reads as "Wallet funding posted" in a dense row. */
export function actionLabel(action: string): string {
  const text = action.replace(/[._-]+/g, " ").trim();
  return text.length === 0 ? action : text.charAt(0).toUpperCase() + text.slice(1);
}

/* ------------------------------------------------ what a row may never show */

/**
 * THE LAST GATE BEFORE A DECISION LINE IS PUT ON A SCREEN.
 *
 * `audit_log.metadata` is a free bag: two dozen call sites choose what goes in
 * it, and the viewer renders it as stored. Every writer in the tree is clean
 * today, which is a fact about today and not a property of the viewer. Rule 16
 * is absolute, so the READER enforces it too: a key naming a NIN, a BVN, a
 * bank account, a card, a token, a secret, a signature, a password, an email
 * address or a phone number is dropped here and never reaches the page,
 * whatever a writer put there and whenever it was written. The same shape and
 * the same vocabulary as the scrubber in `lib/alerts/record.ts`, applied at
 * the other end of the pipe.
 *
 * NAMES ARE NOT DROPPED, and that is a decision rather than an oversight.
 * `agent_name`, `business_name` and `displayName` are already what the rows
 * around them are about: the desk resolves and shows `actorName` on every row
 * from `profiles`, the whole console is a list of people and the decisions
 * taken about them, and a suspension line with the name cut out of it is a
 * line an operator cannot act on. What rule 16 forbids is identity documents
 * and credentials, and those are what this drops.
 *
 * A dropped key is REPLACED, not silently removed: the key stays with the
 * value "[withheld]", so a reader can see that the row carried something and
 * that this viewer refused to show it, rather than reading a shorter row and
 * believing it complete.
 */
const WITHHELD = "[withheld]";

const FORBIDDEN_METADATA_KEY_PARTS = [
  "email",
  "phone",
  "msisdn",
  "nin",
  "bvn",
  "passport",
  "account_number",
  "accountnumber",
  "iban",
  "card",
  "pan",
  "cvv",
  "token",
  "secret",
  "signature",
  "password",
  "authorization",
] as const;

/** True when this key names an identity document or a credential. */
export function forbiddenAuditKey(key: string): boolean {
  const lower = key.toLowerCase();
  return FORBIDDEN_METADATA_KEY_PARTS.some((part) => lower.includes(part));
}

/**
 * One row's metadata, safe to render. Objects and arrays are walked one level
 * deep, because a bag inside a bag is still a bag somebody will read.
 */
export function safeAuditMetadata(metadata: unknown, depth = 0): unknown {
  if (metadata === null || metadata === undefined) return metadata ?? null;
  if (Array.isArray(metadata)) {
    return depth >= 2 ? WITHHELD : metadata.map((item) => safeAuditMetadata(item, depth + 1));
  }
  if (typeof metadata !== "object") return metadata;
  if (depth >= 2) return WITHHELD;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    out[key] = forbiddenAuditKey(key) ? WITHHELD : safeAuditMetadata(value, depth + 1);
  }
  return out;
}

/** A word for a target type, falling back to the value made readable. */
export function entityTypeLabel(value: string): string {
  const hit = AUDIT_ENTITY_TYPES.find((type) => type.value === value);
  if (hit) return hit.label;
  const text = value.replace(/[._-]+/g, " ").trim();
  return text.length === 0 ? value : text.charAt(0).toUpperCase() + text.slice(1);
}
