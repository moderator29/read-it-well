/**
 * D73 Part B, phases 11 and 12: a rental with an approved agreement is paid
 * into a protected arrangement that the licensed provider (Payluk escrow)
 * holds, and released to the lister when the renter confirms (ADR 0003:
 * the provider holds the money, Vallo records it).
 *
 *   open      provider_arrangement_open (database: switch, rent agreement
 *             approved, both parties onboarded, milestones) -> create at the
 *             provider -> awaiting_payment, or unknown when unanswered
 *   pay       the renter funds it from their Payluk balance -> payment_processing;
 *             the provider's webhook (escrow.ongoing) makes it protected
 *   release   the renter's own deliberate confirmation -> release_requested;
 *             escrow.completed makes it released. Milestones one at a time.
 *   webhook   escrow.* -> Vallo's state, through provider_arrangement_observe
 *
 * Rules held here:
 *  - Off unless PAYLUK_ESCROW_FLOWS_BUILT and the `rentals_protected_pay`
 *    switch are both on (the database checks the switch again).
 *  - A reference is never invented and a call is never retried blindly: an
 *    unanswered create is UNKNOWN and is found again by `resolveArrangement`
 *    (read-back by reference), never created twice.
 *  - Release follows the provider's documented release (the buyer confirms),
 *    taken only from the renter's own act. The conditions engine (phase 13:
 *    inspection evidence before release) is not built; until it is, nothing
 *    here releases on Vallo's own initiative.
 */

import { PAYLUK_ESCROW_FLOWS_BUILT } from "../payments/providers/payluk";
import type { PaylukContext } from "../payments/providers/payluk-client";
import {
  buyerOwesMinor,
  confirmMilestone,
  confirmRelease,
  createMilestoneArrangement,
  createStandardArrangement,
  findArrangement,
  fundArrangement,
  parseArrangement,
  readArrangement,
  type PaylukArrangement,
} from "../payments/providers/payluk-arrangements";
import type { RailFailure } from "../payments/provider";
import { deliveryWindowDays, valloStateFor, type ArrangementStatus } from "./arrangement-states";
import type { Db } from "./member-wallet";

export const RENTALS_PROTECTED_PAY_FLAG = "rentals_protected_pay";

export type ArrangementDeps = {
  db: Db;
  ctx: PaylukContext;
  /** Today in Lagos, `YYYY-MM-DD`. */
  todayLagos: () => string;
  alert: (kind: string, detail: Record<string, unknown>) => Promise<void>;
};

export type ArrangementRow = {
  id: string;
  agreement_id: string;
  kind: "standard" | "milestone";
  reference: string;
  provider_arrangement_id: string | null;
  provider_payment_token: string | null;
  amount_minor: number;
  buyer_user_id: string;
  seller_user_id: string;
  buyer_customer_id: string;
  seller_customer_id: string;
  status: ArrangementStatus;
};

type ObserveVerdict = "changed" | "same" | "refused" | "amount_mismatch" | "id_mismatch" | "not_found" | "error";

const ROW = "id, agreement_id, kind, reference, provider_arrangement_id, provider_payment_token, amount_minor, buyer_user_id, seller_user_id, buyer_customer_id, seller_customer_id, status";

/** Both locks: the code reviewed as built, and the founder's switch. */
export async function arrangementsLive(db: Db): Promise<boolean> {
  if (!PAYLUK_ESCROW_FLOWS_BUILT) return false;
  const { data, error } = await db.from("feature_flags").select("enabled").eq("key", RENTALS_PROTECTED_PAY_FLAG).maybeSingle();
  return !error && (data as { enabled?: boolean } | null)?.enabled === true;
}

async function loadRow(db: Db, column: "id" | "provider_arrangement_id" | "reference", value: string): Promise<ArrangementRow | null> {
  const { data, error } = await db.from("provider_arrangements").select(ROW).eq(column, value).maybeSingle();
  if (error || !data) return null;
  const row = data as ArrangementRow;
  return { ...row, amount_minor: Number(row.amount_minor) };
}

