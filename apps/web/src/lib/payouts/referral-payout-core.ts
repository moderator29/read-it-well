import {
  createTransferRecipient,
  initiateTransfer,
  payoutOutcome,
  verifyTransfer,
  type TransferDeps,
} from "./referral-transfer";

/**
 * The payout's decisions, free of Next and Supabase so they are unit tested.
 * `referral-payout.ts` supplies the database and the key.
 */

export type OpenResult =
  | { status: "processing" | "under_review"; payout_id: string; reference: string; amount_minor: number }
  | { status: "phone_required" | "below_minimum" | "already_open" | "invalid" | "error" };

export type SettleInput = {
  reference: string;
  outcome: "paid" | "failed" | "unknown" | "processing";
  providerStatus?: string | null;
  transferCode?: string | null;
  recipientCode?: string | null;
  reason?: string | null;
};

export interface PayoutDb {
  open(input: { memberId: string; bankCode: string; accountNumber: string; accountName: string }): Promise<OpenResult>;
  settle(input: SettleInput): Promise<boolean>;
}

export type RunOutcome =
  | { kind: "ok"; status: "processing" | "under_review" | "unknown" | "failed"; amountMinor: number; reference: string }
  | { kind: "refused"; reason: "phone_required" | "below_minimum" | "already_open" | "invalid" | "error" };

export async function runRewardsPayout(
  deps: { db: PayoutDb; transfer: TransferDeps },
  input: { memberId: string; bankCode: string; accountNumber: string; accountName: string },
): Promise<RunOutcome> {
  const opened = await deps.db.open(input);
  if (opened.status !== "processing" && opened.status !== "under_review") {
    return { kind: "refused", reason: opened.status };
  }
  const { reference, amount_minor: amountMinor } = opened;
  if (opened.status === "under_review") return { kind: "ok", status: "under_review", amountMinor, reference };

  // No money moves when a recipient is made, so any failure here is a clean failure.
  const recipient = await createTransferRecipient(deps.transfer, {
    name: input.accountName,
    accountNumber: input.accountNumber,
    bankCode: input.bankCode,
  });
  if (recipient.kind !== "ok") {
    await deps.db.settle({ reference, outcome: "failed", reason: `recipient: ${recipient.message}` });
    return { kind: "ok", status: "failed", amountMinor, reference };
  }

  const sent = await initiateTransfer(deps.transfer, {
    amountMinor,
    recipientCode: recipient.data.recipientCode,
    reference,
    reason: "Vallo Rewards Balance",
  });
  if (sent.kind === "unknown") {
    // It may have gone. Hold, and let the sweep ask Paystack. Never failed.
    await deps.db.settle({ reference, outcome: "unknown", recipientCode: recipient.data.recipientCode, reason: sent.message });
    return { kind: "ok", status: "unknown", amountMinor, reference };
  }
  if (sent.kind === "refused") {
    await deps.db.settle({ reference, outcome: "failed", recipientCode: recipient.data.recipientCode, reason: sent.message });
    return { kind: "ok", status: "failed", amountMinor, reference };
  }
  // Accepted. Not paid until the webhook or verify confirms it, whatever the
  // initiation response said.
  await deps.db.settle({
    reference,
    outcome: "processing",
    providerStatus: sent.data.status,
    transferCode: sent.data.transferCode,
    recipientCode: recipient.data.recipientCode,
  });
  return { kind: "ok", status: "processing", amountMinor, reference };
}

/**
 * Ask Paystack what happened to one reference and record it. A refusal or an
 * unreachable provider changes nothing: an unanswered question is not a
 * failed transfer. Returns whether the call completed.
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
