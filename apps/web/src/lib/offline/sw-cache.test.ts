import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * V-78 / V-35: the service worker's asset cache key and the offline page's
 * precache list, read from the SHIPPED `public/sw.js` and run, not
 * re-implemented. The two functions are pure; the worker is evaluated against
 * an inert `self` and asked to hand them back.
 */
const SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public", "sw.js"),
  "utf8",
);

type Pure = {
  notificationFromPayload: (raw: unknown) => {
    options: { actions: { action: string; title: string }[]; data: { href: string; actionHrefs: Record<string, string> } };
  };
  assetCacheKey: (url: URL) => string | null;
  offlineAssetUrls: (html: string) => string[];
  CACHE_VERSION: string;
};

function load(): Pure {
  const self = { addEventListener: () => undefined, location: { origin: "https://www.vallospaces.com" } };
  const run = new Function("self", `${SOURCE}\nreturn { assetCacheKey, offlineAssetUrls, CACHE_VERSION, notificationFromPayload };`);
  return run(self) as Pure;
}

const sw = load();
const u = (s: string) => new URL(s, "https://www.vallospaces.com");

describe("assetCacheKey", () => {
  it("drops the deployment id, so a deploy does not re-download unchanged chunks", () => {
    const a = sw.assetCacheKey(u("/_next/static/chunks/11-v4cdswovuj.js?dpl=dpl_AAA"));
    const b = sw.assetCacheKey(u("/_next/static/chunks/11-v4cdswovuj.js?dpl=dpl_BBB"));
    expect(a).toBe("https://www.vallospaces.com/_next/static/chunks/11-v4cdswovuj.js");
    expect(b).toBe(a);
  });
  it("keys a query-less asset by its path", () => {
    expect(sw.assetCacheKey(u("/brand/mark.svg"))).toBe("https://www.vallospaces.com/brand/mark.svg");
  });
  it("refuses any other query parameter, which might change the bytes", () => {
    expect(sw.assetCacheKey(u("/_next/static/chunks/a.js?v=2"))).toBeNull();
    expect(sw.assetCacheKey(u("/_next/static/chunks/a.js?dpl=x&w=640"))).toBeNull();
  });
});

describe("offlineAssetUrls", () => {
  it("finds the offline page's stylesheets and scripts, with or without a deployment id", () => {
    const html = `<link rel="stylesheet" href="/_next/static/css/app.css?dpl=dpl_1"/>
      <script src="/_next/static/chunks/main.js?dpl=dpl_1&amp;x=1" async></script>
      <script src="/_next/static/chunks/page.js"></script>
      <img src="/pwa/icon-192.png"/>`;
    expect(sw.offlineAssetUrls(html)).toEqual([
      "/_next/static/css/app.css?dpl=dpl_1",
      "/_next/static/chunks/main.js?dpl=dpl_1&x=1",
      "/_next/static/chunks/page.js",
    ]);
  });
  it("finds nothing in a page with no Next assets", () => {
    expect(sw.offlineAssetUrls("<p>offline</p>")).toEqual([]);
  });
});

describe("the version", () => {
  it("was bumped, so the activate step clears the caches keyed the old way", () => {
    expect(sw.CACHE_VERSION).toBe("v4");
  });
});

describe("notification buttons (V-53)", () => {
  it("draws up to two buttons, each routed to its own path", () => {
    const shown = sw.notificationFromPayload({
      title: "New message",
      href: "/messages/abc",
      actions: [
        { id: "reply", title: "Reply", href: "/messages/abc" },
        { id: "answer", title: "Answer the request", href: "/agent/inspections" },
        { id: "open-booking", title: "Open the booking", href: "/bookings/1" },
      ],
    });
    expect(shown.options.actions.map((a) => a.action)).toEqual(["reply", "answer"]);
    expect(shown.options.data.actionHrefs.answer).toBe("/agent/inspections");
  });
  it("refuses a button that would leave the origin, or has no title", () => {
    const shown = sw.notificationFromPayload({
      title: "x",
      actions: [
        { id: "reply", title: "Reply", href: "https://evil.example/x" },
        { id: "reply", title: "Reply", href: "//evil.example" },
        { id: "answer", title: "", href: "/agent/inspections" },
        "nonsense",
      ],
    });
    expect(shown.options.actions).toEqual([]);
  });
  it("carries no buttons when the sender sent none", () => {
    expect(sw.notificationFromPayload({ title: "x" }).options.actions).toEqual([]);
  });
});
