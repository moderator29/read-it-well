import {
  createTransferRecipient,
  initiateTransfer,
  payoutOutcome,
  isRewardsReference,
  verifyTransfer,
  type TransferDeps,
} from "./referral-transfer";

/**
 * The payout's decisions, free of Next and Supabase so they are unit tested.
 * `referral-payout.ts` supplies the database and the FLOAT key (or null when
 * payouts are not available, in which case nothing is opened or sent).
 *
 * Order: recipient on the float account (no money moves) -> open (holds the
 * rewards, stores the recipient, or routes to review) -> claim the send
 * exactly once -> transfer. A payout released from review later is sent by
 * the sweep through the same `sendOpenedPayout`, from the stored recipient.
 *
 * PAID ONLY ON THE WEBHOOK (D62). The transfer API accepting a transfer makes
 * it "sent"; `/transfer/verify` answering success changes nothing; only
 * `recordTransferWebhook` (the provider's signed `transfer.*` event, through
 * `public.rewards_payout_webhook`) can make a payout paid, and only the
 * webhook (`transfer.failed` / `transfer.reversed`) or a staff decision can
 * fail one and put the money back. Verify answering failed raises an alert
 * for staff and releases nothing: releasing on verify could pay twice if
 * `transfer.success` arrives later.
 */

export type OpenResult =
  | { status: "processing" | "under_review"; payout_id: string; reference: string; amount_minor: number }
  | { status: "phone_required" | "below_minimum" | "already_open" | "invalid" | "not_available" | "error" };

export type SettleInput = {
  reference: string;
  /**
   * Never "paid" or "failed": only the webhook pays or fails a payout.
   * "verify_failed" records the provider's word and alerts staff.
   */
  outcome: "verify_failed" | "unknown" | "processing";
  providerStatus?: string | null;
  transferCode?: string | null;
  recipientCode?: string | null;
  reason?: string | null;
};

export interface PayoutDb {
  open(input: {
    memberId: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    recipientCode: string;
  }): Promise<OpenResult>;
  settle(input: SettleInput): Promise<boolean>;
  /** `public.rewards_payout_webhook`: idempotent on reference, event and amount. Null on error. */
  webhook(input: TransferWebhookInput): Promise<{ status: string; outcome?: string; duplicate?: boolean } | null>;
  /** True only for the one caller allowed to initiate this reference's transfer. */
  claimSend(reference: string): Promise<boolean>;
}

export type TransferWebhookInput = {
  reference: string;
  event: "transfer.success" | "transfer.failed" | "transfer.reversed";
  amountMinor: number | null;
  transferCode: string | null;
  payload: Record<string, unknown>;
};

export type RefusalReason = "phone_required" | "below_minimum" | "already_open" | "invalid" | "not_available" | "error";

export type RunOutcome =
  | { kind: "ok"; status: "sent" | "under_review" | "unknown"; amountMinor: number; reference: string }
  | { kind: "refused"; reason: RefusalReason };

/** Send one opened payout. Any non-success from /transfer is `unknown`; verify decides. */
export async function sendOpenedPayout(
  deps: { db: PayoutDb; transfer: TransferDeps },
  payout: { reference: string; amountMinor: number; recipientCode: string },
): Promise<"sent" | "unknown" | "skipped"> {
  if (!(await deps.db.claimSend(payout.reference))) return "skipped";
  const sent = await initiateTransfer(deps.transfer, {
    amountMinor: payout.amountMinor,
    recipientCode: payout.recipientCode,
    reference: payout.reference,
    reason: "Vallo Rewards Balance",
  });
  if (sent.kind !== "ok") {
    // It may have gone. Hold, and let the sweep ask Paystack. Never failed.
    await deps.db.settle({ reference: payout.reference, outcome: "unknown", reason: sent.message });
    return "unknown";
  }
  // Accepted: the payout is "sent" (the claim already marked it). Not paid
  // until the webhook lands, whatever the response said.
  await deps.db.settle({
    reference: payout.reference,
    outcome: "processing",
    providerStatus: sent.data.status,
    transferCode: sent.data.transferCode,
  });
  return "sent";
}

