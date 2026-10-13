/**
 * PAYSTACK TRANSFERS FOR THE REWARDS BALANCE (D51), FROM VALLO'S MARKETING FLOAT.
 *
 * The secret key passed in is the FLOAT account's (`PAYSTACK_FLOAT_SECRET_KEY`),
 * never the main merchant key: `source: "balance"` is the balance of whichever
 * account the key belongs to, and the main balance holds customer settlement
 * money.
 *
 * Provenance. The first two endpoints and their fields are taken from this
 * repository's history (the retired payout client, `lib/payments/paystack.ts`
 * before f0c0592af, and `lib/agent/payout-actions.ts` as recorded in
 * `docs/research/API_INVENTORY_RESEARCH.md`). The verify route is NOT in the
 * repository's history: it is Paystack's documented verify endpoint and
 * MUST BE CONFIRMED AGAINST PAYSTACK'S DOCS before payouts are switched on.
 *
 *   POST /transferrecipient   { type: "nuban", name, account_number, bank_code, currency: "NGN" }
 *                             -> data.recipient_code
 *   POST /transfer            { source: "balance", amount, currency: "NGN", recipient, reference, reason }
 *                             -> data.transfer_code, data.reference, data.status
 *   GET  /transfer/verify/:reference   (TO CONFIRM against Paystack docs, see above)
 *                             -> data.status, data.transfer_code, data.reference
 *
 * THE OUTCOMES. A network failure, a timeout, a 5xx or an unreadable 2xx may
 * have moved money: `unknown`. For /transfer specifically, ANY non-success
 * answer is `unknown` too (a 4xx can be "duplicate reference" for a transfer
 * that did go): only the provider's verify, or its webhook confirmed by
 * verify, ever decides `failed`. For /transferrecipient and verify a 4xx is
 * `refused`; no money moves on either.
 *
 * Pure apart from the injected `fetch`, so the whole file is unit tested.
 */

export const PAYSTACK_API = "https://api.paystack.co";
const TIMEOUT_MS = 15_000;

export type CallResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "refused"; message: string; status?: number }
  | { kind: "unknown"; message: string; status?: number };

export type TransferDeps = {
  secretKey: string;
  fetcher?: typeof fetch;
};

async function call<T>(deps: TransferDeps, path: string, body?: Record<string, unknown>): Promise<CallResult<T>> {
  if (!deps.secretKey) return { kind: "refused", message: "The payment service is not configured." };
  const f = deps.fetcher ?? fetch;
  let res: Response;
  try {
    res = await f(`${PAYSTACK_API}${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${deps.secretKey}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return { kind: "unknown", message: "The payment service could not be reached." };
  }
  type Envelope = { status?: boolean; message?: string; data?: unknown };
  let envelope: Envelope | null = null;
  try {
    envelope = (await res.json()) as Envelope;
  } catch {
    envelope = null;
  }
  if (res.status >= 500 || (res.ok && envelope === null)) {
    return { kind: "unknown", message: "The payment service did not say whether it acted.", status: res.status };
  }
  if (!res.ok || !envelope || envelope.status !== true) {
    return { kind: "refused", message: envelope?.message?.trim() || "The payment service declined the request.", status: res.status };
  }
  return { kind: "ok", data: envelope.data as T };
}

export async function createTransferRecipient(
  deps: TransferDeps,
  input: { name: string; accountNumber: string; bankCode: string },
): Promise<CallResult<{ recipientCode: string }>> {
  const r = await call<{ recipient_code?: unknown }>(deps, "/transferrecipient", {
    type: "nuban",
    name: input.name,
    account_number: input.accountNumber,
    bank_code: input.bankCode,
    currency: "NGN",
  });
  if (r.kind !== "ok") return r;
  if (typeof r.data?.recipient_code !== "string") return { kind: "unknown", message: "No recipient code came back." };
  return { kind: "ok", data: { recipientCode: r.data.recipient_code } };
}

export async function initiateTransfer(
  deps: TransferDeps,
  input: { amountMinor: number; recipientCode: string; reference: string; reason: string },
): Promise<
  { kind: "ok"; data: { transferCode: string | null; status: string } } | { kind: "refused" | "unknown"; message: string; status?: number }
> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    return { kind: "refused", message: "The amount must be a positive whole number of kobo." };
  }
  const r = await call<{ transfer_code?: unknown; status?: unknown }>(deps, "/transfer", {
    source: "balance",
    amount: input.amountMinor,
    currency: "NGN",
    recipient: input.recipientCode,
    reference: input.reference,
    reason: input.reason,
  });
  // Never `refused`: whatever /transfer said, only verify decides.
  if (r.kind !== "ok") return { kind: "unknown", message: r.message, status: r.status };
  return {
    kind: "ok",
    data: {
      transferCode: typeof r.data?.transfer_code === "string" ? r.data.transfer_code : null,
      status: typeof r.data?.status === "string" ? r.data.status : "",
    },
  };
}

/** NEEDS CONFIRMATION against Paystack's docs before payouts are switched on (not in repo history). */
export async function verifyTransfer(
  deps: TransferDeps,
  reference: string,
): Promise<CallResult<{ transferCode: string | null; status: string }>> {
  const r = await call<{ transfer_code?: unknown; status?: unknown }>(
    deps,
    `/transfer/verify/${encodeURIComponent(reference)}`,
  );
  if (r.kind !== "ok") return r;
  return {
    kind: "ok",
    data: {
      transferCode: typeof r.data?.transfer_code === "string" ? r.data.transfer_code : null,
      status: typeof r.data?.status === "string" ? r.data.status : "",
    },
  };
}

/** Our references, so the webhook can tell a Rewards payout from anything else. */
export const REWARDS_REFERENCE_PREFIX = "vallo-rw-";

export function isRewardsReference(reference: unknown): reference is string {
  return typeof reference === "string" && /^vallo-rw-[0-9a-f]{32}$/.test(reference);
}

export type PayoutOutcome = "paid" | "failed" | "processing";

/**
 * What a provider transfer status means for the payout. ONLY `success` is
 * paid. `failed` and `reversed` put the money back in the balance. Everything
 * else (pending, otp, received, queued, and any word not seen before) is still
 * in flight: an unrecognised word is never read as a failure, because that
 * would hand back money that may have left.
 */
export function payoutOutcome(providerStatus: string): PayoutOutcome {
  const s = providerStatus.trim().toLowerCase();
  if (s === "success") return "paid";
  if (s === "failed" || s === "reversed") return "failed";
  return "processing";
}

/** The webhook events that settle a transfer, and what each means. */
export function outcomeForEvent(event: string): PayoutOutcome | null {
  if (event === "transfer.success") return "paid";
  if (event === "transfer.failed" || event === "transfer.reversed") return "failed";
  return null;
}
