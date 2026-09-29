/**
 * Whether "Pay with crypto" may appear, decided in one pure function.
 *
 * FIVE THINGS, ALL REQUIRED, and each one has a reason to be a separate
 * question:
 *
 *   flag          `feature_flags.crypto_payments`, fail-closed. The founder's
 *                 switch, off until the regulatory question is answered.
 *   provider      the provider's keys, host and webhook secret are set.
 *   settlement    the founder has confirmed in writing that the provider
 *                 settles naira straight to the split legs (the literal
 *                 `confirmed`), and Vallo's and the reserve's settlement
 *                 accounts at the provider are set. Without this, crypto would
 *                 be custody, and it stays off.
 *   assets        at least one asset/network pair is enabled.
 *   kyc           the payer has a matched identity check. SCUML needs to know
 *                 who paid in crypto, so an anonymous payer is never offered it.
 *
 * The first four are the platform's and hide the option from everybody. The
 * last is the person's: the option is hidden too, but the screen may say
 * truthfully that verifying their identity makes it available. Nothing ever
 * renders a button that the server would refuse.
 */

export type CryptoGateInput = {
  flagOn: boolean;
  providerConfigured: boolean;
  directSettlementConfirmed: boolean;
  enabledAssetCount: number;
  payerKycVerified: boolean;
};

export type CryptoGateReason = "flag_off" | "provider_unconfigured" | "settlement_unconfirmed" | "no_assets" | "kyc_required";

export type CryptoGate =
  | { open: true }
  | { open: false; reason: CryptoGateReason; /** True when the refusal is about the platform, not the person. */ platform: boolean };

export function cryptoGate(input: CryptoGateInput): CryptoGate {
  if (!input.flagOn) return { open: false, reason: "flag_off", platform: true };
  if (!input.providerConfigured) return { open: false, reason: "provider_unconfigured", platform: true };
  if (!input.directSettlementConfirmed) return { open: false, reason: "settlement_unconfirmed", platform: true };
  if (input.enabledAssetCount <= 0) return { open: false, reason: "no_assets", platform: true };
  if (!input.payerKycVerified) return { open: false, reason: "kyc_required", platform: false };
  return { open: true };
}
