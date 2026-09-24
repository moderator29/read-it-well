import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * OPS-09: the functions run beside the database. The database is in
 * eu-west-1 (Ireland); Vercel's Dublin region is `dub1`. Without this the
 * functions default to iad1 (Washington) and every PostgREST call crosses the
 * Atlantic, several times per page.
 */
describe("where the functions run", () => {
  it("is Dublin, next to the database", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as { regions?: string[] };
    expect(config.regions).toEqual(["dub1"]);
  });

  it("DEPLOY.md still names the database region this was chosen for", () => {
    const deploy = readFileSync("../../docs/DEPLOY.md", "utf8");
    expect(deploy).toMatch(/eu-west-1/);
  });
});
