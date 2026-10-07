/**
 * THE PAYLUK HTTP CLIENT for the member money rail (Part B phases 4 to 10).
 *
 * Pure apart from `fetch`, which is injected, so every branch is a unit test
 * against the documented shapes. Every route, header and field here is in
 * `docs/payments/payluk-source/` (the `api-reference_*` pages are Payluk's
 * own, vendored verbatim on 7 October 2026) or in
 * `docs/payments/PAYLUK_LIVE_DOCS_FINDINGS.md`. Where the docs are silent the
 * line says `UNVERIFIED against live docs:` and does the cautious thing.
 *
 * The facts that govern everything below:
 *  - AMOUNTS ARE NAIRA, MAJOR UNITS, at most two decimals ("send 10000 for
 *    ₦10,000", create-payment-intent). Vallo counts kobo. The conversion is
 *    here, at the boundary, both ways, and nowhere else (`koboToNaira`,
 *    `nairaToKobo`). Paystack is the opposite; mixing them is a hundredfold
 *    error, and `payluk-client.test.ts` would catch it.
 *  - 10 requests a minute per secret key, across every `/v1` route. The
 *    `RateLimit: limit=10, remaining=N, reset=S` header is read on every
 *    answer and a call is refused locally while the window is spent, rather
 *    than spending a request to be told 429 (authentication.txt).
 *  - No `Idempotency-Key` exists. Vallo's `reference` is the key: generated
 *    before the call, stored before the call, and looked up after any call
 *    that did not answer (findings, question 2).
 *  - A call that may have moved money and did not answer is UNKNOWN, never a
 *    failure, and is never retried by this file.
 *  - `customer-id` names the merchant customer a request acts for; the
 *    customer and bank-list routes take none (authentication.txt).
 */

import { nairaToKobo, rateLimitRemaining, type PaylukMerchantConfig } from "../../payouts/payluk-merchant";
import type {
  HostedCollection,
  RailBank,
  RailCustomer,
  RailCustomerInput,
  RailFailure,
  RailFailureKind,
  RailMovement,
  RailResult,
  ReportedBalance,
  ResolvedAccount,
  StagedIntent,
  StageIntentInput,
} from "../provider";

export type PaylukFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string | FormData; signal?: AbortSignal },
) => Promise<{ status: number; headers: { get(name: string): string | null }; json(): Promise<unknown> }>;

/* ----------------------------------------------------------- amounts */

/**
 * Integer kobo to the naira number Payluk reads. 100_000 kobo is 1000 naira.
 * Refuses anything that is not a whole, non-negative, safe kobo count.
 */
export function koboToNaira(kobo: number): number {
  if (!Number.isSafeInteger(kobo) || kobo < 0) throw new RangeError(`Not a kobo amount: ${kobo}`);
  return kobo / 100;
}

export { nairaToKobo };

/* --------------------------------------------------------- rate gate */

/** `RateLimit: limit=10, remaining=0, reset=41` -> 41. */
export function rateLimitReset(header: string | null): number | null {
  if (!header) return null;
  const m = /reset\s*=\s*(\d+)/i.exec(header);
  return m ? Number(m[1]) : null;
}

/**
 * Remembers the last window the provider reported, per process. Best effort
 * (each server instance keeps its own), which is why a 429 is still handled.
 */
export class PaylukRateGate {
  private blockedUntil = 0;
  constructor(private readonly now: () => number = Date.now) {}
  /** Record what an answer said. */
  note(remaining: number | null, resetSeconds: number | null): void {
    if (remaining === 0) this.blockedUntil = this.now() + Math.max(1, resetSeconds ?? 60) * 1000;
  }
  /** Seconds until a call may go, or 0. */
  wait(): number {
    const ms = this.blockedUntil - this.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  }
}

/* ----------------------------------------------------------- request */

export type PaylukContext = { config: PaylukMerchantConfig; fetch: PaylukFetch; gate: PaylukRateGate };

