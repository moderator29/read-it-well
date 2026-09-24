import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paystack client. Server-only, typed, no SDK.
 *
 * A thin fetch layer over https://api.paystack.co with narrow response types.
 * Every amount is integer kobo end to end: Paystack speaks kobo natively for
 * NGN, so amounts pass straight through with no division or multiplication
 * anywhere in this file (Master Rule 50).
 *
 * The secret key is read lazily so importing this module never throws when the
 * environment is not configured; callers check isPaystackConfigured() and end
 * honestly when it is false. Every failure surfaces as a PaystackError with a
 * plain message; callers translate it into user-facing copy.
 */

const API_BASE = "https://api.paystack.co";
const REQUEST_TIMEOUT_MS = 15_000;

export class PaystackError extends Error {
  /** HTTP status of the failed call, when one was received. */
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "PaystackError";
    this.status = status;
  }
}

/**
 * MON-01. A call whose outcome is NOT KNOWN: the request may have reached
 * Paystack and done its work. A network failure, the fifteen-second abort, a
 * 5xx, or a 2xx whose body could not be read. Only an explicit refusal (a 4xx,
 * or a 2xx envelope with `status: false`) proves nothing happened. A withdrawal
 * whose transfer call ends this way keeps its hold PENDING and lets the sweep
 * ask Paystack, because releasing it would hand back money that may already
 * have been paid out.
 */
export class PaystackUnknownOutcome extends PaystackError {
  constructor(message: string, status?: number) {
    super(message, status);
    this.name = "PaystackUnknownOutcome";
  }
}

function secretKey(): string {
  return process.env.PAYSTACK_SECRET_KEY ?? "";
}

/** True when PAYSTACK_SECRET_KEY is present. Checked lazily, never at import. */
export function isPaystackConfigured(): boolean {
  return secretKey().length > 0;
}

/** The envelope every Paystack response uses. */
type PaystackEnvelope = {
  status?: boolean;
  message?: string;
  data?: unknown;
};

/**
 * One authenticated call to the Paystack API. Times out after fifteen seconds
 * so a slow processor can never hang a server action; a timeout, network
 * failure, non-2xx status or status:false envelope all become PaystackError.
 */
async function request<T>(
  path: string,
  init?: { method?: "GET" | "POST"; body?: Record<string, unknown> },
): Promise<T> {
  const key = secretKey();
  if (key.length === 0) {
    throw new PaystackError("The payment service is not configured.");
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new PaystackUnknownOutcome("The payment service could not be reached. Please try again.");
  }

  let envelope: PaystackEnvelope | null = null;
  try {
    envelope = (await res.json()) as PaystackEnvelope;
  } catch {
    envelope = null;
  }

  if (res.status >= 500 || (res.ok && envelope === null)) {
    throw new PaystackUnknownOutcome(
      "The payment service did not say whether it acted on the request.",
      res.status,
    );
  }
  if (!res.ok || envelope === null || envelope.status !== true) {
    const message =
      envelope?.message && envelope.message.trim().length > 0
        ? envelope.message.trim()
        : "The payment service declined the request.";
    throw new PaystackError(message, res.status);
  }

  return envelope.data as T;
}

/* ------------------------------------------------------------ transactions */

export type InitializedTransaction = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
};

/**
 * Start a hosted checkout. The caller supplies the unique reference (our
 * idempotency key, e.g. rm-fund-<uuid>) and the kobo amount as an integer.
 */
export async function initializeTransaction(params: {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  /**
   * Which ways of paying to offer, or nothing at all to offer them all.
   *
   * ABSENT BY DEFAULT, ON PURPOSE. With no `channels` key Paystack offers
   * every channel enabled on the merchant account: card, bank, bank transfer,
   * USSD, QR, EFT, Apple Pay. Narrowing that quietly is a revenue decision
   * dressed as a technical one, and a Nigerian customer refused a bank
   * transfer is a Nigerian customer who does not pay. So this is passed only
   * where the transaction genuinely cannot work on another channel, and the
   * caller has to write down why beside the line.
   *
   * There is exactly one such caller today: `startCardSetup`, whose whole
   * purpose is to obtain a reusable card authorisation that only a card can
   * produce.
   */
  channels?: readonly string[];
}): Promise<InitializedTransaction> {
  if (!Number.isSafeInteger(params.amountMinor) || params.amountMinor <= 0) {
    throw new PaystackError("The amount must be a positive integer number of kobo.");
  }
  const data = await request<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: {
      email: params.email,
      amount: params.amountMinor,
      currency: "NGN",
      reference: params.reference,
      callback_url: params.callbackUrl,
      ...(params.channels && params.channels.length > 0
        ? { channels: [...params.channels] }
        : {}),
      ...(params.metadata ? { metadata: params.metadata } : {}),
    },
  });
  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
  };
}

