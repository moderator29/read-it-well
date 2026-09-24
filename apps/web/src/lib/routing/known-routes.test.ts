import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { isKnownRoute, KNOWN_TOP_SEGMENTS, REDIRECT_ONLY_SEGMENTS } from "./known-routes";

/** Every first URL segment under src/app that holds a page or a route. */
function routableTopSegments(): string[] {
  const holds = (dir: string): boolean =>
    readdirSync(dir).some((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? holds(full) : /^(page\.tsx|route\.ts)$/.test(entry);
    });
  const out = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      if (entry.startsWith("(")) walk(full);
      else if (holds(full)) out.add(entry);
    }
  };
  walk("src/app");
  return [...out].sort();
}

describe("OPS-17: the addresses this app answers at", () => {
  it("names exactly the routable directories, plus the redirect-only sources", () => {
    const listed = [...KNOWN_TOP_SEGMENTS].filter((s) => !REDIRECT_ONLY_SEGMENTS.has(s)).sort();
    expect(listed).toEqual(routableTopSegments());
  });

  it("the redirect-only names are next.config redirects", () => {
    const config = readFileSync("next.config.ts", "utf8");
    for (const name of REDIRECT_ONLY_SEGMENTS) expect(config).toContain(`source: "/${name}`);
  });

  it("knows the product and not a typo", () => {
    expect(isKnownRoute("/")).toBe(true);
    expect(isKnownRoute("/listing/abc")).toBe(true);
    expect(isKnownRoute("/definitely-not-a-page-xyz")).toBe(false);
    expect(isKnownRoute("/wp-admin/setup.php")).toBe(false);
  });

  it("the proxy answers an unknown address with the 404, before the sign-in redirect", () => {
    const proxy = readFileSync("src/proxy.ts", "utf8");
    const gate = proxy.indexOf("if (!isPublicPath(path, { publicCatalogue }))");
    const unknown = proxy.indexOf("if (!isKnownRoute(path))", gate);
    const signIn = proxy.indexOf('target.pathname = "/sign-in"', gate);
    expect(gate).toBeGreaterThan(0);
    expect(unknown).toBeGreaterThan(gate);
    expect(unknown).toBeLessThan(signIn);
  });
});
