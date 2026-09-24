import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { shelfCountLine } from "./shelf-count-line";

/**
 * OPS-11: the header never states a page's size as the total. The shelf pages
 * 24 at a time; with more to come, page 1 said "24 properties found" and page
 * 2 counted only itself.
 */
const copy = getDictionary("en").catalogue.shelf;
const line = (count: number, more: boolean, later: boolean) =>
  shelfCountLine({ count, narrowed: false, more, later }, copy, "en");

describe("the results header on a paged shelf", () => {
  it("says a first page with more to come is a page, not a total", () => {
    expect(line(24, true, false)).toBe("24 shown, more below");
    expect(line(24, true, false)).not.toMatch(/found/);
  });

  it("says a middle page is more of the same list", () => {
    expect(line(24, true, true)).toBe("24 more shown, more below");
  });

  it("says the last page of several is the last", () => {
    expect(line(7, false, true)).toBe("7 more shown, the last of them");
  });

  it("keeps the total wording when one page holds everything", () => {
    expect(line(12, false, false)).toBe("12 properties found");
    expect(line(1, false, false)).toBe("1 property found");
    expect(shelfCountLine({ count: 0, narrowed: true, more: false, later: false }, copy, "en")).toBe(
      "No properties found",
    );
  });

  it("the search page tells the header whether more pages exist", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const page = readFileSync(join(process.cwd(), "src/app/(app)/search/page.tsx"), "utf8");
    expect(page).toContain("more={!codeHit && Boolean(nextHref)}");
    expect(page).toContain("later={!codeHit && Boolean(after)}");
  });
});