export type VerifiedTransactionStatus =
  | "success"
  | "failed"
  | "abandoned"
  | "ongoing"
  | "pending"
  | "processing"
  | "queued"
  | "reversed";

export type VerifiedTransaction = {
  status: VerifiedTransactionStatus;
  /** Integer kobo actually charged. */
  amountMinor: number;
  /**
   * Integer kobo Paystack kept out of the charge, when it reported one. Null
   * means it said nothing, which the ledger records as zero rather than a
   * guess. The platform's own take is always zero, so this is the only
   * deduction a booking ledger row ever carries.
   */
  feesMinor: number | null;
  currency: string;
  reference: string;
  paidAt: string | null;
  channel: string | null;
  gatewayResponse: string | null;
  customerEmail: string | null;
  metadata: Record<string, unknown>;
};

/**
 * Paystack metadata, as an object, whatever shape it actually arrived in.
 *
 * Paystack echoes metadata back as an OBJECT on most transactions and as a
 * JSON STRING on others: the hosted checkout serialises it when it was set
 * through certain channels, and the webhook payload and the verify response do
 * not always agree with each other for the same charge. Every reader in this
 * codebase used to accept objects only, so a stringified metadata yielded no
 * user_id, the funding was dropped, and there was no trace of the drop.
 *
 * Anything that is not an object and not a JSON object string becomes an empty
 * record, so callers can always index into the result. This never throws: a
 * malformed metadata is a missing metadata, not a failed payment.
 */
export function metadataObject(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return {};
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

/** Look a transaction up by reference and report its settled truth. */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  const data = await request<{
    status: string;
    amount: number;
    fees?: number | null;
    currency: string;
    reference: string;
    paid_at: string | null;
    channel: string | null;
    gateway_response: string | null;
    customer: { email?: string | null } | null;
    metadata: unknown;
  }>(`/transaction/verify/${encodeURIComponent(reference)}`);

  const metadata = metadataObject(data.metadata);

  return {
    status: data.status as VerifiedTransactionStatus,
    amountMinor: data.amount,
    feesMinor: Number.isSafeInteger(data.fees) ? (data.fees as number) : null,
    currency: data.currency,
    reference: data.reference,
    paidAt: data.paid_at ?? null,
    channel: data.channel ?? null,
    gatewayResponse: data.gateway_response ?? null,
    customerEmail: data.customer?.email ?? null,
    metadata,
  };
}

/**
 * One successful charge as the reconciliation sweep needs to see it.
 *
 * Deliberately smaller than VerifiedTransaction: a listing page returns
 * hundreds of rows and the sweep only has to answer "did this reach our
 * ledger". The authoritative read for anything it decides to POST is still
 * verifyTransaction against the single reference.
 */
export type ChargeSummary = {
  reference: string;
  /** Integer kobo. */
  amountMinor: number;
  currency: string;
  paidAt: string | null;
  channel: string | null;
  customerEmail: string | null;
  metadata: Record<string, unknown>;
  /** Integer kobo the processor kept, when the list reported it (MON-14). */
  feesMinor?: number | null;
};

/** The largest page Paystack will serve, and the sweep's page size. */
const LIST_PAGE_SIZE = 100;

/**
 * Every successful charge Paystack has taken in a window.
 *
 * This is the other half of reconciliation. Verifying a reference we already
 * know about can only recover a payment somebody thought to ask about; asking
 * the processor what it actually charged is the only way to find the ones
 * nobody knows are missing. Pages until the window is exhausted or `maxPages`
 * is reached, so one bad window cannot spin forever.
 */
