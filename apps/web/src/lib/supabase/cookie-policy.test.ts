import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_COOKIE_OPTIONS } from "@supabase/ssr";
import { AUTH_COOKIE_MAX_AGE_SECONDS, browserCookieMethods, withAuthCookiePolicy } from "./cookie-policy";

/**
 * SEC-07: the session cookies are Secure on HTTPS and live 30 days, sliding,
 * not 400. The library's own defaults are the "before": it writes 400 days
 * and no Secure even when handed cookieOptions, which is why the policy is
 * applied where the cookie is written.
 */
describe("the auth cookie policy", () => {
  it("starts from a library default that is the problem (the before)", () => {
    expect(DEFAULT_COOKIE_OPTIONS.maxAge).toBe(400 * 24 * 60 * 60);
    expect(DEFAULT_COOKIE_OPTIONS.secure).not.toBe(true);
  });

  it("caps the lifetime at 30 days, adds Secure, keeps a removal a removal", () => {
    expect(withAuthCookiePolicy({ maxAge: 400 * 86_400, sameSite: "lax", path: "/" }, true)).toMatchObject({
      maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    expect(withAuthCookiePolicy({ maxAge: 0 }, true).maxAge).toBe(0);
    expect(withAuthCookiePolicy(undefined, false).secure).toBe(false);
  });

  it("is applied by every writer of the session cookies: server client, proxy, browser client", () => {
    const src = (p: string) => readFileSync(join(__dirname, p), "utf8");
    for (const file of ["server.ts", "../../proxy.ts"]) {
      const writes = [...src(file).matchAll(/\b(?:cookieStore|response\.cookies)\.set\(([^;]*)\);/g)].map((m) => m[1] ?? "");
      expect(writes.length, file).toBeGreaterThan(0);
      for (const w of writes) expect(w, file).toContain("withAuthCookiePolicy(");
    }
    expect(src("client.ts")).toMatch(/cookies:\s*browserCookieMethods\(\)/);
  });

  it("writes Secure and 30 days from the browser on https, and reads back what it wrote", () => {
    const doc = { cookie: "" };
    const jar = browserCookieMethods(() => ({ doc, https: true }));
    jar.setAll([{ name: "sb-x-auth-token", value: "v", options: { ...DEFAULT_COOKIE_OPTIONS } }]);
    expect(doc.cookie).toContain("Secure");
    expect(doc.cookie).toContain(`Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}`);
    expect(doc.cookie).not.toContain(`Max-Age=${400 * 86_400}`);
    expect(jar.getAll()[0]).toMatchObject({ name: "sb-x-auth-token", value: "v" });
  });

  it("leaves Secure off on a plain-http development page", () => {
    const doc = { cookie: "" };
    browserCookieMethods(() => ({ doc, https: false })).setAll([
      { name: "a", value: "b", options: { ...DEFAULT_COOKIE_OPTIONS } },
    ]);
    expect(doc.cookie).not.toContain("Secure");
  });
});
