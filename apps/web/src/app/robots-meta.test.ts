import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UI-16: a not-found or private page must not carry "index, follow" and
 * "noindex" at once. The root layout states no robots tag at all (indexable
 * is the default), so a page's own noindex is the only one in its head.
 */
describe("one robots answer per page", () => {
  it("the root layout sets no site-wide robots tag", () => {
    const layout = readFileSync(join(__dirname, "layout.tsx"), "utf8");
    expect(layout).not.toMatch(/robots:\s*\{\s*index:\s*true/);
  });
});
