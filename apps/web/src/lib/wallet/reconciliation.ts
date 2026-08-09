import "server-only";

import { failureReason, logMoney } from "../payments/observability";
import {
  PaystackError,
  isPaystackConfigured,
  listSuccessfulCharges,
  metadataObject,
  verifyTransaction,
  verifyTransfer,
  type ChargeSummary,
} from "../payments/paystack";
import { isBookingReference, isFundReference } from "../payments/references";
import { recordMoneyAudit, type MoneyActor } from "./audit";
import {
  findUserByEmail,
  recordFunding,
  settleWithdrawal,
  walletOwnerId,
  type AdminClient,
} from "./ledger";

/**
 * Reconciliation. The permanent answer to "the processor took the money and
 * the ledger never heard about it".
 *
 * THIS EXISTS BECAUSE IT HAPPENED. The owner funded their wallet. Paystack
 * reported success and its delivery log stayed green. Nothing reached the
 * ledger: the live database held zero wallets and zero wallet_entries, and the
 * notifications table had never received a wallet trigger row, which confirms
 * the credit was never written rather than written and lost. The cause was
 * SUPABASE_SERVICE_ROLE_KEY missing from the production runtime, so
 * getAdminClient() returned null and the webhook answered HTTP 200 anyway.
 * Every layer told the truth to itself and nobody told anybody else.
 *
 * A one-off recovery script would have fixed that day and nothing else. What is
 * actually needed is a standing capability, which is what this module is, in
 * three parts:
 *
 *  1. reconcileFundingReference. Given one reference, ask Paystack what it
 *     really did and post the credit if it is missing. This is the recovery
 *     path for a payment somebody has thought to ask about.
 *
 *  2. sweepUnrecordedCharges. Ask Paystack for EVERY successful charge in a
 *     window and compare the lot against wallet_entries and transactions. This
 *     is the part that matters, because it finds the payments nobody knows are
 *     missing. A successful charge that never reached our ledger has to be
 *     impossible to miss, not merely possible to notice.
 *
 *  3. sweepStaleWithdrawalHolds and findOverdrawnWallets. The ledger's own two
 *     ways of being wrong: money held forever against a transfer that never
 *     settled, and a wallet that has gone below zero.
 *
 * IDEMPOTENCY IS THE UNIQUE INDEX AND NOTHING ELSE. Every post here goes
 * through recordFunding, which upserts on the unique `reference` column of
 * wallet_entries with ignoreDuplicates. There is deliberately no second
 * "have we already done this" check in TypeScript: a guard that reads before
 * it writes is a guard with a race in it, and a second source of truth about
 * what has been posted is the beginning of a second ledger. Running any of
 * this twice, or ten times, or at the same time as the webhook, credits
 * exactly once.
 */

/** How far back a routine sweep looks, in hours. */
export const DEFAULT_SWEEP_HOURS = 48;

/**
 * How old a PENDING withdrawal hold must be before the sweeper will even ask
 * Paystack about it. Below this, the transfer is simply in flight.
 */
export const WITHDRAWAL_HOLD_TIMEOUT_MINUTES = 30;

/* ------------------------------------------------------- one reference */

/**
 * What reconciling a single reference did.
 *
 *  - recovered      the charge succeeded, the ledger did not have it, we posted
 *                   it. This is the outcome that gets someone their money back.
 *  - already_posted the ledger already had it. Correct, and the normal answer.
 *  - not_successful Paystack says the charge did not succeed, so there is
 *                   nothing to credit.
 *  - unmatched      the charge succeeded but we cannot tell whose wallet it
 *                   belongs to. Needs a human, and says so.
 *  - not_ours       the reference is not a shape this platform issues.
 *  - unavailable    Paystack or the service role is not configured here.
 *  - failed         something threw. Money may be in an unknown state.
 */
export type ReconcileOutcome =
  | "recovered"
  | "already_posted"
  | "not_successful"
  | "unmatched"
  | "not_ours"
  | "unavailable"
  | "failed";

export type ReconcileResult = {
  outcome: ReconcileOutcome;
  reference: string;
  /** Integer kobo, when the processor told us an amount. */
  amountMinor: number | null;
  /** Whose wallet it landed in, when we could tell. */
  userId: string | null;
  /** Short machine-readable detail, safe to log and to show an admin. */
  reason: string;
};

