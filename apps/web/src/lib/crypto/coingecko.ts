import "server-only";

import { cached } from "./cache";
import type { CoinDetail, CryptoResult, MarketRow, VsCurrency } from "./types";
import { fetchJson, num, numbers, reasonOf, record, text } from "./upstream";

/**
 * CoinGecko, behind our own door.
 *
 * The key lives in the environment and travels in a request header to
 * CoinGecko and nowhere else: never in a URL, never in a cache key, never in a
 * response. The plan decides the host and the header name, because CoinGecko
 * runs the demo and pro tiers on different hosts and refuses a demo key on the
 * pro host.
 *
 * WITHOUT A KEY THE FETCHERS ANSWER "unconfigured" RATHER THAN CALLING THE
 * KEYLESS PUBLIC ENDPOINT. The public endpoint exists and would work for a
 * while, and the founder ruled the surface dark until his key lands, because
 * a feed that works until a shared public allowance runs out is a feed that
 * fails on the day it is shown to somebody. Honest and dark beats live and
 * unreliable.
 */

type Plan = "demo" | "pro";

/** The environment, or a stand-in for it under test. */
export type Env = Record<string, string | undefined>;

export type CoinGeckoConfig = {
  key: string;
  plan: Plan;
  baseUrl: string;
  headerName: string;
};

const BASE: Record<Plan, string> = {
  demo: "https://api.coingecko.com/api/v3",
  pro: "https://pro-api.coingecko.com/api/v3",
};

const HEADER: Record<Plan, string> = {
  demo: "x-cg-demo-api-key",
  pro: "x-cg-pro-api-key",
};

/** Markets and coin detail both hold for a minute. */
export const COINGECKO_TTL_MS = 60_000;

/** Description text is capped so a coin's essay never becomes our page. */
const DESCRIPTION_MAX = 600;

/**
 * The configuration, or null when the surface must stay dark.
 *
 * `COINGECKO_PLAN` is `demo` unless it is exactly `pro`; a typo is the safe
 * tier, because the demo host is the one a wrong key fails loudly on.
 */
export function coinGeckoConfig(
  env: Env = process.env,
): CoinGeckoConfig | null {
  const key = (env.COINGECKO_API_KEY ?? "").trim();
  if (key.length === 0) return null;
  const plan: Plan = (env.COINGECKO_PLAN ?? "").trim().toLowerCase() === "pro" ? "pro" : "demo";
  return { key, plan, baseUrl: BASE[plan], headerName: HEADER[plan] };
}

export function isCoinGeckoConfigured(env: Env = process.env): boolean {
  return coinGeckoConfig(env) !== null;
}

/* ----------------------------------------------------------------- mappers */

/** One `/coins/markets` row into the contract row. Exported for its tests. */
export function mapMarketRow(raw: unknown): MarketRow | null {
  const row = record(raw);
  if (!row) return null;
  const id = text(row["id"]);
  if (id.length === 0) return null;
  const sparkline = record(row["sparkline_in_7d"]);
  return {
    id,
    symbol: text(row["symbol"]).toUpperCase(),
    name: text(row["name"]),
    image: text(row["image"]),
    price: num(row["current_price"]),
    change24h: num(row["price_change_percentage_24h"]),
    marketCap: num(row["market_cap"]),
    sparkline7d: numbers(sparkline?.["price"]),
  };
}

/**
 * Upstream descriptions are HTML with links in them. The surface renders
 * text, so the tags go and whitespace collapses. Anything that reads as a
 * recommendation is the coin's own marketing, which is why the text is capped
 * hard rather than shown in full: the page is a price, not a pitch.
 */
export function plainDescription(html: string): string {
  const stripped = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= DESCRIPTION_MAX) return stripped;
  const cut = stripped.slice(0, DESCRIPTION_MAX);
  const lastStop = cut.lastIndexOf(". ");
  return (lastStop > DESCRIPTION_MAX / 2 ? cut.slice(0, lastStop + 1) : cut).trim();
}

/** One `/coins/{id}` document into the contract detail. Exported for its tests. */
export function mapCoinDetail(raw: unknown, vs: VsCurrency): CoinDetail | null {
  const coin = record(raw);
  if (!coin) return null;
  const id = text(coin["id"]);
  if (id.length === 0) return null;
  const market = record(coin["market_data"]) ?? {};
  const by = (key: string): number => num(record(market[key])?.[vs]);
  const image = record(coin["image"]);
  const description = record(coin["description"]);
  const sparkline = record(market["sparkline_7d"]);
  return {
    id,
    symbol: text(coin["symbol"]).toUpperCase(),
    name: text(coin["name"]),
    image: text(image?.["large"]) || text(image?.["small"]) || text(image?.["thumb"]),
    price: by("current_price"),
    change24h: num(market["price_change_percentage_24h"]),
    change7d: num(market["price_change_percentage_7d"]),
    marketCap: by("market_cap"),
    volume24h: by("total_volume"),
    high24h: by("high_24h"),
    low24h: by("low_24h"),
    description: plainDescription(text(description?.["en"])),
    chart7d: numbers(sparkline?.["price"]),
  };
}

/* ---------------------------------------------------------------- fetchers */

export type MarketsQuery = { vs: VsCurrency; per: number; page: number };

/**
 * The markets table: top coins by market cap with a week of sparkline.
 *
 * The cache key is the URL without the key, which is exactly the URL, because
 * the key is a header. Two callers asking for the same page in the same
 * minute cost one upstream call.
 */
export async function fetchMarkets(
  query: MarketsQuery,
  env: Env = process.env,
): Promise<CryptoResult<MarketRow[]>> {
  const config = coinGeckoConfig(env);
  if (!config) return { ok: false, reason: "unconfigured" };

  const params = new URLSearchParams({
    vs_currency: query.vs,
    order: "market_cap_desc",
    per_page: String(query.per),
    page: String(query.page),
    sparkline: "true",
    price_change_percentage: "24h",
  });
  const url = `${config.baseUrl}/coins/markets?${params.toString()}`;

  try {
    const { data, cachedAt } = await cached(url, COINGECKO_TTL_MS, async () => {
      const body = await fetchJson(url, { [config.headerName]: config.key });
      if (!Array.isArray(body)) return [] as MarketRow[];
      return body.map(mapMarketRow).filter((row): row is MarketRow => row !== null);
    });
    return { ok: true, data, cachedAt };
  } catch (error) {
    return { ok: false, reason: reasonOf(error) };
  }
}

/** One coin in full, priced in `vs`. */
export async function fetchCoin(
  id: string,
  vs: VsCurrency,
  env: Env = process.env,
): Promise<CryptoResult<CoinDetail>> {
  const config = coinGeckoConfig(env);
  if (!config) return { ok: false, reason: "unconfigured" };

  const params = new URLSearchParams({
    localization: "false",
    tickers: "false",
    market_data: "true",
    community_data: "false",
    developer_data: "false",
    sparkline: "true",
  });
  const url = `${config.baseUrl}/coins/${encodeURIComponent(id)}?${params.toString()}`;

  try {
    const { data, cachedAt } = await cached(`${url}#${vs}`, COINGECKO_TTL_MS, async () => {
      const body = await fetchJson(url, { [config.headerName]: config.key });
      const detail = mapCoinDetail(body, vs);
      if (!detail) throw new Error("unreadable coin");
      return detail;
    });
    return { ok: true, data, cachedAt };
  } catch (error) {
    return { ok: false, reason: reasonOf(error) };
  }
}
