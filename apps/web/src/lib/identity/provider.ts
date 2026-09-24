/**
 * THE IDENTITY AGGREGATOR (V-49), AS AN INTERFACE.
 *
 * NIMC's virtual NIN is exposed by several licensed aggregators (Dojah,
 * Youverify, Prembly, QoreID, VerifyMe, Smile ID). Which one holds Vallo's
 * users' identity checks is founder question 4, so the product is built
 * against this interface and ships with:
 *
 *   unconfigured  the production default until a contract is signed: it
 *                 verifies nothing and says so, and `vnin_identity` stays off.
 *   stub          for tests: answers from a fixture table keyed by token.
 *
 * THE ONE SWAP. Implement `IdentityProvider` for the chosen aggregator (the
 * vNIN lookup and the liveness match to the NIMC photograph), return it from
 * `identityProvider()` when its key is present, set VALLO_NIN_HMAC_KEY, and
 * turn the flag on.
 *
 * WHAT A PROVIDER RETURNS AND WHAT HAPPENS TO IT. The NIN comes back so it can
 * be HMACed at once (`nin.ts`) and then dropped: it is never stored, logged or
 * returned to a screen. The legal name is kept, because the name is what the
 * rung, the payout match and the account check compare with.
 */

export type VninAnswer =
  | {
      ok: true;
      nin: string;
      legalName: string;
      /** The aggregator's own reference for this check, for the audit trail. */
      reference: string;
      /** 0 to 1: how closely the selfie matched the NIMC photograph. */
      liveness: number;
    }
  | { ok: false; reason: "unconfigured" | "not_found" | "expired" | "failed" };

export interface IdentityProvider {
  readonly name: string;
  verifyVnin(input: { vnin: string; selfie?: Blob | null }): Promise<VninAnswer>;
}

export const unconfiguredProvider: IdentityProvider = {
  name: "unconfigured",
  async verifyVnin() {
    return { ok: false, reason: "unconfigured" };
  },
};

export function stubProvider(fixtures: Record<string, VninAnswer>): IdentityProvider {
  return {
    name: "stub",
    async verifyVnin({ vnin }) {
      return fixtures[vnin] ?? { ok: false, reason: "not_found" };
    },
  };
}

/** The provider this deployment uses. No aggregator is contracted yet. */
export function identityProvider(): IdentityProvider {
  return unconfiguredProvider;
}
