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

import {
  QUEUE_PAGE_SIZE,
  lagosDayEnd,
  lagosDayStart,
  orSafe,
  pageRange,
  type AdminQueueFilter,
} from "./queue-filter";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every `entity_type` a writer in this codebase uses, with a word for it. */
export const AUDIT_ENTITY_TYPES = [
  { value: "wallet_entry", label: "Money" },
  { value: "paystack_webhook", label: "Webhook delivery" },
  { value: "booking", label: "Booking" },
  { value: "listing", label: "Listing" },
  { value: "business", label: "Business" },
  { value: "agent", label: "Agent" },
  { value: "agent_application", label: "Agent application" },
  { value: "report", label: "Report" },
  { value: "risk_alert", label: "Alert" },
  { value: "message", label: "Message" },
  { value: "message_flag", label: "Message flag" },
  { value: "support_ticket", label: "Support ticket" },
  { value: "user_badge", label: "Badge" },
  { value: "area", label: "Area" },
  { value: "area_moderator_application", label: "Area moderator" },
  { value: "local_government", label: "Local government" },
  { value: "occupation", label: "Occupation" },
  { value: "feature_flag", label: "Switch" },
] as const;

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

/** A word for a target type, falling back to the value made readable. */
export function entityTypeLabel(value: string): string {
  const hit = AUDIT_ENTITY_TYPES.find((type) => type.value === value);
  if (hit) return hit.label;
  const text = value.replace(/[._-]+/g, " ").trim();
  return text.length === 0 ? value : text.charAt(0).toUpperCase() + text.slice(1);
}
