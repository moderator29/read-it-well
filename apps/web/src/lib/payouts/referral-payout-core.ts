import {
  createTransferRecipient,
  initiateTransfer,
  payoutOutcome,
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
 */

export type OpenResult =
  | { status: "processing" | "under_review"; payout_id: string; reference: string; amount_minor: number }
  | { status: "phone_required" | "below_minimum" | "already_open" | "invalid" | "not_available" | "error" };

export type SettleInput = {
  reference: string;
  outcome: "paid" | "failed" | "unknown" | "processing";
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
  /** True only for the one caller allowed to initiate this reference's transfer. */
  claimSend(reference: string): Promise<boolean>;
}

export type RefusalReason = "phone_required" | "below_minimum" | "already_open" | "invalid" | "not_available" | "error";

export type RunOutcome =
  | { kind: "ok"; status: "processing" | "under_review" | "unknown"; amountMinor: number; reference: string }
  | { kind: "refused"; reason: RefusalReason };

/** Send one opened payout. Any non-success from /transfer is `unknown`; verify decides. */
export async function sendOpenedPayout(
  deps: { db: PayoutDb; transfer: TransferDeps },
  payout: { reference: string; amountMinor: number; recipientCode: string },
): Promise<"processing" | "unknown" | "skipped"> {
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
  // Accepted. Not paid until verify confirms it, whatever the response said.
  await deps.db.settle({
    reference: payout.reference,
    outcome: "processing",
    providerStatus: sent.data.status,
    transferCode: sent.data.transferCode,
  });
  return "processing";
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
  return { kind: "ok", status: sent === "unknown" ? "unknown" : "processing", amountMinor, reference };
}

/**
 * Ask Paystack what happened to one reference and record it. A refusal or an
 * unreachable provider changes nothing: an unanswered question is not a
 * failed transfer (the age-based stuck alert catches one that never resolves).
 * Returns whether the call completed.
 */
export async function settleFromProvider(deps: { db: PayoutDb; transfer: TransferDeps }, reference: string): Promise<boolean> {
  const v = await verifyTransfer(deps.transfer, reference);
  if (v.kind !== "ok") return false;
  const outcome = payoutOutcome(v.data.status);
  if (outcome === "processing") return true;
  return deps.db.settle({
    reference,
    outcome,
    providerStatus: v.data.status,
    transferCode: v.data.transferCode,
    reason: outcome === "failed" ? `provider status ${v.data.status}` : null,
  });
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