/**
 * Who a funding belongs to.
 *
 * Metadata first, because fundWallet writes `user_id` into it at checkout, and
 * the customer email second, because metadata is the part of a Paystack
 * transaction that can arrive stringified, arrive empty, or arrive shaped by
 * whichever integration created the charge. verifyFunding has always had this
 * fallback; the webhook did not, which is why a stringified metadata used to
 * drop a funding with no trace.
 */
async function ownerOfCharge(
  metadata: Record<string, unknown>,
  customerEmail: string | null,
): Promise<{ userId: string | null; how: string }> {
  const fromMetadata = metadata["user_id"];
  if (typeof fromMetadata === "string" && fromMetadata.length > 0) {
    return { userId: fromMetadata, how: "metadata_user_id" };
  }
  if (customerEmail && customerEmail.length > 0) {
    const user = await findUserByEmail(customerEmail);
    if (user) return { userId: user.id, how: "customer_email" };
    return { userId: null, how: "email_unknown" };
  }
  return { userId: null, how: "no_identifier" };
}

/**
 * Recover one funding by reference: ask Paystack, post the credit if it is
 * missing, and leave an audit line either way.
 *
 * Safe to run repeatedly. Safe to run while the webhook is running. Safe to run
 * against a reference that has already been credited, which simply reports
 * already_posted.
 */
export async function reconcileFundingReference(
  admin: AdminClient,
  reference: string,
  actor: MoneyActor,
): Promise<ReconcileResult> {
  const trimmed = reference.trim();

  if (!isFundReference(trimmed)) {
    logMoney({ surface: "reconcile", outcome: "ignored", reason: "not_a_fund_reference", reference: trimmed });
    return {
      outcome: "not_ours",
      reference: trimmed,
      amountMinor: null,
      userId: null,
      reason: "not_a_fund_reference",
    };
  }

  if (!isPaystackConfigured()) {
    logMoney({ surface: "reconcile", outcome: "unconfigured", reason: "paystack_key_missing", reference: trimmed });
    return {
      outcome: "unavailable",
      reference: trimmed,
      amountMinor: null,
      userId: null,
      reason: "paystack_key_missing",
    };
  }

  logMoney({ surface: "reconcile", outcome: "received", reason: "verify_requested", reference: trimmed });

  let charge;
  try {
    charge = await verifyTransaction(trimmed);
  } catch (error) {
    const reason = error instanceof PaystackError ? `paystack:${error.message}` : failureReason(error);
    logMoney({ surface: "reconcile", outcome: "failed", reason: `verify_failed:${reason}`, reference: trimmed });
    return { outcome: "failed", reference: trimmed, amountMinor: null, userId: null, reason };
  }

  if (charge.status !== "success") {
    logMoney({
      surface: "reconcile",
      outcome: "ignored",
      reason: `charge_${charge.status}`,
      reference: trimmed,
      amountMinor: charge.amountMinor,
    });
    return {
      outcome: "not_successful",
      reference: trimmed,
      amountMinor: charge.amountMinor,
      userId: null,
      reason: `charge_${charge.status}`,
    };
  }

  if (charge.currency !== "NGN") {
    logMoney({
      surface: "reconcile",
      outcome: "rejected",
      reason: "currency_not_ngn",
      reference: trimmed,
      amountMinor: charge.amountMinor,
    });
    return {
      outcome: "unmatched",
      reference: trimmed,
      amountMinor: charge.amountMinor,
      userId: null,
      reason: "currency_not_ngn",
    };
  }

  if (!Number.isSafeInteger(charge.amountMinor) || charge.amountMinor <= 0) {
    logMoney({ surface: "reconcile", outcome: "rejected", reason: "bad_amount", reference: trimmed });
    return {
      outcome: "unmatched",
      reference: trimmed,
      amountMinor: null,
      userId: null,
      reason: "bad_amount",
    };
  }

  const owner = await ownerOfCharge(charge.metadata, charge.customerEmail);
  if (!owner.userId) {
    // Loud on purpose. This is real money with no home, and only a human can
    // give it one. The reference is in the line, which is all support needs.
    logMoney({
      surface: "reconcile",
      outcome: "failed",
      reason: `owner_unresolved:${owner.how}`,
      reference: trimmed,
      amountMinor: charge.amountMinor,
    });
    await recordMoneyAudit(admin, {
      actor,
      action: "wallet.funding.unmatched",
      reference: trimmed,
      amountMinor: charge.amountMinor,
      outcome: "unmatched",
      detail: { resolution: owner.how },
    });
    return {
      outcome: "unmatched",
      reference: trimmed,
      amountMinor: charge.amountMinor,
      userId: null,
      reason: owner.how,
    };
  }

  let posted: "posted" | "duplicate";
  try {
    posted = await recordFunding(admin, {
      userId: owner.userId,
      amountMinor: charge.amountMinor,
      reference: trimmed,
      metadata: {
        channel: charge.channel,
        paid_at: charge.paidAt,
        purpose: "wallet_fund",
        recovered_by: "reconciliation",
      },
    });
  } catch (error) {
    logMoney({
      surface: "reconcile",
      outcome: "failed",
      reason: `post_failed:${failureReason(error)}`,
      reference: trimmed,
      amountMinor: charge.amountMinor,
      userId: owner.userId,
    });
    return {
      outcome: "failed",
      reference: trimmed,
      amountMinor: charge.amountMinor,
      userId: owner.userId,
      reason: failureReason(error),
    };
  }

  logMoney({
    surface: "reconcile",
    outcome: posted === "posted" ? "posted" : "duplicate",
    reason: posted === "posted" ? `recovered:${owner.how}` : "already_in_ledger",
    reference: trimmed,
    amountMinor: charge.amountMinor,
    userId: owner.userId,
  });

  await recordMoneyAudit(admin, {
    actor,
    action: posted === "posted" ? "wallet.funding.recovered" : "wallet.funding.already_posted",
    reference: trimmed,
    amountMinor: charge.amountMinor,
    subjectUserId: owner.userId,
    outcome: posted,
    detail: { resolution: owner.how, channel: charge.channel },
  });

  return {
    outcome: posted === "posted" ? "recovered" : "already_posted",
    reference: trimmed,
    amountMinor: charge.amountMinor,
    userId: owner.userId,
    reason: owner.how,
  };
}

