/**
 * The crypto payment status machine.
 *
 * TWIN OF `private.crypto_transition_allowed` in
 * supabase/migrations/20260929001617_crypto_pay_1_an_alternative_way_to_pay_with_no_custody.sql.
 * The database is the authority (it decides inside `crypto_payment_apply`,
 * under the row lock); this copy lets the screen and the webhook say in words
 * what will happen, and `state-machine.test.ts` pins the table so the two
 * cannot drift silently. Change both or neither.
 *
 * The states, in the order money moves:
 *
 *   quoted            a rate and an amount, valid until the quote expires
 *   awaiting_payment  the provider issued a deposit address (the provider's)
 *   confirming        the transfer is on chain, gathering confirmations
 *   underpaid         less than quoted arrived; top up before expiry, or the
 *                     provider returns what came to the refund address
 *   overpaid          more than quoted arrived; the provider converts the
 *                     charge and returns the difference to the refund address
 *   converting        confirmed; the provider is converting and settling naira
 *   settled           the provider settled the naira to the split legs; the
 *                     charge is paid (FINAL)
 *   expired           the quote ran out before enough arrived
 *   refunded          the provider returned the crypto to the payer (FINAL)
 *   failed            the provider could not complete it
 *
 * A report of money moving outranks a clock: late funds on an expired quote
 * still move forward, and a failure the provider later settles is settled.
 */

export const CRYPTO_STATES = [
  "quoted",
  "awaiting_payment",
  "confirming",
  "underpaid",
  "overpaid",
  "converting",
  "settled",
  "expired",
  "refunded",
  "failed",
] as const;

export type CryptoState = (typeof CRYPTO_STATES)[number];

export const TRANSITIONS: Readonly<Record<CryptoState, readonly CryptoState[]>> = {
  quoted: ["awaiting_payment", "expired", "failed"],
  awaiting_payment: ["confirming", "underpaid", "overpaid", "converting", "settled", "expired", "failed"],
  confirming: ["underpaid", "overpaid", "converting", "settled", "refunded", "failed"],
  underpaid: ["confirming", "overpaid", "converting", "settled", "expired", "refunded", "failed"],
  overpaid: ["converting", "settled", "refunded", "failed"],
  converting: ["settled", "refunded", "failed"],
  settled: [],
  expired: ["confirming", "underpaid", "overpaid", "converting", "settled", "refunded"],
  refunded: [],
  failed: ["settled", "refunded"],
};

/** States in which a repeat report is a progress update (more confirmations). */
const PROGRESS: ReadonlySet<CryptoState> = new Set([
  "awaiting_payment",
  "confirming",
  "underpaid",
  "overpaid",
  "converting",
]);

/** Nothing further can happen to the money. */
export const FINAL: ReadonlySet<CryptoState> = new Set(["settled", "refunded"]);

/** The screen stops polling here (expired and failed can still be revived by the provider, but not by waiting on this page). */
export const RESTING: ReadonlySet<CryptoState> = new Set(["settled", "refunded", "expired", "failed"]);

export function isCryptoState(value: unknown): value is CryptoState {
  return typeof value === "string" && (CRYPTO_STATES as readonly string[]).includes(value);
}

export type TransitionOutcome = "applied" | "updated" | "stale" | "refused";

/** What `crypto_payment_apply` will do with a report of `to` while the payment is `from`. */
export function transition(from: CryptoState, to: CryptoState): TransitionOutcome {
  if (from === to) return PROGRESS.has(from) ? "updated" : "stale";
  return TRANSITIONS[from].includes(to) ? "applied" : "refused";
}

/** The live steps the screen draws, and which one a state sits on. */
export const STEPS = ["awaiting_payment", "confirming", "converting", "settled"] as const;
export type Step = (typeof STEPS)[number];

export function stepOf(state: CryptoState): Step | null {
  switch (state) {
    case "quoted":
    case "awaiting_payment":
      return "awaiting_payment";
    case "confirming":
    case "underpaid":
    case "overpaid":
      return "confirming";
    case "converting":
      return "converting";
    case "settled":
      return "settled";
    default:
      return null;
  }
}
