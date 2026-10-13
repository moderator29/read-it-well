/**
 * THE REFERENCE SYSTEM, AS A DESIGN (D50; VALLO_FINANCIAL_LAYER.md section 4.5).
 *
 * Six different things, never confused on a screen:
 *
 *   transaction        Vallo's own record of one movement of money
 *   receipt            the receipt's number, which a stranger can look up
 *   agreement          the agreement both parties confirmed
 *   space              the listing or stay the money is for
 *   provider           the payment partner's own reference, labelled with the
 *                      partner's name, because a receipt must name it
 *   chain              a blockchain transaction hash, ONLY for a payment that
 *                      settled on a chain, and only as the chain printed it
 *
 * Every value is printed exactly as the record holds it: never shortened into
 * a code nobody can look up, never formatted into something it is not. And two
 * refusals, which are the reason this file exists:
 *
 *   - A FIAT PAYMENT SHOWS NO CHAIN HASH. Asked to draw one, it draws nothing.
 *   - A PROVIDER REFERENCE IS NEVER RELABELLED AS A HASH. A chain value equal
 *     to a provider reference on the same payment is dropped, because that is
 *     exactly the relabelling the founder's brief forbids.
 *
 * Client-safe and pure.
 */

export type ReferenceKind = "transaction" | "receipt" | "agreement" | "space" | "provider" | "chain";

export type MoneyReference = {
  kind: ReferenceKind;
  /** Exactly as the record holds it. */
  value: string;
  /** The payment partner's name, on a `provider` reference only. */
  provider?: string;
  /** Where the thing it names can be opened, when there is such a place. */
  href?: string;
};

/** How the money settled: fiat (card, transfer, bank) or on a chain. */
export type Settlement = "fiat" | "chain";

/** The fixed order, so two screens never list them differently. */
export const REFERENCE_ORDER: readonly ReferenceKind[] = ["transaction", "receipt", "agreement", "space", "provider", "chain"];

const LABEL: Record<Exclude<ReferenceKind, "provider">, string> = {
  transaction: "Transaction",
  receipt: "Receipt number",
  agreement: "Agreement",
  space: "Space",
  chain: "Chain transaction hash",
};

/** The label a person reads. A provider reference carries the provider's name, never "hash". */
export function referenceLabel(ref: MoneyReference): string {
  if (ref.kind === "provider") return ref.provider ? `${ref.provider} reference` : "Payment partner reference";
  return LABEL[ref.kind];
}

/**
 * The references a screen may draw, in order, with the two refusals applied
 * and empty or duplicate kinds dropped. The first of a kind wins.
 */
export function referenceRows(refs: readonly MoneyReference[], settlement: Settlement): MoneyReference[] {
  const providerValues = new Set(refs.filter((r) => r.kind === "provider").map((r) => r.value.trim().toLowerCase()));
  const seen = new Set<ReferenceKind>();
  const kept: MoneyReference[] = [];
  for (const ref of refs) {
    const value = ref.value.trim();
    if (!value || seen.has(ref.kind)) continue;
    if (ref.kind === "chain" && (settlement !== "chain" || providerValues.has(value.toLowerCase()))) continue;
    seen.add(ref.kind);
    kept.push({ ...ref, value });
  }
  return kept.sort((a, b) => REFERENCE_ORDER.indexOf(a.kind) - REFERENCE_ORDER.indexOf(b.kind));
}