type RequestSpec = {
  method: "GET" | "POST";
  path: string;
  customerId?: string;
  body?: Record<string, unknown>;
  /** A `multipart/form-data` body (create-escrow); fetch sets the boundary. */
  form?: Record<string, string>;
  query?: Record<string, string>;
  /** True when the call can move money or create something: no answer is then UNKNOWN. */
  mutates: boolean;
};

type Raw = { ok: true; data: unknown; message: string } | RailFailure;

function fail(kind: RailFailureKind, httpStatus: number | null, detail: string, retryAfterSeconds: number | null = null): RailFailure {
  return { ok: false, kind, httpStatus, detail: detail.slice(0, 200), retryAfterSeconds };
}

/** The HTTP status onto Vallo's failure kinds (essentials_errors). */
export function failureKindFor(status: number, mutates: boolean): RailFailureKind {
  if (status === 429) return "rate_limited";
  if (status === 404) return "not_found";
  if (status === 401 || status === 403 || status === 410) return "not_configured";
  if (status === 503) return "unavailable";
  /* A gateway error or timeout in front of the provider says nothing about
     whether the request reached it. */
  if (status === 502 || status === 504) return mutates ? "unknown" : "unavailable";
  if (status >= 500) return mutates ? "unknown" : "unavailable";
  return "refused";
}

function formBody(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  return form;
}

