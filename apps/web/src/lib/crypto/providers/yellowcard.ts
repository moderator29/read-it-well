import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { asDecimalString, toAtomic } from "../decimal";
import { findPair } from "../assets";
import { isCryptoState, type CryptoState } from "../state-machine";
import {
  CryptoProviderError,
  derivedEventId,
  type CryptoRampProvider,
  type ProviderEvent,
  type ProviderFacts,
  type ProviderPayment,
  type ProviderQuote,
  type SettlementDestination,
  type SettlementLeg,
} from "../provider";

/**
 * Yellow Card, behind the provider seam.
 *
 * ===========================================================================
 * NOT YET RUN AGAINST A REAL MERCHANT ACCOUNT. NO KEYS EXIST.
 * ===========================================================================
 *
 * The paths, field names, status words and the signing scheme below are
 * written from Yellow Card's published business API as far as it is public,
 * and every one is marked `CONFIRM ON ONBOARDING`. Nothing here has ever been
 * called; every test mocks `fetch`. On the day keys arrive, check each marked
 * line against the live documentation before the flag goes on.
 *
 * WHAT IT MUST NEVER DO. It never asks for a Vallo deposit address (there is
 * none), never asks the provider to settle to one Vallo account for Vallo to
 * pass on (that is custody), and never turns a provider float into a figure:
 * naira comes back as kobo through `toAtomic(..., 2)`, crypto as a decimal
 * string checked against the asset's precision.
 */

const REQUEST_TIMEOUT_MS = 15_000;

function env(name: "YELLOWCARD_API_KEY" | "YELLOWCARD_API_SECRET" | "YELLOWCARD_API_BASE" | "YELLOWCARD_WEBHOOK_SECRET"): string {
  switch (name) {
    case "YELLOWCARD_API_KEY":
      return (process.env.YELLOWCARD_API_KEY ?? "").trim();
    case "YELLOWCARD_API_SECRET":
      return (process.env.YELLOWCARD_API_SECRET ?? "").trim();
    case "YELLOWCARD_API_BASE":
      return (process.env.YELLOWCARD_API_BASE ?? "").trim().replace(/\/+$/, "");
    case "YELLOWCARD_WEBHOOK_SECRET":
      return (process.env.YELLOWCARD_WEBHOOK_SECRET ?? "").trim();
  }
}

/** Kobo as an exact naira decimal string: 1234567 -> "12345.67". No float. */
export function koboToNairaString(kobo: number): string {
  if (!Number.isSafeInteger(kobo) || kobo < 0) throw new CryptoProviderError("A naira amount must be whole kobo.");
  const whole = Math.floor(kobo / 100);
  const part = kobo % 100;
  return `${whole}.${part.toString().padStart(2, "0")}`;
}

/** A provider naira figure as kobo, exactly, or null. "12345.67" and 12345.67 both work; "12345.678" does not. */
export function nairaToKobo(value: unknown): number | null {
  const text = asDecimalString(value);
  if (text === null) return null;
  try {
    const kobo = toAtomic(text, 2);
    return kobo <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(kobo) : null;
  } catch {
    return null;
  }
}

/**
 * The provider's status words, mapped onto ours. CONFIRM ON ONBOARDING.
 * Anything unrecognised is null, and an unreadable report acts on nothing.
 */
const STATUS_MAP: Record<string, CryptoState> = {
  AWAITING_PAYMENT: "awaiting_payment",
  PENDING: "awaiting_payment",
  CREATED: "awaiting_payment",
  CONFIRMING: "confirming",
  DETECTED: "confirming",
  UNDERPAID: "underpaid",
  PARTIALLY_PAID: "underpaid",
  OVERPAID: "overpaid",
  PROCESSING: "converting",
  CONVERTING: "converting",
  SETTLING: "converting",
  COMPLETE: "settled",
  COMPLETED: "settled",
  SETTLED: "settled",
  SUCCESS: "settled",
  EXPIRED: "expired",
  REFUNDED: "refunded",
  RETURNED: "refunded",
  FAILED: "failed",
  CANCELLED: "failed",
  REJECTED: "failed",
};

