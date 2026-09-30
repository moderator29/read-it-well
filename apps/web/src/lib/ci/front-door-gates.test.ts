import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WEB = join(__dirname, "..", "..", "..");
const budget = JSON.parse(readFileSync(join(WEB, "perf-budget.json"), "utf8")) as {
  routes: { path: string; signedIn: boolean; budgetKb: number | null }[];
  heights: { path: string; width: number; maxPx: number; targetPx: number }[];
};
const a11y = readFileSync(join(WEB, "tests", "a11y-front-door.spec.mjs"), "utf8");
const ci = readFileSync(join(WEB, "..", "..", ".github", "workflows", "ci.yml"), "utf8");

describe("A15 the speed budget", () => {
  it("drops the retired wallet and covers the public front door", () => {
    const paths = budget.routes.map((r) => r.path);
    expect(paths).not.toContain("/wallet");
    for (const path of ["/", "/sign-up/email", "/check", "/guides/avoiding-rental-scams"]) expect(paths).toContain(path);
  });

  it("holds the landing height to a ceiling at or above its UIUX 9 target, never below", () => {
    for (const row of budget.heights) expect(row.maxPx).toBeGreaterThanOrEqual(row.targetPx);
    expect(budget.heights.map((h) => h.width).sort()).toEqual([1440, 390]);
  });
});

describe("A16 the accessibility gate", () => {
  it("walks all four locales and fails on serious and critical", () => {
    expect(a11y).toMatch(/"en,ha,yo,ig"/);
    expect(a11y).toMatch(/FAILING_IMPACTS = new Set\(\["serious", "critical"\]\)/);
  });

  it("is wired into CI with the weight and height checks", () => {
    expect(ci).toMatch(/tests\/a11y-front-door\.spec\.mjs/);
    expect(ci).toMatch(/scripts\/check-landing-height\.mjs/);
    expect(ci).toMatch(/scripts\/check-weight\.mjs/);
  });
});
