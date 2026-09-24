import { describe, expect, it } from "vitest";

import { listingIsMissing, type ListingCounter } from "./listing-exists";

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
    const call = proxy.indexOf("await listingIsMissing(path");
    expect(call).toBeGreaterThan(proxy.indexOf('target.searchParams.set("notice", "sign-in-required")'));
    expect(proxy.slice(call - 400, call)).toContain('request.method === "GET" && isDocumentRequest(request)');
    expect(proxy.slice(call, call + 500)).toContain("rewritten.cookies.set(cookie)");
  });
});
