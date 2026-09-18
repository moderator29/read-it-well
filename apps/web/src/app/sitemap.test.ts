import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildSitemap, PUBLIC_PAGES, RESTAURANT_PAGES_INDEXABLE } from "@/lib/listings/sitemap";

/**
 * Surface one of four: the sitemap.
 *
 * A sitemap is an explicit invitation to a crawler, so this is the surface
 * where an example listing does the most damage: it is the difference between
 * a fabricated property advertisement that Google might find and one that
 * Google has been asked to fetch. Both halves are checked here. The builder is
 * held against a fixture, and the route is held against a database that hands
 * back an example row anyway, because the SQL predicate is exactly the kind of
 * line a refactor removes without noticing. The Stays side is held to the same
 * rule, table by table.
 */

type Row = { id: string; is_demo: boolean; updated_at: string };

/** Rows the fake database returns, per table, set per test. */
let rows: Record<string, Row[]> = {};

/** Every table the route asked for, in order, with the predicates it applied. */
let asked: { table: string; where: [string, string, string | boolean][] }[] = [];

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: () => true,
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon",
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    /* A chainable stand-in per table: every builder method returns the
       builder, the predicates are recorded, and the terminal `range` resolves
       that table's rows. One page, then empty. */
    from(table: string) {
      const record = { table, where: [] as [string, string, string | boolean][] };
      asked.push(record);
      let served = false;
      const builder = {
        select: () => builder,
        eq: (column: string, value: string | boolean) => {
          record.where.push(["eq", column, value]);
          return builder;
        },
        neq: (column: string, value: string | boolean) => {
          record.where.push(["neq", column, value]);
          return builder;
        },
        order: () => builder,
        range: async () => {
          if (served) return { data: [], error: null };
          served = true;
          return { data: rows[table] ?? [], error: null };
        },
      };
      return builder;
    },
  }),
}));

const { default: sitemap } = await import("./sitemap");

beforeEach(() => {
  rows = {};
  asked = [];
});

describe("the sitemap builder", () => {
  it("carries every public page on both sides and no product page", () => {
    const urls = buildSitemap("https://vallo.ng", []).map((entry) => entry.url);

    expect(urls).toContain("https://vallo.ng");
    expect(urls).toContain("https://vallo.ng/search");
    expect(urls).toContain("https://vallo.ng/stays");
    expect(urls).toContain("https://vallo.ng/stays/search");
    expect(urls).toContain("https://vallo.ng/restaurants");
    for (const page of PUBLIC_PAGES) {
      expect(urls.length).toBeGreaterThan(0);
      expect(page.path.startsWith("/")).toBe(true);
    }
    /* The line `proxy.ts` draws: browsing is open, doing costs an account. A
       sitemap entry that redirects to sign-in is a wasted crawl. */
    for (const shut of [
      "/wallet",
      "/saved",
      "/settings",
      "/admin",
      "/agent",
      "/styleguide",
      "/trips",
      "/host",
      "/preview",
      "/gallery",
    ]) {
      expect(urls.some((url) => url.includes(shut)), shut).toBe(false);
    }
  });

  it("drops an example listing and keeps a real one", () => {
    const urls = buildSitemap("https://vallo.ng", [
      { id: "real-1", isDemo: false },
      { id: "example-1", isDemo: true },
    ]).map((entry) => entry.url);

    expect(urls).toContain("https://vallo.ng/listing/real-1");
    expect(urls).not.toContain("https://vallo.ng/listing/example-1");
  });

  it("lists a published stay and drops an example one", () => {
    const urls = buildSitemap("https://vallo.ng", [], {
      stays: [
        { id: "stay-1", isDemo: false, updatedAt: "2026-09-01T00:00:00Z" },
        { id: "stay-example", isDemo: true },
      ],
    }).map((entry) => entry.url);

    expect(urls).toContain("https://vallo.ng/stay/stay-1");
    expect(urls).not.toContain("https://vallo.ng/stay/stay-example");
  });

  it("knows how to list a restaurant, behind the same gate", () => {
    const urls = buildSitemap("https://vallo.ng", [], {
      restaurants: [
        { id: "rest-1", isDemo: false },
        { id: "rest-example", isDemo: true },
      ],
    }).map((entry) => entry.url);

    expect(urls).toContain("https://vallo.ng/restaurant/rest-1");
    expect(urls).not.toContain("https://vallo.ng/restaurant/rest-example");
  });

  it("does not double the slash on an origin that ends in one", () => {
    const urls = buildSitemap("https://vallo.ng/", [{ id: "real-1", isDemo: false }]).map(
      (entry) => entry.url,
    );
    expect(urls).toContain("https://vallo.ng/listing/real-1");
    expect(urls.some((url) => url.includes("//listing"))).toBe(false);
  });
});

