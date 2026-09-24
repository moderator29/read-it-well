import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** OPS-16: the share card is small, and every page names its own address. */
describe("the share card", () => {
  it("is a JPEG of at most 120KB", () => {
    const size = statSync("src/app/opengraph-image.jpg").size;
    expect(size).toBeLessThanOrEqual(120 * 1024);
    const head = readFileSync("src/app/opengraph-image.jpg").subarray(0, 3);
    expect([...head]).toEqual([0xff, 0xd8, 0xff]);
    expect(() => statSync("src/app/opengraph-image.png")).toThrow();
  });

  it("the proxy lets an unfurler fetch it signed out", () => {
    expect(readFileSync("src/proxy.ts", "utf8")).toContain('"/opengraph-image.jpg"');
  });

  it("every page's canonical and og:url is its own address", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toContain('alternates: { canonical: "./" }');
    expect(layout).toMatch(/openGraph: \{\s+url: "\.\/"/);
  });
});
