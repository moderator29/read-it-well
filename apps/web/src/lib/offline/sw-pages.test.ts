import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * WHAT THE SERVICE WORKER KEEPS, AND WHAT IT NEVER KEEPS (8 October 2026).
 *
 * The founder: an app that shows a full-screen "no connection" card where the
 * page he had just been on should be is not how an industry app behaves. So
 * `public/sw.js` now keeps the pages a member opens, per member, and answers
 * from them when the network is down or too slow to wait for. This file runs
 * the SHIPPED worker (no copy of it) against an in-memory Cache Storage and a
 * scripted network, and pins the rules both ways:
 *
 *   kept      a stamped 200 HTML page on a keepable path, under the viewer the
 *             server named (header, or the head's stamp on Android)
 *   not kept  no stamp; a redirect; a non-200; not HTML; money, identity,
 *             sign-in, admin and API paths; a page rendered for another path;
 *             a header and a head that disagree
 *   served    offline, the kept copy, marked; slow, the kept copy after the
 *             timeout, the fresh one kept behind it and the page told; never
 *             another viewer's copy; a page never opened, the offline screen
 *   left alone POSTs, API GETs and other origins: no respondWith at all
 *   forgotten a different viewer on any document; `vallo:forget` on sign-out
 */

const SW_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public", "sw.js");
const SOURCE = readFileSync(SW_PATH, "utf8");
const ORIGIN = "https://www.vallospaces.com";
const ALICE = "a1a1a1a1a1a1a1a1";
const BOB = "b2b2b2b2b2b2b2b2";

/* ------------------------------------------------------------ the harness */

class FakeCache {
  entries = new Map<string, Response>();
  private key(input: unknown): string {
    const raw = typeof input === "string" ? input : (input as { url: string }).url;
    return new URL(raw, ORIGIN).href;
  }
  async match(input: unknown) {
    const hit = this.entries.get(this.key(input));
    return hit ? hit.clone() : undefined;
  }
  async put(input: unknown, response: Response) {
    /* The real Cache reads the body to the end before resolving. */
    const body = await response.arrayBuffer();
    this.entries.set(this.key(input), new Response(body, { status: response.status, headers: response.headers }));
  }
  async delete(input: unknown) {
    return this.entries.delete(this.key(input));
  }
  async keys() {
    return [...this.entries.keys()];
  }
  async addAll(urls: string[]) {
    for (const url of urls) this.entries.set(this.key(url), new Response(`shell ${url}`, { headers: { "content-type": "text/html" } }));
  }
}

class FakeCacheStorage {
  stores = new Map<string, FakeCache>();
  async open(name: string) {
    let cache = this.stores.get(name);
    if (!cache) {
      cache = new FakeCache();
      this.stores.set(name, cache);
    }
    return cache;
  }
  async keys() {
    return [...this.stores.keys()];
  }
  async delete(name: string) {
    return this.stores.delete(name);
  }
  async has(name: string) {
    return this.stores.has(name);
  }
  async match(input: unknown) {
    for (const cache of this.stores.values()) {
      const hit = await cache.match(input);
      if (hit) return hit;
    }
    return undefined;
  }
}

type Net = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>;

function html(viewer: string | null, options: { body?: string; status?: number; type?: string; meta?: { viewer: string; path: string } } = {}) {
  const headers: Record<string, string> = { "content-type": options.type ?? "text/html; charset=utf-8", "content-security-policy": "script-src 'nonce-abc'" };
  if (viewer) headers["x-vallo-viewer"] = viewer;
  const meta = options.meta ? `<meta name="x-vallo-viewer" content="${options.meta.viewer}" data-path="${options.meta.path}"/>` : "";
  return new Response(`<!doctype html><html><head>${meta}</head><body>${options.body ?? "page"}</body></html>`, {
    status: options.status ?? 200,
    headers,
  });
}

function load(options: { saveData?: boolean } = {}) {
  const caches = new FakeCacheStorage();
  const listeners = new Map<string, (event: unknown) => void>();
  const posted: Array<{ to: string; message: unknown }> = [];
  const fetched: Array<{ url: string; headers?: Record<string, string> }> = [];
  let network: Net = async () => {
    throw new TypeError("offline");
  };
  const self = {
    addEventListener: (type: string, fn: (event: unknown) => void) => listeners.set(type, fn),
    skipWaiting: async () => undefined,
    location: { origin: ORIGIN },
    navigator: { connection: options.saveData ? { saveData: true } : {} },
    registration: {},
    clients: {
      claim: async () => undefined,
      matchAll: async () => [{ url: `${ORIGIN}/home`, postMessage: (message: unknown) => posted.push({ to: "/home", message }) }],
    },
  };
  const fetchStub = (input: unknown, init?: { headers?: Record<string, string> }) => {
    const url = typeof input === "string" ? input : (input as { url: string }).url;
    fetched.push({ url, headers: init?.headers });
    return network(url, init);
  };
  new Function("self", "caches", "fetch", SOURCE)(self, caches, fetchStub);

  /** Dispatch a fetch event; resolves with what was answered (or null when the worker left it alone) and waits for the background work. */
  async function request(path: string, init: { mode?: string; method?: string; headers?: Record<string, string> } = {}) {
    const url = new URL(path, ORIGIN).href;
    let answered: Promise<Response> | null = null;
    const waits: Promise<unknown>[] = [];
    listeners.get("fetch")!({
      request: { url, method: init.method ?? "GET", mode: init.mode ?? "navigate", headers: new Headers(init.headers ?? {}) },
      respondWith: (p: Promise<Response>) => {
        answered = Promise.resolve(p);
      },
      waitUntil: (p: Promise<unknown>) => waits.push(Promise.resolve(p)),
    });
    /* Assigned inside the listener, which the compiler cannot see through. */
    const pending = answered as Promise<Response> | null;
    const response: Response | null = pending ? await pending : null;
    return { response, settled: () => Promise.all(waits) };
  }

  async function message(data: unknown) {
    const waits: Promise<unknown>[] = [];
    listeners.get("message")!({ data, origin: ORIGIN, waitUntil: (p: Promise<unknown>) => waits.push(Promise.resolve(p)) });
    await Promise.all(waits);
  }

  const pages = (viewer: string) => caches.stores.get(`vallo-pages-v5-${viewer}`);
  const keptPaths = (viewer: string) => [...(pages(viewer)?.entries.keys() ?? [])].map((k) => new URL(k).pathname + new URL(k).search);

  return {
    caches,
    posted,
    fetched,
    request,
    message,
    keptPaths,
    setNetwork: (fn: Net) => {
      network = fn;
    },
    /** Visit a page online, answered by `respond`, and wait for the copy to be written. */
    async visit(path: string, respond: () => Response) {
      network = async () => respond();
      const { response, settled } = await this.request(path);
      await response?.text();
      await settled();
      return response;
    },
  };
}

beforeEach(() => {
  vi.useRealTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/* ---------------------------------------------------------------- the list */

describe("which pages may be kept at all", () => {
  type Pure = { isKeepablePagePath: (p: string) => boolean; CACHE_VERSION: string };
  const pure = new Function("self", "caches", "fetch", `${SOURCE}\nreturn { isKeepablePagePath, CACHE_VERSION };`)(
    { addEventListener: () => undefined, location: { origin: ORIGIN }, navigator: {} },
    new FakeCacheStorage(),
    async () => undefined,
  ) as Pure;

  it.each(["/home", "/search", "/search?q=lekki", "/listing/abc", "/stays", "/messages", "/messages/abc", "/notifications", "/profile", "/u/amara", "/saved", "/bookings/1", "/", "/welcome"])(
    "keeps %s",
    (path) => expect(pure.isKeepablePagePath(path.split("?")[0]!)).toBe(true),
  );

  it.each([
    "/api/push/register",
    "/api/webhooks/paystack",
    "/wallet",
    "/wallet/withdraw",
    "/checkout/b1",
    "/pay/crypto/r1",
    "/payments",
    "/payouts",
    "/refunds",
    "/receipts",
    "/rent/pay/1",
    "/admin",
    "/agent/dashboard",
    "/host/earnings",
    "/auth/callback",
    "/sign-in",
    "/sign-up/email",
    "/forgot-password",
    "/reset-password",
    "/settings/passcode",
    "/settings/devices",
    "/verification",
    "/calls/abc",
    "/open",
    "/offline",
    "/s/token",
    "/_next/static/chunks/a.js",
  ])("never keeps %s", (path) => expect(pure.isKeepablePagePath(path)).toBe(false));

  it("was bumped, so the activate step clears caches the old worker wrote", () => {
    expect(pure.CACHE_VERSION).toBe("v5");
  });
});

/* -------------------------------------------------------------- keeping */

describe("keeping a page", () => {
  it("keeps a stamped page under the viewer the server named, with its policy and without its encoding", async () => {
    const sw = load();
    const response = await sw.visit("/home", () => {
      const r = html(ALICE, { body: "alice home" });
      r.headers.set("content-encoding", "br");
      return r;
    });
    expect(response?.status).toBe(200);
    expect(sw.keptPaths(ALICE)).toEqual(["/home"]);
    const kept = await sw.caches.stores.get(`vallo-pages-v5-${ALICE}`)!.match(`${ORIGIN}/home`);
    expect(await kept!.text()).toContain("alice home");
    expect(kept!.headers.get("content-security-policy")).toBe("script-src 'nonce-abc'");
    expect(kept!.headers.get("content-encoding")).toBeNull();
  });

  it("keeps nothing without the server's stamp", async () => {
    const sw = load();
    await sw.visit("/home", () => html(null));
    expect([...sw.caches.stores.keys()].filter((n) => n.startsWith("vallo-pages-"))).toEqual([]);
  });

  it("keeps nothing that is not a plain 200 HTML page", async () => {
    const sw = load();
    await sw.visit("/home", () => html(ALICE, { status: 404 }));
    await sw.visit("/search", () => html(ALICE, { status: 500 }));
    await sw.visit("/profile", () => html(ALICE, { type: "application/json" }));
    expect(sw.keptPaths(ALICE)).toEqual([]);
  });

  it("never keeps a money, identity or sign-in page, even stamped", async () => {
    const sw = load();
    for (const path of ["/wallet", "/checkout/b1", "/payments", "/sign-in", "/settings/passcode", "/admin", "/api/me"]) {
      await sw.visit(path, () => html(ALICE));
    }
    expect(sw.keptPaths(ALICE)).toEqual([]);
  });

  it("keeps a page the Android shell fetched, from the head's stamp, when the path matches", async () => {
    const sw = load();
    await sw.visit("/home", () => html(null, { meta: { viewer: ALICE, path: "/home" } }));
    expect(sw.keptPaths(ALICE)).toEqual(["/home"]);
  });

  it("refuses a page rendered for another address (a redirect followed out of sight)", async () => {
    const sw = load();
    await sw.visit("/listing/abc", () => html(null, { meta: { viewer: ALICE, path: "/sign-in" } }));
    expect(sw.keptPaths(ALICE)).toEqual([]);
  });

  it("refuses a page whose header and head disagree about whose it is", async () => {
    const sw = load();
    await sw.visit("/home", () => html(ALICE, { meta: { viewer: BOB, path: "/home" } }));
    expect(sw.keptPaths(ALICE)).toEqual([]);
    expect(sw.keptPaths(BOB)).toEqual([]);
  });
});

/* ------------------------------------------------------------- answering */

describe("answering a navigation", () => {
  it("offline, opens the page this viewer already saw, marked as kept", async () => {
    const sw = load();
    await sw.visit("/messages", () => html(ALICE, { body: "the inbox as it was" }));
    sw.setNetwork(async () => {
      throw new TypeError("offline");
    });
    const { response } = await sw.request("/messages");
    expect(await response!.text()).toContain("the inbox as it was");
    expect(response!.headers.get("server-timing")).toMatch(/vallo-kept/);
  });

  it("offline, a page never opened here gets the small offline screen", async () => {
    const sw = load();
    await sw.caches.open("vallo-shell-v5").then((c) => c.addAll(["/offline"]));
    await sw.visit("/home", () => html(ALICE));
    sw.setNetwork(async () => {
      throw new TypeError("offline");
    });
    const { response } = await sw.request("/listing/never-opened");
    expect(await response!.text()).toBe("shell /offline");
  });

  it("offline, a money page is never answered from a copy", async () => {
    const sw = load();
    await sw.caches.open("vallo-shell-v5").then((c) => c.addAll(["/offline"]));
    await sw.visit("/wallet", () => html(ALICE, { body: "balance 5,000" }));
    sw.setNetwork(async () => {
      throw new TypeError("offline");
    });
    const { response } = await sw.request("/wallet");
    expect(await response!.text()).not.toContain("balance");
  });

  it("offline, the shell's start opens the viewer's kept home", async () => {
    const sw = load();
    await sw.visit("/home", () => html(ALICE, { body: "alice home" }));
    sw.setNetwork(async () => {
      throw new TypeError("offline");
    });
    const { response } = await sw.request("/open");
    expect(await response!.text()).toContain("alice home");
  });

  it("online, the network answers and the copy is refreshed", async () => {
    const sw = load();
    await sw.visit("/home", () => html(ALICE, { body: "old" }));
    sw.setNetwork(async () => html(ALICE, { body: "new" }));
    const { response, settled } = await sw.request("/home");
    expect(await response!.text()).toContain("new");
    expect(response!.headers.get("server-timing")).toBeNull();
    await settled();
    const kept = await sw.caches.stores.get(`vallo-pages-v5-${ALICE}`)!.match(`${ORIGIN}/home`);
    expect(await kept!.text()).toContain("new");
  });

  it("slow, the kept copy answers after the timeout, the fresh one is kept behind it, and the page is told", async () => {
    const sw = load();
    await sw.visit("/home", () => html(ALICE, { body: "old" }));
    vi.useFakeTimers();
    let release: (r: Response) => void = () => undefined;
    sw.setNetwork(() => new Promise<Response>((resolve) => (release = resolve)));
    const pending = sw.request("/home");
    await vi.advanceTimersByTimeAsync(3_100);
    const { response, settled } = await pending;
    expect(await response!.text()).toContain("old");
    expect(response!.headers.get("server-timing")).toMatch(/vallo-kept/);
    vi.useRealTimers();
    release(html(ALICE, { body: "fresh" }));
    await settled();
    const kept = await sw.caches.stores.get(`vallo-pages-v5-${ALICE}`)!.match(`${ORIGIN}/home`);
    expect(await kept!.text()).toContain("fresh");
    expect(sw.posted).toContainEqual({ to: "/home", message: { type: "vallo:page-fresh", path: "/home" } });
  });

  it("with nothing kept, waits for the network however slow, rather than showing the offline screen", async () => {
    const sw = load();
    vi.useFakeTimers();
    let release: (r: Response) => void = () => undefined;
    sw.setNetwork(() => new Promise<Response>((resolve) => (release = resolve)));
    const pending = sw.request("/search");
    await vi.advanceTimersByTimeAsync(10_000);
    release(html(ALICE, { body: "results" }));
    vi.useRealTimers();
    const { response } = await pending;
    expect(await response!.text()).toContain("results");
  });
});

/* ----------------------------------------------------------- whose pages */

describe("one viewer's pages are never another's", () => {
  it("a document naming a different viewer deletes the previous viewer's pages before anything else", async () => {
    const sw = load();
    await sw.visit("/messages", () => html(ALICE, { body: "alice's inbox" }));
    expect(sw.keptPaths(ALICE)).toEqual(["/messages"]);
    /* Bob signs in on the same phone: even a page that is never kept says whose it is. */
    await sw.visit("/sign-in", () => html(BOB));
    expect(sw.caches.stores.has(`vallo-pages-v5-${ALICE}`)).toBe(false);
    sw.setNetwork(async () => {
      throw new TypeError("offline");
    });
    const { response } = await sw.request("/messages");
    expect(await response!.text()).not.toContain("alice");
  });

  it("signing out forgets every kept page", async () => {
    const sw = load();
    await sw.visit("/home", () => html(ALICE));
    await sw.visit("/profile", () => html(ALICE));
    await sw.message({ type: "vallo:forget" });
    expect([...sw.caches.stores.keys()].filter((n) => n.startsWith("vallo-pages-"))).toEqual([]);
  });
});

/* -------------------------------------------------------- left alone */

describe("what the worker never touches", () => {
  it("leaves POSTs, server actions and webhooks to the network", async () => {
    const sw = load();
    expect((await sw.request("/messages/abc", { method: "POST", mode: "cors", headers: { "next-action": "x" } })).response).toBeNull();
    expect((await sw.request("/api/webhooks/paystack", { method: "POST", mode: "cors" })).response).toBeNull();
  });

  it("leaves API GETs alone: no cache, no stale answer", async () => {
    const sw = load();
    expect((await sw.request("/api/me", { mode: "cors" })).response).toBeNull();
    expect((await sw.request("/api/wallet/balance", { mode: "cors" })).response).toBeNull();
  });

  it("leaves another origin alone", async () => {
    const sw = load();
    expect((await sw.request("https://images.unsplash.com/photo.jpg", { mode: "no-cors" })).response).toBeNull();
    expect((await sw.request("https://x.supabase.co/rest/v1/listings", { mode: "cors" })).response).toBeNull();
  });
});

/* ------------------------------------------------------------ photographs */

describe("listing photographs", () => {
  it("are kept the first time and answered from the phone after that, offline included", async () => {
    const sw = load();
    let hits = 0;
    sw.setNetwork(async () => {
      hits += 1;
      return new Response("avif-bytes", { headers: { "content-type": "image/avif" } });
    });
    const path = "/_next/image?url=https%3A%2F%2Fx.supabase.co%2Fp.jpg&w=384&q=60";
    const first = await sw.request(path, { mode: "no-cors" });
    expect(await first.response!.text()).toBe("avif-bytes");
    await new Promise((r) => setTimeout(r, 10));
    sw.setNetwork(async () => {
      throw new TypeError("offline");
    });
    const second = await sw.request(path, { mode: "no-cors" });
    expect(await second.response!.text()).toBe("avif-bytes");
    expect(hits).toBe(1);
  });

  it("refuses a personal image response", async () => {
    const sw = load();
    sw.setNetwork(async () => new Response("x", { headers: { "content-type": "image/png", "cache-control": "private" } }));
    const path = "/_next/image?url=%2Fa.png&w=384&q=60";
    await sw.request(path, { mode: "no-cors" });
    await new Promise((r) => setTimeout(r, 10));
    expect(sw.caches.stores.get("vallo-images-v5")?.entries.size ?? 0).toBe(0);
  });
});

/* ------------------------------------------------------------- warming */

describe("pages opened inside the app", () => {
  it("are fetched once as a document, marked as a warm, and kept", async () => {
    const sw = load();
    sw.setNetwork(async () => html(ALICE, { body: "search" }));
    await sw.message({ type: "vallo:visited", path: "/search?q=lekki" });
    expect(sw.fetched.at(-1)?.headers?.["x-vallo-warm"]).toBe("1");
    expect(sw.keptPaths(ALICE)).toEqual(["/search?q=lekki"]);
    /* A second announcement inside the window does not fetch again. */
    const before = sw.fetched.length;
    await sw.message({ type: "vallo:visited", path: "/search?q=lekki" });
    expect(sw.fetched.length).toBe(before);
  });

  it("are never fetched for a never-kept path, another origin, or under Save-Data", async () => {
    const sw = load();
    sw.setNetwork(async () => html(ALICE));
    await sw.message({ type: "vallo:visited", path: "/wallet" });
    await sw.message({ type: "vallo:visited", path: "https://evil.example/home" });
    await sw.message({ type: "vallo:visited", path: "//evil.example/home" });
    expect(sw.fetched).toEqual([]);

    const frugal = load({ saveData: true });
    frugal.setNetwork(async () => html(ALICE));
    await frugal.message({ type: "vallo:visited", path: "/home" });
    expect(frugal.fetched).toEqual([]);
  });
});