/* ----------------------------------------------------------- the sweep */

/** One charge the processor has and the ledger does not. */
export type LedgerGap = {
  reference: string;
  amountMinor: number;
  paidAt: string | null;
  /** "funding" is ours to post. "booking" is reported and never posted here. */
  family: "funding" | "booking";
  /** What we did about it on this run. */
  action: "posted" | "reported" | "unmatched" | "failed";
  reason: string;
};

export type SweepReport = {
  /** The window asked about, as ISO instants. */
  from: string;
  to: string;
  /** Successful charges Paystack reported in the window. */
  chargesSeen: number;
  /** Of those, the ones carrying a reference shape this platform issues. */
  chargesOurs: number;
  /** Charges present at the processor and absent from our ledger. */
  gaps: LedgerGap[];
  /** Kobo recovered on this run. Integer. */
  recoveredMinor: number;
  /** True when the sweep could not run at all. */
  unavailable: boolean;
  reason: string;
};

/** wallet_entries references that already exist, out of a candidate list. */
async function existingWalletReferences(
  admin: AdminClient,
  references: string[],
): Promise<Set<string>> {
  const found = new Set<string>();
  const CHUNK = 100;
  for (let i = 0; i < references.length; i += CHUNK) {
    const slice = references.slice(i, i + CHUNK);
    const { data, error } = await admin
      .from("wallet_entries")
      .select("reference")
      .in("reference", slice);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) found.add(row.reference);
  }
  return found;
}

/** transactions provider_refs already settled SUCCESSFUL, out of a list. */
async function settledTransactionReferences(
  admin: AdminClient,
  references: string[],
): Promise<Set<string>> {
  const found = new Set<string>();
  const CHUNK = 100;
  for (let i = 0; i < references.length; i += CHUNK) {
    const slice = references.slice(i, i + CHUNK);
    const { data, error } = await admin
      .from("transactions")
      .select("provider_ref, status")
      .in("provider_ref", slice)
      .eq("status", "SUCCESSFUL");
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (row.provider_ref) found.add(row.provider_ref);
    }
  }
  return found;
}

