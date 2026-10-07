import "server-only";

import { defineFiatProvider, type CollectionStatus } from "../provider";
import { paylukMerchantConfig } from "../../payouts/payluk-merchant";
import {
  PaylukRateGate,
  createCustomer,
  createIntent,
  findCustomerByEmail,
  findTransaction,
  getBalance,
  getBankList,
  getCustomer,
  verifyAccount,
  verifyIntent,
  type PaylukContext,
  type PaylukFetch,
} from "./payluk-client";
import { verifyPaylukSignature } from "./payluk-webhook";

/**
 * THE PAYLUK ADAPTER (Part B phases 4 and 5).
 *
 * Declares only what Payluk has, from its own documentation:
 *  - `hold_in_escrow`: Payluk is an escrow provider. The escrow methods land
 *    with phases 11 and 12; nothing calls this rail for a booking yet
 *    (`railGate` still refuses an escrow rail on every direct path).
 *  - `member_wallet`: per-customer balances, the two-step payment intent,
 *    bank list and account resolution (merchant customers, payments).
 *
 * And NOT, deliberately:
 *  - `refund_without_dispute`: no refund route exists outside a dispute
 *    (findings, question 3).
 *  - `split_at_charge`: one escrow pays one seller (Finding A).
 *  - `list_successful_charges`, `charge_saved_card`, `verify_with_record`:
 *    the routes that would back them are per customer or card-feature gated,
 *    and nothing on this rail needs them yet.
 *
 * The key never leaves the server; `paylukMerchantConfig` picks the host
 * from the key's own prefix, so a test key can never reach production.
 */

/** Phases 11 and 12 (standard and milestone escrow) are not built. `escrowRailLive` reads this. */
export const PAYLUK_ESCROW_FLOWS_BUILT = false as const;

const gate = new PaylukRateGate();
const fetchImpl: PaylukFetch = (url, init) => fetch(url, { ...init, cache: "no-store" });

function context(): PaylukContext | null {
  const config = paylukMerchantConfig(process.env);
  return config ? { config, fetch: fetchImpl, gate } : null;
}

const NOT_CONFIGURED = {
  ok: false as const,
  kind: "not_configured" as const,
  httpStatus: null,
  detail: "No Payluk key in this environment.",
  retryAfterSeconds: null,
};

/** The provider's `payment.*` status word onto the seam's collection status. Unknown words are `unknown`. */
export function paylukCollectionStatus(word: string): CollectionStatus {
  switch (word.toLowerCase()) {
    case "success":
      return "success";
    case "failed":
      return "failed";
    case "reversed":
      return "reversed";
    case "pending":
    case "processing":
      return "pending";
    default:
      return "unknown";
  }
}

export class PaylukCollectUnavailable extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "PaylukCollectUnavailable";
  }
}

export const paylukProvider = defineFiatProvider(["hold_in_escrow", "member_wallet"] as const, {
  id: "payluk",
  displayName: "Payluk",
  isConfigured: () => context() !== null,

  /**
   * A hosted collection is a deposit to the payer's own balance (create
   * intent, `transactionType: deposit`, no card). There is no anonymous
   * checkout: a payer who is not yet a customer cannot be collected from.
   */
  async collect(input) {
    const ctx = context();
    if (!ctx) throw new PaylukCollectUnavailable("not_configured");
    if (!input.payerCustomerId) throw new PaylukCollectUnavailable("no_customer");
    const r = await createIntent(ctx, input.payerCustomerId, { type: "deposit", reference: input.reference, amountMinor: input.amountMinor });
    if (!r.ok) throw new PaylukCollectUnavailable(r.kind);
    if (r.value.hosted?.kind !== "checkout_url") throw new PaylukCollectUnavailable("no_hosted_url");
    return { reference: r.value.reference, redirectUrl: r.value.hosted.url };
  },

  async verifyByReference(reference, scope) {
    const ctx = context();
    const unknown = { reference, status: "unknown" as const, providerStatus: "", amountMinor: 0, paidAt: null };
    if (!ctx || !scope?.customerId) return unknown;
    const r = await findTransaction(ctx, scope.customerId, reference);
    if (!r.ok || r.value === null) return unknown;
    const m = r.value;
    return {
      reference,
      status: paylukCollectionStatus(m.status),
      providerStatus: m.status,
      amountMinor: m.amountMinor,
      paidAt: m.status === "success" ? m.updatedAt : null,
    };
  },

  verifyWebhook(rawBody, headers) {
    const config = paylukMerchantConfig(process.env);
    return config ? verifyPaylukSignature(rawBody, headers.get("x-payluk-signature"), config.key) : false;
  },

  async findCustomer(input) {
    const ctx = context();
    return ctx ? findCustomerByEmail(ctx, input.email) : NOT_CONFIGURED;
  },
  async createCustomer(input) {
    const ctx = context();
    return ctx ? createCustomer(ctx, input) : NOT_CONFIGURED;
  },
  async readCustomer(customerId) {
    const ctx = context();
    return ctx ? getCustomer(ctx, customerId) : NOT_CONFIGURED;
  },
  async readBalance(customerId) {
    const ctx = context();
    return ctx ? getBalance(ctx, customerId) : NOT_CONFIGURED;
  },
  async listBanks() {
    const ctx = context();
    return ctx ? getBankList(ctx) : NOT_CONFIGURED;
  },
  async resolveAccount(customerId, input) {
    const ctx = context();
    return ctx ? verifyAccount(ctx, customerId, input) : NOT_CONFIGURED;
  },
  async stageIntent(customerId, input) {
    const ctx = context();
    return ctx ? createIntent(ctx, customerId, input) : NOT_CONFIGURED;
  },
  async submitIntent(customerId, input) {
    const ctx = context();
    return ctx ? verifyIntent(ctx, customerId, input) : NOT_CONFIGURED;
  },
  async findMovement(customerId, reference) {
    const ctx = context();
    return ctx ? findTransaction(ctx, customerId, reference) : NOT_CONFIGURED;
  },
});
