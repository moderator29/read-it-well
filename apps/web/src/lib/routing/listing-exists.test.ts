import { describe, expect, it } from "vitest";

import { detailIsMissing, listingIsMissing, type ListingCounter } from "./listing-exists";

/** A reader whose count answer is fixed, recording what it was asked. */
function reader(answer: { count: number | null; error: unknown } | Error) {
  const asked: [string, string][] = [];
  const query = {
    eq(column: string, value: string) {
      asked.push([column, value]);
      return query;
    },
    then(resolve: (value: { count: number | null; error: unknown }) => unknown, reject: (e: unknown) => unknown) {
      return answer instanceof Error ? Promise.reject(answer).then(resolve, reject) : Promise.resolve(answer).then(resolve);
    },
  };
  const counter = { from: () => ({ select: () => query }) } as unknown as ListingCounter;
  return { counter, asked };
}

const ID = "ed000000-0000-4000-8000-000000000003";

describe("OPS-17: is this listing page for a listing that is not there?", () => {
  it("a published listing the caller can read is there", async () => {
    const { counter, asked } = reader({ count: 1, error: null });
    expect(await listingIsMissing(`/listing/${ID}`, counter)).toBe(false);
    expect(asked).toEqual([["status", "PUBLISHED"], ["id", ID]]);
  });

  it("no such listing is missing", async () => {
    expect(await listingIsMissing(`/listing/${ID}`, reader({ count: 0, error: null }).counter)).toBe(true);
  });

  it("an id that cannot be a listing is missing, without a read", async () => {
    const { counter, asked } = reader({ count: 1, error: null });
    expect(await listingIsMissing("/listing/not-an-id", counter)).toBe(true);
    expect(asked).toEqual([]);
  });

  it("a failed read never 404s a live listing", async () => {
    expect(await listingIsMissing(`/listing/${ID}`, reader({ count: null, error: { code: "57014" } }).counter)).toBe(false);
    expect(await listingIsMissing(`/listing/${ID}`, reader(new Error("down")).counter)).toBe(false);
  });

  it("only the listing page itself is judged", async () => {
    const { counter } = reader({ count: 0, error: null });
    expect(await listingIsMissing(`/listing/${ID}/photos`, counter)).toBe(false);
    expect(await listingIsMissing("/search", counter)).toBe(false);
  });

  it("the proxy asks it on documents, after the sign-in gate, keeping refreshed cookies", async () => {
    const { readFileSync } = await import("node:fs");
    const proxy = readFileSync("src/proxy.ts", "utf8");
    const call = proxy.indexOf("await detailIsMissing(path");
    expect(call).toBeGreaterThan(proxy.indexOf('target.searchParams.set("notice", "sign-in-required")'));
    expect(proxy.slice(call - 400, call)).toContain('request.method === "GET" && isDocumentRequest(request)');
    expect(proxy.slice(call, call + 500)).toContain("rewritten.cookies.set(cookie)");
  });
});

/** A reader answering per table. */
function tables(answers: Record<string, number | null>) {
  const asked: string[] = [];
  const counter = {
    from: (table: string) => ({
      select: () => {
        asked.push(table);
        const query = {
          eq: () => query,
          then: (resolve: (v: { count: number | null; error: unknown }) => unknown) =>
            Promise.resolve({ count: answers[table] ?? 0, error: answers[table] === null ? { code: "x" } : null }).then(resolve),
        };
        return query;
      },
    }),
  } as unknown as ListingCounter;
  return { counter, asked };
}

describe("UI-16: stays and restaurants", () => {
  it("a stay page is there when the accommodation is", async () => {
    expect(await detailIsMissing(`/stay/${ID}`, tables({ accommodations: 1 }).counter)).toBe(false);
  });

  it("a stay page is there when a published listing is (the page falls back to it)", async () => {
    expect(await detailIsMissing(`/stay/${ID}`, tables({ accommodations: 0, listings: 1 }).counter)).toBe(false);
  });

  it("a stay page for nothing is missing, after asking both", async () => {
    const { counter, asked } = tables({ accommodations: 0, listings: 0 });
    expect(await detailIsMissing(`/stay/${ID}`, counter)).toBe(true);
    expect(asked).toEqual(["accommodations", "listings"]);
  });

  it("a restaurant page asks the restaurant businesses, then the listings", async () => {
    const { counter, asked } = tables({ businesses: 0, listings: 0 });
    expect(await detailIsMissing(`/restaurant/${ID}`, counter)).toBe(true);
    expect(asked).toEqual(["businesses", "listings"]);
    expect(await detailIsMissing(`/restaurant/${ID}`, tables({ businesses: 1 }).counter)).toBe(false);
  });

  it("a failed read on either answers exists", async () => {
    expect(await detailIsMissing(`/stay/${ID}`, tables({ accommodations: null }).counter)).toBe(false);
    expect(await detailIsMissing(`/restaurant/${ID}`, tables({ businesses: 0, listings: null }).counter)).toBe(false);
  });

  it("the listing-only entry point ignores other pages", async () => {
    expect(await listingIsMissing(`/stay/${ID}`, tables({}).counter)).toBe(false);
  });
});
