import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Yellow Card: the crypto on-ramp.
 *
 * ===========================================================================
 * WHY THIS PROVIDER AND NOT A WALLET ADDRESS.
 * ===========================================================================
 *
 * The obvious way to "accept crypto" is to show a USDT address and watch the
 * chain. Vallo must not do that, and the reason is not squeamishness:
 *
 *  - IT MAKES US A CUSTODIAN. A private key we hold is somebody else's money
 *    we hold, with no bank, no insurance and no recovery. One leaked key is
 *    every deposit ever made.
 *  - IT MAKES US AN EXCHANGE. The wallet is denominated in kobo. Crediting a
 *    naira balance from a USDT deposit means someone decided a rate, and if
 *    that someone is us then we carry the price movement between the deposit
 *    landing and the naira being spent.
 *  - IT NEEDS A CHAIN WATCHER. Confirmations, reorgs, dust, wrong-network
 *    sends, memo-less exchange withdrawals. Every one of those is a way to
 *    lose a person's money quietly, which is the failure this codebase has
 *    already had once.
 *
 * Yellow Card is a licensed on-ramp operating across Africa with NGN
 * settlement. The person pays in crypto; we are credited in naira; the rate,
 * the custody and the compliance are theirs. That is the same relationship we
 * already have with Paystack for cards, which is why this module is shaped
 * like `paystack.ts` down to the error class and the fifteen second timeout.
 *
 * ===========================================================================
 * THE ONE THING IN HERE THAT IS NOT YET PROVEN AGAINST A LIVE ACCOUNT.
 * ===========================================================================
 *
 * `YELLOWCARD_API_BASE`, the request signing scheme and the exact field names
 * in `createCollection` are written from Yellow Card's published Payments API
 * and have NOT been executed against a real merchant account, because this
 * platform does not have one yet. Everything structural around them - the
 * reference scheme, the idempotency, the webhook verification, the ledger
 * credit, the configured-gate - is ours and is exercised by the same code
 * paths Paystack already uses.
 *
 * So the seam to check on the day the keys arrive is `createCollection` and
 * `parseWebhook`, and nothing else. They are deliberately small and
 * deliberately at the bottom of this file. Do not spread provider field names
 * beyond them.
 *
 * ===========================================================================
 * NOTHING RENDERS WITHOUT KEYS, AND THAT IS THE POINT.
 * ===========================================================================
 *
 * `isYellowCardConfigured()` is false until both variables are set, and the
 * wallet asks it before it draws anything. A crypto option that appears and
 * then cannot take money is the same defect as a Reserve button on a listing
 * nobody can book - worse here, because this one is about money. Gated this
 * way the control cannot exist before the capability does.
 */

const REQUEST_TIMEOUT_MS = 15_000;

export class YellowCardError extends Error {
  /** HTTP status of the failed call, when one was received. */
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "YellowCardError";
    this.status = status;
  }
}

function apiKey(): string {
  return process.env.YELLOWCARD_API_KEY ?? "";
}

function apiSecret(): string {
  return process.env.YELLOWCARD_API_SECRET ?? "";
}

/**
 * The API host, from configuration, because sandbox and production are
 * different hosts and hard-coding either one guarantees somebody ships the
 * wrong one. No default: an unset base means unconfigured, which means the
 * feature does not appear, which is the safe direction.
 */
function apiBase(): string {
  return (process.env.YELLOWCARD_API_BASE ?? "").replace(/\/+$/, "");
}

/**
 * True only when the key, the secret AND the host are all present.
 *
 * All three, deliberately. Two out of three is a half-configured integration
 * that renders a button and fails at the network, which is the state this gate
 * exists to make impossible. Checked lazily, never at import.
 */
export function isYellowCardConfigured(): boolean {
  return apiKey().length > 0 && apiSecret().length > 0 && apiBase().length > 0;
}

/**
 * One signed call.
 *
 * Yellow Card authenticates with an HMAC over the request, so a leaked key
 * alone does not let somebody forge a call. The signature covers the method,
 * the path, the body and a timestamp, which is what stops a captured request
 * being replayed against a different endpoint.
 */
