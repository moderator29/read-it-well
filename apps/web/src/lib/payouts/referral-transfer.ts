/**
 * PAYSTACK TRANSFERS FOR THE REWARDS BALANCE (D51), FROM VALLO'S MARKETING FLOAT.
 *
 * Only endpoints and fields this repository has already used are called here
 * (the retired payout client, `lib/payments/paystack.ts` before f0c0592af, and
 * `lib/agent/payout-actions.ts` as recorded in
 * `docs/research/API_INVENTORY_RESEARCH.md`):
 *
 *   POST /transferrecipient   { type: "nuban", name, account_number, bank_code, currency: "NGN" }
 *                             -> data.recipient_code
 *   POST /transfer            { source: "balance", amount, currency: "NGN", recipient, reference, reason }
 *                             -> data.transfer_code, data.reference, data.status
 *   GET  /transfer/verify/:reference
 *                             -> data.status, data.transfer_code, data.reference
 *
 * THE THREE OUTCOMES, AND WHY THERE ARE THREE. An explicit refusal (a 4xx, or
 * an envelope with status false) proves nothing moved: `refused`. A network
 * failure, a timeout, a 5xx or an unreadable 2xx may have moved money:
 * `unknown`, which is never treated as failed. Anything else is the
 * provider's answer.
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
): Promise<CallResult<{ transferCode: string | null; status: string }>> {
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
  if (r.kind !== "ok") return r;
  return {
    kind: "ok",
    data: {
      transferCode: typeof r.data?.transfer_code === "string" ? r.data.transfer_code : null,
      status: typeof r.data?.status === "string" ? r.data.status : "",
    },
  };
}

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
