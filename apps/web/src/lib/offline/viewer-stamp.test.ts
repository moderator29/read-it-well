import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { ANON_VIEWER, VIEWER_HEADER, VIEWER_PATH_HEADER, VIEWER_PATTERN, viewerMeta, viewerStamp, wantsViewerStamp } from "./viewer-stamp";

/*
 * WHOSE PAGE THIS IS (8 October 2026). The service worker keeps a page only
 * under the viewer the SERVER names; these pin how the server names one, and
 * that nothing a client sends can name one for it.
 */

describe("the stamp", () => {
  it("is anon for nobody, and an opaque 16-hex digest for an account", async () => {
    expect(await viewerStamp(null)).toBe(ANON_VIEWER);
    const a = await viewerStamp("4f9c1c36-0000-4000-8000-000000000001");
    const b = await viewerStamp("4f9c1c36-0000-4000-8000-000000000002");
    expect(a).toMatch(/^[a-f0-9]{16}$/);
    expect(a).not.toBe(b);
    expect(await viewerStamp("4f9c1c36-0000-4000-8000-000000000001")).toBe(a);
    /* It is not the id, nor a plain digest of it. */
    expect(a).not.toContain("4f9c1c36");
    expect(VIEWER_PATTERN.test(a)).toBe(true);
  });

  it("goes only on a page load or the worker's warm, never on an RSC fetch, a prefetch or a write", () => {
    const req = (method: string, headers: Record<string, string>) => ({ method, headers: new Headers(headers) });
    expect(wantsViewerStamp(req("GET", { "sec-fetch-dest": "document" }))).toBe(true);
    expect(wantsViewerStamp(req("GET", {}))).toBe(true);
    expect(wantsViewerStamp(req("GET", { "sec-fetch-dest": "empty", "x-vallo-warm": "1" }))).toBe(true);
    expect(wantsViewerStamp(req("GET", { rsc: "1" }))).toBe(false);
    expect(wantsViewerStamp(req("GET", { "next-router-prefetch": "1" }))).toBe(false);
    expect(wantsViewerStamp(req("GET", { "sec-fetch-dest": "empty" }))).toBe(false);
    expect(wantsViewerStamp(req("POST", { "sec-fetch-dest": "document", "next-action": "x" }))).toBe(false);
  });

  it("is drawn into the head only as a well-formed viewer and a plain path", () => {
    const h = (v: string, p: string) => new Headers({ [VIEWER_HEADER]: v, [VIEWER_PATH_HEADER]: p });
    expect(viewerMeta(h("anon", "/home"))).toEqual({ viewer: "anon", path: "/home" });
    expect(viewerMeta(h("not a stamp", "/home"))).toBeNull();
    expect(viewerMeta(h("anon", "/home\"><script>"))).toBeNull();
    expect(viewerMeta(h("anon", "https://evil.example/"))).toBeNull();
    expect(viewerMeta(new Headers())).toBeNull();
  });
});

describe("the proxy stamps the page it forwards", () => {
  /* This suite runs with no Supabase configured, which is the pass-through
     exit: everybody is a signed-out reader there. */
  it("stamps a document load on the response and into the render", async () => {
    const response = await proxy(new NextRequest("http://localhost/home", { headers: { "sec-fetch-dest": "document" } }));
    expect(response.headers.get(VIEWER_HEADER)).toBe(ANON_VIEWER);
    const overridden = (response.headers.get("x-middleware-override-headers") ?? "").split(",").map((n) => n.trim());
    expect(overridden).toContain(VIEWER_HEADER);
    expect(response.headers.get(`x-middleware-request-${VIEWER_HEADER}`)).toBe(ANON_VIEWER);
    expect(response.headers.get(`x-middleware-request-${VIEWER_PATH_HEADER}`)).toBe("/home");
  });

  it("does not stamp an RSC fetch", async () => {
    const response = await proxy(new NextRequest("http://localhost/home?_rsc=1", { headers: { rsc: "1" } }));
    expect(response.headers.get(VIEWER_HEADER)).toBeNull();
  });

  it("never forwards a stamp the client sent", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/home?_rsc=1", {
        headers: { rsc: "1", [VIEWER_HEADER]: "b2b2b2b2b2b2b2b2", [VIEWER_PATH_HEADER]: "/home" },
      }),
    );
    expect(response.headers.get(`x-middleware-request-${VIEWER_HEADER}`)).toBeNull();
    expect(response.headers.get(VIEWER_HEADER)).toBeNull();
  });
});
