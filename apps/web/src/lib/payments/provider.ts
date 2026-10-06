/**
 * THE FIAT PROVIDER SEAM (Session 2, 7.3).
 *
 * Modelled on the crypto seam (`lib/crypto/provider.ts`), with one difference
 * that is the whole point: the fiat providers are not equivalent. Paystack
 * splits at the moment of charge and cannot hold money; Payluk holds money in
 * escrow, cannot split, and cannot refund without a dispute. So every
 * provider shares a small CORE, and everything else is a CAPABILITY whose
 * methods exist on the type only when it is declared:
 *
 *   - `defineFiatProvider(["split_at_charge", ...], impl)` builds the runtime
 *     set from the same literal list as the type, so the two cannot drift, and
 *     an adapter missing a declared capability's methods does not compile.
 *   - `can(p, "hold_in_escrow")` is a type predicate: inside the `if`, the
 *     escrow methods are on `p`; outside, they are not.
 *
 * Always true, for every provider:
 *  - The reference is Vallo's, generated before the call, and it is the
 *    idempotency key whatever the provider offers (Payluk offers none, so its
 *    adapter must look a reference up before creating).
 *  - Webhook signatures are checked over the RAW body, constant-time.
 *  - A timeout is UNKNOWN, never a failure. Never retry a money-moving call
 *    blindly; read back first.
 *  - Secrets live in the server environment only.
 *
 * This file is types and pure functions only, safe to import anywhere.
 */

/* Types only, erased at build: the record shapes the detailed capabilities
   return are the ones the existing call sites already read, so moving them
   behind the seam changes no outcome. */
import type { ChargeSummary, ChargedAuthorization, VerifiedTransaction } from "./paystack";

export type FiatProviderId = "paystack" | "payluk";

export type CollectInput = {
  /** Vallo's reference: the idempotency key. */
  reference: string;
  amountMinor: number;
  email: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  /**
   * Narrow the ways of paying offered. Absent by default, on purpose: only a
   * caller that genuinely cannot work on another channel passes it (card
   * setup, which needs a reusable card authorisation).
   */
  channels?: readonly string[];
};
export type CollectResult = {
  reference: string;
  redirectUrl: string;
  /** The provider's handle for resuming this checkout inline, when it issues one. */
  accessCode?: string;
};

/** What the provider says happened to a reference. `unknown` is never a failure. */
export type CollectionStatus = "success" | "failed" | "reversed" | "pending" | "unknown";
export type VerifiedCollection = {
  reference: string;
  status: CollectionStatus;
  /** The provider's own word, kept so nothing is lost in the mapping. */
  providerStatus: string;
  amountMinor: number;
  paidAt: string | null;
};

/** Every provider does these. */
export type FiatCore = {
  readonly id: FiatProviderId;
  readonly displayName: string;
  isConfigured(): boolean;
  collect(input: CollectInput): Promise<CollectResult>;
  /** Also the reconciliation read-back: the provider's state for one reference. */
  verifyByReference(reference: string): Promise<VerifiedCollection>;
  /** Raw body, constant-time, never throws. Headers, because each provider names its own. */
  verifyWebhook(rawBody: string, headers: Headers): boolean;
};

/** Neutral settlement legs for a charge split at the moment of payment. */
export type ChargeSplit = {
  listerSubaccount: string;
  listerShareMinor: number;
  reserveSubaccount: string;
  guaranteeMinor: number;
};

/** Capability name -> the methods it unlocks. */
export type FiatCapabilityMethods = {
  /** One charge settles to several parties at once (Paystack dynamic split). */
  split_at_charge: {
    collectWithSplit(input: CollectInput & { split: ChargeSplit }): Promise<CollectResult>;
  };
  /** Money is held until a release decision (Payluk escrow). Methods land with the Payluk adapter. */
  hold_in_escrow: Record<never, never>;
  /**
   * A charge can be refunded by API without a dispute. Paystack: yes, and on a
   * split charge the refund is drawn from the MAIN balance, because the
   * lister's share has already settled to them. Payluk: NO (question 3).
   */
  refund_without_dispute: {
    refund(input: { reference: string; amountMinor?: number; merchantNote?: string; customerNote?: string }): Promise<{ refundId: string; status: string }>;
  };
  /** A list of successful charges in a window, for reconciliation. Charges, not settlements. */
  list_successful_charges: {
    listSuccessfulCharges(input: { from: string; to?: string; maxPages?: number }): Promise<ChargeSummary[]>;
  };
  /**
   * Charge a card the payer saved earlier, with no checkout page (Paystack
   * charge_authorization). A decline is returned, not thrown; a timeout is
   * UNKNOWN and never retried blindly. Starts money movement: gate it with
   * `assertProviderEnabled`.
   */
  charge_saved_card: {
    chargeSavedCard(input: {
      authorizationCode: string;
      email: string;
      amountMinor: number;
      reference: string;
      metadata?: Record<string, unknown>;
      split?: ChargeSplit;
    }): Promise<ChargedAuthorization>;
  };
  /**
   * The provider's full record of one reference, in its own words (status,
   * fees, channel, metadata, card token), for the call sites that settle,
   * reconcile and save cards and need more than the neutral
   * `verifyByReference`. Read-only: never gated by the kill switch.
   */
  verify_with_record: {
    verifyRecord(reference: string): Promise<VerifiedTransaction>;
  };
};
export type FiatCapability = keyof FiatCapabilityMethods;

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

/** A provider declaring capabilities C carries exactly their methods. */
export type FiatProvider<C extends FiatCapability = never> = FiatCore & {
  readonly capabilities: ReadonlySet<FiatCapability>;
} & ([C] extends [never] ? unknown : UnionToIntersection<FiatCapabilityMethods[C]>);

export type AnyFiatProvider = FiatCore & { readonly capabilities: ReadonlySet<FiatCapability> };

export function can<K extends FiatCapability>(p: AnyFiatProvider, k: K): p is AnyFiatProvider & FiatProvider<K> {
  return p.capabilities.has(k);
}

export class FiatCapabilityMissing extends Error {
  constructor(readonly provider: FiatProviderId, readonly capability: FiatCapability) {
    super(`${provider} does not support ${capability}.`);
    this.name = "FiatCapabilityMissing";
  }
}

export function requireCapability<K extends FiatCapability>(
  p: AnyFiatProvider,
  k: K,
): asserts p is AnyFiatProvider & FiatProvider<K> {
  if (!can(p, k)) throw new FiatCapabilityMissing(p.id, k);
}

/** The only constructor: the runtime set comes from the same tuple as the type. */
export function defineFiatProvider<const C extends readonly FiatCapability[]>(
  capabilities: C,
  impl: Omit<FiatProvider<C[number]>, "capabilities">,
): FiatProvider<C[number]> {
  return { ...impl, capabilities: new Set<FiatCapability>(capabilities) } as FiatProvider<C[number]>;
}
