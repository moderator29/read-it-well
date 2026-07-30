import { NextResponse } from "next/server";
import {
  isPaystackConfigured,
  verifyWebhookSignature,
} from "@/lib/payments/paystack";
import {
  availableBalanceMinor,
  ensureWalletId,
  getAdminClient,
  recordFunding,
  settleWithdrawal,
  walletOwnerId,
  type AdminClient,
} from "@/lib/wallet/ledger";
import { bestEffortEmail, sendEmail } from "@/lib/email/client";
import { walletFunded, withdrawalFailed } from "@/lib/email/messages";
import { contactForUser } from "@/lib/email/recipients";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Paystack webhook.
 *
 * The processor's word on what actually happened to money. The RAW body is
 * read first and its HMAC SHA-512 signature verified before anything is
 * parsed; an unsigned or unverifiable delivery is acknowledged and ignored.
 * Every path answers 200 quickly so Paystack never retries into a crash, and
 * nothing sensitive is logged.
 *
 * Routing is by reference format, the contract this platform generates:
 *  - rm-fund-<uuid>: wallet funding. charge.success credits the ledger with a
 *    COMPLETED deposit, idempotent on the unique reference, so a replayed
 *    webhook or the verify-on-redirect fallback can never double-post.
 *  - rm-wd-<uuid>: withdrawal. transfer.success / transfer.failed /
 *    transfer.reversed settle the matching PENDING debit hold.
 *
 * Completion notifications fire from the database trigger, never from here.
 */

export const runtime = "nodejs";

const FUND_PREFIX = "rm-fund-";
const WITHDRAW_PREFIX = "rm-wd-";

type WebhookEvent = {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    channel?: string | null;
    paid_at?: string | null;
    metadata?: unknown;
  };
};

function acknowledged(received: boolean): NextResponse {
  return NextResponse.json({ received }, { status: 200 });
}

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata !== null && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

async function handleChargeSuccess(
  admin: AdminClient,
  data: NonNullable<WebhookEvent["data"]>,
): Promise<void> {
  const reference = data.reference ?? "";
  if (!reference.startsWith(FUND_PREFIX)) return;
  if (data.currency !== undefined && data.currency !== "NGN") return;

  const amountMinor = data.amount;
  if (!Number.isSafeInteger(amountMinor) || amountMinor === undefined || amountMinor <= 0) return;

  const metadata = metadataRecord(data.metadata);
  const userId = metadata["user_id"];
  if (typeof userId !== "string" || userId.length === 0) return;

  const posted = await recordFunding(admin, {
    userId,
    amountMinor,
    reference,
    metadata: {
      channel: (data.channel ?? null) as Json,
      paid_at: (data.paid_at ?? null) as Json,
      purpose: "wallet_fund",
    },
  });

  // This is the settlement path that actually runs in production: most
  // fundings arrive here, not through the redirect. The receipt is gated on
  // "posted" so a replayed delivery credits nothing and emails nothing.
  if (posted !== "posted") return;

  await bestEffortEmail(async () => {
    const owner = await contactForUser(admin, userId);
    if (!owner) return;
    const walletId = await ensureWalletId(admin, userId);
    const balanceMinor = await availableBalanceMinor(admin, walletId);
    const message = walletFunded({ ownerName: owner.name, amountMinor, balanceMinor });
    await sendEmail({ to: owner.email, subject: message.subject, html: message.html });
  });
}

async function handleTransferEvent(
  admin: AdminClient,
  event: string,
  data: NonNullable<WebhookEvent["data"]>,
): Promise<void> {
  const reference = data.reference ?? "";
  if (!reference.startsWith(WITHDRAW_PREFIX)) return;

  if (event === "transfer.success") {
    await settleWithdrawal(admin, reference, "COMPLETED");
    return;
  }

  const outcome =
    event === "transfer.failed" ? "FAILED" : event === "transfer.reversed" ? "REVERSED" : null;
  if (!outcome) return;

  const settled = await settleWithdrawal(admin, reference, outcome);
  // Null means nothing moved, which is what a replayed delivery looks like:
  // stay silent rather than tell someone twice that their money came back.
  if (!settled) return;

  await bestEffortEmail(async () => {
    const ownerId = await walletOwnerId(admin, settled.walletId);
    if (!ownerId) return;
    const owner = await contactForUser(admin, ownerId);
    if (!owner) return;

    // The withdrawal's own metadata carries where it was headed, written when
    // the hold was placed. Absent or malformed, the email simply omits it.
    const meta = metadataRecord(settled.metadata);
    const bankName = typeof meta["bank_name"] === "string" ? meta["bank_name"] : null;
    const accountLast4 =
      typeof meta["account_last4"] === "string" ? meta["account_last4"] : null;

    const message = withdrawalFailed({
      ownerName: owner.name,
      amountMinor: settled.amountMinor,
      bankName,
      accountLast4,
    });
    await sendEmail({ to: owner.email, subject: message.subject, html: message.html });
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return acknowledged(false);
  }

  // Missing environment must never crash a delivery: acknowledge and move on.
  if (!isPaystackConfigured()) return acknowledged(false);
  const admin = getAdminClient();
  if (!admin) return acknowledged(false);

  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature)) return acknowledged(false);

  let payload: WebhookEvent;
  try {
    payload = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return acknowledged(false);
  }

  const event = payload.event ?? "";
  const data = payload.data;
  if (!data) return acknowledged(true);

  try {
    if (event === "charge.success") {
      await handleChargeSuccess(admin, data);
    } else if (event.startsWith("transfer.")) {
      await handleTransferEvent(admin, event, data);
    }
  } catch {
    // A write hiccup must not trigger a retry storm; the verify fallback and
    // reconciliation settle the ledger against Paystack's records.
  }

  return acknowledged(true);
}
