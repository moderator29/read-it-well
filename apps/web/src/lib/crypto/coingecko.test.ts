import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearCryptoCache } from "./cache";
import {
  coinGeckoConfig,
  fetchCoin,
  fetchMarkets,
  mapCoinDetail,
  mapMarketRow,
  plainDescription,
} from "./coingecko";

/**
 * The CoinGecko half of the proxy: the mappers against a real-shaped payload,
 * and the three ways a call does not answer. The fetch is mocked, because the
 * sandbox cannot reach the API and a test that needs a key is not a test.
 */

const MARKET_ROW = {
  id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
  current_price: 98_000_000,
  market_cap: 1_900_000_000_000_000,
  price_change_percentage_24h: -1.23,
  sparkline_in_7d: { price: [1, 2, null, 3, "x"] },
};

const COIN = {
  id: "ethereum",
  symbol: "eth",
  name: "Ethereum",
  image: { thumb: "t.png", small: "s.png", large: "l.png" },
  description: { en: 'Ethereum is a <a href="https://x">platform</a>. &amp; more.' },
  market_data: {
    current_price: { ngn: 5_000_000, usd: 3_100 },
    market_cap: { ngn: 600_000_000_000_000, usd: 370_000_000_000 },
    total_volume: { ngn: 20_000_000_000_000, usd: 12_000_000_000 },
    high_24h: { ngn: 5_100_000, usd: 3_200 },
    low_24h: { ngn: 4_900_000, usd: 3_000 },
    price_change_percentage_24h: 2.5,
    price_change_percentage_7d: -4.25,
    sparkline_7d: { price: [10, 11, 12] },
  },
};

