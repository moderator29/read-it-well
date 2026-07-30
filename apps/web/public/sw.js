/*
 * RentMe service worker. Hand written, no library, deliberately small.
 *
 * The audience is Nigerian and frequently on a mid-range Android over 3G with
 * a metered data bundle, so this worker has two jobs and no others:
 *
 *   1. Keep a tiny offline shell so a dropped connection shows a designed
 *      screen instead of the browser's dinosaur.
 *   2. Stop the phone paying twice for bytes that never change (the hashed
 *      Next build output and the brand artwork).
 *
 * What it must never do is answer a question about money, messages or
 * identity from a cache. A stale balance or a stale conversation is worse
 * than no answer at all, so:
 *
 *   - No HTML document is ever written to a cache. Navigations are always
 *     network first, and the only cached document is the static /offline
 *     page precached at install. There is therefore no code path by which a
 *     page of personal data can be served from disk.
 *   - Runtime caching is an allowlist (hashed build output plus brand and
 *     icon images), not a blocklist, so a new authenticated route added
 *     later is excluded by default rather than by remembering to exclude it.
 *   - On top of that allowlist there is an explicit blocklist of first path
 *     segments: api, admin, agent, wallet, messages, notifications, auth.
 *   - Any response carrying Authorization, Set-Cookie, Vary: Cookie, or a
 *     no-store / private cache directive is passed through untouched.
 *
 * Save-Data is respected: when the hint is present the asset cache is not
 * populated at all, because filling a cache is itself paid-for traffic the
 * user has asked us to economise on.
 *
 * Bump CACHE_VERSION on any change to this file. The activate step deletes
 * every cache that is not in the current set, so a deploy can never leave a
 * user on last week's shell.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `rentme-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `rentme-assets-${CACHE_VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE];

const OFFLINE_URL = "/offline";

/*
 * The whole offline shell. Three entries, roughly 30 kB in total: the offline
 * document, the small brand icon it renders, and the manifest so an installed
 * app still knows its own name and colours with no network.
 */
const SHELL_ASSETS = [OFFLINE_URL, "/pwa/icon-192.png", "/manifest.webmanifest"];

/* First path segment is enough to name a surface that must never be cached. */
const NEVER_CACHE_SEGMENTS = new Set([
  "api",
  "admin",
  "agent",
  "wallet",
  "messages",
  "notifications",
  "auth",
]);

/* Prefixes whose bytes are immutable or effectively so, and therefore worth keeping. */
const CACHEABLE_ASSET_PREFIXES = ["/_next/static/", "/brand/", "/icons/", "/pwa/"];

/* A single pathological entry must not swallow the origin's storage quota. */
const MAX_CACHEABLE_BYTES = 5 * 1024 * 1024;

/* ------------------------------------------------------------------ helpers */

function firstSegment(pathname) {
  const parts = pathname.split("/");
  return parts.length > 1 ? parts[1] : "";
}

function isForbiddenPath(pathname) {
  return NEVER_CACHE_SEGMENTS.has(firstSegment(pathname));
}

function isCacheableAssetPath(pathname) {
  if (isForbiddenPath(pathname)) return false;
  return CACHEABLE_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/*
 * The Save-Data hint. The header is checked first because that is the literal
 * signal on the request; navigator.connection is the fallback because a
 * browser-added header is not always visible to a worker.
 */
function saveDataRequested(request) {
  try {
    if (request.headers.get("save-data")) return true;
  } catch {
    /* Header access can throw on an opaque request. Fall through. */
  }
  const connection = self.navigator && self.navigator.connection;
  return Boolean(connection && connection.saveData);
}

/*
 * Whether a response may be written to disk. Deliberately conservative: any
 * hint that this body was personalised, or that the server asked for it not
 * to be stored, is a refusal.
 */
function isStorableResponse(response) {
  if (!response || !response.ok || response.status !== 200) return false;
  if (response.type !== "basic" && response.type !== "default") return false;

  const headers = response.headers;
  // Set-Cookie is normally filtered out of a Response's headers, so this is a
  // belt-and-braces check rather than the primary defence. Vary: Cookie is the
  // signal that actually survives, and it means the body is per-session.
  if (headers.get("set-cookie")) return false;
  if (headers.get("authorization")) return false;
  const vary = (headers.get("vary") || "").toLowerCase();
  if (vary.includes("cookie") || vary === "*") return false;
  const control = (headers.get("cache-control") || "").toLowerCase();
  if (control.includes("no-store") || control.includes("private")) return false;

  const length = Number(headers.get("content-length") || "0");
  if (length > MAX_CACHEABLE_BYTES) return false;

  return true;
}

function carriesCredentials(request) {
  try {
    return Boolean(request.headers.get("authorization"));
  } catch {
    return false;
  }
}

/*
 * The offline document's stylesheet is a hashed Next chunk whose name this
 * file cannot know, so it is discovered by reading the precached HTML once at
 * install time. Without this the offline page would render as unstyled markup
 * for a visitor whose first ever action after installing is losing signal.
 */
async function precacheOfflineStyles(cache) {
  try {
    const response = await cache.match(OFFLINE_URL);
    if (!response) return;
    const html = await response.clone().text();
    const hrefs = new Set();
    const pattern = /href="(\/_next\/static\/[^"]+\.css)"/g;
    let match = pattern.exec(html);
    while (match !== null) {
      hrefs.add(match[1]);
      match = pattern.exec(html);
    }
    if (hrefs.size > 0) {
      await cache.addAll(Array.from(hrefs));
    }
  } catch {
    /* A missing stylesheet costs styling, never correctness. */
  }
}

/* ------------------------------------------------------------------ install */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(SHELL_CACHE);
        await cache.addAll(SHELL_ASSETS);
        await precacheOfflineStyles(cache);
      } catch {
        /*
         * A failed precache must not wedge the install. The worker simply has
         * no offline shell this time round and will try again on the next
         * version.
         */
      }
      await self.skipWaiting();
    })(),
  );
});

/* ----------------------------------------------------------------- activate */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("rentme-") && !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/* -------------------------------------------------------------------- fetch */

/*
 * Navigations: network first, always. Nothing is written to a cache here, so
 * a page can never be answered from disk. When the network fails, the
 * precached offline document stands in.
 */
async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(OFFLINE_URL);
    if (cached) return cached;
    return new Response(
      "You are offline. Reconnect and try again.",
      {
        status: 503,
        statusText: "Offline",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      },
    );
  }
}

/*
 * Static assets: stale while revalidate. The cached copy answers immediately,
 * a background fetch refreshes it for next time. Under Save-Data the cache is
 * read but never written, so the user pays for exactly what they asked for.
 */
async function handleAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const allowWrite = !saveDataRequested(request);

  const network = fetch(request)
    .then((response) => {
      if (allowWrite && isStorableResponse(response)) {
        cache.put(request, response.clone()).catch(() => {
          /* Quota or a rejected key. Not worth failing the request over. */
        });
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) return cached;

  const fresh = await network;
  if (fresh) return fresh;
  return new Response("", { status: 504, statusText: "Offline" });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only plain GETs are ours. Anything that mutates state goes straight out.
  if (request.method !== "GET") return;
  if (carriesCredentials(request)) return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Same origin only. Third-party bytes are not ours to store.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isCacheableAssetPath(url.pathname) && url.search === "") {
    event.respondWith(handleAsset(request));
    return;
  }

  // Everything else, including every API and authenticated data response, is
  // left entirely alone: no interception, no cache, no stale answer.
});