export async function listSuccessfulCharges(params: {
  /** ISO date or datetime, inclusive lower bound. */
  from: string;
  /** ISO date or datetime, inclusive upper bound. Defaults to now. */
  to?: string;
  maxPages?: number;
}): Promise<ChargeSummary[]> {
  const maxPages = Math.max(1, Math.min(params.maxPages ?? 10, 50));
  const out: ChargeSummary[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const query = new URLSearchParams({
      status: "success",
      perPage: String(LIST_PAGE_SIZE),
      page: String(page),
      from: params.from,
      ...(params.to ? { to: params.to } : {}),
    });
    const rows = await request<
      {
        reference?: string | null;
        amount?: number | null;
        currency?: string | null;
        paid_at?: string | null;
        channel?: string | null;
        customer?: { email?: string | null } | null;
        metadata?: unknown;
        fees?: number | null;
      }[]
    >(`/transaction?${query.toString()}`);

    for (const row of rows) {
      const reference = typeof row.reference === "string" ? row.reference : "";
      if (reference.length === 0) continue;
      out.push({
        reference,
        amountMinor: Number.isSafeInteger(row.amount) ? (row.amount as number) : 0,
        currency: row.currency ?? "NGN",
        paidAt: row.paid_at ?? null,
        channel: row.channel ?? null,
        customerEmail: row.customer?.email ?? null,
        metadata: metadataObject(row.metadata),
        feesMinor: Number.isSafeInteger(row.fees) ? (row.fees as number) : null,
      });
    }

    if (rows.length < LIST_PAGE_SIZE) break;
  }

  return out;
}

/* ----------------------------------------------------------- authorizations */

/**
 * The reusable-card token Paystack hands back after a successful charge.
 *
 * Token material and display facts only. There is no card number anywhere in
 * this shape and there never will be: Paystack tokenises, and the platform
 * stores what the processor gives it and nothing it does not.
 */
export type PaystackAuthorization = {
  authorizationCode: string;
  signature: string;
  cardType: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  bin: string | null;
  bank: string | null;
  channel: string | null;
  reusable: boolean;
};

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function smallIntOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d{1,4}$/.test(value.trim())) return Number(value.trim());
  return null;
}

/**
 * The authorization object as it arrives on a webhook, a verify response or a
 * charge_authorization response, read defensively: Paystack has changed the
 * shape of these payloads before and a missing field must never throw inside
 * a webhook. Null when the two facts that make a row possible (the code and
 * the signature) are absent.
 */
export function readAuthorization(raw: unknown): PaystackAuthorization | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const a = raw as Record<string, unknown>;
  const authorizationCode = textOrNull(a["authorization_code"]);
  const signature = textOrNull(a["signature"]);
  if (!authorizationCode || !signature) return null;
  return {
    authorizationCode,
    signature,
    cardType: textOrNull(a["card_type"]),
    last4: textOrNull(a["last4"]),
    expMonth: smallIntOrNull(a["exp_month"]),
    expYear: smallIntOrNull(a["exp_year"]),
    bin: textOrNull(a["bin"]),
    bank: textOrNull(a["bank"]),
    channel: textOrNull(a["channel"]),
    reusable: a["reusable"] === true,
  };
}

export type ChargedAuthorization = {
  /** Paystack's word for the attempt: success, failed, pending, and so on. */
  status: string;
  reference: string;
  /** Integer kobo. */
  amountMinor: number;
  gatewayResponse: string | null;
  authorization: PaystackAuthorization | null;
};

/**
 * Charge a saved card: POST /transaction/charge_authorization.
 *
 * Server-side only, integer kobo, a fresh platform reference, and THE SAME
 * EMAIL the authorization was minted under, which is why payment_methods
 * carries email_used. There is no 3DS challenge on this path: when the bank
 * insists on authenticating, or the token has gone stale, Paystack declines,
 * and the caller falls back to a hosted checkout rather than retrying.
 *
 * A status:false envelope becomes a PaystackError as everywhere else. A
 * status:true envelope whose data.status is not "success" is a decline the
 * processor recorded, and is returned rather than thrown so the caller can
 * read gateway_response and decide.
 */
