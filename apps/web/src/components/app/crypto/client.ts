/**
 * The typed client for BD's crypto proxy, to the contract in
 * docs/archive/BUILD_06_LEDGER.md section 2.1.
 *
 *   GET /api/crypto/markets?vs=ngn&per=50&page=1
 *   GET /api/crypto/coins/[id]
 *   GET /api/crypto/pairs?network=eth&query=
 *
 * Every response is `{ ok: true, data, cachedAt }` or
 * `{ ok: false, reason: "unconfigured" | "rate_limited" | "upstream" }`.
 *
 * NOTHING HERE THROWS. A network failure, a non-JSON body and a route that
 * has not landed yet all come back as the contract's own failure shape, so
 * the surface has exactly four states to draw and draws each one on
 * purpose. A 404 is read as `unconfigured`: the honest thing to say about a
 * feed that is not there is that it is not connected yet.
 */

export type CryptoVs = "ngn" | "usd";

export type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  marketCap: number;
  sparkline7d: number[];
};

/** A chart point is either a bare price or a `[timestamp, price]` pair. */
export type ChartPoint = number | [number, number];

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
  description: string;
  chart7d: ChartPoint[];
};

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

export type CryptoFailureReason = "unconfigured" | "rate_limited" | "upstream";

export type CryptoResponse<T> =
  | { ok: true; data: T; cachedAt: string }
  | { ok: false; reason: CryptoFailureReason };

export const PAIR_NETWORKS: { id: string; label: string }[] = [
  { id: "eth", label: "Ethereum" },
  { id: "bsc", label: "BNB Chain" },
  { id: "solana", label: "Solana" },
  { id: "base", label: "Base" },
  { id: "arbitrum", label: "Arbitrum" },
  { id: "polygon_pos", label: "Polygon" },
];

async function read<T>(url: string, signal?: AbortSignal): Promise<CryptoResponse<T>> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", signal });
  } catch {
    return { ok: false, reason: "upstream" };
  }
  if (response.status === 404) return { ok: false, reason: "unconfigured" };
  if (response.status === 429) return { ok: false, reason: "rate_limited" };
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: "upstream" };
  }
  return parseResponse<T>(body);
}

/** The contract's envelope, checked rather than trusted. Exported for tests. */
export function parseResponse<T>(body: unknown): CryptoResponse<T> {
  if (typeof body !== "object" || body === null) return { ok: false, reason: "upstream" };
  const envelope = body as { ok?: unknown; data?: unknown; cachedAt?: unknown; reason?: unknown };
  if (envelope.ok === true && envelope.data !== undefined) {
    return {
      ok: true,
      data: envelope.data as T,
      cachedAt: typeof envelope.cachedAt === "string" ? envelope.cachedAt : new Date().toISOString(),
    };
  }
  const reason = envelope.reason;
  if (reason === "unconfigured" || reason === "rate_limited" || reason === "upstream") {
    return { ok: false, reason };
  }
  return { ok: false, reason: "upstream" };
}

export function fetchMarkets(
  vs: CryptoVs,
  signal?: AbortSignal,
): Promise<CryptoResponse<MarketRow[]>> {
  return read<MarketRow[]>(`/api/crypto/markets?vs=${vs}&per=50&page=1`, signal);
}

export function fetchCoin(
  id: string,
  vs: CryptoVs,
  signal?: AbortSignal,
): Promise<CryptoResponse<CoinDetail>> {
  return read<CoinDetail>(`/api/crypto/coins/${encodeURIComponent(id)}?vs=${vs}`, signal);
}

export function fetchPairs(
  network: string,
  query: string,
  signal?: AbortSignal,
): Promise<CryptoResponse<PairRow[]>> {
  const params = new URLSearchParams({ network, query });
  return read<PairRow[]>(`/api/crypto/pairs?${params.toString()}`, signal);
}