async function observe(
  deps: ArrangementDeps,
  row: ArrangementRow,
  to: ArrangementStatus,
  source: "vallo" | "provider_response" | "provider_webhook" | "provider_readback",
  seen: PaylukArrangement | null,
  extra: { eventKey?: string; detail?: Record<string, unknown> } = {},
): Promise<ObserveVerdict> {
  const { data, error } = await deps.db.rpc("provider_arrangement_observe", {
    p_arrangement: row.id,
    p_to_status: to,
    p_source: source,
    p_provider_state: seen?.state ?? null,
    p_provider_status: seen?.status ?? null,
    p_provider_arrangement_id: seen?.id ?? null,
    p_provider_payment_token: seen?.paymentToken || null,
    p_provider_amount_minor: seen?.amountMinor ?? null,
    p_provider_fee_minor: seen?.feeMinor ?? null,
    p_milestones: seen?.milestones.length
      ? seen.milestones.map((m, i) => ({
          position: i + 1,
          provider_milestone_id: m.id,
          status: m.status,
          released_at: m.releasedAt,
        }))
      : null,
    p_provider_event_key: extra.eventKey ?? null,
    p_detail: extra.detail ?? {},
  });
  if (error) return "error";
  const verdict = String(data) as ObserveVerdict;
  if (verdict === "amount_mismatch" || verdict === "id_mismatch") {
    await deps.alert(`arrangement.${verdict}`, { arrangement_id: row.id, reference: row.reference, source });
  }
  return verdict;
}

/** The provider's report onto Vallo's state, observed; an undescribed pair is recorded as a detail only. */
async function observeProvider(
  deps: ArrangementDeps,
  row: ArrangementRow,
  seen: PaylukArrangement,
  source: "provider_response" | "provider_webhook" | "provider_readback",
  eventKey?: string,
): Promise<ObserveVerdict | "unmapped"> {
  const to = valloStateFor(seen.state, seen.status);
  if (!to) return "unmapped";
  return observe(deps, row, to, source, seen, { eventKey });
}

/* ------------------------------------------------------------------ open */

export type OpenInput = {
  agreementId: string;
  kind: "standard" | "milestone";
  /** Who bears Payluk's 2 percent fee. A pricing decision the founder has not made; the caller names it. */
  whoPays: "buyer" | "seller" | "both";
  purpose: string;
  milestones?: { title: string; description?: string | null; amountMinor: number }[];
};

export type OpenOutcome =
  | { outcome: "arranged" | "unknown" | "failed"; arrangementId: string; status: ArrangementStatus }
  | { outcome: "existing"; arrangementId: string; status: ArrangementStatus }
  | { outcome: "refused"; reason: string };

function settledWhy(f: RailFailure): string {
  return `${f.kind}${f.httpStatus ? ` ${f.httpStatus}` : ""}: ${f.detail}`;
}

export async function openArrangement(deps: ArrangementDeps, input: OpenInput): Promise<OpenOutcome> {
  if (!(await arrangementsLive(deps.db))) return { outcome: "refused", reason: "switched_off" };

  /* The delivery window first: no record is made for an agreement whose
     move-in date cannot bound the provider's claim clock. */
  const { data: ag } = await deps.db.from("deal_agreements").select("terms").eq("id", input.agreementId).maybeSingle();
  const moveIn = ((ag as { terms?: Record<string, unknown> } | null)?.terms?.move_in ?? null) as string | null;
  const windowDays = deliveryWindowDays(moveIn, deps.todayLagos());
  if (windowDays === null) return { outcome: "refused", reason: "move_in_unreadable" };

  const { data, error } = await deps.db.rpc("provider_arrangement_open", {
    p_agreement: input.agreementId,
    p_kind: input.kind,
    p_who_pays_fee: input.whoPays,
    p_milestones: input.kind === "milestone"
      ? (input.milestones ?? []).map((m) => ({ title: m.title, description: m.description ?? null, amount_minor: m.amountMinor }))
      : null,
  });
  if (error || !data) return { outcome: "refused", reason: "store_unavailable" };
  const opened = data as { status: string; id?: string; reference?: string };

  if (opened.status === "exists" && opened.id) {
    const row = await loadRow(deps.db, "id", opened.id);
    if (!row) return { outcome: "refused", reason: "store_unavailable" };
    /* Never a second create: an unfinished one is read back. */
    if (row.status === "preparing" || row.status === "unknown") {
      const resolved = await resolveArrangement(deps, row);
      return { outcome: "existing", arrangementId: row.id, status: resolved };
    }
    return { outcome: "existing", arrangementId: row.id, status: row.status };
  }
  if (opened.status !== "ok" || !opened.id) return { outcome: "refused", reason: opened.status };

  const row = await loadRow(deps.db, "id", opened.id);
  if (!row) return { outcome: "refused", reason: "store_unavailable" };

  const terms = { reference: row.reference, amountMinor: row.amount_minor, purpose: input.purpose, whoPays: input.whoPays, windowDays };
  const created =
    input.kind === "milestone"
      ? await createMilestoneArrangement(deps.ctx, row.seller_customer_id, { ...terms, milestones: input.milestones ?? [] })
      : await createStandardArrangement(deps.ctx, row.seller_customer_id, terms);

  if (created.ok) {
    const verdict = await observeProvider(deps, row, created.value, "provider_response");
    if (verdict === "changed" || verdict === "same") {
      return { outcome: "arranged", arrangementId: row.id, status: "awaiting_payment" };
    }
    await observe(deps, row, "unknown", "vallo", null, { detail: { created_but: verdict } });
    return { outcome: "unknown", arrangementId: row.id, status: "unknown" };
  }
  /* Provably not created: refused by the provider, an unapproved key, or held
     by the rate gate before sending. The record closes as failed and a later
     open makes a fresh one. */
  if (created.kind === "refused" || created.kind === "not_configured" || created.kind === "rate_limited") {
    await observe(deps, row, "failed", "provider_response", null, { detail: { why: settledWhy(created) } });
    return { outcome: "failed", arrangementId: row.id, status: "failed" };
  }
  /* Anything else may have reached the provider. */
  await observe(deps, row, "unknown", "vallo", null, { detail: { why: settledWhy(created) } });
  await deps.alert("arrangement.create_unknown", { arrangement_id: row.id, reference: row.reference });
  return { outcome: "unknown", arrangementId: row.id, status: "unknown" };
}

