import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderClient } from "@/lib/testing/render-client";
import { parseStaysQuery, toStaysHref } from "@/lib/stays/filters";
import { carriedParams } from "./stays-dates-carried";

/**
 * UX-08 (remainder): /stays/search has dates on its face. The row is a GET
 * form to the same address that sets `in`, `out` and `guests` (the names the
 * search reads) and carries every other filter already in the URL.
 */
describe("dates on the stays search page", () => {
  it("carries the other filters and drops only the three it sets", () => {
    const query = parseStaysQuery({ q: "Ikeja", in: "2026-10-10", out: "2026-10-12", guests: "3", wifi: "1" }, "2026-09-24");
    const carried = carriedParams(
      toStaysHref({ ...query, checkIn: undefined, checkOut: undefined, guests: undefined }, "/stays/search"),
      "hotel",
    );
    expect(carried).toContainEqual(["q", "Ikeja"]);
    expect(carried).toContainEqual(["wifi", "1"]);
    expect(carried).toContainEqual(["type", "hotel"]);
    expect(carried.map(([name]) => name)).not.toContain("in");
    expect(carried.map(([name]) => name)).not.toContain("guests");
  });

  it("renders a GET form with the search's own field names", async () => {
    const html = await renderClient(`
      import { renderToStaticMarkup } from "react-dom/server";
      import { StaysDatesRow } from "@/components/app/stays/StaysDatesRow";
      export const html = () => renderToStaticMarkup(
        <StaysDatesRow carried={[["q", "Ikeja"]]} checkIn="2026-10-10" checkOut="2026-10-12" guests={3} today="2026-09-24"
          copy={{ checkIn: "Check in", checkOut: "Check out", guests: "Guests", submit: "Show" }} />);
    `);
    expect(html).toContain('method="get"');
    expect(html).toContain('action="/stays/search"');
    expect(html).toMatch(/<input[^>]*name="in"[^>]*>/);
    expect(html).toMatch(/<input[^>]*name="out"[^>]*>/);
    expect(html).toMatch(/<input[^>]*type="hidden"[^>]*name="q"[^>]*value="Ikeja"/);
    expect(html).toMatch(/min="2026-09-24"/);
  }, 30_000);

  it("is on the page, above the categories", () => {
    const page = readFileSync(join(process.cwd(), "src/app/(app)/stays/search/page.tsx"), "utf8");
    expect(page.indexOf("<StaysDatesRow")).toBeGreaterThan(-1);
    expect(page.indexOf("<StaysDatesRow")).toBeLessThan(page.indexOf("<StayCategoryTiles"));
  });
});