async function request<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: Record<string, unknown> },
): Promise<T> {
  if (!isYellowCardConfigured()) {
    throw new YellowCardError("The crypto service is not configured.");
  }

  const timestamp = new Date().toISOString();
  const payload = init.body ? JSON.stringify(init.body) : "";
  const signature = createHmac("sha256", apiSecret())
    .update(`${timestamp}${path}${init.method}${payload}`)
    .digest("base64");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBase()}${path}`, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        "X-YC-Timestamp": timestamp,
        Authorization: `YcHmacV1 ${apiKey()}:${signature}`,
      },
      ...(payload.length > 0 ? { body: payload } : {}),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();
    if (!response.ok) {
      /* The provider's own words where it gave any, because "something went
         wrong" on a money screen tells the reader nothing and tells support
         less. Truncated, so a stray HTML error page cannot become the whole
         message. */
      throw new YellowCardError(
        text.slice(0, 200) || `The crypto service answered ${response.status}.`,
        response.status,
      );
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new YellowCardError("The crypto service returned something unreadable.");
    }
  } catch (error) {
    if (error instanceof YellowCardError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new YellowCardError("The crypto service did not answer in time.");
    }
    throw new YellowCardError("The crypto service could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Whether a webhook really came from Yellow Card.
 *
 * The same shape as the Paystack check and for the same reason: this endpoint
 * credits wallets, so an unverified body is an instruction from anybody on the
 * internet to add money to an account.
 *
 * Length is compared before `timingSafeEqual` because it throws on a mismatch
 * rather than returning false. Returns false, never throws, so the route can
 * always answer.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = apiSecret();
  if (secret.length === 0 || signature.length === 0) return false;
  try {
    const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
    const received = Buffer.from(signature, "base64");
    if (received.length !== expected.length) return false;
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

/* ======================================================================== */
/* THE PROVIDER SEAM. Confirm these two against live docs when keys arrive.  */
/* ======================================================================== */

export type CryptoCollection = {
  /** Where to send the person to pay. */
  paymentUrl: string;
  /** Our reference, echoed back so the caller can assert it survived. */
  reference: string;
};

/**
 * Open a crypto collection for a naira amount.
 *
 * THE AMOUNT IS IN NAIRA, NOT IN CRYPTO, and that is the whole design. We ask
 * for "credit this wallet with ₦50,000"; Yellow Card decides how much USDT
 * that is at the moment of payment and carries the rate. We never quote a
 * crypto amount, never store one, and never convert. If this function ever
 * grows a `rate` parameter, something has gone wrong upstream of it.
 *
 * `reference` is OURS and is the idempotency key end to end: the collection,
 * the webhook and the ledger row all carry it, so a webhook delivered twice
 * credits once.
 */
export async function createCollection(params: {
  /** Integer kobo. Converted to naira units at the boundary, once, here. */
  amountMinor: number;
  reference: string;
  email: string;
  callbackUrl: string;
}): Promise<CryptoCollection> {
  if (!Number.isSafeInteger(params.amountMinor) || params.amountMinor <= 0) {
    throw new YellowCardError("The amount must be a positive integer number of kobo.");
  }

  const data = await request<{ paymentUrl?: string; url?: string; sequenceId?: string }>(
    "/business/collections",
    {
      method: "POST",
      body: {
        /* Kobo to naira at the boundary. The ledger stays integer kobo either
           side of this line; this is the only division in the crypto path and
           it is exact, because kobo amounts are whole. */
        amount: params.amountMinor / 100,
        currency: "NGN",
        sequenceId: params.reference,
        customerEmail: params.email,
        callbackUrl: params.callbackUrl,
      },
    },
  );

  const paymentUrl = data.paymentUrl ?? data.url ?? "";
  if (paymentUrl.length === 0) {
    throw new YellowCardError("The crypto service did not return a payment link.");
  }
  return { paymentUrl, reference: params.reference };
}

export type CryptoWebhookEvent = {
  /** Our reference, which is how the ledger finds the row to write. */
  reference: string;
  /** Integer kobo, as settled in naira by the provider. */
  amountMinor: number;
  status: "completed" | "failed" | "pending" | "unknown";
  /**
   * The payer's email, which is how the credit finds a wallet.
   *
   * The card path resolves an owner the same way - `findUserByEmail` on the
   * address the processor echoes back - and this is deliberately the same
   * mechanism rather than a second one. `startCryptoDeposit` sends the
   * signed-in user's own address, so the round trip is what ties an anonymous
   * settlement to an account.
   */
  email: string | null;
};

/**
 * Read a webhook body into the three facts the ledger needs.
 *
 * Returns null rather than throwing on anything it does not recognise, so an
 * unexpected event type is a no-op the route can answer 200 to rather than an
 * exception that looks like an outage.
 *
 * ROUNDING IS `Math.round`, NOT `Math.floor`. A provider that settles
 * ₦49,999.999999 through float arithmetic must not credit ₦49,999.99 - the
 * fraction of a kobo is theirs to be exact about and ours to not silently
 * shave. Anything that does not parse to a positive integer is refused above.
 */
export function parseWebhook(body: unknown): CryptoWebhookEvent | null {
  if (typeof body !== "object" || body === null) return null;
  const row = body as Record<string, unknown>;

  const reference = typeof row["sequenceId"] === "string" ? row["sequenceId"] : "";
  if (reference.length === 0) return null;

  const amount = Number(row["amount"]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const amountMinor = Math.round(amount * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;

  const raw = String(row["status"] ?? "").toLowerCase();
  const status: CryptoWebhookEvent["status"] =
    raw === "complete" || raw === "completed" || raw === "success"
      ? "completed"
      : raw === "failed" || raw === "cancelled" || raw === "expired"
        ? "failed"
        : raw === "pending" || raw === "processing"
          ? "pending"
          : "unknown";

  const email =
    typeof row["customerEmail"] === "string" && row["customerEmail"].length > 0
      ? row["customerEmail"]
      : null;

  return { reference, amountMinor, status, email };
}