/* ------------------------------------------------------------- read back */

/**
 * Settle an unanswered create (or refresh any record) from the provider's own
 * answer: by payment token when Vallo has one, else by listing the seller's
 * escrows and matching Vallo's reference and the amount. Not found leaves it
 * where it is; it is never created again from here.
 */
export async function resolveArrangement(deps: ArrangementDeps, row: ArrangementRow): Promise<ArrangementStatus> {
  const seen = row.provider_payment_token
    ? await readArrangement(deps.ctx, row.provider_payment_token)
    : await findArrangement(deps.ctx, row.seller_customer_id, { reference: row.reference, amountMinor: row.amount_minor });
  if (!seen.ok || seen.value === null) return row.status;
  await observeProvider(deps, row, seen.value, "provider_readback");
  const fresh = await loadRow(deps.db, "id", row.id);
  return fresh?.status ?? row.status;
}

/* ------------------------------------------------------------------- pay */

export type ActOutcome =
  | { outcome: "submitted" | "unknown" }
  | { outcome: "refused"; reason: string };

/**
 * The renter funds the arrangement from their Payluk balance. Vallo's
 * reference for the payment is the arrangement's reference with `-pay`, so a
 * second press is the same payment, never a second one.
 */
export async function payArrangement(deps: ArrangementDeps, arrangementId: string, actorUserId: string): Promise<ActOutcome> {
  if (!(await arrangementsLive(deps.db))) return { outcome: "refused", reason: "switched_off" };
  const row = await loadRow(deps.db, "id", arrangementId);
  if (!row || row.buyer_user_id !== actorUserId) return { outcome: "refused", reason: "not_found" };
  if (row.status !== "awaiting_payment" || !row.provider_payment_token || !row.provider_arrangement_id) {
    return { outcome: "refused", reason: `not_payable:${row.status}` };
  }
  /* Read the escrow first, as the docs ask, rather than trust a cached quote. */
  const seen = await readArrangement(deps.ctx, row.provider_payment_token);
  if (!seen.ok) return { outcome: "refused", reason: "provider_unreadable" };
  if (seen.value.amountMinor !== row.amount_minor || seen.value.id !== row.provider_arrangement_id) {
    await deps.alert("arrangement.amount_mismatch", { arrangement_id: row.id, reference: row.reference, source: "pay" });
    return { outcome: "refused", reason: "provider_mismatch" };
  }
  const owed = buyerOwesMinor(seen.value);
  if (owed === null) return { outcome: "refused", reason: "fee_share_unclear" };

  const asked = await observe(deps, row, "payment_processing", "vallo", null, { detail: { owed_minor: owed } });
  if (asked !== "changed" && asked !== "same") return { outcome: "refused", reason: `store:${asked}` };

  const paid = await fundArrangement(deps.ctx, row.buyer_customer_id, {
    arrangementId: row.provider_arrangement_id,
    reference: `${row.reference}-pay`,
    owedMinor: owed,
  });
  if (paid.ok) return { outcome: "submitted" };
  if (paid.kind === "refused" || paid.kind === "not_configured" || paid.kind === "rate_limited") {
    /* The provider charged nothing (insufficient balance, amount mismatch,
       wrong state) or the call was never sent. */
    await observe(deps, row, "awaiting_payment", "provider_response", null, { detail: { why: settledWhy(paid) } });
    return { outcome: "refused", reason: paid.kind === "refused" ? paid.detail : paid.kind };
  }
  /* Stays payment_processing: the webhook or a read-back settles it. */
  await deps.alert("arrangement.payment_unknown", { arrangement_id: row.id, reference: `${row.reference}-pay` });
  return { outcome: "unknown" };
}