/** Post one missing funding found by the sweep, from the listing row alone. */
async function postGapFunding(
  admin: AdminClient,
  charge: ChargeSummary,
  actor: MoneyActor,
): Promise<LedgerGap> {
  const base = {
    reference: charge.reference,
    amountMinor: charge.amountMinor,
    paidAt: charge.paidAt,
    family: "funding" as const,
  };

  const owner = await ownerOfCharge(charge.metadata, charge.customerEmail);
  if (!owner.userId) {
    logMoney({
      surface: "reconcile",
      outcome: "failed",
      reason: `gap_owner_unresolved:${owner.how}`,
      reference: charge.reference,
      amountMinor: charge.amountMinor,
    });
    await recordMoneyAudit(admin, {
      actor,
      action: "wallet.funding.unmatched",
      reference: charge.reference,
      amountMinor: charge.amountMinor,
      outcome: "unmatched",
      detail: { resolution: owner.how, found_by: "sweep" },
    });
    return { ...base, action: "unmatched", reason: owner.how };
  }

  try {
    const posted = await recordFunding(admin, {
      userId: owner.userId,
      amountMinor: charge.amountMinor,
      reference: charge.reference,
      metadata: {
        channel: charge.channel,
        paid_at: charge.paidAt,
        purpose: "wallet_fund",
        recovered_by: "sweep",
      },
    });
    logMoney({
      surface: "reconcile",
      outcome: posted === "posted" ? "posted" : "duplicate",
      reason: posted === "posted" ? "gap_recovered" : "gap_raced_with_webhook",
      reference: charge.reference,
      amountMinor: charge.amountMinor,
      userId: owner.userId,
    });
    await recordMoneyAudit(admin, {
      actor,
      action: "wallet.funding.recovered",
      reference: charge.reference,
      amountMinor: charge.amountMinor,
      subjectUserId: owner.userId,
      outcome: posted,
      detail: { resolution: owner.how, found_by: "sweep" },
    });
    return { ...base, action: "posted", reason: posted };
  } catch (error) {
    logMoney({
      surface: "reconcile",
      outcome: "failed",
      reason: `gap_post_failed:${failureReason(error)}`,
      reference: charge.reference,
      amountMinor: charge.amountMinor,
      userId: owner.userId,
    });
    return { ...base, action: "failed", reason: failureReason(error) };
  }
}

/**
 * Compare every successful charge in a window against the ledger.
 *
 * `apply: false` reports and changes nothing, which is what a first run on a
 * live database should always be. `apply: true` posts the funding gaps.
 *
 * BOOKING GAPS ARE REPORTED AND NEVER POSTED HERE, on purpose. Settling a
 * booking charge does far more than write a ledger row: it confirms the stay,
 * closes calendar nights and emails the guest and the host. A sweeper doing
 * that unattended at three in the morning, possibly for dates that have already
 * passed, is a worse outcome than a loud report naming the reference. The
 * report says exactly which references need lib/bookings/settlement.ts run
 * against them, and that is a decision with a human in it.
 */
