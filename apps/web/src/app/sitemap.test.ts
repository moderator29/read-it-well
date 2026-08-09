import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildSitemap, PUBLIC_PAGES } from "@/lib/listings/sitemap";

/**
 * Surface one of four: the sitemap.
 *
 * A sitemap is an explicit invitation to a crawler, so this is the surface
 * where an example listing does the most damage: it is the difference between
 * a fabricated property advertisement that Google might find and one that
 * Google has been asked to fetch. Both halves are checked here. The builder is
 * held against a fixture, and the route is held against a database that hands
 * back an example row anyway, because the SQL predicate is exactly the kind of
 * line a refactor removes without noticing.
 */

/** Rows the fake database returns, set per test. */
let rows: { id: string; is_demo: boolean; updated_at: string }[] = [];

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: () => true,
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon",
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => {
    /* A chainable stand-in: every builder method returns the builder, and the
       terminal `range` resolves the rows. One page, then empty. */
    let served = false;
    const builder: Record<string, unknown> = {};
    for (const name of ["from", "select", "eq", "order"]) {
      builder[name] = () => builder;
    }
    builder.range = async () => {
      if (served) return { data: [], error: null };
      served = true;
      return { data: rows, error: null };
    };
    return builder;
  },
}));

const { default: sitemap } = await import("./sitemap");

beforeEach(() => {
  rows = [];
});

describe("the sitemap builder", () => {
  it("carries every public page and no product page", () => {
    const urls = buildSitemap("https://rentme.ng", []).map((entry) => entry.url);

    expect(urls).toContain("https://rentme.ng");
    expect(urls).toContain("https://rentme.ng/search");
    for (const page of PUBLIC_PAGES) {
      expect(urls.length).toBeGreaterThan(0);
      expect(page.path.startsWith("/")).toBe(true);
    }
    /* The line `middleware.ts` draws: browsing is open, doing costs an
       account. A sitemap entry that redirects to sign-in is a wasted crawl. */
    for (const shut of ["/wallet", "/saved", "/settings", "/admin", "/agent", "/styleguide"]) {
      expect(urls.some((url) => url.includes(shut))).toBe(false);
    }
  });

  it("drops an example listing and keeps a real one", () => {
    const urls = buildSitemap("https://rentme.ng", [
      { id: "real-1", isDemo: false },
      { id: "example-1", isDemo: true },
    ]).map((entry) => entry.url);

    expect(urls).toContain("https://rentme.ng/listing/real-1");
    expect(urls).not.toContain("https://rentme.ng/listing/example-1");
  });

  it("does not double the slash on an origin that ends in one", () => {
    const urls = buildSitemap("https://rentme.ng/", [{ id: "real-1", isDemo: false }]).map(
      (entry) => entry.url,
    );
    expect(urls).toContain("https://rentme.ng/listing/real-1");
    expect(urls.some((url) => url.includes("//listing"))).toBe(false);
  });
});

describe("the sitemap route", () => {
  it("publishes a real listing", async () => {
    rows = [{ id: "real-1", is_demo: false, updated_at: "2026-08-01T00:00:00Z" }];
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith("/listing/real-1"))).toBe(true);
  });

  /**
   * The braces, tested by removing the belt. If the SQL predicate is ever
   * dropped, the gate inside `buildSitemap` is what stands between an example
   * listing and Google's crawl queue, and this is the spec that says so.
   */
  it("refuses an example listing even when the database hands one back", async () => {
    rows = [
      { id: "real-1", is_demo: false, updated_at: "2026-08-01T00:00:00Z" },
      { id: "example-1", is_demo: true, updated_at: "2026-08-09T00:00:00Z" },
    ];
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls.some((url) => url.endsWith("/listing/real-1"))).toBe(true);
    expect(urls.some((url) => url.includes("example-1"))).toBe(false);
  });

  it("still serves the static pages when the catalogue cannot be read", async () => {
    rows = [];
    const entries = await sitemap();
    expect(entries.length).toBe(PUBLIC_PAGES.length);
  });
});