export function mapStatus(raw: unknown): CryptoState | null {
  const key = String(raw ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const mapped = STATUS_MAP[key];
  return mapped && isCryptoState(mapped) ? mapped : null;
}

function str(value: unknown, max = 300): string | undefined {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : undefined;
}

function int(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? n : undefined;
}

/**
 * A crypto amount at the pair's precision, or undefined when it does not fit.
 *
 * An UNKNOWN pair (null precision) drops the figure entirely: stored without a
 * precision it could fail `crypto_payments_decimals_fit`, and a report the
 * database can never write would be retried by the provider for ever. The
 * status still moves; the amount is read back by the reconcile job.
 */
function cryptoAt(value: unknown, decimals: number | null): string | undefined {
  const text = asDecimalString(value);
  if (text === null) return undefined;
  if (decimals === null) return undefined;
  try {
    toAtomic(text, decimals);
    return text;
  } catch {
    return undefined;
  }
}

/**
 * One Yellow Card payment object (webhook `data`, or a GET response) as a
 * status report. Field names CONFIRM ON ONBOARDING.
 */
export function readPaymentObject(row: Record<string, unknown>, fallbackEventId?: string): ProviderEvent | null {
  const reference = str(row["sequenceId"]) ?? str(row["reference"]);
  if (!reference) return null;
  const state = mapStatus(row["status"]);
  if (!state) return null;

  const pair = findPair(String(row["asset"] ?? row["currency"] ?? ""), String(row["network"] ?? ""));
  const decimals = pair ? pair.decimals : null;

  const facts: ProviderFacts = {};
  const confirmations = int(row["confirmations"]);
  if (confirmations !== undefined) facts.confirmations = confirmations;
  const required = int(row["requiredConfirmations"] ?? row["confirmationsRequired"]);
  if (required !== undefined) facts.confirmationsRequired = required;
  const txHash = str(row["txHash"] ?? row["transactionHash"], 200);
  if (txHash) facts.txHash = txHash;
  const received = cryptoAt(row["amountReceived"] ?? row["cryptoReceived"], decimals);
  if (received) facts.cryptoReceived = received;
  const overpaid = cryptoAt(row["overpaidAmount"], decimals);
  if (overpaid) facts.cryptoOverpaid = overpaid;
  const refunded = cryptoAt(row["refundedAmount"], decimals);
  if (refunded) facts.cryptoRefunded = refunded;
  const refundTx = str(row["refundTxHash"], 200);
  if (refundTx) facts.refundTxHash = refundTx;
  const reason = str(row["reason"] ?? row["failureReason"], 200);
  if (reason) facts.reason = reason;
  if (state === "settled") {
    /* ONLY an explicit settled amount counts. `localAmount` is the amount
       QUOTED, not what was settled to the legs, and reading it here would let
       a report that says nothing about settlement settle the charge. A
       settled report without it reaches the database with no `settled_minor`,
       which `crypto_payment_apply` refuses as `amount-mismatch` and alerts. */
    const settled = nairaToKobo(row["settledAmount"]);
    if (settled !== null) facts.settledMinor = settled;
  }

  const providerPaymentId = str(row["id"], 200) ?? null;
  /* The report's own id when the provider sends one; otherwise a digest of
     what it says, so the same report delivered twice is still one event. */
  const eventId = fallbackEventId ?? derivedEventId("derived", reference, state, facts);
  return { eventId, reference, providerPaymentId, state, facts };
}

function legBody(leg: SettlementLeg): Record<string, unknown> {
  const destination: SettlementDestination = leg.destination;
  const base = { amount: koboToNairaString(leg.amountMinor), currency: "NGN", narration: leg.role };
  return destination.kind === "bank"
    ? { ...base, bankCode: destination.bankCode, accountNumber: destination.accountNumber, accountName: destination.accountName }
    : { ...base, settlementAccountId: destination.accountId };
}

export class YellowCardProvider implements CryptoRampProvider {
  readonly id = "yellowcard" as const;
  readonly displayName = "Yellow Card";

  constructor(private readonly fetcher: typeof fetch = (...args) => fetch(...args)) {}

  isConfigured(): boolean {
    return (
      env("YELLOWCARD_API_KEY").length > 0 &&
      env("YELLOWCARD_API_SECRET").length > 0 &&
      env("YELLOWCARD_API_BASE").startsWith("https://") &&
      env("YELLOWCARD_WEBHOOK_SECRET").length > 0
    );
  }

  /**
   * Two written confirmations from the founder, both the literal `confirmed`:
   * that Yellow Card settles naira straight to each leg, and that Vallo's
   * settlement account at Yellow Card pays out to Vallo's own bank account
   * rather than accruing a balance at the provider. Plus every destination.
   */
  isDirectSettlementReady(): boolean {
    return (
      (process.env.YELLOWCARD_DIRECT_SETTLEMENT ?? "").trim() === "confirmed" &&
      (process.env.YELLOWCARD_PROVIDER_ACCOUNTS_ARE_BANK_PAYOUTS ?? "").trim() === "confirmed" &&
      this.platformDestinations() !== null
    );
  }

  /**
   * The reserve leg is a BANK payout to the Guarantee reserve's own account,
   * never a balance at the provider: a reserve balance held at a crypto
   * provider is exactly the custody this design exists to avoid. Vallo's
   * commission goes to Vallo's settlement account at the provider, which the
   * founder has confirmed pays out to Vallo's bank
   * (`YELLOWCARD_PROVIDER_ACCOUNTS_ARE_BANK_PAYOUTS`).
   */
  platformDestinations(): { reserve: SettlementDestination; vallo: SettlementDestination } | null {
    const vallo = (process.env.YELLOWCARD_VALLO_SETTLEMENT_ACCOUNT_ID ?? "").trim();
    const bankCode = (process.env.YELLOWCARD_RESERVE_BANK_CODE ?? "").trim();
    const accountNumber = (process.env.YELLOWCARD_RESERVE_ACCOUNT_NUMBER ?? "").trim();
    const accountName = (process.env.YELLOWCARD_RESERVE_ACCOUNT_NAME ?? "").trim();
    if (vallo.length === 0) return null;
    if (!/^\d{3,6}$/.test(bankCode) || !/^\d{10}$/.test(accountNumber) || accountName.length < 2) return null;
    return {
      vallo: { kind: "provider_account", accountId: vallo },
      reserve: { kind: "bank", bankCode, accountNumber, accountName },
    };
  }

  /**
   * One signed call. Signing scheme CONFIRM ON ONBOARDING.
   *
   * TODO CONFIRM ON ONBOARDING: webhook replay window. `verifyWebhook` checks
   * an HMAC over the raw body only. If Yellow Card's live docs put a timestamp
   * in the webhook signature (or a timestamp header), include it in the HMAC
   * and refuse deliveries older than a few minutes. Replays are already
   * harmless (idempotent on the event id in `crypto_payment_apply`), so this
   * is defence in depth, not the only line.
   */
  private async request<T>(path: string, init: { method: "GET" | "POST"; body?: Record<string, unknown> }): Promise<T> {
    if (!this.isConfigured()) throw new CryptoProviderError("The crypto service is not configured.");
    const timestamp = new Date().toISOString();
    const payload = init.body ? JSON.stringify(init.body) : "";
    const bodyHash = createHash("sha256").update(payload).digest("base64");
    const signature = createHmac("sha256", env("YELLOWCARD_API_SECRET"))
      .update(`${timestamp}${path}${init.method}${payload.length > 0 ? bodyHash : ""}`)
      .digest("base64");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await this.fetcher(`${env("YELLOWCARD_API_BASE")}${path}`, {
        method: init.method,
        headers: {
          "Content-Type": "application/json",
          "X-YC-Timestamp": timestamp,
          Authorization: `YcHmacV1 ${env("YELLOWCARD_API_KEY")}:${signature}`,
        },
        ...(payload.length > 0 ? { body: payload } : {}),
        signal: controller.signal,
        cache: "no-store",
      });
      const text = await response.text();
      if (!response.ok) {
        throw new CryptoProviderError(text.slice(0, 200) || `The crypto service answered ${response.status}.`, response.status);
      }
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new CryptoProviderError("The crypto service returned something unreadable.");
      }
    } catch (error) {
      if (error instanceof CryptoProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new CryptoProviderError("The crypto service did not answer in time.");
      throw new CryptoProviderError("The crypto service could not be reached.");
    } finally {
      clearTimeout(timer);
    }
  }

  async quote(input: { reference: string; amountMinor: number; asset: string; network: string }): Promise<ProviderQuote> {
    const pair = findPair(input.asset, input.network);
    if (!pair) throw new CryptoProviderError("That asset and network are not offered.");
    // CONFIRM ON ONBOARDING: path and fields.
    const data = await this.request<Record<string, unknown>>("/business/crypto-collections/quotes", {
      method: "POST",
      body: {
        sequenceId: input.reference,
        localAmount: koboToNairaString(input.amountMinor),
        localCurrency: "NGN",
        asset: pair.asset,
        network: pair.network,
      },
    });
    const quoteId = str(data["id"] ?? data["quoteId"], 200);
    const rate = asDecimalString(data["rate"]);
    const cryptoAmount = cryptoAt(data["cryptoAmount"] ?? data["amount"], pair.decimals);
    const feeMinor = data["fee"] === undefined ? 0 : nairaToKobo(data["fee"]);
    const expiresAt = str(data["expiresAt"], 60);
    if (!quoteId || !rate || !cryptoAmount || feeMinor === null || !expiresAt || Number.isNaN(Date.parse(expiresAt))) {
      throw new CryptoProviderError("The crypto service returned a quote we could not read, so nothing was offered.");
    }
    return { quoteId, rate, cryptoAmount, feeMinor, expiresAt };
  }

  async createPayment(input: Parameters<CryptoRampProvider["createPayment"]>[0]): Promise<ProviderPayment> {
    const total = input.settlement.reduce((sum, leg) => sum + leg.amountMinor, 0);
    if (total !== input.amountMinor || input.settlement.some((leg) => !Number.isSafeInteger(leg.amountMinor) || leg.amountMinor < 0)) {
      throw new CryptoProviderError("The settlement does not add up to the charge, so nothing was sent.");
    }
    // CONFIRM ON ONBOARDING: path and fields. Settlement is per leg, direct.
    const data = await this.request<Record<string, unknown>>("/business/crypto-collections", {
      method: "POST",
      body: {
        sequenceId: input.reference,
        quoteId: input.quoteId,
        asset: input.asset,
        network: input.network,
        localAmount: koboToNairaString(input.amountMinor),
        localCurrency: "NGN",
        refundAddress: input.refundAddress,
        customer: { email: input.payer.email, name: input.payer.legalName },
        settlement: input.settlement.filter((leg) => leg.amountMinor > 0).map(legBody),
      },
    });
    const providerPaymentId = str(data["id"], 200);
    const depositAddress = str(data["walletAddress"] ?? data["address"], 200);
    const expiresAt = str(data["expiresAt"], 60);
    const hosted = str(data["checkoutUrl"] ?? data["paymentUrl"], 500);
    if (!providerPaymentId || !depositAddress || !expiresAt || Number.isNaN(Date.parse(expiresAt))) {
      throw new CryptoProviderError("The crypto service did not return a deposit address, so nothing was opened.");
    }
    return {
      providerPaymentId,
      depositAddress,
      depositMemo: str(data["memo"] ?? data["tag"], 100) ?? null,
      hostedUrl: hosted && hosted.startsWith("https://") ? hosted : null,
      expiresAt,
      confirmationsRequired: int(data["requiredConfirmations"]) ?? null,
    };
  }

  async getPayment(providerPaymentId: string, reference: string): Promise<ProviderEvent | null> {
    // CONFIRM ON ONBOARDING: path.
    const data = await this.request<Record<string, unknown>>(
      `/business/crypto-collections/${encodeURIComponent(providerPaymentId)}`,
      { method: "GET" },
    );
    const event = readPaymentObject({ sequenceId: reference, ...data });
    return event && event.reference === reference ? event : null;
  }

  /**
   * HMAC-SHA256 of the raw body with the WEBHOOK secret, base64, in
   * `x-yc-signature`. CONFIRM ON ONBOARDING. Compared in constant time; the
   * length check first because `timingSafeEqual` throws on a mismatch.
   */
  verifyWebhook(rawBody: string, headers: Headers): boolean {
    const secret = env("YELLOWCARD_WEBHOOK_SECRET");
    const signature = headers.get("x-yc-signature") ?? "";
    return verifyYellowCardSignature(rawBody, signature, secret);
  }

  parseWebhook(body: unknown): ProviderEvent | null {
    if (typeof body !== "object" || body === null) return null;
    const envelope = body as Record<string, unknown>;
    const data =
      typeof envelope["data"] === "object" && envelope["data"] !== null
        ? (envelope["data"] as Record<string, unknown>)
        : envelope;
    const eventId = str(envelope["eventId"] ?? envelope["id"], 300);
    /* When the envelope's id is the payment's own id (a flat body), it is not
       an event id: fall back to the derived digest. */
    const flat = data === envelope;
    return readPaymentObject(data, flat ? undefined : eventId);
  }
}

/** The signature check itself, exported so the old import path and the tests share it. */
export function verifyYellowCardSignature(rawBody: string, signature: string, secret: string): boolean {
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
