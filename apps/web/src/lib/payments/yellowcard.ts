import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Yellow Card: crypto in, naira out, under Yellow Card's licence.
 *
 * ===========================================================================
 * TRACK A, 25 SEPTEMBER 2026: CRYPTO NEVER TOUCHES ANYTHING VALLO CONTROLS.
 * ===========================================================================
 *
 * The person's crypto goes to Yellow Card. Yellow Card converts it under its
 * own licence and settles NAIRA, and only naira, to the destinations the
 * booking's split names: the lister's share to the lister's bank account, the
 * Guarantee contribution to the reserve's bank account, and Vallo's
 * commission to Vallo. Vallo never holds a crypto address, a crypto balance or
 * a key, not even briefly, and nothing in Vallo's data is ever denominated in
 * crypto: every figure this module accepts or returns is integer kobo.
 *
 * There is no wallet to credit. A completed collection settles ONE approved
 * booking through the same database function a card charge uses.
 *
 * ===========================================================================
 * WHAT MUST BE TRUE BEFORE THIS IS EVER SWITCHED ON.
 * ===========================================================================
 *
 * Yellow Card has to settle the naira DIRECTLY to the named destinations. If
 * the contract instead settles everything into one Vallo account for Vallo to
 * pass on, that is custody and this path must stay off. So it runs only when
 * `YELLOWCARD_DIRECT_SETTLEMENT=confirmed` is set, which is a statement the
 * founder makes after reading the Yellow Card contract, not a technical
 * switch. The request shape of `createBookingCollection` and `parseWebhook`
 * has not been executed against a live merchant account and must be checked
 * against Yellow Card's live documentation on the day keys arrive.
 *
 * NOTHING RENDERS WITHOUT KEYS AND THAT CONFIRMATION.
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
 * marks bookings paid, so an unverified body is an instruction from anybody on
 * the internet to treat a stay as paid for.
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

/** True only when the founder has confirmed Yellow Card settles directly to each destination. */
export function isDirectSettlementConfirmed(): boolean {
  return (process.env.YELLOWCARD_DIRECT_SETTLEMENT ?? "").trim() === "confirmed";
}

/** Crypto can be offered only when the keys exist AND direct settlement is confirmed. */
export function isCryptoPaymentOpen(): boolean {
  return isYellowCardConfigured() && isDirectSettlementConfirmed();
}

export type CryptoCollection = {
  /** Where to send the person to pay. */
  paymentUrl: string;
  /** Our reference, echoed back so the caller can assert it survived. */
  reference: string;
};

/** One naira destination of a collection's settlement. */
export type NairaSettlement = {
  /** Who this leg is for, for the record: never used to route money. */
  role: "lister" | "guarantee_reserve" | "vallo_commission";
  bankCode: string;
  accountNumber: string;
  amountMinor: number;
};

/**
 * Open a crypto collection that pays one booking in naira.
 *
 * THE AMOUNT IS IN NAIRA, NOT IN CRYPTO. We ask Yellow Card to collect the
 * crypto equivalent of a naira amount at the moment of payment and to settle
 * that naira to the destinations given. We never quote a crypto amount, never
 * store one and never convert. The settlement legs must add up to the amount
 * exactly, or nothing is sent.
 */
export async function createBookingCollection(params: {
  amountMinor: number;
  reference: string;
  email: string;
  callbackUrl: string;
  settlements: readonly NairaSettlement[];
}): Promise<CryptoCollection> {
  if (!isCryptoPaymentOpen()) {
    throw new YellowCardError("Crypto payments are not open.");
  }
  if (!Number.isSafeInteger(params.amountMinor) || params.amountMinor <= 0) {
    throw new YellowCardError("The amount must be a positive integer number of kobo.");
  }
  const total = params.settlements.reduce((sum, leg) => sum + leg.amountMinor, 0);
  if (total !== params.amountMinor || params.settlements.some((leg) => !Number.isSafeInteger(leg.amountMinor) || leg.amountMinor < 0)) {
    throw new YellowCardError("The settlement does not add up to the amount, so nothing was sent.");
  }

  const data = await request<{ paymentUrl?: string; url?: string; sequenceId?: string }>(
    "/business/collections",
    {
      method: "POST",
      body: {
        amount: params.amountMinor / 100,
        currency: "NGN",
        sequenceId: params.reference,
        customerEmail: params.email,
        callbackUrl: params.callbackUrl,
        settlement: params.settlements
          .filter((leg) => leg.amountMinor > 0)
          .map((leg) => ({
            bankCode: leg.bankCode,
            accountNumber: leg.accountNumber,
            amount: leg.amountMinor / 100,
            currency: "NGN",
            narration: leg.role,
          })),
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
  /** Our reference, which is how the booking's charge is found. */
  reference: string;
  /** Integer kobo, as settled in naira by the provider. Never a crypto amount. */
  amountMinor: number;
  status: "completed" | "failed" | "pending" | "unknown";
};

/**
 * Read a webhook body into the facts settlement needs: our reference, the
 * naira amount, and the status. Nothing about the crypto side is read or
 * kept. Returns null on anything it does not recognise.
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

  return { reference, amountMinor, status };
}