export async function runRewardsPayout(
  deps: { db: PayoutDb; transfer: TransferDeps | null },
  input: { memberId: string; bankCode: string; accountNumber: string; accountName: string },
): Promise<RunOutcome> {
  if (!deps.transfer) return { kind: "refused", reason: "not_available" };
  const transfer = deps.transfer;

  // No money moves when a recipient is made, and nothing is opened yet.
  const recipient = await createTransferRecipient(transfer, {
    name: input.accountName,
    accountNumber: input.accountNumber,
    bankCode: input.bankCode,
  });
  if (recipient.kind !== "ok") return { kind: "refused", reason: "error" };

  const opened = await deps.db.open({ ...input, recipientCode: recipient.data.recipientCode });
  if (opened.status !== "processing" && opened.status !== "under_review") {
    return { kind: "refused", reason: opened.status };
  }
  const { reference, amount_minor: amountMinor } = opened;
  if (opened.status === "under_review") return { kind: "ok", status: "under_review", amountMinor, reference };

  const sent = await sendOpenedPayout(
    { db: deps.db, transfer },
    { reference, amountMinor, recipientCode: recipient.data.recipientCode },
  );
  return { kind: "ok", status: sent === "unknown" ? "unknown" : "sent", amountMinor, reference };
}

/**
 * RECONCILIATION: ask Paystack what happened to one reference. Nothing is
 * paid or released from here. A success waits for the webhook; a failure is
 * recorded as `verify_failed`, which raises a high alert for staff and leaves
 * the money held. A payout whose webhook never comes stays sent and the
 * age-based stuck alert raises it too. A refusal or an unreachable
 * provider changes nothing. Returns whether the call completed.
 */
export async function settleFromProvider(deps: { db: PayoutDb; transfer: TransferDeps }, reference: string): Promise<boolean> {
  const v = await verifyTransfer(deps.transfer, reference);
  if (v.kind !== "ok") return false;
  const outcome = payoutOutcome(v.data.status);
  if (outcome !== "failed") return true;
  return deps.db.settle({
    reference,
    outcome: "verify_failed",
    providerStatus: v.data.status,
    transferCode: v.data.transferCode,
    reason: `provider status ${v.data.status}`,
  });
}

const INCIDENT_OUTCOMES = new Set(["amount_mismatch", "conflict", "unknown_reference"]);

/**
 * THE WEBHOOK, after the route's signature check: the only path to paid.
 * Hands the event to the database as-is (no verify round trip); the database
 * matches the amount against the payout and records any mismatch as an
 * incident. "ignored" for events and references this file does not own.
 */
export async function recordTransferWebhook(
  db: Pick<PayoutDb, "webhook">,
  event: string,
  data: unknown,
): Promise<"recorded" | "incident" | "duplicate" | "ignored" | "error"> {
  const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  if (!isRewardsReference(row.reference)) return "ignored";
  if (event !== "transfer.success" && event !== "transfer.failed" && event !== "transfer.reversed") return "ignored";
  const amount = typeof row.amount === "number" ? row.amount : typeof row.amount === "string" ? Number(row.amount) : NaN;
  const res = await db.webhook({
    reference: row.reference,
    event,
    amountMinor: Number.isSafeInteger(amount) ? amount : null,
    transferCode: typeof row.transfer_code === "string" ? row.transfer_code : null,
    payload: {
      reference: row.reference,
      status: typeof row.status === "string" ? row.status : null,
      amount: Number.isSafeInteger(amount) ? amount : null,
      transfer_code: typeof row.transfer_code === "string" ? row.transfer_code : null,
    },
  });
  if (!res) return "error";
  if (res.duplicate) return "duplicate";
  // Recorded but not applied: a person must look (the database raised an alert).
  if (res.outcome && INCIDENT_OUTCOMES.has(res.outcome)) return "incident";
  return "recorded";
}

/**
 * The float account's key, or null: payouts are then not available. A key
 * equal to the main merchant key (live or test) is refused, because that is
 * the balance holding customer settlement money.
 */
export function floatTransferDeps(env: Record<string, string | undefined> = process.env): TransferDeps | null {
  const key = env.PAYSTACK_FLOAT_SECRET_KEY?.trim();
  if (!key) return null;
  if (key === env.PAYSTACK_SECRET_KEY?.trim() || key === env.PAYSTACK_TEST_SECRET_KEY?.trim()) return null;
  return { secretKey: key };
}
