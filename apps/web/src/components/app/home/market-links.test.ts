import { describe, expect, it } from "vitest";
import { MARKETS } from "./markets";
import { parseShelfQuery } from "@/components/app/search/shelf-query";

/**
 * EVERY TILE ON THE HOME GRID MUST REACH A FILTERED SHELF.
 *
 * The defect. Two of the nine tiles linked at `/search?intent=rent` and
 * `/search?intent=sale`. `parseShelfQuery` reads `market=buy|rent` and reads
 * NOTHING called `intent`, so from the day the market parameter was
 * introduced, somebody tapping Buy on the first screen of the product was
 * handed the unfiltered catalogue with rentals mixed into it. Nothing failed,
 * nothing logged, and the page looked entirely normal: it simply answered a
 * different question from the one that was asked.
 *
 * It is a link, so no type checked it, and it is a string, so no compiler
 * could. The only thing that catches this class is running the link through
 * the parser that receives it, which is what these do: each tile's href is
 * parsed by the real `parseShelfQuery` and asserted to come back carrying a
 * filter. A tile whose parameter is not read comes back empty, which is the
 * shape of the defect.
 */

/** The query string of a tile's href, as the shelf would receive it. */
function paramsOf(href: string): Record<string, string> {
  const query = new URL(href, "https://vallo.test").searchParams;
  return Object.fromEntries(query.entries());
}

describe("every market tile spends a parameter the shelf actually reads", () => {
  it("has tiles to check, so a passing suite cannot mean an empty list", () => {
    expect(MARKETS.length).toBeGreaterThan(0);
  });

  for (const market of MARKETS) {
    it(`"${market.key}" reaches a filtered shelf rather than the whole catalogue`, () => {
      const query = parseShelfQuery(paramsOf(market.href));
      const filtered = query.intent !== undefined || query.kind !== undefined;

      expect(
        filtered,
        `${market.href} parses to no filter at all, so this tile lands on the ` +
          `unfiltered catalogue. The shelf reads "market" and "type"; it does ` +
          `not read "intent".`,
      ).toBe(true);
    });
  }

  it("sends Rent to the letting market and Buy to the sale market, not the reverse", () => {
    const rent = MARKETS.find((m) => m.key === "rent");
    const buy = MARKETS.find((m) => m.key === "buy");
    expect(parseShelfQuery(paramsOf(rent?.href ?? "")).intent).toBe("rent");
    expect(parseShelfQuery(paramsOf(buy?.href ?? "")).intent).toBe("sale");
  });
});
