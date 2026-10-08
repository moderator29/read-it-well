import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { currentPaystack, currentReserveSubaccount } from "./paystack-mode";

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

/**
 * The secret key for the current mode (`./paystack-mode.ts`): live on
 * Production, the sandbox key on Preview and Development when one is set, and
 * whatever `PAYSTACK_MODE` says when it says something. Empty when that mode
 * has no usable key, which every caller already treats as "not configured".
 */
function secretKey(): string {
  return currentPaystack().secretKey;
}

/** True when the current mode has a usable secret key. Checked lazily, never at import. */
export function isPaystackConfigured(): boolean {
  return secretKey().length > 0;
}

export { currentPaystackMode, type PaystackMode } from "./paystack-mode";

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
/**
 * Where each kobo of a charge settles, fixed before the card is touched.
 *
 * TRACK A, 25 SEPTEMBER 2026: VALLO NEVER HOLDS CUSTOMER MONEY. Every charge
 * this platform opens carries a Paystack dynamic split: the lister's share to
 * the lister's own subaccount (their bank), the Guarantee contribution to the
 * reserve subaccount (a separate bank account), and what is left, Vallo's
 * commission, to the main account. All of it settles from the same
 * transaction. The processor's fee is borne by the lister's subaccount.
 *
 * The shares are computed by the database (`public.payment_split_for_booking`)
 * and only copied here. They are flat kobo, and they add up to the amount
 * minus the commission by construction.
 */
export type PaystackSplit = {
  listerSubaccount: string;
  listerShareMinor: number;
  /** Null when the split has no reserve leg (guaranteeMinor 0, D51). */
  reserveSubaccount: string | null;
  guaranteeMinor: number;
};

function splitBody(split: PaystackSplit): Record<string, unknown> {
  const subaccounts: { subaccount: string; share: number }[] = [
    { subaccount: split.listerSubaccount, share: split.listerShareMinor },
  ];
  if (split.guaranteeMinor > 0) {
    /* A reserve leg with no reserve account is never sent: quoteSplit refuses it first. */
    if (!split.reserveSubaccount) throw new PaystackError("A reserve leg needs the reserve subaccount.");
    subaccounts.push({ subaccount: split.reserveSubaccount, share: split.guaranteeMinor });
  }
  return {
    split: {
      type: "flat",
      bearer_type: "subaccount",
      bearer_subaccount: split.listerSubaccount,
      subaccounts,
    },
  };
}

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
   * There are two such callers today: `startCardSetup`, whose whole purpose
   * is to obtain a reusable card authorisation that only a card can produce,
   * and a subscription checkout (lib/subscriptions/checkout.ts), which Paystack
   * renews every month against exactly that authorisation.
   */
  channels?: readonly string[];
  /** Where the charge settles. Required for every payment a person makes to another. */
  split?: PaystackSplit;
  /**
   * A Paystack plan code (`PLN_...`). Paystack then charges the plan's amount
   * and, once the charge succeeds, creates a subscription that it charges
   * every interval itself (lib/subscriptions). Absent for every other charge.
   */
  plan?: string;
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
      ...(params.split ? splitBody(params.split) : {}),
      ...(params.plan ? { plan: params.plan } : {}),
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
  /**
   * The card token the charge produced, exactly as Paystack returned it, for
   * `readAuthorization` to read defensively. Optional so the many callers and
   * fixtures that never look at it are untouched. Only the card-setup confirm
   * (`lib/payments/card-setup.ts`) reads it.
   */
  authorization?: unknown;
  /** Paystack's customer code (`CUS_...`), when the verify response carried one. */
  customerCode?: string | null;
  /** The plan code (`PLN_...`) a subscription charge was made under, when there was one. */
  planCode?: string | null;
};

/**
 * The plan code a charge was made under, from a webhook payload or a verify
 * response. Paystack sends `plan` as an object with `plan_code` on a plan
 * charge and as an empty object (or a bare code, or nothing) otherwise, and the
 * verify response also carries `plan_object`. Null when none of them names a
 * `PLN_` code.
 */
