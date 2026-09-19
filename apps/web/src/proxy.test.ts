import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { NONCE_HEADER } from "@/lib/security/csp";

/**
 * The nonce contract, which nothing held.
 *
 * `lib/security/security.test.ts` proves the SHAPE of the policy string. This
 * file proves the other half, which is the half that kills a deployment: that
 * the nonce the proxy names in `script-src` is the same nonce it forwards to
 * the app on `x-nonce`.
 *
 * Why that is the whole product rather than a detail. Under `'strict-dynamic'`
 * a browser stops honouring `'self'` and every host in the directive and runs a
 * script only if it carries this request's nonce. Next reads the policy off the
 * request it is handed and stamps that nonce onto every script it emits: the
 * bootstrap, the chunk preinits, the streaming payload. The root layout reads
 * `x-nonce` and stamps its own three before-paint scripts by hand. If those two
 * values ever disagree, or if either goes missing, EVERY script on EVERY route
 * is refused, nothing hydrates, and the pages still render perfectly in a
 * screenshot because the server markup is already on screen. That is the exact
 * failure this platform has now paid for twice in development clothes.
 *
 * Measured on a production server on 19 September before this file was written:
 * the nonce in the response policy, the nonce on the layout's theme script and
 * the nonce on Next's bootstrap script were one value on every route walked, so
 * the contract held. Nothing was asserting it.
 *
 * These run against the pass-through exit, which is the one a request takes
 * when Supabase is not configured, because that needs no credentials. The
 * policy is stamped by `withSecurityPolicy` on all three exits, so what is
 * proved here is the stamp itself.
 */

/** The nonce the response's own policy names. */
function policyNonce(policy: string): string | null {
  const directive = policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("script-src "));
  const match = directive?.match(/'nonce-([^']+)'/);
  return match?.[1] ?? null;
}

/**
 * The nonce the app will actually receive.
 *
 * `NextResponse.next({ request })` does not hand the modified request back
 * directly. It encodes the overridden names in `x-middleware-override-headers`
 * and each value in `x-middleware-request-<name>`, and Next applies them to the
 * request before the render. Reading them here is reading what the layout will
 * read, rather than reading the variable the proxy happened to use.
 */
function forwardedNonce(response: Response): string | null {
  const overridden = (response.headers.get("x-middleware-override-headers") ?? "")
    .split(",")
    .map((name) => name.trim());
  if (!overridden.includes(NONCE_HEADER)) return null;
  return response.headers.get(`x-middleware-request-${NONCE_HEADER}`);
}

/*
 * Every route family the product renders, including the two boundaries.
 *
 * The boundaries are named because they are where a policy like this one
 * historically breaks: `not-found` and `error` render through a different
 * branch of Next's tree than an ordinary page, so a nonce that is wired up in
 * a layout can be absent there while every normal route looks fine. They go
 * through this proxy exactly like anything else, and this is the assertion
 * that says so.
 */
const ROUTES = [
  "/",
  "/home",
  "/search",
  "/wallet",
  "/messages",
  "/definitely-not-a-route",
  "/preview/f1/chrome",
  // The matcher hole that SEC-4 closed: an asset suffix inside a parameter.
  "/listing/abc.png",
];

describe("the proxy's Content Security Policy", () => {
  it("stamps a policy on every route, boundaries included", async () => {
    for (const route of ROUTES) {
      const response = await proxy(new NextRequest(`http://localhost${route}`));
      const policy = response.headers.get("content-security-policy");
      expect(policy, `${route} served no enforcing policy`).toBeTruthy();
      expect(policy).toContain("'strict-dynamic'");
    }
  });

  it("names, in the policy, the same nonce it forwards to the app", async () => {
    for (const route of ROUTES) {
      const response = await proxy(new NextRequest(`http://localhost${route}`));
      const named = policyNonce(response.headers.get("content-security-policy") ?? "");
      const forwarded = forwardedNonce(response);
      expect(named, `${route} named no nonce in script-src`).toBeTruthy();
      expect(forwarded, `${route} forwarded no ${NONCE_HEADER}`).toBeTruthy();
      expect(named, `${route} would have served a policy the app cannot satisfy`).toBe(forwarded);
    }
  });

  it("mints a fresh nonce per request rather than one per build", async () => {
    const first = await proxy(new NextRequest("http://localhost/"));
    const second = await proxy(new NextRequest("http://localhost/"));
    const a = policyNonce(first.headers.get("content-security-policy") ?? "");
    const b = policyNonce(second.headers.get("content-security-policy") ?? "");
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it("serves the boundaries the identical policy it serves an ordinary page", async () => {
    /* One function builds the string, so the only difference between any two
       responses must be the nonce. A boundary that quietly got a different
       policy is the shape of fault R1 reported, and this is the cheap check
       that would have settled it without a browser. */
    const strip = (policy: string) => policy.replace(/'nonce-[^']+'/, "'nonce-X'");
    const page = await proxy(new NextRequest("http://localhost/"));
    for (const route of ["/definitely-not-a-route", "/home", "/preview/f1/chrome"]) {
      const boundary = await proxy(new NextRequest(`http://localhost${route}`));
      expect(strip(boundary.headers.get("content-security-policy") ?? ""), route).toBe(
        strip(page.headers.get("content-security-policy") ?? ""),
      );
    }
  });

  it("carries the reporting endpoint the policy points at", async () => {
    const response = await proxy(new NextRequest("http://localhost/"));
    expect(response.headers.get("Reporting-Endpoints")).toBe('csp="/api/csp-report"');
  });
});
