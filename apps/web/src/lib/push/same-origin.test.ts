import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { sameOriginPath } from "./same-origin";

const ESCAPES = ["//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "\\\\evil.com", "https://evil.com", "javascript:alert(1)", " //evil.com"];

describe("sameOriginPath (V-53)", () => {
  it("keeps a path on our origin", () => {
    expect(sameOriginPath("/messages/abc?x=1#y")).toBe("/messages/abc?x=1#y");
    expect(sameOriginPath(" /notifications ")).toBe("/notifications");
  });
  it("refuses every way off the origin", () => {
    for (const bad of ESCAPES) expect(sameOriginPath(bad), JSON.stringify(bad)).toBeNull();
    expect(sameOriginPath(null)).toBeNull();
  });
  it("is the same rule in the service worker", () => {
    const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
    const start = source.indexOf("function safePushHref");
    const end = source.indexOf("\n}\n", start) + 2;
    const fn = runInNewContext(`const PUSH_FALLBACK_HREF = "/notifications"; ${source.slice(start, end)}; safePushHref`, { URL });
    for (const bad of ESCAPES) expect(fn(bad), JSON.stringify(bad)).toBe("/notifications");
    expect(fn("/messages/abc")).toBe("/messages/abc");
  });
});
