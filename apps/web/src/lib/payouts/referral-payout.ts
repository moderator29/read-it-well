import "server-only";

import { z } from "zod";

import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { resolveBankAccountName } from "../payments/bank-resolve";
import { currentPaystack } from "../payments/paystack-mode";
import { consume, subjectForUser } from "../security/rate-limit";
import { hasServiceRole } from "../security/service-rpc";
import { createAdminClient } from "../supabase/admin";
import { runRewardsPayout, settleFromProvider, type PayoutDb } from "./referral-payout-core";
import { isRewardsReference, outcomeForEvent, type TransferDeps } from "./referral-transfer";

/**
 * THE REWARDS BALANCE PAYOUT (D51): server action, webhook settlement, sweep.
 *
 * Order of events, every one of them server-side:
 *   1. the bank resolves the account name (never the member's typing);
 *   2. `rewards_payout_open` holds the available rewards in the append-only
 *      ledger and mints an idempotent reference, or routes to review;
 *   3. a Paystack transfer recipient and a transfer from the balance (the
 *      marketing float) under that reference;
 *   4. PAID ONLY WHEN PAYSTACK CONFIRMS: the `transfer.success` webhook, or the
 *      sweep's `/transfer/verify`. A timeout is `unknown`, never `failed`.
 *
 * The webhook route (`app/api/paystack/webhook/route.ts`, not this file's
 * owner) currently acknowledges and ignores every `transfer.*` event; it must
 * call `settleRewardsTransferEvent` for references that start `vallo-rw-`.
 */

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

function adminDb(): PayoutDb {
  const admin = createAdminClient() as unknown as Rpc;
  return {
    async open(input) {
      const { data, error } = await admin.rpc("rewards_payout_open", {
        p_member: input.memberId,
        p_bank_code: input.bankCode,
        p_account_number: input.accountNumber,
        p_account_name: input.accountName,
      });
      if (error || !data || typeof data !== "object") return { status: "error" };
      return data as Awaited<ReturnType<PayoutDb["open"]>>;
    },
    async settle(input) {
      const { error } = await admin.rpc("rewards_payout_settle", {
        p_reference: input.reference,
        p_outcome: input.outcome,
        p_provider_status: input.providerStatus ?? null,
        p_transfer_code: input.transferCode ?? null,
        p_recipient_code: input.recipientCode ?? null,
        p_reason: input.reason ?? null,
      });
      return !error;
    },
  };
}

function transferDeps(): TransferDeps {
  return { secretKey: currentPaystack().secretKey };
}

const payoutSchema = z.object({
  bankCode: z.string().trim().min(1, "Choose your bank.").max(12),
  accountNumber: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => /^\d{10}$/.test(v), "A Nigerian account number is exactly ten digits."),
});

const MESSAGES = {
  phone_required: "Confirm your phone number in Settings before you withdraw your Rewards Balance.",
  below_minimum: "Your Rewards Balance has not reached the withdrawal minimum yet.",
  already_open: "A withdrawal from your Rewards Balance is already on its way.",
  not_confirmed: "We could not confirm that account with the bank. Check the number and the bank.",
  unreachable: "We could not reach the bank just now. Nothing was sent. Please try again.",
  error: "Your withdrawal could not be started. Nothing was sent.",
  invalid: "Your withdrawal could not be started. Nothing was sent.",
} as const;

export type RewardsPayoutResult = { status: "processing" | "under_review" | "unknown" | "failed"; amountMinor: number };

/** The member asks for their Rewards Balance to be paid to a bank account. */
export async function requestRewardsPayout(input: unknown): Promise<ActionResult<RewardsPayoutResult>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const parsed = validate(payoutSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  if (!hasServiceRole()) return fail(NOT_CONFIGURED_MESSAGE);

  const verdict = await consume({
    bucket: "rewards_payout",
    subject: subjectForUser(session.user.id),
    limit: 5,
    windowSeconds: 3600,
  });
  if (!verdict.allowed || verdict.degraded) return fail("Too many attempts. Please wait an hour and try again.");

  const resolved = await resolveBankAccountName(parsed.data);
  if (!resolved.ok) {
    return fail(resolved.failure === "not-confirmed" ? MESSAGES.not_confirmed : MESSAGES.unreachable);
  }

  const outcome = await runRewardsPayout(
    { db: adminDb(), transfer: transferDeps() },
    {
      memberId: session.user.id,
      bankCode: parsed.data.bankCode,
      accountNumber: resolved.accountNumber,
      accountName: resolved.accountName,
    },
  );
  if (outcome.kind === "refused") return fail(MESSAGES[outcome.reason]);
  return ok({ status: outcome.status, amountMinor: outcome.amountMinor });
}

/**
 * For the Paystack webhook, after its signature check. Returns false for an
 * event this file does not own, so the route can carry on as before.
 */
export async function settleRewardsTransferEvent(event: string, data: unknown): Promise<boolean> {
  const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  if (!isRewardsReference(row.reference)) return false;
  const outcome = outcomeForEvent(event);
  if (!outcome) return true;
  // A webhook is a claim; the provider's own verify is the confirmation for a payment.
  return settleFromProvider({ db: adminDb(), transfer: transferDeps() }, row.reference);
}

/** The cron sweep: ask Paystack about every payout still in flight. */
export async function sweepRewardsPayouts(): Promise<{ checked: number }> {
  if (!hasServiceRole()) return { checked: 0 };
  const admin = createAdminClient() as unknown as Rpc;
  const { data } = await admin.rpc("rewards_payouts_to_verify", { p_older_than_minutes: 10 });
  const rows = Array.isArray(data) ? (data as { reference: string }[]) : [];
  const deps = { db: adminDb(), transfer: transferDeps() };
  for (const r of rows) await settleFromProvider(deps, r.reference);
  return { checked: rows.length };
}
