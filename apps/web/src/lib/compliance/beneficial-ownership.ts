import { normalisePhone } from "../phone";

/**
 * SCUML item 17: BENEFICIAL OWNERSHIP. Who is the lister acting for?
 *
 * The pure half: the closed sets the database checks, the reading of the
 * definer functions' answers into typed shapes, the refusal the publish gate
 * raises, and the form's own validation. No I/O, so it is tested directly.
 *
 * Migration: supabase/migrations/20260924171000_scuml_item_17_beneficial_ownership_a_mandate_before_publish.sql
 */

export const MANDATE_KINDS = ["letting", "sale", "management"] as const;
export type MandateKind = (typeof MANDATE_KINDS)[number];

export const RELATIONSHIPS = [
  "owner",
  "joint_owner",
  "family_of_owner",
  "company_director",
  "executor_or_trustee",
  "attorney",
  "other",
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const VERIFIED_HOW = ["call_back", "in_person", "video_call", "document"] as const;
export type VerifiedHow = (typeof VERIFIED_HOW)[number];

/**
 * No NIN, and no national ID card either: the card carries the NIN, so its
 * reference would be one (20260924171200).
 */
export const ID_DOCUMENT_KINDS = [
  "international_passport",
  "drivers_licence",
  "voters_card",
  "cac_certificate",
  "other",
] as const;
export type IdDocumentKind = (typeof ID_DOCUMENT_KINDS)[number];

export const ACTING_FOR_KINDS = ["listing", "booking", "transaction", "rent_payment", "escrow"] as const;
export type ActingForKind = (typeof ACTING_FOR_KINDS)[number];

/** The day listings already live must have a mandate by (Lagos). */
export const MANDATE_GRACE_ENDS = "2026-10-24";

const includes = <T extends string>(set: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (set as readonly string[]).includes(value);

export const isRelationship = (v: unknown): v is Relationship => includes(RELATIONSHIPS, v);
export const isVerifiedHow = (v: unknown): v is VerifiedHow => includes(VERIFIED_HOW, v);
export const isIdDocumentKind = (v: unknown): v is IdDocumentKind => includes(ID_DOCUMENT_KINDS, v);
export const isMandateKind = (v: unknown): v is MandateKind => includes(MANDATE_KINDS, v);
export const isActingForKind = (v: unknown): v is ActingForKind => includes(ACTING_FOR_KINDS, v);

/**
 * NEVER A NIN. A NIN and a BVN are both eleven digits. The same rule as the
 * database's `listing_mandates_id_ref_is_never_a_nin`: anything that is not
 * plain ASCII is refused (so digits from another script cannot slip past),
 * and so is any run of eleven or more digits once everything that is not a
 * letter or a digit is stripped.
 */
export function looksLikeNin(ref: string): boolean {
  if (/[^\x20-\x7E]/.test(ref)) return true;
  return /[0-9]{11}/.test(ref.replace(/[^A-Za-z0-9]/g, ""));
}

/** The publish gate's refusal (23514), so a reviewer reads why and not "service down". */
export function isMandateRefusal(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  return e.code === "23514" && typeof e.message === "string" && /SCUML item 17/.test(e.message);
}

/** A delete the five-year rule refused (42501, SCUML item 17). */
export function isMandateRetentionRefusal(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  return e.code === "42501" && typeof e.message === "string" && /SCUML item 17/.test(e.message);
}

export const LISTING_KEPT_MESSAGE =
  "This listing cannot be deleted: it has been live, or the owner's mandate for it was approved, so we keep its record for five years after it closes. Take it down instead.";

export const MANDATE_NEEDED_MESSAGE =
  "This agent listing cannot go live yet: it needs an approved mandate naming the owner it is let for. Approve the mandate on the listings desk first (SCUML item 17).";

/* ------------------------------------------------------------ the form */

export type MandateFormInput = {
  kind: string;
  principalName: string;
  principalPhone: string;
  relationship: string;
  exclusive: "yes" | "no" | "unknown";
  signedOn: string;
  expiresOn: string;
};

export type MandateFormValue = {
  kind: MandateKind;
  principalName: string;
  principalPhone: string | null;
  relationship: Relationship;
  exclusive: boolean | null;
  signedOn: string | null;
  expiresOn: string | null;
};

export type MandateFormField = "kind" | "principalName" | "principalPhone" | "relationship" | "dates" | "endsInThePast";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The lister's form, checked the way the database will check it. `today` is the Lagos date. */
export function readMandateForm(
  input: MandateFormInput,
  today: string,
): { ok: true; value: MandateFormValue } | { ok: false; field: MandateFormField } {
  if (!isMandateKind(input.kind)) return { ok: false, field: "kind" };
  const name = input.principalName.trim();
  if (name.length < 2 || name.length > 160) return { ok: false, field: "principalName" };
  const rawPhone = input.principalPhone.trim();
  const phone = rawPhone.length === 0 ? null : normalisePhone(rawPhone);
  if (rawPhone.length > 0 && phone === null) return { ok: false, field: "principalPhone" };
  if (!isRelationship(input.relationship)) return { ok: false, field: "relationship" };
  const signedOn = input.signedOn.trim() || null;
  const expiresOn = input.expiresOn.trim() || null;
  if ((signedOn && !DAY.test(signedOn)) || (expiresOn && !DAY.test(expiresOn))) return { ok: false, field: "dates" };
  if (signedOn && expiresOn && expiresOn < signedOn) return { ok: false, field: "dates" };
  if (expiresOn && expiresOn < today) return { ok: false, field: "endsInThePast" };
  return {
    ok: true,
    value: {
      kind: input.kind,
      principalName: name,
      principalPhone: phone,
      relationship: input.relationship,
      exclusive: input.exclusive === "yes" ? true : input.exclusive === "no" ? false : null,
      signedOn,
      expiresOn,
    },
  };
}

/* ------------------------------------------------ the lister's own view */

export type MyMandate = {
  id: string;
  kind: MandateKind;
  principalName: string;
  principalPhone: string | null;
  relationship: Relationship | null;
  exclusive: boolean | null;
  signedOn: string | null;
  expiresOn: string | null;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  reviewedAt: string | null;
};

export type MyMandateRead =
  | { state: "failed" }
  | { state: "not_yours" }
  | {
      state: "ok";
      role: "owner" | "agent" | "firm" | null;
      isDemo: boolean;
      listingStatus: string;
      needsMandateSince: string | null;
      /** The waiting mandate if any, else the current one, else the latest refusal. */
      mandate: MyMandate | null;
      /** The approved mandate in force now (possibly run out), if any. */
      current: MyMandate | null;
      /** Within 30 days of the current mandate's end, or past it: a renewal may be filed. */
      renewalOpen: boolean;
      /** The current mandate's end date has passed. */
      currentExpired: boolean;
      /** The Lagos date the database read this on. */
      today: string | null;
      /** A refusal since the current mandate (a refused renewal), with the reason the lister reads. */
      lastRefusal: { reason: string | null; reviewedAt: string | null } | null;
    };

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const reviewStatus = (v: unknown): "pending" | "approved" | "rejected" | null =>
  v === "pending" || v === "approved" || v === "rejected" ? v : null;

export function readMyMandate(data: unknown): MyMandateRead {
  if (!data || typeof data !== "object") return { state: "failed" };
  const d = data as Record<string, unknown>;
  if (d.state === "not_yours") return { state: "not_yours" };
  if (d.state !== "ok") return { state: "failed" };
  const role = d.role === "owner" || d.role === "agent" || d.role === "firm" ? d.role : null;
  const mandate = readOneMandate(d.mandate);
  const current = readOneMandate(d.current);
  if (mandate === "bad" || current === "bad") return { state: "failed" };
  return {
    state: "ok",
    role,
    isDemo: d.is_demo === true,
    listingStatus: typeof d.status === "string" ? d.status : "",
    needsMandateSince: str(d.needs_mandate_since),
    mandate,
    current,
    renewalOpen: d.renewal_open === true,
    currentExpired: d.current_expired === true,
    today: str(d.today),
    lastRefusal:
      d.last_refusal && typeof d.last_refusal === "object"
        ? {
            reason: str((d.last_refusal as Record<string, unknown>).reason),
            reviewedAt: str((d.last_refusal as Record<string, unknown>).reviewed_at),
          }
        : null,
  };
}

function readOneMandate(raw: unknown): MyMandate | null | "bad" {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return "bad";
  const m = raw as Record<string, unknown>;
  const status = reviewStatus(m.review_status);
  const id = str(m.id);
  if (!status || !id || !isMandateKind(m.kind) || typeof m.principal_name !== "string") return "bad";
  return {
    id,
    kind: m.kind,
    principalName: m.principal_name,
    principalPhone: str(m.principal_phone),
    relationship: isRelationship(m.relationship) ? m.relationship : null,
    exclusive: bool(m.exclusive),
    signedOn: str(m.signed_on),
    expiresOn: str(m.expires_on),
    status,
    rejectionReason: str(m.rejection_reason),
    reviewedAt: str(m.reviewed_at),
  };
}

/* ------------------------------------------------------- acting for whom */

export type ActingForMandate = {
  id: string;
  kind: string;
  status: "pending" | "approved" | "rejected";
  principalName: string;
  principalPhoneLast4: string | null;
  relationship: Relationship | null;
  exclusive: boolean | null;
  signedOn: string | null;
  expiresOn: string | null;
  filedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  verifiedHow: VerifiedHow | null;
  verifiedAt: string | null;
  verifiedByName: string | null;
  idDocumentKind: IdDocumentKind | null;
  idDocumentRef: string | null;
  hasDocument: boolean;
  /** When an approved replacement took over; the record is kept. */
  supersededAt: string | null;
  /** In force at the moment of the record looked up (its created_at). */
  inForce: boolean;
  retainedUntil: string | null;
};

export type ActingFor =
  | { state: "failed" }
  | { state: "not_found" }
  | { state: "no_listing" }
  | {
      state: "ok";
      /** The moment the answer is for: the record's own created_at, or now for a listing. */
      asOf: string | null;
      /** themselves: an owner listing. principal: an approved, current mandate. */
      acting: "themselves" | "principal" | "unconfirmed" | "example";
      listing: {
        id: string;
        reference: string | null;
        title: string;
        role: string | null;
        status: string;
        closedAt: string | null;
        needsMandateSince: string | null;
      };
      lister: { agentId: string | null; userId: string | null; name: string | null };
      mandates: ActingForMandate[];
    };

export function readActingFor(data: unknown): ActingFor {
  if (!data || typeof data !== "object") return { state: "failed" };
  const d = data as Record<string, unknown>;
  if (d.state === "no_listing") return { state: "no_listing" };
  if (d.state === "not_found") return { state: "not_found" };
  if (d.state !== "ok") return { state: "failed" };
  const acting =
    d.acting === "themselves" || d.acting === "principal" || d.acting === "unconfirmed" || d.acting === "example"
      ? d.acting
      : null;
  const l = (d.listing ?? null) as Record<string, unknown> | null;
  if (!acting || !l || typeof l.id !== "string") return { state: "failed" };
  const who = (d.lister ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(d.mandates) ? d.mandates : [];
  const mandates: ActingForMandate[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") return { state: "failed" };
    const m = raw as Record<string, unknown>;
    const status = reviewStatus(m.review_status);
    if (!status || typeof m.id !== "string" || typeof m.principal_name !== "string") return { state: "failed" };
    mandates.push({
      id: m.id,
      kind: typeof m.kind === "string" ? m.kind : "",
      status,
      principalName: m.principal_name,
      principalPhoneLast4: str(m.principal_phone_last4),
      relationship: isRelationship(m.relationship) ? m.relationship : null,
      exclusive: bool(m.exclusive),
      signedOn: str(m.signed_on),
      expiresOn: str(m.expires_on),
      filedAt: str(m.filed_at),
      reviewedAt: str(m.reviewed_at),
      rejectionReason: str(m.rejection_reason),
      verifiedHow: isVerifiedHow(m.verified_how) ? m.verified_how : null,
      verifiedAt: str(m.verified_at),
      verifiedByName: str(m.verified_by_name),
      idDocumentKind: isIdDocumentKind(m.id_document_kind) ? m.id_document_kind : null,
      idDocumentRef: str(m.id_document_ref),
      hasDocument: m.has_document === true,
      supersededAt: str(m.superseded_at),
      inForce: m.in_force === true,
      retainedUntil: str(m.retained_until),
    });
  }
  return {
    state: "ok",
    asOf: str(d.as_of),
    acting,
    listing: {
      id: l.id,
      reference: str(l.reference),
      title: typeof l.title === "string" ? l.title : "",
      role: str(l.role),
      status: typeof l.status === "string" ? l.status : "",
      closedAt: str(l.closed_at),
      needsMandateSince: str(l.needs_mandate_since),
    },
    lister: { agentId: str(who.agent_id), userId: str(who.user_id), name: str(who.name) },
    mandates,
  };
}

/* ------------------------------------------------------------ the lane */

export type OwnershipDesk = {
  counts: {
    liveIntermediary: number;
    liveWithMandate: number;
    liveWithoutMandate: number;
    /** Live without a current mandate, with one filed and waiting for us. */
    awaitingDecision: number;
    takenDown: number;
    mandatesWaiting: number;
  };
  needs: {
    id: string;
    reference: string | null;
    title: string;
    status: string;
    since: string | null;
    agentName: string | null;
    lastMandate: "pending" | "approved" | "rejected" | null;
  }[];
  graceEnds: string | null;
};

const count = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

export function readOwnershipDesk(data: unknown): OwnershipDesk | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const c = (d.counts ?? null) as Record<string, unknown> | null;
  if (!c) return null;
  const counts = {
    liveIntermediary: count(c.live_intermediary),
    liveWithMandate: count(c.live_with_mandate),
    liveWithoutMandate: count(c.live_without_mandate),
    awaitingDecision: count(c.awaiting_decision),
    takenDown: count(c.taken_down),
    mandatesWaiting: count(c.mandates_waiting),
  };
  if (Object.values(counts).some((v) => v === null)) return null;
  if (!Array.isArray(d.needs)) return null;
  const needs: OwnershipDesk["needs"] = [];
  for (const raw of d.needs) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string") return null;
    needs.push({
      id: r.id,
      reference: str(r.reference),
      title: typeof r.title === "string" ? r.title : "",
      status: typeof r.status === "string" ? r.status : "",
      since: str(r.since),
      agentName: str(r.agent_name),
      lastMandate: reviewStatus(r.last_mandate),
    });
  }
  return { counts: counts as OwnershipDesk["counts"], needs, graceEnds: str(d.grace_ends) };
}

/** The lookup's GET params (`actingKind`, `actingId`), with a default kind. */
export function readActingForParams(
  params: Record<string, string | string[] | undefined>,
  fallback: ActingForKind,
): { kind: ActingForKind; id: string } {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  const kind = one(params.actingKind);
  return { kind: isActingForKind(kind) ? kind : fallback, id: one(params.actingId).slice(0, 64) };
}