/* --------------------------------------------------------------- release */

/**
 * The renter confirms, deliberately, and the provider releases to the
 * lister. Standard: the whole amount. Milestone: one milestone, by position.
 */
export async function requestRelease(
  deps: ArrangementDeps,
  arrangementId: string,
  actorUserId: string,
  milestonePosition?: number,
): Promise<ActOutcome> {
  if (!(await arrangementsLive(deps.db))) return { outcome: "refused", reason: "switched_off" };
  const row = await loadRow(deps.db, "id", arrangementId);
  if (!row || row.buyer_user_id !== actorUserId) return { outcome: "refused", reason: "not_found" };
  if (row.status !== "protected" || !row.provider_arrangement_id) return { outcome: "refused", reason: `not_releasable:${row.status}` };

  if (row.kind === "standard") {
    if (milestonePosition !== undefined) return { outcome: "refused", reason: "no_milestones" };
    const asked = await observe(deps, row, "release_requested", "vallo", null);
    if (asked !== "changed") return { outcome: "refused", reason: `store:${asked}` };
    const done = await confirmRelease(deps.ctx, row.buyer_customer_id, row.provider_arrangement_id);
    if (done.ok) return { outcome: "submitted" };
    if (done.kind === "refused" || done.kind === "not_configured" || done.kind === "rate_limited") {
      await observe(deps, row, "protected", "provider_response", null, { detail: { why: settledWhy(done) } });
      return { outcome: "refused", reason: done.kind };
    }
    await deps.alert("arrangement.release_unknown", { arrangement_id: row.id, reference: row.reference });
    return { outcome: "unknown" };
  }

  /* Milestone: the arrangement stays protected until the final milestone;
     each milestone records its own request. */
  if (milestonePosition === undefined) return { outcome: "refused", reason: "milestone_required" };
  const { data: m } = await deps.db
    .from("provider_arrangement_milestones")
    .select("id, provider_milestone_id, status")
    .eq("arrangement_id", row.id)
    .eq("position", milestonePosition)
    .maybeSingle();
  const milestone = m as { id: string; provider_milestone_id: string | null; status: string } | null;
  if (!milestone?.provider_milestone_id || milestone.status !== "pending") return { outcome: "refused", reason: "milestone_not_releasable" };
  const { error: markError } = await deps.db
    .from("provider_arrangement_milestones")
    .update({ status: "release_requested", release_requested_at: new Date().toISOString() })
    .eq("id", milestone.id)
    .eq("status", "pending");
  if (markError) return { outcome: "refused", reason: "store_unavailable" };
  const done = await confirmMilestone(deps.ctx, row.buyer_customer_id, row.provider_arrangement_id, milestone.provider_milestone_id);
  if (done.ok) return { outcome: "submitted" };
  if (done.kind === "refused" || done.kind === "not_configured" || done.kind === "rate_limited") {
    await deps.db
      .from("provider_arrangement_milestones")
      .update({ status: "pending", release_requested_at: null })
      .eq("id", milestone.id)
      .eq("status", "release_requested");
    return { outcome: "refused", reason: done.kind };
  }
  await deps.alert("arrangement.release_unknown", { arrangement_id: row.id, milestone: milestonePosition });
  return { outcome: "unknown" };
}

/* --------------------------------------------------------------- webhook */

const REFERENCE_IN_DESCRIPTION = /Vallo reference (vallo-arr-[0-9a-f]{32})/;

export type WebhookOutcome = ObserveVerdict | "unmapped" | "unknown_arrangement" | "malformed";

/** An `escrow.*` delivery, already signature-checked and stored raw by the route. */
export async function applyArrangementWebhook(deps: ArrangementDeps, data: unknown, eventKey: string): Promise<WebhookOutcome> {
  const seen = parseArrangement(data);
  if (!seen) return "malformed";
  let row = await loadRow(deps.db, "provider_arrangement_id", seen.id);
  if (!row) {
    /* escrow.created can arrive before the create's own answer was recorded. */
    const ref = REFERENCE_IN_DESCRIPTION.exec(seen.description)?.[1];
    row = ref ? await loadRow(deps.db, "reference", ref) : null;
  }
  if (!row) return "unknown_arrangement";
  return observeProvider(deps, row, seen, "provider_webhook", eventKey);
}
