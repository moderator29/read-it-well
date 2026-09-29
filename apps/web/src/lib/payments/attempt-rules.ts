/**
 * The rules for a card payment attempt's life, as pure functions.
 *
 * THE PROBLEM THEY SOLVE (audit, 28 September 2026). A payer who cancelled or
 * walked away from the Paystack window left the attempt PENDING. That blocked
 * cancelling the agreement for two hours (`payment_in_flight`) and every retry
 * opened another pending attempt. Now:
 *
 *  - a retry REUSES the live attempt's Paystack checkout (its access code)
 *    when it is still for the same charge, so one payer and one charge have
 *    one open attempt (`pickReusableAttempt`);
 *  - an attempt Paystack says was never completed becomes ABANDONED, either at
 *    once when the payer closes the window, or after the abandonment window
 *    (`judgeAttempt`). The client's "I closed it" is never trusted alone: the
 *    server asks Paystack first, and only abandoned, failed or not-found close
 *    anything. Success settles through the normal path. Anything else,
 *    including a network failure, leaves the attempt PENDING;
 *  - `payment_in_flight` counts only attempts genuinely in flight
 *    (`isAttemptInFlight`, the TypeScript twin of the SQL
 *    `private.payment_attempt_in_flight`).
 *
 * Every window here is the SQL one; `attempt-rules.test.ts` pins both.
 */

/**
 * How long after it was last opened an unfinished attempt still counts as in
 * flight by the clock alone. Pay with Transfer is the slowest ordinary way to
 * finish a Paystack checkout and its one-time account lives 30 minutes; card
 * OTP and 3-D Secure expire well inside that; 15 more minutes cover a bank's
 * late transfer notification. Slower than that is counted only when Paystack
 * itself says the charge is still moving.
 */
export const ABANDON_AFTER_MINUTES = 45;

/**
 * How recently the payer must have been handed a checkout for a retry to reuse
 * it. Shorter than the abandonment window, so an attempt is never handed back
 * moments before the sweep may close it (reusing it moves `checkout_opened_at`
 * and restarts that window).
 */
export const REUSE_WITHIN_MINUTES = 30;

/** However often it is reopened, an attempt older than this is not reused. */
export const REUSE_MAX_AGE_MINUTES = 120;

/** Paystack's words for a charge that is still moving. */
export const PROCESSOR_IN_PROGRESS = ["ongoing", "pending", "processing", "queued"] as const;

/** A processor "still moving" answer counts for this long after it was given. */
export const PROCESSOR_ANSWER_VALID_MINUTES = 120;

/** And never for an attempt older than this. */
export const IN_FLIGHT_CEILING_HOURS = 24;

const MINUTE = 60_000;