export async function sweepUnrecordedCharges(
  admin: AdminClient,
  options?: { hours?: number; apply?: boolean; actor?: MoneyActor; maxPages?: number },
): Promise<SweepReport> {
  const hours = Math.max(1, Math.min(options?.hours ?? DEFAULT_SWEEP_HOURS, 24 * 90));
  const apply = options?.apply ?? false;
  const actor: MoneyActor = options?.actor ?? { kind: "sweep" };

  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - hours * 60 * 60 * 1000);
  const from = fromDate.toISOString();
  const to = toDate.toISOString();

  const empty: SweepReport = {
    from,
    to,
    chargesSeen: 0,
    chargesOurs: 0,
    gaps: [],
    recoveredMinor: 0,
    unavailable: true,
    reason: "",
  };

  if (!isPaystackConfigured()) {
    logMoney({ surface: "reconcile", outcome: "unconfigured", reason: "paystack_key_missing" });
    return { ...empty, reason: "paystack_key_missing" };
  }

  logMoney({ surface: "reconcile", outcome: "received", reason: `sweep_started:${hours}h` });

  let charges: ChargeSummary[];
  try {
    charges = await listSuccessfulCharges({
      from,
      to,
      ...(options?.maxPages === undefined ? {} : { maxPages: options.maxPages }),
    });
  } catch (error) {
    const reason = error instanceof PaystackError ? `paystack:${error.message}` : failureReason(error);
    logMoney({ surface: "reconcile", outcome: "failed", reason: `sweep_list_failed:${reason}` });
    return { ...empty, reason };
  }

  const funding = charges.filter((c) => isFundReference(c.reference));
  const booking = charges.filter((c) => isBookingReference(c.reference));

  let knownFunding: Set<string>;
  let knownBooking: Set<string>;
  try {
    knownFunding = await existingWalletReferences(admin, funding.map((c) => c.reference));
    knownBooking = await settledTransactionReferences(admin, booking.map((c) => c.reference));
  } catch (error) {
    logMoney({
      surface: "reconcile",
      outcome: "failed",
      reason: `sweep_ledger_read_failed:${failureReason(error)}`,
    });
    return { ...empty, reason: failureReason(error) };
  }

  const gaps: LedgerGap[] = [];
  let recoveredMinor = 0;

  for (const charge of funding) {
    if (knownFunding.has(charge.reference)) continue;
    if (!apply) {
      logMoney({
        surface: "reconcile",
        outcome: "failed",
        reason: "gap_found_not_applied",
        reference: charge.reference,
        amountMinor: charge.amountMinor,
      });
      gaps.push({
        reference: charge.reference,
        amountMinor: charge.amountMinor,
        paidAt: charge.paidAt,
        family: "funding",
        action: "reported",
        reason: "dry_run",
      });
      continue;
    }
    const gap = await postGapFunding(admin, charge, actor);
    if (gap.action === "posted" && gap.reason === "posted") recoveredMinor += gap.amountMinor;
    gaps.push(gap);
  }

  for (const charge of booking) {
    if (knownBooking.has(charge.reference)) continue;
    // Reported, never posted. See the note on this function.
    logMoney({
      surface: "reconcile",
      outcome: "failed",
      reason: "booking_charge_unsettled",
      reference: charge.reference,
      amountMinor: charge.amountMinor,
    });
    await recordMoneyAudit(admin, {
      actor,
      action: "wallet.booking.unsettled",
      reference: charge.reference,
      amountMinor: charge.amountMinor,
      outcome: "reported",
      detail: { found_by: "sweep" },
    });
    gaps.push({
      reference: charge.reference,
      amountMinor: charge.amountMinor,
      paidAt: charge.paidAt,
      family: "booking",
      action: "reported",
      reason: "needs_booking_settlement",
    });
  }

  logMoney({
    surface: "reconcile",
    outcome: gaps.length > 0 ? "failed" : "posted",
    reason: `sweep_finished:seen=${charges.length}:ours=${funding.length + booking.length}:gaps=${gaps.length}`,
    amountMinor: recoveredMinor,
  });

  return {
    from,
    to,
    chargesSeen: charges.length,
    chargesOurs: funding.length + booking.length,
    gaps,
    recoveredMinor,
    unavailable: false,
    reason: gaps.length > 0 ? "gaps_found" : "clean",
  };
}

/* ------------------------------------------------- stale withdrawal holds */

export type HoldResolution = {
  reference: string;
  amountMinor: number;
  ageMinutes: number;
  /** What the sweeper did: settled it, released it, or left it alone. */
  action: "completed" | "released" | "left_pending" | "failed";
  reason: string;
};

export type HoldSweepReport = {
  examined: number;
  resolutions: HoldResolution[];
  /** Kobo handed back to spendable balances on this run. Integer. */
  releasedMinor: number;
  unavailable: boolean;
  reason: string;
};

/**
 * PENDING withdrawal holds that have outlived their transfer.
 *
 * A withdrawal posts a PENDING debit hold and then hands the same reference to
 * Paystack. availableBalanceMinor subtracts every pending debit, so a hold
 * whose settlement webhook never arrives holds that money out of the owner's
 * spendable balance FOREVER. Nothing swept them. There was no timeout anywhere.
 * A person could be locked out of their own money by a delivery that got lost.
 *
 * The sweeper does not expire on age. It asks Paystack what became of each
 * transfer and acts on the answer, because a hold whose transfer really did pay
 * out must never be handed back. Age only decides which holds are worth asking
 * about; the processor decides what happens to them.
 *
 * The write is `settleWithdrawal`, a single UPDATE conditional on the row still
 * being kind='withdrawal' and status='PENDING'. One statement, so a webhook
 * arriving mid-sweep and this sweeper cannot both settle the same hold.
 */