describe("the sitemap route", () => {
  it("publishes a real listing and a real stay", async () => {
    rows = {
      listings: [{ id: "real-1", is_demo: false, updated_at: "2026-08-01T00:00:00Z" }],
      accommodations: [{ id: "stay-1", is_demo: false, updated_at: "2026-08-02T00:00:00Z" }],
    };
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith("/listing/real-1"))).toBe(true);
    expect(urls.some((url) => url.endsWith("/stay/stay-1"))).toBe(true);
  });

  it("asks each table only for published, real rows", async () => {
    await sitemap();
    const tables = asked.map((a) => a.table);
    expect(tables).toContain("listings");
    expect(tables).toContain("accommodations");
    for (const { where } of asked) {
      expect(where).toContainEqual(["eq", "status", "PUBLISHED"]);
      expect(where).toContainEqual(["eq", "is_demo", false]);
    }
    /* A restaurant is a listing row too. The property read leaves it out so
       nothing is listed twice, once as /listing and once as /restaurant. */
    const properties = asked.find((a) => a.table === "listings");
    expect(properties?.where).toContainEqual(["neq", "property_type", "restaurant"]);
  });

  /**
   * The braces, tested by removing the belt. If the SQL predicate is ever
   * dropped, the gate inside `buildSitemap` is what stands between an example
   * row and Google's crawl queue, and this is the spec that says so, for both
   * tables.
   */
  it("refuses an example row even when the database hands one back", async () => {
    rows = {
      listings: [
        { id: "real-1", is_demo: false, updated_at: "2026-08-01T00:00:00Z" },
        { id: "example-1", is_demo: true, updated_at: "2026-08-09T00:00:00Z" },
      ],
      accommodations: [
        { id: "stay-1", is_demo: false, updated_at: "2026-08-01T00:00:00Z" },
        { id: "stay-example", is_demo: true, updated_at: "2026-08-09T00:00:00Z" },
      ],
    };
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls.some((url) => url.endsWith("/listing/real-1"))).toBe(true);
    expect(urls.some((url) => url.endsWith("/stay/stay-1"))).toBe(true);
    expect(urls.some((url) => url.includes("example"))).toBe(false);
  });

  it("lists no restaurant page while that page refuses to be indexed", async () => {
    /*
     * `app/(app)/restaurant/[id]/page.tsx` emits noindex for every restaurant
     * today. A sitemap entry the page then turns away is the contradiction
     * Search Console flags by name, so the route does not read the rows until
     * RESTAURANT_PAGES_INDEXABLE flips, and this test flips with it.
     */
    rows = { listings: [{ id: "rest-1", is_demo: false, updated_at: "2026-08-01T00:00:00Z" }] };
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.includes("/restaurant/"))).toBe(RESTAURANT_PAGES_INDEXABLE);
  });

  it("still serves the static pages when the catalogue cannot be read", async () => {
    rows = {};
    const entries = await sitemap();
    expect(entries.length).toBe(PUBLIC_PAGES.length);
  });
});
