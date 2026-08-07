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

  /*
   * The bypass the first version of this guard shipped with.
   *
   * A URL parser DELETES tab, newline and carriage return before it resolves,
   * so a string this function reads as starting with one slash is handed to the
   * browser starting with two. Proved against the real parser below rather than
   * asserted, so this test fails if that behaviour ever changes.
   */
  it("refuses the control characters a URL parser strips rather than rejects", () => {
    for (const control of ["\t", "\n", "\r", "\u0000", "\u001f"]) {
      expect(safeReturnPath(`/${control}/evil.example`, "")).toBeNull();
      expect(safeReturnPath("/search", `?next=${control}//evil.example`)).toBeNull();
    }
  });

  it("the stripped-control bypass really did resolve off-origin", () => {
    // The reason the rule above exists, stated as an executable fact.
    for (const control of ["\t", "\n", "\r"]) {
      expect(new URL(`/${control}/evil.example`, "https://rentme.ng").origin).toBe(
        "https://evil.example",
      );
    }
  });

  it("refuses percent-encoded forms of the same characters", () => {
    for (const encoded of ["%09", "%0a", "%0d", "%0A", "%0D"]) {
      expect(safeReturnPath(`/${encoded}/evil.example`, "")).toBeNull();
    }
    // And an encoded slash that would become a protocol-relative host.
    expect(safeReturnPath("/%2f/evil.example", "")).toBeNull();
  });

  it("refuses a malformed percent sequence rather than guessing at it", () => {
    expect(safeReturnPath("/%zz", "")).toBeNull();
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
  const policy = () => contentSecurityPolicy("TESTNONCE");

  /** Pull one directive's source list out of a policy string. */
  const directive = (value: string, name: string) =>
    value
      .split(";")
      .map((part) => part.trim())
      .find((part) => part === name || part.startsWith(`${name} `)) ?? null;

  it("carries the nonce it was given", () => {
    expect(directive(policy(), "script-src")).toContain("'nonce-TESTNONCE'");
  });

  it("never allows inline or eval'd script", () => {
    const script = directive(policy(), "script-src") ?? "";
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it("sets the directives that cost nothing and close real attacks", () => {
    const value = policy();
    expect(directive(value, "default-src")).toBe("default-src 'self'");
    expect(directive(value, "object-src")).toBe("object-src 'none'");
    expect(directive(value, "base-uri")).toBe("base-uri 'self'");
    expect(directive(value, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(value, "frame-src")).toBe("frame-src 'none'");
  });

  it("keeps form-action rooted at 'self'", () => {
    /*
     * Worth a note rather than a wider assertion. Two server actions finish
     * with a `redirect()` off-origin, Supabase authorize for Google and Apple
     * and Paystack for a card. With JavaScript running neither is a form
     * navigation, so `form-action` does not govern them. Without it, Next
     * degrades the action to a real form POST and browsers disagree about
     * whether the following redirect is still part of that navigation.
     *
     * This policy ships REPORT-ONLY by default, which is the reason not to
     * pre-emptively widen the directive: if that path is real it arrives at
     * `/api/csp-report` as a `form-action` violation before anybody enforces,
     * which is a measurement rather than a guess. Widen it then, not now.
     */
    expect(directive(policy(), "form-action")).toBe("form-action 'self'");
  });

  it("lets the map's tiles through, or it draws a grey box", () => {
    /*
     * The invariant is REACHABILITY, not naming. This policy allows `https:`
     * wholesale on images rather than listing hosts, which is looser than an
     * allowlist and is a deliberate choice: listing photography arrives from
     * whatever CDN an agent's image sits behind, and a named list would fail
     * closed on a host nobody predicted, turning a listing into a broken frame.
     *
     * So this asserts the two tile hosts are covered one way or the other. If
     * somebody later tightens `img-src` to an allowlist, this fails unless they
     * remember the map, which is exactly when it should.
     */
    const value = directive(policy(), "img-src") ?? "";
    const covered = (host: string) => value.includes(host) || /(^|\s)https:(\s|$)/.test(value);
    expect(covered("https://basemaps.cartocdn.com")).toBe(true);
    expect(covered("https://api.maptiler.com")).toBe(true);
    // A chosen photo is previewed from a blob before it is ever uploaded.
    expect(value).toContain("blob:");
  });

  it("allows the service worker and the manifest it needs", () => {
    const value = policy();
    expect(directive(value, "worker-src")).toContain("blob:");
    expect(directive(value, "manifest-src")).toBe("manifest-src 'self'");
  });
});
