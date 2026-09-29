import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/* V-51: the smoke tier names real specs, and the full tier is every spec. */
const TESTS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "tests");

type Runner = { SMOKE: string[]; PROD: string[]; specsFor: (tier: string, available: string[]) => string[] };
let runner: Runner;
const available = readdirSync(TESTS)
  .filter((f) => f.endsWith(".spec.mjs"))
  .map((f) => f.replace(/\.spec\.mjs$/, ""));

beforeAll(async () => {
  runner = (await import(/* @vite-ignore */ pathToFileURL(join(TESTS, "run.mjs")).href)) as Runner;
});

describe("the spec runner's tiers", () => {
  it("has ten smoke specs, every one of which exists", () => {
    expect(runner.SMOKE).toHaveLength(10);
    expect(runner.specsFor("smoke", available)).toEqual(runner.SMOKE);
  });
  it("runs every spec in the full tier", () => {
    expect(runner.specsFor("full", available)).toHaveLength(available.length);
    expect(available.length).toBeGreaterThanOrEqual(80);
  });
  it("names only real specs in the prod tier (production-build properties)", () => {
    expect(runner.specsFor("prod", available)).toEqual(runner.PROD);
    for (const name of runner.PROD) expect(available).toContain(name);
  });
  it("refuses a smoke list that names a spec that has gone", () => {
    expect(() => runner.specsFor("smoke", available.filter((n) => n !== "wallet"))).toThrow(/wallet/);
  });
});
