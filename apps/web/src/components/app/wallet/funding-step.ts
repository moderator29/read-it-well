/**
 * WHAT HAPPENS AFTER A SAVED CARD IS CHARGED.
 *
 * `fundWalletWithSavedCard` returns one shape for two different outcomes.
 * When the processor took the money there and then, the reference is the
 * whole answer and `authorizationUrl` comes back EMPTY; when the bank wants
 * a challenge instead, the same reference arrives with a hosted URL to send
 * the browser to. Assigning that empty string would navigate the wallet to
 * itself and lose the reference, so the credit would sit unverified until a
 * webhook happened to arrive.
 *
 * The decision was one inline condition inside an effect, which is the one
 * place it could not be tested. It is a named function now, so the branch
 * that only fires when a real Nigerian bank declines to challenge a card is
 * covered by a test rather than by belief.
 */
export type FundingStep =
  | { kind: "hosted"; url: string }
  /** Charged synchronously: settle it through `/wallet?funded=1&reference=`. */
  | { kind: "verify"; reference: string };

export function fundingStep(result: { reference: string; authorizationUrl: string }): FundingStep {
  /* Trimmed, because a processor that sends a blank string and one that sends
     a single space mean exactly the same thing and only one of them was
     handled. */
  const url = result.authorizationUrl.trim();
  return url.length > 0 ? { kind: "hosted", url } : { kind: "verify", reference: result.reference };
}

/** The path the wallet lands on so `FundingVerifier` can settle the credit. */
export function verifyPath(reference: string): string {
  return `/wallet?funded=1&reference=${encodeURIComponent(reference)}`;
}
