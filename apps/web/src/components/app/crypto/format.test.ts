import { describe, expect, it } from "vitest";
import { parseResponse, type MarketRow } from "./client";
import { chartValues, formatCompact, formatListPrice, formatPercent, formatPrice, linePath, matchesCoin, movers, plainText } from "./format";

function row(id: string, change24h: number): MarketRow {
  return {
    id,
    symbol: id.slice(0, 3).toUpperCase(),
    name: id,
    image: "",
    price: 1,
    change24h,
    marketCap: 1,
    sparkline7d: [],
  };
}

describe("market formatting", () => {
  /* The app's English is en-NG, whose own way of writing a dollar is "US$":
     a Nigerian reader sees which dollar it is. The formatter takes the
     locale's word for it, so the tests do too. */
  it("prices with the precision their size deserves", () => {
    expect(formatPrice(64782.32, "usd", "en")).toBe("US$64,782.32");
    expect(formatPrice(0.0063, "usd", "en")).toBe("US$0.0063");
    expect(formatPrice(0.0000241, "usd", "en")).toBe("US$0.000024");
    expect(formatPrice(98_000_000, "ngn", "en")).toBe("₦98,000,000.00");
  });

  it("compacts caps and volumes with a lower-case magnitude", () => {
    expect(formatCompact(2_480_000_000_000, "usd", "en")).toBe("US$2.5t");
    expect(formatCompact(112_600_000_000, "usd", "en")).toBe("US$112.6b");
    expect(formatCompact(1_940_000_000_000_000, "ngn", "en")).toBe("₦1,940t");
  });

  it("signs every percentage", () => {
    expect(formatPercent(2.48, "en")).toBe("+2.48%");
    expect(formatPercent(-0.9, "en")).toBe("-0.90%");
    expect(formatPercent(0, "en")).toBe("0.00%");
  });
});

describe("chart geometry", () => {
  it("reads bare prices and timestamped pairs alike", () => {
    expect(chartValues([1, [2, 3], Number.NaN, 4])).toEqual([1, 3, 4]);
  });

  it("needs two points for a line and maps the range onto the box", () => {
    expect(linePath([1], 100, 40)).toBeNull();
    const path = linePath([1, 3, 2], 100, 40, 0);
    expect(path?.min).toBe(1);
    expect(path?.max).toBe(3);
    expect(path?.line).toBe("M0 40 L50 0 L100 20");
    expect(path?.area.endsWith("L100 40 L0 40 Z")).toBe(true);
  });
});

describe("movers and search", () => {
  it("splits gainers from losers and orders each by size", () => {
    const rows = [row("a", 2), row("b", -5), row("c", 9), row("d", -1), row("e", 0)];
    const { gainers, losers } = movers(rows, 5);
    expect(gainers.map((r) => r.id)).toEqual(["c", "a"]);
    expect(losers.map((r) => r.id)).toEqual(["b", "d"]);
  });

  it("matches on name, symbol or id", () => {
    const bitcoin = { ...row("bitcoin", 1), symbol: "btc", name: "Bitcoin" };
    expect(matchesCoin(bitcoin, "BTC")).toBe(true);
    expect(matchesCoin(bitcoin, "bit")).toBe(true);
    expect(matchesCoin(bitcoin, "")).toBe(true);
    expect(matchesCoin(bitcoin, "sol")).toBe(false);
  });

  it("strips the feed's markup from a description", () => {
    expect(plainText('Bitcoin is <a href="x">peer to peer</a> &amp; open.')).toBe(
      "Bitcoin is peer to peer & open.",
    );
  });
});

describe("the envelope", () => {
  it("accepts the contract's two shapes and nothing else", () => {
    expect(parseResponse({ ok: true, data: [], cachedAt: "2026-09-18T00:00:00Z" })).toEqual({
      ok: true,
      data: [],
      cachedAt: "2026-09-18T00:00:00Z",
    });
    expect(parseResponse({ ok: false, reason: "unconfigured" })).toEqual({
      ok: false,
      reason: "unconfigured",
    });
    expect(parseResponse({ ok: false, reason: "something_else" })).toEqual({
      ok: false,
      reason: "upstream",
    });
    expect(parseResponse("<!doctype html>")).toEqual({ ok: false, reason: "upstream" });
  });
});

describe("formatListPrice", () => {
  it("keeps the whole figure while it fits", () => {
    expect(formatListPrice(3940, "ngn", "en")).toBe("\u20a63,940.00");
  });

  it("groups above a million, keeping the value rather than rounding it away", () => {
    expect(formatListPrice(14_700_000, "ngn", "en")).toBe("\u20a614.7m");
    expect(formatListPrice(98_412_500, "ngn", "en")).toBe("\u20a698.4m");
  });

  it("leaves a dollar price alone at the sizes a coin list shows", () => {
    expect(formatListPrice(64_782.32, "usd", "en")).toBe("US$64,782.32");
  });

  it("says nothing for a figure the feed did not send", () => {
    expect(formatListPrice(Number.NaN, "ngn", "en")).toBe("");
  });
});