export async function sweepStaleWithdrawalHolds(
  admin: AdminClient,
  options?: { olderThanMinutes?: number; apply?: boolean; actor?: MoneyActor },
): Promise<HoldSweepReport> {
  const olderThanMinutes = Math.max(5, options?.olderThanMinutes ?? WITHDRAWAL_HOLD_TIMEOUT_MINUTES);
  const apply = options?.apply ?? false;
  const actor: MoneyActor = options?.actor ?? { kind: "sweep" };

  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("wallet_entries")
    .select("reference, wallet_id, amount_minor, created_at")
    .eq("kind", "withdrawal")
    .eq("status", "PENDING")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    logMoney({
      surface: "withdraw",
      outcome: "failed",
      reason: `hold_sweep_read_failed:${error.message}`,
    });
    return { examined: 0, resolutions: [], releasedMinor: 0, unavailable: true, reason: error.message };
  }

  const holds = data ?? [];
  if (holds.length === 0) {
    return { examined: 0, resolutions: [], releasedMinor: 0, unavailable: false, reason: "clean" };
  }

  if (!isPaystackConfigured()) {
    // Holds exist and we cannot ask about them. That is worth saying out loud:
    // somebody's balance is held and nothing here can free it.
    logMoney({
      surface: "withdraw",
      outcome: "unconfigured",
      reason: `holds_stranded:${holds.length}`,
    });
    return {
      examined: holds.length,
      resolutions: [],
      releasedMinor: 0,
      unavailable: true,
      reason: "paystack_key_missing",
    };
  }

  const resolutions: HoldResolution[] = [];
  let releasedMinor = 0;

  for (const hold of holds) {
    const ageMinutes = Math.max(
      0,
      Math.round((Date.now() - new Date(hold.created_at).getTime()) / 60000),
    );
    const base = { reference: hold.reference, amountMinor: hold.amount_minor, ageMinutes };

    let verdict: "COMPLETED" | "FAILED" | "REVERSED" | null = null;
    let reason: string;

    try {
      const transfer = await verifyTransfer(hold.reference);
      if (transfer.status === "success") {
        verdict = "COMPLETED";
        reason = "transfer_succeeded";
      } else if (transfer.status === "reversed") {
        verdict = "REVERSED";
        reason = "transfer_reversed";
      } else if (transfer.status === "failed" || transfer.status === "abandoned") {
        verdict = "FAILED";
        reason = `transfer_${transfer.status}`;
      } else {
        reason = `transfer_${transfer.status}`;
      }
    } catch (error) {
      // Paystack does not know this reference, so the transfer never started
      // and the hold is an orphan. This is the exact case the timeout exists
      // for: withdraw() posted the hold and then could not reach the processor.
      if (error instanceof PaystackError && error.status === 404) {
        verdict = "FAILED";
        reason = "transfer_never_started";
      } else {
        logMoney({
          surface: "withdraw",
          outcome: "failed",
          reason: `hold_verify_failed:${failureReason(error)}`,
          reference: hold.reference,
          amountMinor: hold.amount_minor,
        });
        resolutions.push({ ...base, action: "failed", reason: failureReason(error) });
        continue;
      }
    }

    if (verdict === null) {
      logMoney({
        surface: "withdraw",
        outcome: "received",
        reason: `hold_still_in_flight:${reason}:age=${ageMinutes}m`,
        reference: hold.reference,
        amountMinor: hold.amount_minor,
      });
      resolutions.push({ ...base, action: "left_pending", reason });
      continue;
    }

    if (!apply) {
      resolutions.push({
        ...base,
        action: verdict === "COMPLETED" ? "completed" : "released",
        reason: `${reason}:dry_run`,
      });
      continue;
    }

    try {
      const settled = await settleWithdrawal(admin, hold.reference, verdict);
      if (!settled) {
        // Somebody else settled it between the read and now, which is exactly
        // what the conditional update is for.
        resolutions.push({ ...base, action: "left_pending", reason: "settled_elsewhere" });
        continue;
      }
      const ownerId = await walletOwnerId(admin, settled.walletId);
      if (verdict !== "COMPLETED") releasedMinor += settled.amountMinor;
      logMoney({
        surface: "withdraw",
        outcome: "posted",
        reason: `hold_${verdict.toLowerCase()}:${reason}`,
        reference: hold.reference,
        amountMinor: settled.amountMinor,
        walletId: settled.walletId,
        ...(ownerId ? { userId: ownerId } : {}),
      });
      await recordMoneyAudit(admin, {
        actor,
        action: "wallet.withdrawal.hold_resolved",
        reference: hold.reference,
        amountMinor: settled.amountMinor,
        walletId: settled.walletId,
        subjectUserId: ownerId,
        outcome: verdict,
        detail: { resolution: reason, age_minutes: ageMinutes },
      });
      resolutions.push({
        ...base,
        action: verdict === "COMPLETED" ? "completed" : "released",
        reason,
      });
    } catch (error) {
      logMoney({
        surface: "withdraw",
        outcome: "failed",
        reason: `hold_settle_failed:${failureReason(error)}`,
        reference: hold.reference,
      });
      resolutions.push({ ...base, action: "failed", reason: failureReason(error) });
    }
  }

  return {
    examined: holds.length,
    resolutions,
    releasedMinor,
    unavailable: false,
    reason: resolutions.length > 0 ? "resolved" : "clean",
  };
}