const DEMO_ENV = { COINGECKO_API_KEY: "throwaway-demo-key" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("coinGeckoConfig", () => {
  it("is null without a key, so the surface stays dark", () => {
    expect(coinGeckoConfig({})).toBeNull();
    expect(coinGeckoConfig({ COINGECKO_API_KEY: "   " })).toBeNull();
  });

  it("defaults to the demo host and header", () => {
    const config = coinGeckoConfig(DEMO_ENV);
    expect(config?.baseUrl).toBe("https://api.coingecko.com/api/v3");
    expect(config?.headerName).toBe("x-cg-demo-api-key");
  });

  it("switches host and header together on the pro plan, and only on exactly pro", () => {
    const pro = coinGeckoConfig({ ...DEMO_ENV, COINGECKO_PLAN: "Pro" });
    expect(pro?.baseUrl).toBe("https://pro-api.coingecko.com/api/v3");
    expect(pro?.headerName).toBe("x-cg-pro-api-key");
    const typo = coinGeckoConfig({ ...DEMO_ENV, COINGECKO_PLAN: "prof" });
    expect(typo?.plan).toBe("demo");
  });
});

describe("mapMarketRow", () => {
  it("maps a markets row to the contract and drops non-numbers from the sparkline", () => {
    expect(mapMarketRow(MARKET_ROW)).toEqual({
      id: "bitcoin",
      symbol: "BTC",
      name: "Bitcoin",
      image: MARKET_ROW.image,
      price: 98_000_000,
      change24h: -1.23,
      marketCap: 1_900_000_000_000_000,
      sparkline7d: [1, 2, 3],
    });
  });

  it("zeroes a nulled figure rather than inventing one", () => {
    const row = mapMarketRow({ ...MARKET_ROW, current_price: null, sparkline_in_7d: null });
    expect(row?.price).toBe(0);
    expect(row?.sparkline7d).toEqual([]);
  });

  it("refuses a row without an id", () => {
    expect(mapMarketRow({ symbol: "x" })).toBeNull();
    expect(mapMarketRow("nonsense")).toBeNull();
  });
});

describe("mapCoinDetail", () => {
  it("prices in the requested currency", () => {
    const ngn = mapCoinDetail(COIN, "ngn");
    expect(ngn).toMatchObject({
      id: "ethereum",
      symbol: "ETH",
      name: "Ethereum",
      image: "l.png",
      price: 5_000_000,
      change24h: 2.5,
      change7d: -4.25,
      marketCap: 600_000_000_000_000,
      volume24h: 20_000_000_000_000,
      high24h: 5_100_000,
      low24h: 4_900_000,
      chart7d: [10, 11, 12],
    });
    expect(mapCoinDetail(COIN, "usd")?.price).toBe(3_100);
  });

  it("strips the description to plain text", () => {
    expect(mapCoinDetail(COIN, "ngn")?.description).toBe("Ethereum is a platform . & more.");
  });

  it("refuses an unreadable document", () => {
    expect(mapCoinDetail(null, "ngn")).toBeNull();
    expect(mapCoinDetail({ symbol: "x" }, "ngn")).toBeNull();
  });
});

describe("plainDescription", () => {
  it("caps a long essay at a sentence boundary", () => {
    const essay = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} here.`).join(" ");
    const out = plainDescription(essay);
    expect(out.length).toBeLessThanOrEqual(600);
    expect(out.endsWith(".")).toBe(true);
  });

  it("is empty for nothing", () => {
    expect(plainDescription("")).toBe("");
  });
});

describe("fetchMarkets and fetchCoin", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    clearCryptoCache();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("answers unconfigured without a key and never touches the network", async () => {
    const result = await fetchMarkets({ vs: "ngn", per: 50, page: 1 }, {});
    expect(result).toEqual({ ok: false, reason: "unconfigured" });
    const coin = await fetchCoin("bitcoin", "ngn", {});
    expect(coin).toEqual({ ok: false, reason: "unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the key in the plan's header and never in the URL", async () => {
    fetchMock.mockResolvedValue(jsonResponse([MARKET_ROW]));
    const result = await fetchMarkets({ vs: "usd", per: 25, page: 2 }, DEMO_ENV);
    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/coins/markets?vs_currency=usd");
    expect(String(url)).toContain("per_page=25");
    expect(String(url)).toContain("page=2");
    expect(String(url)).not.toContain("throwaway");
    expect((init?.headers as Record<string, string>)["x-cg-demo-api-key"]).toBe(
      "throwaway-demo-key",
    );
  });

  it("maps the rows and stamps cachedAt", async () => {
    fetchMock.mockResolvedValue(jsonResponse([MARKET_ROW, { no: "id" }]));
    const result = await fetchMarkets({ vs: "ngn", per: 50, page: 1 }, DEMO_ENV);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe("bitcoin");
    expect(Number.isNaN(Date.parse(result.cachedAt))).toBe(false);
  });

  it("serves the second call in the minute from memory", async () => {
    fetchMock.mockResolvedValue(jsonResponse([MARKET_ROW]));
    await fetchMarkets({ vs: "ngn", per: 50, page: 1 }, DEMO_ENV);
    await fetchMarkets({ vs: "ngn", per: 50, page: 1 }, DEMO_ENV);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("answers rate_limited on an upstream 429 and says nothing else", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: { error_message: "secret" } }, 429));
    const result = await fetchMarkets({ vs: "ngn", per: 50, page: 1 }, DEMO_ENV);
    expect(result).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("answers upstream on a 401 from a bad key, without the body", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "invalid api key" }, 401));
    const result = await fetchMarkets({ vs: "ngn", per: 50, page: 1 }, DEMO_ENV);
    expect(result).toEqual({ ok: false, reason: "upstream" });
  });

  it("answers upstream when the network fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const result = await fetchCoin("bitcoin", "ngn", DEMO_ENV);
    expect(result).toEqual({ ok: false, reason: "upstream" });
  });

  it("answers bad_request for a coin upstream does not know", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "coin not found" }, 404));
    const result = await fetchCoin("no-such-coin", "ngn", DEMO_ENV);
    expect(result).toEqual({ ok: false, reason: "bad_request" });
  });

  it("maps a coin document", async () => {
    fetchMock.mockResolvedValue(jsonResponse(COIN));
    const result = await fetchCoin("ethereum", "usd", DEMO_ENV);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.price).toBe(3_100);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/coins/ethereum?");
  });
});
