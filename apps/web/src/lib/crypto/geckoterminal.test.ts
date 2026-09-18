import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearCryptoCache } from "./cache";
import { fetchPairs, mapPool } from "./geckoterminal";

const POOL = {
  id: "eth_0xabc",
  type: "pool",
  attributes: {
    address: "0xabc",
    name: "WETH / USDC 0.05%",
    base_token_price_usd: "3100.5",
    price_change_percentage: { h24: "-2.1" },
    volume_usd: { h24: "12345678.9" },
  },
  relationships: { dex: { data: { id: "uniswap_v3", type: "dex" } } },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("mapPool", () => {
  it("maps a pool and reads the pair from its name", () => {
    expect(mapPool(POOL)).toEqual({
      address: "0xabc",
      name: "WETH / USDC 0.05%",
      baseSymbol: "WETH",
      quoteSymbol: "USDC",
      priceUsd: 3100.5,
      change24h: -2.1,
      volume24h: 12345678.9,
      dex: "uniswap_v3",
    });
  });

  it("refuses a pool without an address", () => {
    expect(mapPool({ attributes: { name: "A / B" } })).toBeNull();
    expect(mapPool(null)).toBeNull();
  });
});

describe("fetchPairs", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    clearCryptoCache();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("asks for the network's top pools when there is no term, with no key", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [POOL] }));
    const result = await fetchPairs({ network: "eth", query: "" });
    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://api.geckoterminal.com/api/v2/networks/eth/pools?page=1");
    const headers = init?.headers as Record<string, string>;
    expect(Object.keys(headers).some((h) => h.toLowerCase().includes("api-key"))).toBe(false);
  });

  it("searches when there is a term", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [POOL] }));
    await fetchPairs({ network: "base", query: "weth" });
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/search/pools?query=weth&network=base");
  });

  it("answers rate_limited on 429 and upstream on anything else", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 429));
    expect(await fetchPairs({ network: "eth", query: "" })).toEqual({
      ok: false,
      reason: "rate_limited",
    });
    clearCryptoCache();
    fetchMock.mockResolvedValueOnce(jsonResponse({ errors: ["boom"] }, 500));
    expect(await fetchPairs({ network: "eth", query: "" })).toEqual({
      ok: false,
      reason: "upstream",
    });
  });

  it("answers an empty list for a document with no data", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const result = await fetchPairs({ network: "eth", query: "" });
    expect(result).toMatchObject({ ok: true, data: [] });
  });
});
