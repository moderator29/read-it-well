/**
 * What a payment screen is told about crypto, decided on the server.
 *
 *   null     the platform half of the gate is closed (flag off, provider
 *            unconfigured, direct settlement unconfirmed, nothing enabled):
 *            nothing about crypto renders anywhere.
 *   "kyc"    crypto is open, but this payer has no matched identity check:
 *            one honest row pointing to verification, and no button.
 *   "open"   everything is in place: the option and its flow.
 */
export type CryptoOfferPair = {
  asset: string;
  network: string;
  assetName: string;
  networkName: string;
  decimals: number;
};

export type CryptoOffer =
  | { kind: "kyc" }
  | { kind: "open"; providerName: string; pairs: CryptoOfferPair[] };