function ms(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

function isInProgress(status: string | null | undefined): boolean {
  return (PROCESSOR_IN_PROGRESS as readonly string[]).includes((status ?? "").toLowerCase());
}

export type AttemptClock = {
  status: string;
  created_at: string;
  checkout_opened_at: string | null;
  processor_status: string | null;
  processor_checked_at: string | null;
};

/** When the payer was last handed this attempt's checkout. */
export function lastOpenedAt(row: Pick<AttemptClock, "created_at" | "checkout_opened_at">): number {
  return ms(row.checkout_opened_at) ?? ms(row.created_at) ?? 0;
}

/**
 * Is this attempt genuinely in flight? The same predicate as the SQL
 * `private.payment_attempt_in_flight`, which is what `agreement_cancel_as` and
 * the hold sweep ask.
 */
export function isAttemptInFlight(row: AttemptClock, now: number): boolean {
  if (row.status !== "PENDING") return false;
  if (lastOpenedAt(row) > now - ABANDON_AFTER_MINUTES * MINUTE) return true;
  const checked = ms(row.processor_checked_at);
  const created = ms(row.created_at) ?? 0;
  return (
    isInProgress(row.processor_status) &&
    checked !== null &&
    checked > now - PROCESSOR_ANSWER_VALID_MINUTES * MINUTE &&
    created > now - IN_FLIGHT_CEILING_HOURS * 60 * MINUTE
  );
}

/* ------------------------------------------------------------------ reuse */

/** The charge a new attempt would be for, as the database computed it. */
export type ExpectedCharge = {
  agreementId: string;
  amountMinor: number;
  payeeSubaccount: string;
  reserveSubaccount: string;
  listerShareMinor: number;
  guaranteeMinor: number;
  commissionMinor: number;
  mode: "live" | "test";
  /**
   * Whose share this is, for a flatmate share of a rent charge. Null or absent
   * means a whole-booking charge, which never reuses a share attempt, and a
   * share never reuses another payer's attempt however equal the amounts.
   */
  sharePayerId?: string | null;
};

export type ReusableRow = AttemptClock & {
  id: string;
  provider_ref: string | null;
  access_code: string | null;
  authorization_url: string | null;
  amount_minor: number;
  agreement_id: string | null;
  payee_subaccount_code: string | null;
  reserve_subaccount_code: string | null;
  lister_share_minor: number | null;
  guarantee_minor: number | null;
  commission_minor: number | null;
  paystack_mode: string | null;
  share_payer_id?: string | null;
};

/**
 * The attempt a retry may reuse, or null to open a new one.
 *
 * Reused only when it is the SAME charge: same agreement, same amount, same
 * split to the same subaccounts, opened on the same Paystack mode. An
 * agreement amended since, a payee who changed their settlement account, or a
 * switch between test and live all mean a new attempt, because an old access
 * code would charge the old terms. Most recently opened first.
 */
export function pickReusableAttempt(
  rows: readonly ReusableRow[],
  expected: ExpectedCharge,
  now: number,
): ReusableRow | null {
  const candidates = rows
    .filter((r) => r.status === "PENDING")
    .filter((r) => (r.access_code ?? "").length > 0 && (r.provider_ref ?? "").length > 0)
    .filter((r) => (r.paystack_mode ?? "live") === expected.mode)
    .filter((r) => (r.share_payer_id ?? null) === (expected.sharePayerId ?? null))
    .filter(
      (r) =>
        r.agreement_id === expected.agreementId &&
        Number(r.amount_minor) === expected.amountMinor &&
        r.payee_subaccount_code === expected.payeeSubaccount &&
        r.reserve_subaccount_code === expected.reserveSubaccount &&
        Number(r.lister_share_minor) === expected.listerShareMinor &&
        Number(r.guarantee_minor) === expected.guaranteeMinor &&
        Number(r.commission_minor) === expected.commissionMinor,
    )
    .filter((r) => lastOpenedAt(r) > now - REUSE_WITHIN_MINUTES * MINUTE)
    .filter((r) => (ms(r.created_at) ?? 0) > now - REUSE_MAX_AGE_MINUTES * MINUTE)
    .sort((a, b) => lastOpenedAt(b) - lastOpenedAt(a));
  return candidates[0] ?? null;
}

/* ----------------------------------------------------------------- judging */

/** What asking Paystack about one reference came back with. */
export type VerifyAnswer =
  | { kind: "status"; status: string }
  /** Paystack answered, clearly, that it has no such transaction. */
  | { kind: "not-found" }
  /** No answer we can act on: a network failure, a timeout, a 5xx, a refused key. */
  | { kind: "unknown" };

export type AttemptVerdict =
  /** Paystack took the money: settle through the normal path. */
  | { action: "settle" }
  /** Paystack says the charge failed: FAILED. */
  | { action: "fail"; processorStatus: string }
  /** Nobody paid and nobody will on this checkout: ABANDONED. */
  | { action: "abandon"; reason: "payer_closed" | "sweep_abandoned" | "sweep_not_found"; processorStatus: string | null }
  /** Leave it PENDING. Record what Paystack said when it said something. */
  | { action: "keep"; processorStatus: string | null };

/**
 * Decide what an attempt becomes on Paystack's answer.
 *
 * `payerClosed` is true only on the server action the payer's own close
 * button calls. It lets "abandoned" close the attempt at once instead of after
 * the window; it never closes one on its own, because the client is not
 * trusted: without Paystack's word the attempt stays PENDING.
 *
 * Paystack reports a checkout that has been opened but not paid as
 * "abandoned", including one the payer is still looking at. That is why the
 * sweep closes an "abandoned" attempt only once it is past the abandonment
 * window, and why a late payment on an ABANDONED attempt is still settled
 * (the settlement accepts any status but SUCCESSFUL and REFUNDED).
 */
export function judgeAttempt(
  answer: VerifyAnswer,
  context: { payerClosed: boolean; openedAt: number; now: number },
): AttemptVerdict {
  const pastWindow = context.openedAt <= context.now - ABANDON_AFTER_MINUTES * MINUTE;
  if (answer.kind === "unknown") return { action: "keep", processorStatus: null };
  if (answer.kind === "not-found") {
    if (context.payerClosed) return { action: "abandon", reason: "payer_closed", processorStatus: null };
    return pastWindow
      ? { action: "abandon", reason: "sweep_not_found", processorStatus: null }
      : { action: "keep", processorStatus: null };
  }
  const status = answer.status.toLowerCase();
  if (status === "success") return { action: "settle" };
  if (status === "failed" || status === "reversed") return { action: "fail", processorStatus: status };
  if (status === "abandoned") {
    if (context.payerClosed) return { action: "abandon", reason: "payer_closed", processorStatus: status };
    return pastWindow
      ? { action: "abandon", reason: "sweep_abandoned", processorStatus: status }
      : { action: "keep", processorStatus: status };
  }
  /* ongoing, pending, processing, queued, or a word Paystack adds later: the
     money may still be moving, so nothing is closed. */
  return { action: "keep", processorStatus: status.slice(0, 40) };
}

/**
 * What a retry does with the live attempt it found, on Paystack's answer.
 *
 *  - reuse     hand the same checkout back. "abandoned" is Paystack's word
 *              for a checkout opened and not yet paid, which is exactly the
 *              one a returning payer should resume; a charge still moving is
 *              resumed too, never duplicated. No usable answer also reuses:
 *              handing back the same checkout can never charge twice, while
 *              opening a second one beside a live one could.
 *  - settle    it was paid: settle through the normal path, open nothing.
 *  - replace   it failed, or Paystack has no such transaction: close it
 *              (FAILED or ABANDONED) and open a new one.
 */
export type ReuseDecision =
  | { action: "reuse"; processorStatus: string | null }
  | { action: "settle" }
  | { action: "replace"; verdict: Exclude<AttemptVerdict, { action: "settle" } | { action: "keep" }> };

export function decideReuse(answer: VerifyAnswer): ReuseDecision {
  if (answer.kind === "unknown") return { action: "reuse", processorStatus: null };
  if (answer.kind === "not-found") {
    return { action: "replace", verdict: { action: "abandon", reason: "sweep_not_found", processorStatus: null } };
  }
  const status = answer.status.toLowerCase();
  if (status === "success") return { action: "settle" };
  if (status === "failed" || status === "reversed") {
    return { action: "replace", verdict: { action: "fail", processorStatus: status } };
  }
  return { action: "reuse", processorStatus: status.slice(0, 40) };
}
