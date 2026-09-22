import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PRICE CHECK IS REACHABLE WITH NO ACCOUNT, AND THAT HAS TO STAY TRUE.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS WORTH A TEST.
 *
 * `/price` is the acquisition surface. It is the one screen on this platform
 * that is useful in an area where we have nothing, and the whole strategic
 * case for it is that a stranger arrives cold, asks about their own flat, gets
 * an honest refusal plus a notify me, and leaves us a geocoded demand signal
 * telling us where to recruit supply. A stranger who is bounced to /sign-in
 * before the page runs leaves us nothing at all.
 *
 * `proxy.ts` sends a signed-out visitor to sign in for every first path
 * segment in `PRODUCT_SEGMENTS`, BEFORE ANY PAGE RUNS. Adding "price" to that
 * set is a one-word edit that reads as tidying: every other `(app)` route is
 * in there, so the list looks incomplete without it. Nothing would fail. The
 * page would still render perfectly for anybody signed in, every test would
 * stay green, and the feature would quietly stop doing the only job that
 * justifies building it before there is any supply.
 *
 * This is also the exact shape the session brief warns about in the other
 * direction: a Next.js layout calling `notFound()` answers HTTP 200 with the
 * not-found body, so neither a status code nor a signed-in smoke test can see
 * this class of fault. The proxy's own source can.
 *
 * ---------------------------------------------------------------------------
 * IT READS `proxy.ts` AND DOES NOT EDIT IT.
 *
 * `proxy.ts` belongs to another session, which owns one line of it by written
 * agreement. This asserts a fact about that file rather than changing it, so
 * the two sessions cannot collide, and if the fact stops being true the
 * failure names the file and the reason rather than a line number.
 */

const PROXY = join(__dirname, "..", "..", "proxy.ts");

/** The set as it is written, without executing the module. */
function productSegments(): string[] {
  const source = readFileSync(PROXY, "utf8");
  const start = source.indexOf("const PRODUCT_SEGMENTS = new Set([");
  expect(start, "PRODUCT_SEGMENTS is no longer declared the way this test reads it").toBeGreaterThan(
    -1,
  );
  const end = source.indexOf("]);", start);
  expect(end, "PRODUCT_SEGMENTS is not closed the way this test reads it").toBeGreaterThan(start);
  const body = source.slice(start, end);
  return [...body.matchAll(/"([a-z0-9-]+)"/g)].map((match) => match[1] ?? "");
}

describe("the standalone Price Check route is open to a stranger", () => {
  it("reads the segment list it is asserting about, rather than an empty one", () => {
    /* A parser that stopped matching would return nothing, and "price is not in
       []" is true of every possible list. So the shape is checked first: the
       segments this test knows are in there have to be in there. */
    const segments = productSegments();
    expect(segments.length).toBeGreaterThan(10);
    for (const known of ["wallet", "profile", "settings", "admin"]) {
      expect(segments, `${known} should be a product segment`).toContain(known);
    }
  });

  it("does not gate `price` behind sign-in", () => {
    expect(
      productSegments(),
      "adding `price` to PRODUCT_SEGMENTS sends every signed-out visitor to /sign-in before the page runs, which removes the only reason to build this feature before there is any supply",
    ).not.toContain("price");
  });

  it("leaves the browsing surfaces a refusal sends people to open as well", () => {
    /* Two of the nine refusals offer "see area prices" and one offers "see
       similar nearby". Both land inside this feature or on /search, and a
       signed-out reader who followed a refusal's own next action into a sign-in
       wall would have been given a dead end dressed as a way forward. */
    const segments = productSegments();
    expect(segments).not.toContain("search");
    expect(segments).not.toContain("listing");
  });
});
