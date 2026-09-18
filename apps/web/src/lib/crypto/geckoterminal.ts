import "server-only";

import { cached } from "./cache";
import type { CryptoResult, PairRow } from "./types";
import { fetchJson, num, reasonOf, record, text } from "./upstream";

/**
 * GeckoTerminal, for DEX pools.
 *
 * The public v2 API takes no key, so this half of the proxy can answer before
 * the founder's CoinGecko key lands. It is still behind our cache and our
 * rate limit, because a public allowance shared with every other caller on the
 * internet is exactly the thing a bare fetch from the browser would exhaust.
 */

const BASE = "https://api.geckoterminal.com/api/v2";

/** GeckoTerminal versions its JSON through the Accept header. */
const ACCEPT_VERSION = "application/json;version=20230302";

export const GECKOTERMINAL_TTL_MS = 60_000;

/** Top pools per call. The surface shows a list, not a ledger. */
const POOLS_PER_PAGE = 20;

/**
 * One pool into the contract row. Exported for its tests.
 *
 * The pair's symbols come from the pool's own name, which GeckoTerminal writes
 * as "BASE / QUOTE" (occasionally with a fee tier after the quote). Reading
 * the two token objects would cost an `include` and a second walk of the
 * document for a string the name already carries.
 */
export function mapPool(raw: unknown): PairRow | null {
  const pool = record(raw);
  if (!pool) return null;
  const attributes = record(pool["attributes"]);
  if (!attributes) return null;
  const address = text(attributes["address"]);
  if (address.length === 0) return null;

  const name = text(attributes["name"]).trim();
  const [base = "", rest = ""] = name.split(" / ");
  const quote = rest.split(" ")[0] ?? "";

  const change = record(attributes["price_change_percentage"]);
  const volume = record(attributes["volume_usd"]);
  const relationships = record(pool["relationships"]);
  const dex = record(record(relationships?.["dex"])?.["data"]);

  return {
    address,
    name,
    baseSymbol: base.trim(),
    quoteSymbol: quote.trim(),
    priceUsd: num(attributes["base_token_price_usd"]),
    change24h: num(change?.["h24"]),
    volume24h: num(volume?.["h24"]),
    dex: text(dex?.["id"]),
  };
}

export type PairsQuery = { network: string; query: string };

/**
 * The top pools on a network, or the pools matching a search term.
 *
 * Two upstream endpoints answer the two questions, so the URL is built here
 * and the mapper does not care which one it came from.
 */
export async function fetchPairs(query: PairsQuery): Promise<CryptoResult<PairRow[]>> {
  const network = encodeURIComponent(query.network);
  const url =
    query.query.length > 0
      ? `${BASE}/search/pools?${new URLSearchParams({ query: query.query, network: query.network, page: "1" }).toString()}`
      : `${BASE}/networks/${network}/pools?page=1`;

  try {
    const { data, cachedAt } = await cached(url, GECKOTERMINAL_TTL_MS, async () => {
      const body = record(await fetchJson(url, { accept: ACCEPT_VERSION }));
      const list = Array.isArray(body?.["data"]) ? (body["data"] as unknown[]) : [];
      return list
        .map(mapPool)
        .filter((row): row is PairRow => row !== null)
        .slice(0, POOLS_PER_PAGE);
    });
    return { ok: true, data, cachedAt };
  } catch (error) {
    return { ok: false, reason: reasonOf(error) };
  }
}
