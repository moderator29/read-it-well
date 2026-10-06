import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { withoutComments } from "@/lib/copy/source-scan";
import { countOrNoData, measurementRows } from "./measurement";
import { PROMOTION_METRICS } from "./tiers";

/**
 * STATEMENT 6: NO METRIC IS ESTIMATED, AND NO DATA IS NEVER ZERO
 * (`VALLO_PROMOTION.md`, "What promotion must never do").
 */
const t = getDictionary("en");

describe("the promotion results model", () => {
  it("while not live, lays out all ten figures, each as no data", () => {
    const rows = measurementRows({ state: "not-live" });
    expect(rows.map((row) => row.metric)).toEqual([...PROMOTION_METRICS]);
    for (const row of rows) expect(row.value).toBeNull();
  });

  it("keeps a recorded zero as a zero, and turns anything unrecorded into no data rather than zero", () => {
    expect(countOrNoData(0)).toBe(0);
    expect(countOrNoData(12)).toBe(12);
    for (const value of [undefined, null, "", "0", Number.NaN, Infinity, -1, 2.5, {}, []]) {
      expect(countOrNoData(value)).toBeNull();
    }
  });

  it("when ready, shows only the tier's metrics and never fills a gap", () => {
    const rows = measurementRows({ state: "ready", tier: "boost", values: { impressions: 40, saves: 0 }, comparisonValid: false });
    expect(rows.map((row) => row.metric)).toEqual(["impressions", "views", "uniqueViewers", "saves", "inquiries"]);
    expect(rows.find((row) => row.metric === "impressions")?.value).toBe(40);
    expect(rows.find((row) => row.metric === "saves")?.value).toBe(0);
    expect(rows.find((row) => row.metric === "views")?.value).toBeNull();
  });

  it("has a name for every metric and a no-data word that is not a number", () => {
    for (const metric of PROMOTION_METRICS) expect(t.experienceFeatures.promotion.metrics[metric].trim()).not.toBe("");
    expect(t.experienceFeatures.promotion.noData).not.toMatch(/\d/);
  });
});

describe("the results screen", () => {
  const results = withoutComments(
    readFileSync(join(__dirname, "..", "..", "components", "promotion", "PromotionResults.tsx"), "utf8"),
  );

  it("prints no data for a null figure, never a zero", () => {
    expect(results).toMatch(/value === null\s*\?\s*p\.noData/);
    expect(results).not.toMatch(/\?\?\s*0\b|\|\|\s*0\b/);
  });

  it("is not linked from anywhere: it waits for Session 2's reads", () => {
    const SRC = join(__dirname, "..", "..");
    const PAGE = join("app", "agent", "listings", "[listingId]", "promotion", "page.tsx");
    /* A literal path to the screen, outside the screen itself and the route map. */
    const LINK = /["'`][^"'`\n]*listings\/[^"'`\n]*\/promotion\b[^"'`\n]*["'`]/;
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry.startsWith(".")) continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
          if (path.endsWith(PAGE) || path.endsWith(join("lib", "nav", "route-parents.ts"))) continue;
          if (LINK.test(withoutComments(readFileSync(path, "utf8")))) offenders.push(path.slice(SRC.length));
        }
      }
    };
    walk(SRC);
    expect(offenders).toEqual([]);
  });
});