export function planCodeOf(data: unknown): string | null {
  if (data === null || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  for (const candidate of [d["plan_object"], d["plan"]]) {
    if (typeof candidate === "string" && /^PLN_[A-Za-z0-9]+$/.test(candidate)) return candidate;
    if (candidate !== null && typeof candidate === "object") {
      const code = (candidate as Record<string, unknown>)["plan_code"];
      if (typeof code === "string" && /^PLN_[A-Za-z0-9]+$/.test(code)) return code;
    }
  }
  return null;
}

/** The customer code (`CUS_...`) on a payload's `customer`, or null. */
export function customerCodeOf(data: unknown): string | null {
  if (data === null || typeof data !== "object") return null;
  const customer = (data as Record<string, unknown>)["customer"];
  if (customer === null || typeof customer !== "object") return null;
  const code = (customer as Record<string, unknown>)["customer_code"];
  return typeof code === "string" && code.trim().length > 0 ? code.trim() : null;
}

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
    customer: { email?: string | null; customer_code?: string | null } | null;
    metadata: unknown;
    authorization?: unknown;
    plan?: unknown;
    plan_object?: unknown;
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
    authorization: data.authorization ?? null,
    customerCode: customerCodeOf(data),
    planCode: planCodeOf(data),
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
  split?: PaystackSplit;
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
      ...(params.split ? splitBody(params.split) : {}),
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

/* Track A, 25 September 2026: there are no transfers. Vallo never holds money,
   so it never sends any: a lister is paid by the split at the moment of the
   charge, and a person is refunded to their card. The transfer calls that
   lived here are deleted so nothing can reach them. */

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

/* ------------------------------------------------------------- subaccounts */

export type CreatedSubaccount = { subaccountCode: string };

/**
 * A lister's settlement account at Paystack.
 *
 * Created from a verified payout account, once, when the lister adds it. The
 * lister's share of every payment settles here straight from the charge, so
 * Vallo never holds it. `percentage_charge` is 0 because the split every
 * charge carries names the shares in flat kobo, and a subaccount-level
 * percentage would be a second, silent fee.
 */
export async function createSubaccount(params: {
  businessName: string;
  bankCode: string;
  accountNumber: string;
  description?: string;
}): Promise<CreatedSubaccount> {
  const data = await request<{ subaccount_code: string }>("/subaccount", {
    method: "POST",
    body: {
      business_name: params.businessName.slice(0, 100),
      settlement_bank: params.bankCode,
      account_number: params.accountNumber,
      percentage_charge: 0,
      ...(params.description ? { description: params.description.slice(0, 200) } : {}),
    },
  });
  if (typeof data?.subaccount_code !== "string" || data.subaccount_code.length === 0) {
    throw new PaystackError("The payment service did not return a settlement account.");
  }
  return { subaccountCode: data.subaccount_code };
}

/* ------------------------------------------------------- plans and subscriptions */

/**
 * VALLO'S OWN SUBSCRIPTIONS (Vallo Pro, Vallo Business). Paystack owns the
 * monthly charge and the card: a plan is created once per Vallo plan, mode and
 * price (lib/subscriptions/plans.ts records its code), a checkout initialised
 * with `plan` creates the subscription, and Paystack charges it every month.
 * Vallo stores no card data, only the codes Paystack returns.
 */

export type PaystackPlan = {
  planCode: string;
  name: string;
  /** Integer kobo. */
  amountMinor: number;
  interval: string;
  currency: string;
};

function readPlan(row: unknown): PaystackPlan | null {
  if (row === null || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const planCode = typeof r["plan_code"] === "string" ? r["plan_code"] : "";
  if (!/^PLN_[A-Za-z0-9]+$/.test(planCode)) return null;
  return {
    planCode,
    name: typeof r["name"] === "string" ? r["name"] : "",
    amountMinor: Number.isSafeInteger(r["amount"]) ? (r["amount"] as number) : 0,
    interval: typeof r["interval"] === "string" ? r["interval"] : "",
    currency: typeof r["currency"] === "string" ? r["currency"] : "",
  };
}

/** The account's monthly plans at an amount (GET /plan). */
export async function listPlans(params: { amountMinor: number; interval: "monthly" }): Promise<PaystackPlan[]> {
  const query = new URLSearchParams({ perPage: "100", interval: params.interval, amount: String(params.amountMinor) });
  const rows = await request<unknown[]>(`/plan?${query.toString()}`);
  return (Array.isArray(rows) ? rows : []).flatMap((row) => {
    const plan = readPlan(row);
    return plan ? [plan] : [];
  });
}

/** Create a plan (POST /plan). The amount is integer kobo, always the Vallo plan row's price. */
export async function createPlan(params: {
  name: string;
  amountMinor: number;
  interval: "monthly";
  description?: string;
}): Promise<PaystackPlan> {
  if (!Number.isSafeInteger(params.amountMinor) || params.amountMinor <= 0) {
    throw new PaystackError("A plan amount must be a positive integer number of kobo.");
  }
  const data = await request<unknown>("/plan", {
    method: "POST",
    body: {
      name: params.name.slice(0, 100),
      amount: params.amountMinor,
      interval: params.interval,
      currency: "NGN",
      ...(params.description ? { description: params.description.slice(0, 200) } : {}),
    },
  });
  const plan = readPlan(data);
  if (!plan) throw new PaystackError("The payment service did not return a plan code.");
  return plan;
}

export type PaystackSubscription = {
  subscriptionCode: string;
  status: string;
  emailToken: string | null;
  nextPaymentDate: string | null;
};

/** One subscription (GET /subscription/:code), for the email token a cancel needs. */
export async function fetchSubscription(code: string): Promise<PaystackSubscription> {
  const data = await request<Record<string, unknown> | null>(`/subscription/${encodeURIComponent(code)}`);
  const text = (key: string): string | null => (typeof data?.[key] === "string" ? (data[key] as string) : null);
  return {
    subscriptionCode: text("subscription_code") ?? code,
    status: text("status") ?? "unknown",
    emailToken: text("email_token"),
    nextPaymentDate: text("next_payment_date"),
  };
}

/**
 * Stop a subscription renewing (POST /subscription/disable). Paystack charges
 * nothing more; the member keeps what they already paid for (Vallo's record
 * of the period decides that, not this call).
 */
export async function disableSubscription(params: { code: string; token: string }): Promise<void> {
  await request<unknown>("/subscription/disable", {
    method: "POST",
    body: { code: params.code, token: params.token },
  });
}

/* ----------------------------------------------------------------- refunds */

export type SubmittedRefund = { refundId: string; status: string };

/**
 * Return a charge, in full or in part, to the card or account it came from.
 *
 * This is the only way money goes back to a person on Vallo. There is no
 * wallet to credit. Paystack processes the refund against the original
 * transaction; the bank shows it on its own schedule.
 */
export async function refundTransaction(params: {
  reference: string;
  amountMinor?: number;
  merchantNote?: string;
  customerNote?: string;
}): Promise<SubmittedRefund> {
  if (params.amountMinor !== undefined && (!Number.isSafeInteger(params.amountMinor) || params.amountMinor <= 0)) {
    throw new PaystackError("A refund amount must be a positive integer number of kobo.");
  }
  const data = await request<{ id?: number | string; status?: string }>("/refund", {
    method: "POST",
    body: {
      transaction: params.reference,
      ...(params.amountMinor !== undefined ? { amount: params.amountMinor } : {}),
      currency: "NGN",
      ...(params.merchantNote ? { merchant_note: params.merchantNote.slice(0, 300) } : {}),
      ...(params.customerNote ? { customer_note: params.customerNote.slice(0, 300) } : {}),
    },
  });
  return { refundId: String(data?.id ?? ""), status: typeof data?.status === "string" ? data.status : "pending" };
}

/**
 * The reserve's settlement subaccount for the current mode. Null when not set
 * up. Subaccounts belong to one Paystack mode, so test mode reads
 * PAYSTACK_TEST_GUARANTEE_SUBACCOUNT and never the live code.
 */
export function guaranteeReserveSubaccount(): string | null {
  return currentReserveSubaccount();
}