/* ------------------------------------------------------------ overdrawn */

export type OverdrawnWallet = {
  walletId: string;
  userId: string | null;
  balanceMinor: number;
};

/**
 * Wallets whose derived balance has gone below zero.
 *
 * `private.wallets_overdrawn()` has existed the whole time and nothing has ever
 * called it. A negative balance is the ledger contradicting itself: it means
 * debits were posted that the balance check should have refused, which is
 * precisely what the unlocked read-then-write paths in actions.ts could
 * produce under two concurrent transfers.
 *
 * Read through the `wallet_balances` view rather than the private function,
 * because PostgREST exposes the public schema only and the view computes the
 * identical arithmetic. When Agent B lands `public.wallets_overdrawn()` this
 * can call it instead; the answer is the same either way, which is the point of
 * having one derivation of a balance.
 */
export async function findOverdrawnWallets(admin: AdminClient): Promise<OverdrawnWallet[]> {
  const { data, error } = await admin
    .from("wallet_balances")
    .select("wallet_id, user_id, balance_minor")
    .lt("balance_minor", 0);

  if (error) {
    logMoney({ surface: "reconcile", outcome: "failed", reason: `overdrawn_read_failed:${error.message}` });
    return [];
  }

  const rows = (data ?? []).filter((row): row is typeof row & { wallet_id: string } =>
    typeof row.wallet_id === "string",
  );

  for (const row of rows) {
    // A wallet below zero is never routine. It gets its own error line every
    // single run until somebody fixes it.
    logMoney({
      surface: "reconcile",
      outcome: "failed",
      reason: "wallet_overdrawn",
      walletId: row.wallet_id,
      userId: row.user_id,
      amountMinor: row.balance_minor ?? 0,
    });
  }

  return rows.map((row) => ({
    walletId: row.wallet_id,
    userId: row.user_id,
    balanceMinor: row.balance_minor ?? 0,
  }));
}

/* --------------------------------------------------------- the whole run */

export type MoneyReconciliationReport = {
  charges: SweepReport;
  holds: HoldSweepReport;
  overdrawn: OverdrawnWallet[];
  /** True when anything at all needs a human. */
  needsAttention: boolean;
};

/**
 * Everything, in one call: the processor against the ledger, the ledger's stuck
 * holds, and the ledger against itself. This is what the scheduled job runs.
 */
export async function runMoneyReconciliation(
  admin: AdminClient,
  options?: { hours?: number; apply?: boolean; actor?: MoneyActor },
): Promise<MoneyReconciliationReport> {
  const actor: MoneyActor = options?.actor ?? { kind: "sweep" };
  const charges = await sweepUnrecordedCharges(admin, {
    ...(options?.hours === undefined ? {} : { hours: options.hours }),
    ...(options?.apply === undefined ? {} : { apply: options.apply }),
    actor,
  });
  const holds = await sweepStaleWithdrawalHolds(admin, {
    ...(options?.apply === undefined ? {} : { apply: options.apply }),
    actor,
  });
  const overdrawn = await findOverdrawnWallets(admin);

  const needsAttention =
    charges.unavailable ||
    charges.gaps.length > 0 ||
    holds.unavailable ||
    holds.resolutions.some((r) => r.action === "failed" || r.action === "released") ||
    overdrawn.length > 0;

  return { charges, holds, overdrawn, needsAttention };
}
