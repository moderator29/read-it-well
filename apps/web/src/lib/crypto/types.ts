/**
 * The crypto proxy's contract, as the ledger (BUILD_06 section 2.1) binds it.
 *
 * Worker E builds the Crypto surface against exactly these shapes, so a field
 * here is a promise: nothing is added, renamed or made optional without the
 * ledger line changing first. Everything is display-only. There is no order,
 * no balance and no quote in any of it, because the platform does not trade,
 * hold or advise on any of this.
 *
 * Prices are upstream floats in the requested quote currency and are NOT
 * platform money: nothing here is kobo, nothing here reaches a wallet, and the
 * surface formats them for reading rather than for settling. `formatMoney` is
 * for money the platform moves; a coin's spot price is a number somebody else
 * published and we relay unchanged.
 */

/** The quote currencies the proxy will ask upstream for. */
export const VS_CURRENCIES = ["ngn", "usd"] as const;
export type VsCurrency = (typeof VS_CURRENCIES)[number];

/** One row of the markets table. */
export type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  /** Percentage, signed. Emerald up, rose down: the surface's job, not ours. */
  change24h: number;
  marketCap: number;
  /** Seven days of prices, oldest first, as many as upstream gave. */
  sparkline7d: number[];
};

/** One coin, for its detail page. */
export type CoinDetail = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  /** Plain text, tags stripped, capped. Empty when upstream had none. */
  description: string;
  /** Seven days of prices, oldest first. */
  chart7d: number[];
};

/** One DEX pool, from GeckoTerminal. */
export type PairRow = {
  address: string;
  name: string;
  baseSymbol: string;
  quoteSymbol: string;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  dex: string;
};

/**
 * Why a call did not answer.
 *
 * The ledger names three. `bad_request` is the fourth and is this file's one
 * addition to the contract: it is answered only for a malformed path segment
 * (a coin id that is not a slug) or an upstream 404, and never for a query
 * parameter, which the schemas coerce to a default instead. A surface that
 * treats any unknown reason as a plain failure state is already correct.
 */
export type CryptoFailureReason = "unconfigured" | "rate_limited" | "upstream" | "bad_request";

export type CryptoResult<T> =
  | { ok: true; data: T; cachedAt: string }
  | { ok: false; reason: CryptoFailureReason };
