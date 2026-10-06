import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Point 12 (X2, Session 3 Round 4): a listing's inner pages each draw their
 * own wait. Without one, /agent/listings/<id>/promotion borrowed
 * /agent/listings' skeleton, a filter rail and photograph rows this page does
 * not have.
 */
const LISTING = join(__dirname, "..");

describe("a listing's inner pages: the wait is their own shape", () => {
  it("gives every page under [listingId] its own loading.tsx", () => {
    const pages = readdirSync(LISTING, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(LISTING, d.name, "page.tsx")))
      .map((d) => d.name);
    expect(pages).toContain("promotion");
    expect(pages.filter((name) => !existsSync(join(LISTING, name, "loading.tsx")))).toEqual([]);
  });

  it("draws the promotion page's ten figure rows, never a spinner", () => {
    const source = readFileSync(join(__dirname, "loading.tsx"), "utf8");
    expect(source).toContain("AgentScreenSkeleton");
    expect(source).toMatch(/length:\s*10\b/);
    expect(source).not.toMatch(/Spinner|PendingRing/);
  });
});