export async function chargeAuthorization(params: {
  authorizationCode: string;
  email: string;
  amountMinor: number;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<ChargedAuthorization> {
  if (!Number.isSafeInteger(params.amountMinor) || params.amountMinor <= 0) {
    throw new PaystackError("The amount must be a positive integer number of kobo.");
  }
  const data = await request<{
    status: string;
    reference: string;
    amount: number;
    gateway_response?: string | null;
    authorization?: unknown;
  }>("/transaction/charge_authorization", {
    method: "POST",
    body: {
      authorization_code: params.authorizationCode,
      email: params.email,
      amount: params.amountMinor,
      currency: "NGN",
      reference: params.reference,
      ...(params.metadata ? { metadata: params.metadata } : {}),
    },
  });
  return {
    status: typeof data.status === "string" ? data.status : "unknown",
    reference: data.reference,
    amountMinor: Number.isSafeInteger(data.amount) ? data.amount : params.amountMinor,
    gatewayResponse: data.gateway_response ?? null,
    authorization: readAuthorization(data.authorization),
  };
}

/* ---------------------------------------------------------------- webhooks */

/**
 * Verify x-paystack-signature: HMAC SHA-512 of the RAW request body with the
 * secret key, compared in constant time. Returns false, never throws, so the
 * webhook route can always answer 200 quickly.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const key = secretKey();
  if (key.length === 0 || signature.length === 0) return false;
  try {
    const expected = createHmac("sha512", key).update(rawBody, "utf8").digest();
    const received = Buffer.from(signature, "hex");
    if (received.length !== expected.length) return false;
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

/* --------------------------------------------------------------- transfers */

export type TransferRecipient = {
  recipientCode: string;
};

/** Register a NUBAN account as a transfer recipient, returning its code. */
export async function createTransferRecipient(params: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<TransferRecipient> {
  const data = await request<{ recipient_code: string }>("/transferrecipient", {
    method: "POST",
    body: {
      type: "nuban",
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: "NGN",
    },
  });
  return { recipientCode: data.recipient_code };
}

export type InitiatedTransfer = {
  transferCode: string;
  reference: string;
  /** Paystack's transfer state at initiation, e.g. pending, otp or success. */
  status: string;
};

/**
 * Send money from the Paystack balance to a recipient. The caller supplies the
 * unique reference (rm-wd-<uuid>), which the webhook later settles against.
 */
export async function initiateTransfer(params: {
  amountMinor: number;
  recipientCode: string;
  reference: string;
  reason?: string;
}): Promise<InitiatedTransfer> {
  if (!Number.isSafeInteger(params.amountMinor) || params.amountMinor <= 0) {
    throw new PaystackError("The amount must be a positive integer number of kobo.");
  }
  const data = await request<{ transfer_code: string; reference: string; status: string }>(
    "/transfer",
    {
      method: "POST",
      body: {
        source: "balance",
        amount: params.amountMinor,
        currency: "NGN",
        recipient: params.recipientCode,
        reference: params.reference,
        ...(params.reason ? { reason: params.reason } : {}),
      },
    },
  );
  return {
    transferCode: data.transfer_code,
    reference: data.reference,
    status: data.status,
  };
}

export type VerifiedTransfer = {
  /** Paystack's own word: success, failed, reversed, pending, otp, abandoned. */
  status: string;
  /** Integer kobo. */
  amountMinor: number;
  reference: string;
};

/**
 * What actually became of a transfer we started.
 *
 * The withdrawal sweeper cannot expire a PENDING hold on age alone. A hold
 * whose transfer really did pay out, and whose webhook was merely late or lost,
 * would be marked FAILED and the money handed back to a wallet it had already
 * left. So the sweeper asks the processor first and acts on the answer, and a
 * hold is only released when Paystack says the transfer failed, was reversed,
 * or does not exist at all.
 *
 * Throws PaystackError when the reference is unknown, which is the useful case:
 * a hold was posted and the transfer never started.
 */
export async function verifyTransfer(reference: string): Promise<VerifiedTransfer> {
  const data = await request<{
    status: string;
    amount: number;
    reference: string;
  }>(`/transfer/verify/${encodeURIComponent(reference)}`);
  return {
    status: data.status,
    amountMinor: Number.isSafeInteger(data.amount) ? data.amount : 0,
    reference: data.reference,
  };
}

/* -------------------------------------------------------------------- banks */

export type PaystackBank = {
  name: string;
  code: string;
  slug: string;
};

/** Nigerian banks Paystack can pay out to, for building payout pickers. */
export async function listBanks(): Promise<PaystackBank[]> {
  const data = await request<{ name: string; code: string; slug: string }[]>(
    "/bank?currency=NGN&perPage=100",
  );
  return data.map((b) => ({ name: b.name, code: b.code, slug: b.slug }));
}

export type ResolvedAccount = {
  accountNumber: string;
  accountName: string;
};

/**
 * Who a NUBAN actually belongs to, straight from the bank.
 *
 * This is the single best mis-transfer prevention available and it is how every
 * Nigerian banking app already behaves: you type ten digits, the real name comes
 * back, and you check it before you commit. The name is never taken from the
 * person filing the account, only from here.
 *
 * Throws PaystackError when the account cannot be resolved, which callers should
 * treat as "we could not confirm this account" rather than as an outage.
 */
export async function resolveAccountNumber(
  accountNumber: string,
  bankCode: string,
): Promise<ResolvedAccount> {
  const params = new URLSearchParams({
    account_number: accountNumber,
    bank_code: bankCode,
  });
  const data = await request<{ account_number: string; account_name: string }>(
    `/bank/resolve?${params.toString()}`,
  );
  return {
    accountNumber: data.account_number,
    accountName: data.account_name,
  };
}