export async function paylukRequest(ctx: PaylukContext, spec: RequestSpec): Promise<Raw> {
  const wait = ctx.gate.wait();
  if (wait > 0) return fail("rate_limited", null, "Held locally: the provider's rate window is spent.", wait);

  const qs = spec.query ? `?${new URLSearchParams(spec.query).toString()}` : "";
  const headers: Record<string, string> = { Authorization: `Bearer ${ctx.config.key}`, Accept: "application/json" };
  if (spec.customerId) headers["customer-id"] = spec.customerId;
  if (spec.body) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await ctx.fetch(`${ctx.config.baseUrl}${spec.path}${qs}`, {
      method: spec.method,
      headers,
      ...(spec.body ? { body: JSON.stringify(spec.body) } : spec.form ? { body: formBody(spec.form) } : {}),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return spec.mutates
      ? fail("unknown", null, "No answer (network or timeout); the request may have reached the provider.")
      : fail("unavailable", null, "No answer (network or timeout).");
  }

  const rateHeader = res.headers.get("RateLimit");
  const reset = rateLimitReset(rateHeader);
  ctx.gate.note(res.status === 429 ? 0 : rateLimitRemaining(rateHeader), reset);

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const envelope = (body && typeof body === "object" ? body : {}) as { message?: unknown; data?: unknown };
  const message = typeof envelope.message === "string" ? envelope.message : "";

  if (res.status === 200 || res.status === 201) {
    if (body === null) {
      return spec.mutates ? fail("unknown", res.status, "Accepted but unreadable.") : fail("unreadable", res.status, "Unreadable body.");
    }
    return { ok: true, data: envelope.data, message };
  }
  return fail(failureKindFor(res.status, spec.mutates), res.status, message, res.status === 429 ? reset ?? 60 : null);
}

/* ----------------------------------------------------------- parsers */

const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** The `Customer` schema (create, get and list merchant customers). */
export function parseCustomer(data: unknown): RailCustomer | null {
  const d = obj(data);
  const customerId = str(d.customerId) || str(d.id);
  if (!customerId) return null;
  const permissions = obj(d.permissions);
  const status = str(d.status).toLowerCase();
  return {
    customerId,
    status,
    phone: str(d.phone),
    displayName: [str(d.firstname), str(d.lastname)].filter(Boolean).join(" "),
    canWithdraw: bool(permissions.canWithdraw),
    canBuy: bool(permissions.canBuy),
    canSell: bool(permissions.canSell),
    blocked: status === "blocked" || str(d.blockedAt).length > 0,
  };
}

/** `GET /v1/wallet` (and the merchant balance, same shape). Null when either figure is not naira. */
export function parseBalance(data: unknown): ReportedBalance | null {
  const d = obj(data);
  const available = nairaToKobo(d.mainBalance);
  const held = nairaToKobo(d.escrowBalance);
  if (available === null || held === null) return null;
  /* The docs show `currency: "NG"` in the example and "NGN" on the concept
     page. A two-letter country code is read as that country's currency. */
  const raw = str(d.currency).toUpperCase();
  const currency = raw === "NG" ? "NGN" : /^[A-Z]{3}$/.test(raw) ? raw : "NGN";
  return {
    providerBalanceId: str(d.id),
    availableMinor: available,
    protectedMinor: held,
    currency,
    providerUpdatedAt: str(d.updatedAt) || null,
  };
}

/**
 * The hosted collection on a deposit intent without a card: `checkoutConfig`
 * on production, `testAccount` on staging (create-payment-intent).
 * UNVERIFIED against live docs: neither object's fields are specified. A
 * string field that is an https URL is taken as the page to open; anything
 * else is kept whole and the screen says the deposit cannot be opened here.
 */
export function parseHosted(d: Record<string, unknown>): HostedCollection | null {
  const config = obj(d.checkoutConfig);
  if (Object.keys(config).length > 0) {
    for (const key of ["authorizationUrl", "authorization_url", "checkoutUrl", "url", "link"]) {
      const v = str(config[key]);
      if (/^https:\/\//.test(v)) return { kind: "checkout_url", url: v };
    }
    return { kind: "checkout_config", config };
  }
  const test = obj(d.testAccount);
  if (Object.keys(test).length > 0) {
    const details: Record<string, string> = {};
    for (const [k, v] of Object.entries(test)) if (typeof v === "string" || typeof v === "number") details[k] = String(v);
    return { kind: "test_account", details };
  }
  return null;
}

/** The intent returned by create-intent and verify. Null when amount or fee is not naira. */
export function parseIntent(data: unknown): StagedIntent | null {
  const d = obj(data);
  const amount = nairaToKobo(d.amount);
  /* A fee the provider did not send is not zero; it is unknown, and an
     intent without one is not shown to a member as a price. */
  const fee = nairaToKobo(d.fee);
  const reference = str(d.reference);
  if (amount === null || fee === null || !reference) return null;
  return { providerId: str(d.id), reference, amountMinor: amount, feeMinor: fee, status: str(d.status).toLowerCase(), hosted: parseHosted(d) };
}

/** One entry of `GET /v1/payment/history`, or a `payment.*` webhook's `data`. */
export function parseMovement(data: unknown): RailMovement | null {
  const d = obj(data);
  const amount = nairaToKobo(d.amount);
  const fee = d.fee === null || d.fee === undefined ? 0 : nairaToKobo(d.fee);
  const reference = str(d.reference);
  if (amount === null || fee === null || !reference) return null;
  const credit = str(d.creditType).toLowerCase();
  return {
    providerId: str(d.id),
    reference,
    amountMinor: amount,
    feeMinor: fee,
    status: str(d.status).toLowerCase(),
    type: str(d.transactionType).toLowerCase(),
    direction: credit === "credit" ? "credit" : credit === "debit" ? "debit" : null,
    customerId: str(d.customerId) || null,
    updatedAt: str(d.updatedAt) || null,
  };
}

/* --------------------------------------------------------- endpoints */

function unreadable(): RailFailure {
  return fail("unreadable", 200, "The answer did not match the documented shape.");
}

/** `GET /v1/customers?email=` (list merchant customers, the single-customer lookup). */
export async function findCustomerByEmail(ctx: PaylukContext, email: string): Promise<RailResult<RailCustomer | null>> {
  const r = await paylukRequest(ctx, { method: "GET", path: "/v1/customers", query: { email }, mutates: false });
  if (!r.ok) {
    /* "No customer found with the provided email" is the documented 400 for no match. */
    if (r.kind === "refused" && /no customer found/i.test(r.detail)) return { ok: true, value: null };
    return r;
  }
  const rows = obj(r.data).data;
  if (!Array.isArray(rows)) return unreadable();
  if (rows.length === 0) return { ok: true, value: null };
  const c = parseCustomer(rows[0]);
  return c ? { ok: true, value: c } : unreadable();
}

/** `POST /v1/customer/create`. Not idempotent at the provider, so a timeout is UNKNOWN and resolved by `findCustomerByEmail`. */
export async function createCustomer(ctx: PaylukContext, input: RailCustomerInput): Promise<RailResult<RailCustomer>> {
  const r = await paylukRequest(ctx, {
    method: "POST",
    path: "/v1/customer/create",
    body: {
      firstname: input.firstName,
      lastname: input.lastName,
      email: input.email,
      phone: input.phone,
      ...(input.country ? { countryId: input.country } : {}),
    },
    mutates: true,
  });
  if (!r.ok) return r;
  const c = parseCustomer(r.data);
  return c ? { ok: true, value: c } : fail("unknown", 200, "Created, but the customer id was unreadable.");
}

/** `GET /v1/customer/get/{customerId}`. */
export async function getCustomer(ctx: PaylukContext, customerId: string): Promise<RailResult<RailCustomer>> {
  const r = await paylukRequest(ctx, { method: "GET", path: `/v1/customer/get/${encodeURIComponent(customerId)}`, mutates: false });
  if (!r.ok) return r;
  const c = parseCustomer(r.data);
  return c ? { ok: true, value: c } : unreadable();
}

/** `GET /v1/wallet` with `customer-id`. */
export async function getBalance(ctx: PaylukContext, customerId: string): Promise<RailResult<ReportedBalance>> {
  const r = await paylukRequest(ctx, { method: "GET", path: "/v1/wallet", customerId, mutates: false });
  if (!r.ok) return r;
  const b = parseBalance(r.data);
  return b ? { ok: true, value: b } : unreadable();
}

/** `GET /v1/payment/bank-list`. Codes are opaque strings and never cached across sessions (get-bank-list). */
export async function getBankList(ctx: PaylukContext): Promise<RailResult<RailBank[]>> {
  const r = await paylukRequest(ctx, { method: "GET", path: "/v1/payment/bank-list", mutates: false });
  if (!r.ok) return r;
  if (!Array.isArray(r.data)) return unreadable();
  const banks = r.data
    .map((row) => ({ name: str(obj(row).name).trim(), code: str(obj(row).code).trim() }))
    .filter((b) => b.name && b.code);
  return { ok: true, value: banks };
}

/** `POST /v1/payment/verify-account` with `customer-id`. */
export async function verifyAccount(
  ctx: PaylukContext,
  customerId: string,
  input: { accountNumber: string; bankCode: string; bankName?: string },
): Promise<RailResult<ResolvedAccount>> {
  const r = await paylukRequest(ctx, {
    method: "POST",
    path: "/v1/payment/verify-account",
    customerId,
    body: { accountNumber: input.accountNumber, bankCode: input.bankCode, ...(input.bankName ? { bankName: input.bankName } : {}) },
    mutates: false,
  });
  if (!r.ok) return r;
  const d = obj(r.data);
  const accountName = str(d.accountName).trim();
  if (!accountName) return unreadable();
  return { ok: true, value: { accountName, accountNumber: str(d.accountNumber) || input.accountNumber, bankCode: str(d.bankCode) || input.bankCode } };
}

/** The create-intent body for one staged movement. Lower-case values; naira, not kobo. */
export function intentBody(input: StageIntentInput): Record<string, unknown> {
  const base = {
    amount: koboToNaira(input.amountMinor),
    reference: input.reference,
    /* A crypto payout is a `withdrawal` with `blockchainDetails` (create-payment-intent). */
    transactionType: input.type === "withdrawal_crypto" ? "withdrawal" : input.type,
    currency: input.currency ?? "NGN",
  };
  switch (input.type) {
    case "withdrawal_crypto":
      if (!/^0x[0-9a-fA-F]{40}$/.test(input.chain.toAddress)) throw new RangeError("Not a BSC address.");
      return { ...base, blockchainDetails: { toAddress: input.chain.toAddress, network: input.chain.network } };
    case "withdrawal":
      return {
        ...base,
        withdrawalDetails: {
          bankCode: input.bank.bankCode,
          accountNumber: input.bank.accountNumber,
          accountName: input.bank.accountName,
          bankName: input.bank.bankName,
          ...(input.bank.narration ? { narration: input.bank.narration } : {}),
        },
      };
    case "wallet_transfer":
      return {
        ...base,
        walletDetails: {
          phone: input.recipient.phone,
          name: input.recipient.name,
          ...(input.recipient.narration ? { narration: input.recipient.narration } : {}),
        },
      };
    case "deposit":
      /* No `depositDetails.cardId`: a hosted collection, never a saved card here. */
      return base;
  }
}

/** `POST /v1/payment/create-intent`. Stages only: no money moves until `submitIntent`. */
export async function createIntent(ctx: PaylukContext, customerId: string, input: StageIntentInput): Promise<RailResult<StagedIntent>> {
  const r = await paylukRequest(ctx, { method: "POST", path: "/v1/payment/create-intent", customerId, body: intentBody(input), mutates: true });
  if (!r.ok) return r;
  const intent = parseIntent(r.data);
  if (!intent) return fail("unknown", 200, "Staged, but the amount or fee was unreadable.");
  if (intent.reference !== input.reference || intent.amountMinor !== input.amountMinor) {
    return fail("unknown", 200, "The staged intent does not match the request (reference or amount).");
  }
  return { ok: true, value: intent };
}

/**
 * `POST /v1/payment/verify`: executes the staged intent.
 * UNVERIFIED against live docs: when an OTP is required, the error shape is
 * not documented. A refusal whose message names an OTP or PIN is reported as
 * `refused` with that detail, and the caller asks the member for the code.
 */
export async function verifyIntent(
  ctx: PaylukContext,
  customerId: string,
  input: { reference: string; otp?: string },
): Promise<RailResult<StagedIntent>> {
  const r = await paylukRequest(ctx, {
    method: "POST",
    path: "/v1/payment/verify",
    customerId,
    body: { reference: input.reference, ...(input.otp ? { otp: input.otp } : {}) },
    mutates: true,
  });
  if (!r.ok) return r;
  const intent = parseIntent(r.data);
  return intent ? { ok: true, value: intent } : fail("unknown", 200, "Submitted, but the answer was unreadable.");
}

export function needsOtp(f: RailFailure): boolean {
  return f.kind === "refused" && /\b(otp|pin)\b/i.test(f.detail);
}

/**
 * `GET /v1/payment/history?reference=`: a filter returns a flat array.
 * UNVERIFIED against live docs: whether an intent that was staged and never
 * submitted appears here. Absence is reported as null, never as a failure.
 */
export async function findTransaction(ctx: PaylukContext, customerId: string, reference: string): Promise<RailResult<RailMovement | null>> {
  const r = await paylukRequest(ctx, { method: "GET", path: "/v1/payment/history", customerId, query: { reference }, mutates: false });
  if (!r.ok) return r;
  const rows = Array.isArray(r.data) ? r.data : Array.isArray(obj(r.data).data) ? (obj(r.data).data as unknown[]) : null;
  if (!rows) return unreadable();
  for (const row of rows) {
    const m = parseMovement(row);
    if (m && m.reference === reference) return { ok: true, value: m };
  }
  return { ok: true, value: null };
}
