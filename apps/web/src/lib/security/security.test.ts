import { afterEach, describe, expect, it } from "vitest";
import { contentSecurityPolicy, createNonce, cspEnforced, cspHeaderName } from "./csp";
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
      expect(new URL(`/${control}/evil.example`, "https://vallo.ng").origin).toBe(
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

  it("lets a deposit reach Paystack, and nowhere else", () => {
    /*
     * This asserted `form-action 'self'` exactly, and reasoned that a
     * redirect to Paystack is not a form navigation so the directive cannot
     * govern it. That reasoning holds only while JavaScript is running. Where
     * it is not, Next degrades a server action to a real form POST, and Chrome
     * applies `form-action` to every hop of the redirect chain that POST
     * follows rather than only to its first target. A same-origin POST that
     * answers with a redirect to checkout is therefore blocked by `'self'`.
     *
     * The old note said to wait for a report before widening. That works only
     * if somebody is reading the reports on the day `CSP_ENFORCE` is flipped,
     * and the failure it is waiting for is a dead deposit with no server-side
     * trace. Paystack is named now.
     *
     * The pairing matters as much as the addition: the origins belong in
     * `form-action` and in nothing else. No Paystack script runs here and no
     * browser code calls their API, so finding them in `script-src` or
     * `connect-src` would mean somebody widened the wrong directive.
     */
    const value = policy();
    const form = directive(value, "form-action") ?? "";
    expect(form).toContain("'self'");
    expect(form).toContain("https://checkout.paystack.com");
    expect(form).toContain("https://checkout.paystack.co");

    for (const name of ["script-src", "connect-src", "img-src", "default-src"]) {
      expect(directive(value, name) ?? "").not.toContain("paystack");
    }
  });

  it("names every image host instead of allowing the whole web", () => {
    /*
     * `img-src` was `https:`, a wildcard over every host that speaks TLS, and
     * one thing paid for it: partner hotel photos came from whichever CDN each
     * supplier used, so the set could not be written down. There is no partner
     * stock any more, so the wildcard has nothing left holding it open.
     *
     * The wildcard is not a harmless looseness. An injected
     * `<img src="https://attacker/?q=...">` is a GET to any host on the
     * internet carrying whatever the URL was built from, and it needs no
     * script to fire.
     *
     * Both halves are asserted. The wildcard must be gone, and the map must
     * still be reachable: tightening this directive and forgetting the
     * basemaps turns the map into a grey box, and that is exactly the mistake
     * this test exists to catch.
     */
    const value = directive(policy(), "img-src") ?? "";
    expect(/(^|\s)https:(\s|$)/.test(value)).toBe(false);
    expect(value).toContain("https://basemaps.cartocdn.com");
    expect(value).toContain("https://api.maptiler.com");
    // A chosen photo is previewed from a blob before it is ever uploaded.
    expect(value).toContain("blob:");
    expect(value).toContain("data:");
  });

  it("allows the service worker and the manifest it needs", () => {
    const value = policy();
    expect(directive(value, "worker-src")).toContain("blob:");
    expect(directive(value, "manifest-src")).toBe("manifest-src 'self'");
  });

  it("permits a style attribute and forbids an injected style block", () => {
    /*
     * The two halves of `style-src` are not the same risk and no longer carry
     * the same permission.
     *
     * React writes every `style={{...}}` prop as an attribute, so the inline
     * allowance on `style-src` cannot go: on a browser with no
     * `style-src-elem`, that directive governs everything and removing it
     * leaves an unstyled product. What CAN go is the element form, and that is
     * the one worth taking: a whole injected `<style>` block can draw a fake
     * sign-in over the real page, hide the amount above a Pay button, or read
     * the document through attribute selectors. Nothing in this app writes
     * one; a production sweep of seventeen routes found zero `<style>`
     * elements, stylesheets all arrive as same-origin `<link>`s.
     *
     * Asserting the element directive rather than `style-src` is the point.
     * `style-src` still says `'unsafe-inline'` and always will, so a test that
     * read only that one would pass on a policy that had lost the split.
     */
    const value = policy();
    expect(directive(value, "style-src")).toContain("'unsafe-inline'");
    expect(directive(value, "style-src-elem")).toBe("style-src-elem 'self'");
  });

  it("names a source for video instead of letting default-src black it out", () => {
    /*
     * `listing_videos` is already joined into the listing detail read and its
     * rows point at Supabase storage. Without this directive `media-src` falls
     * back to `default-src 'self'`, so the day the walkthrough player renders
     * its `<video>`, an enforcing policy shows a black box with no server-side
     * trace. No new host is trusted: this is the set `img-src` already allows,
     * for the same buckets.
     */
    const value = directive(policy(), "media-src") ?? "";
    expect(value).toContain("'self'");
    expect(value).toContain("blob:");
    expect(/(^|\s)https:(\s|$)/.test(value)).toBe(false);
  });

  it("does not smuggle 'unsafe-eval' back in for a library feature probe", () => {
    /*
     * Zod decides whether it may compile a validator by calling
     * `new Function("")` in a try/catch, which the policy blocks and Zod
     * handles. The tempting fix was `'unsafe-eval'`, which would hand every
     * injected string a way to become code and undo the whole directive. The
     * fix that shipped is `src/instrumentation-client.ts`, which tells Zod not
     * to probe. This is the assertion that stops the tempting one coming back.
     */
    expect(directive(policy(), "script-src") ?? "").not.toContain("'unsafe-eval'");
  });
});

describe("cspEnforced", () => {
  const original = process.env.CSP_ENFORCE;
  afterEach(() => {
    if (original === undefined) delete process.env.CSP_ENFORCE;
    else process.env.CSP_ENFORCE = original;
  });

  /*
   * THE DEFAULT IS THE WHOLE TEST.
   *
   * This platform served a Content Security Policy for months and enforced
   * nothing, because the switch read `=== "true"` and nobody set it. A
   * report-only policy is indistinguishable from a correct one in every header
   * dump and every audit, and indistinguishable from no policy at all to an
   * attacker: the browser runs the injected script and then files a report
   * about having run it.
   *
   * So the accident cases all have to land on the protection. Unset, a typo,
   * a value of "TRUE", a new environment nobody remembered to configure: all
   * enforce. Only the literal "false" steps back, which is a thing somebody
   * has to write down and can be asked about.
   */
  it("enforces when nothing is set, which is the state that shipped unenforced", () => {
    delete process.env.CSP_ENFORCE;
    expect(cspEnforced()).toBe(true);
    expect(cspHeaderName()).toBe("Content-Security-Policy");
  });

  it("enforces through the typos that used to silently disable it", () => {
    for (const value of ["TRUE", "true", "1", "yes", "", "False", " false"]) {
      process.env.CSP_ENFORCE = value;
      expect(cspEnforced()).toBe(true);
    }
  });

  it("steps back to reporting only on a deliberate literal false", () => {
    process.env.CSP_ENFORCE = "false";
    expect(cspEnforced()).toBe(false);
    expect(cspHeaderName()).toBe("Content-Security-Policy-Report-Only");
  });
});
