import type { CryptoState } from "./state-machine";

/**
 * THE PROVIDER SEAM: what any licensed on/off-ramp must do for Vallo.
 *
 * Yellow Card is the first implementation (`providers/yellowcard.ts`); another
 * licensed provider can be swapped in by implementing this interface and
 * registering it in `providers/index.ts`. Nothing outside `providers/` knows a
 * provider's endpoints, field names or signature scheme.
 *
 * THE CONTRACT A PROVIDER MUST MEET, OR IT CANNOT BE USED AT ALL:
 *
 *  1. The deposit address is the PROVIDER's (or the provider's custodian's),
 *     issued per payment. Vallo never holds a crypto address, a key or a
 *     crypto balance.
 *  2. The provider converts under its own licence and settles NAIRA directly
 *     to each `SettlementLeg`: the lister's verified bank account, the
 *     Guarantee reserve's account, and Vallo's commission account. Vallo never
 *     receives the naira for anybody and never passes it on.
 *  3. An overpayment's difference, and an underpayment that is not topped up
 *     before expiry, go back to the payer's refund address, by the provider.
 *  4. Every status change reaches Vallo as a signed webhook, and the same
 *     status can be read back on demand (for the reconcile job).
 *
 * Every naira figure is integer kobo. Every crypto figure is a decimal string
 * at the asset's precision (`decimal.ts`); a provider's float never becomes a
 * figure in our records.
 */

export type ProviderId = "yellowcard";

export type SettlementRole = "lister" | "guarantee_reserve" | "vallo_commission";

/** Where one naira leg settles. */
export type SettlementDestination =
  /** A Nigerian bank account, verified by name enquiry before it was saved. */
  | { kind: "bank"; bankCode: string; accountNumber: string; accountName: string }
  /** An account already registered with the provider (Vallo's own, and the reserve's). */
  | { kind: "provider_account"; accountId: string };

export type SettlementLeg = {
  role: SettlementRole;
  amountMinor: number;
  destination: SettlementDestination;
};

export type ProviderQuote = {
  quoteId: string;
  /** Naira per ONE whole unit of the asset, exact decimal string. */
  rate: string;
  /** What the payer sends, exact decimal string at the asset's precision. */
  cryptoAmount: string;
  /** The provider's fee in kobo, borne by the payer and included in `cryptoAmount`. */
  feeMinor: number;
  /** ISO time the rate stops being honoured. */
  expiresAt: string;
};

export type ProviderPayment = {
  providerPaymentId: string;
  /** The provider's deposit address for this one payment. */
  depositAddress: string;
  /** A memo or tag some networks need; null when none. */
  depositMemo: string | null;
  /** The provider's own hosted page for this payment, when it has one. */
  hostedUrl: string | null;
  expiresAt: string;
  confirmationsRequired: number | null;
};

/** The facts a status report may carry. All optional; absent means unchanged. */
export type ProviderFacts = {
  confirmations?: number;
  confirmationsRequired?: number;
  txHash?: string;
  cryptoReceived?: string;
  cryptoOverpaid?: string;
  cryptoRefunded?: string;
  refundTxHash?: string;
  /** Kobo the provider settled in naira across all legs. Only on `settled`. */
  settledMinor?: number;
  reason?: string;
};

/** One status report, from a webhook or from reading the payment back. */
export type ProviderEvent = {
  /** Unique per report. The idempotency key: the same report twice is one event. */
  eventId: string;
  /** Our `rm-yc-` reference. */
  reference: string;
  providerPaymentId: string | null;
  state: CryptoState;
  facts: ProviderFacts;
};

/**
 * The idempotency key for a report that carries no id of its own: every fact
 * that can change between two genuinely different reports of the same state
 * (confirmations, hash, amount received, amount settled, return hash). The
 * webhook parser and the reconcile job both use it, so the same observation
 * has the same name whichever door it came through.
 */
export function derivedEventId(source: string, reference: string, state: string, facts: ProviderFacts): string {
  return [
    source,
    reference,
    state,
    facts.confirmations ?? "",
    facts.txHash ?? "",
    facts.cryptoReceived ?? "",
    facts.settledMinor ?? "",
    facts.refundTxHash ?? "",
  ].join(":");
}

export class CryptoProviderError extends Error {
  readonly status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "CryptoProviderError";
    this.status = status;
  }
}

export interface CryptoRampProvider {
  readonly id: ProviderId;
  /** A person-facing name, for "This address belongs to …". */
  readonly displayName: string;
  /** Keys, host and webhook secret are all present. Checked lazily, never at import. */
  isConfigured(): boolean;
  /** The founder's written confirmation of direct naira settlement, and the settlement accounts, are set. */
  isDirectSettlementReady(): boolean;
  /** The provider's own settlement account ids for the reserve and Vallo. */
  platformDestinations(): { reserve: SettlementDestination; vallo: SettlementDestination } | null;

  quote(input: { reference: string; amountMinor: number; asset: string; network: string }): Promise<ProviderQuote>;

  createPayment(input: {
    reference: string;
    quoteId: string;
    asset: string;
    network: string;
    amountMinor: number;
    refundAddress: string;
    payer: { email: string | null; legalName: string | null };
    settlement: readonly SettlementLeg[];
  }): Promise<ProviderPayment>;

  /** Read a payment back, as a status report (the reconcile job's view). */
  getPayment(providerPaymentId: string, reference: string): Promise<ProviderEvent | null>;

  /** True only for a body the provider signed. Never throws. */
  verifyWebhook(rawBody: string, headers: Headers): boolean;

  /** A webhook body as a status report, or null when it is not one we can read. */
  parseWebhook(body: unknown): ProviderEvent | null;
}
