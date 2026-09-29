/**
 * The assets and networks crypto payment can ever offer, with their exact
 * precision. Client-safe: constants and pure parsing only.
 *
 * WHICH ONES ARE OFFERED is configuration, not code: `CRYPTO_ENABLED_ASSETS`
 * (read in `config.ts`) names a subset of this catalogue, and the provider has
 * to support each pair on the merchant account. A pair missing here cannot be
 * switched on by an environment variable, because its precision would be a
 * guess, and a guessed precision is a wrong amount.
 *
 * Precision is the asset's ON THAT NETWORK: USDT is six decimals on TRON and
 * on Ethereum; BTC is eight. Confirmations are the usual counts a provider
 * waits for and are only shown as guidance; the provider's own count, when it
 * reports one, is what the screen prints.
 */

export type AssetPair = {
  /** Upper-case ticker, as stored in `crypto_payments.asset`. */
  asset: string;
  /** Upper-case network id, as stored in `crypto_payments.network`. */
  network: string;
  /** Decimal places of the asset on this network. */
  decimals: number;
  /** What a person calls the asset. */
  assetName: string;
  /** What a person calls the network, including its token standard. */
  networkName: string;
  /** The confirmations a provider typically waits for. Guidance only. */
  typicalConfirmations: number;
  /** A sentence a person should read before sending on this network. */
  warning: string;
};

export const CATALOGUE: readonly AssetPair[] = [
  {
    asset: "USDT",
    network: "TRON",
    decimals: 6,
    assetName: "Tether (USDT)",
    networkName: "TRON (TRC-20)",
    typicalConfirmations: 19,
    warning: "Send USDT on the TRON network (TRC-20) only. USDT sent on any other network to this address is lost.",
  },
  {
    asset: "USDT",
    network: "ETHEREUM",
    decimals: 6,
    assetName: "Tether (USDT)",
    networkName: "Ethereum (ERC-20)",
    typicalConfirmations: 12,
    warning: "Send USDT on the Ethereum network (ERC-20) only. USDT sent on any other network to this address is lost.",
  },
  {
    asset: "USDC",
    network: "ETHEREUM",
    decimals: 6,
    assetName: "USD Coin (USDC)",
    networkName: "Ethereum (ERC-20)",
    typicalConfirmations: 12,
    warning: "Send USDC on the Ethereum network (ERC-20) only. USDC sent on any other network to this address is lost.",
  },
  {
    asset: "USDC",
    network: "SOLANA",
    decimals: 6,
    assetName: "USD Coin (USDC)",
    networkName: "Solana (SPL)",
    typicalConfirmations: 32,
    warning: "Send USDC on the Solana network only. USDC sent on any other network to this address is lost.",
  },
  {
    asset: "BTC",
    network: "BITCOIN",
    decimals: 8,
    assetName: "Bitcoin (BTC)",
    networkName: "Bitcoin",
    typicalConfirmations: 2,
    warning: "Send bitcoin on the Bitcoin network only, not wrapped or Lightning bitcoin.",
  },
];

export function findPair(asset: string, network: string): AssetPair | null {
  const a = asset.trim().toUpperCase();
  const n = network.trim().toUpperCase();
  return CATALOGUE.find((pair) => pair.asset === a && pair.network === n) ?? null;
}

/**
 * Read `CRYPTO_ENABLED_ASSETS`: comma-separated `ASSET:NETWORK` pairs, for
 * example `USDT:TRON,USDC:ETHEREUM,BTC:BITCOIN`.
 *
 * Unknown pairs and duplicates are dropped, and the order is kept (the first
 * pair is the default selection). Empty or unset means nothing is enabled,
 * which keeps crypto hidden.
 */
export function parseEnabledAssets(raw: string | undefined | null): AssetPair[] {
  const out: AssetPair[] = [];
  for (const token of (raw ?? "").split(",")) {
    const [asset, network, ...rest] = token.split(":");
    if (!asset || !network || rest.length > 0) continue;
    const pair = findPair(asset, network);
    if (pair && !out.includes(pair)) out.push(pair);
  }
  return out;
}

/** The distinct assets in a list of pairs, in order: the first sheet's rows. */
export function assetsOf(pairs: readonly AssetPair[]): string[] {
  return [...new Set(pairs.map((pair) => pair.asset))];
}

/** The networks one asset can be sent on: the second sheet's rows. */
export function networksFor(pairs: readonly AssetPair[], asset: string): AssetPair[] {
  return pairs.filter((pair) => pair.asset === asset);
}

/** A refund address the provider can return crypto to: shape only, per network. */
export function refundAddressLooksValid(network: string, address: string): boolean {
  const value = address.trim();
  switch (network) {
    case "TRON":
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value);
    case "ETHEREUM":
      return /^0x[0-9a-fA-F]{40}$/.test(value);
    case "SOLANA":
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
    case "BITCOIN":
      return /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/.test(value);
    default:
      return false;
  }
}
