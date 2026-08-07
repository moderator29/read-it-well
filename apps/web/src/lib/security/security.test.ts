import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, createNonce } from "./csp";
import { safeReturnPath } from "./return-path";

/**
 * The two security functions that had no test.
 *
 * Both are pure, both are cheap to check, and both fail in a way nothing else
 * in the suite would notice. An open redirect does not throw and does not break
 * a page: it works perfectly, for the attacker. A Content Security Policy that
 * has quietly gained `'unsafe-inline'` still serves, still hydrates, and still
 * passes every browser check in `tests/csp.spec.mjs` that is about the page
 * rendering rather than about the policy's shape.
 */

describe("safeReturnPath", () => {
  it("keeps an ordinary in-product path, with its query", () => {
    expect(safeReturnPath("/search", "?state=lagos")).toBe("/search?state=lagos");
    expect(safeReturnPath("/listing/abc", "")).toBe("/listing/abc");
  });

  it("refuses anything that is not rooted at a single slash", () => {
    // An absolute URL is the obvious attempt.
    expect(safeReturnPath("https://evil.example", "")).toBeNull();
    // A bare relative path would resolve against whatever page is current.
    expect(safeReturnPath("search", "")).toBeNull();
    expect(safeReturnPath("", "")).toBeNull();
  });

  it("refuses a protocol-relative address, which a browser reads as a host", () => {
    expect(safeReturnPath("//evil.example", "")).toBeNull();
    expect(safeReturnPath("//evil.example/path", "?a=1")).toBeNull();
  });

  it("refuses a backslash anywhere, because a URL parser treats it as a separator", () => {
    // This is the shape that got past an earlier version of the auth callback.
    expect(safeReturnPath("/\\evil.example", "")).toBeNull();
    expect(safeReturnPath("/\\\\evil.example", "")).toBeNull();
    // Including when it is smuggled through the query rather than the path.
    expect(safeReturnPath("/search", "?next=\\\\evil.example")).toBeNull();
  });
});

describe("createNonce", () => {
  it("is base64 and long enough to be worth having", () => {
    const nonce = createNonce();
    // 16 bytes base64 is 24 characters including the padding.
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(nonce.length).toBe(24);
  });

  it("is different every time, which is the entire point", () => {
    const seen = new Set(Array.from({ length: 200 }, () => createNonce()));
    expect(seen.size).toBe(200);
  });
});

describe("contentSecurityPolicy", () => {
  const production = () => contentSecurityPolicy("TESTNONCE", false);
  const development = () => contentSecurityPolicy("TESTNONCE", true);

  /** Pull one directive's source list out of a policy string. */
  const directive = (policy: string, name: string) =>
    policy
      .split(";")
      .map((part) => part.trim())
      .find((part) => part === name || part.startsWith(`${name} `)) ?? null;

  it("carries the nonce it was given", () => {
    expect(directive(production(), "script-src")).toContain("'nonce-TESTNONCE'");
  });

  it("never allows inline script, in either mode", () => {
    expect(directive(production(), "script-src")).not.toContain("'unsafe-inline'");
    expect(directive(development(), "script-src")).not.toContain("'unsafe-inline'");
  });

  it("allows eval only in development, because Turbopack's refresh runtime needs it", () => {
    expect(directive(production(), "script-src")).not.toContain("'unsafe-eval'");
    expect(directive(development(), "script-src")).toContain("'unsafe-eval'");
  });

  it("opens a websocket to localhost only in development", () => {
    expect(directive(production(), "connect-src")).not.toContain("ws://localhost");
    expect(directive(development(), "connect-src")).toContain("ws://localhost:*");
  });

  it("upgrades insecure requests only where there is TLS to upgrade to", () => {
    expect(production()).toContain("upgrade-insecure-requests");
    expect(development()).not.toContain("upgrade-insecure-requests");
  });

  it("sets the four directives that cost nothing and close real attacks", () => {
    const policy = production();
    expect(directive(policy, "object-src")).toBe("object-src 'none'");
    expect(directive(policy, "base-uri")).toBe("base-uri 'self'");
    expect(directive(policy, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(policy, "frame-src")).toBe("frame-src 'none'");
  });

  it("keeps form-action rooted at 'self' and names only Paystack beyond it", () => {
    /*
     * Supabase is absent from this expectation on purpose: it is derived from
     * NEXT_PUBLIC_SUPABASE_URL, which is unset in the test environment, and an
     * absent variable contributing no origin is the designed behaviour rather
     * than a gap. The browser spec covers the configured case.
     */
    const value = directive(production(), "form-action");
    expect(value).toBe("form-action 'self' https://checkout.paystack.com");
  });

  it("names the tile hosts on img-src, or the map draws a grey box", () => {
    const value = directive(production(), "img-src") ?? "";
    expect(value).toContain("https://basemaps.cartocdn.com");
    expect(value).toContain("https://api.maptiler.com");
    // A chosen photo is previewed from a blob before it is ever uploaded.
    expect(value).toContain("blob:");
  });

  it("starts from default-src 'self'", () => {
    expect(directive(production(), "default-src")).toBe("default-src 'self'");
  });
});
