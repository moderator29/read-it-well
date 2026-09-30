/*
 * Vallo service worker. Hand written, no library, deliberately small.
 *
 * The audience is Nigerian and frequently on a mid-range Android over 3G with
 * a metered data bundle, so this worker has three jobs and no others:
 *
 *   1. Keep a tiny offline shell so a dropped connection shows a designed
 *      screen instead of the browser's dinosaur.
 *   2. Stop the phone paying twice for bytes that never change (the hashed
 *      Next build output and the brand artwork).
 *   3. Turn a push into a notification, and a tap on that notification into
 *      the right screen. See THE PUSH HALF at the foot of this file.
 *
 * THE PUSH HANDLERS LIVE HERE AND NOT IN A SECOND WORKER, and that is a
 * correctness decision rather than a tidiness one. TWO REGISTRATIONS AT THE
 * SAME SCOPE ARE NOT TWO WORKERS, THEY ARE ONE WORKER REPLACING THE OTHER, so
 * a push worker registered at `/` would have silently uninstalled the offline
 * shell above. The previous arrangement dodged that by serving a second
 * worker from `/api/push/sw` at the narrower scope `/api/push/`, where it
 * could not displace anything. It cost one thing and the cost was the whole
 * point of a notification: `clients.matchAll()` only returns pages inside the
 * scope, so a tap could not see an already-open Vallo tab and opened a second
 * one. One worker at `/` sees every tab, so a tap lands in the tab the person
 * already has.
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

/* Bumped to v2 when the push handlers moved in from `/api/push/sw`.
   Bumped to v3 (V-35, V-78) when the offline page began carrying the gate
   code and its script chunks were precached, and when the asset cache key
   stopped including the deployment id. v4 (V-53) when notifications gained
   buttons. */
const CACHE_VERSION = "v4";
const SHELL_CACHE = `vallo-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `vallo-assets-${CACHE_VERSION}`;
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
 * THE ASSET CACHE KEY, WITHOUT THE DEPLOYMENT ID. V-78.
 *
 * On Vercel every `/_next/static/` URL carries `?dpl=<deployment id>` for
 * skew protection. The fetch handler used to cache only URLs with an empty
 * query string, so on production it cached NOTHING: every chunk carries the
 * query. And had it cached them with the query, each deploy would change every
 * key, and a returning person would re-download about 450 KB of JavaScript
 * whose bytes had not changed (fifty deploys reached main on 23 September).
 *
 * The chunk's file name is a hash of its content, so the query adds nothing
 * to identity: the key is the path, with `dpl` dropped. Any OTHER query
 * parameter still refuses the cache, because an unknown parameter might
 * change the bytes.
 */
function assetCacheKey(url) {
  const params = new URLSearchParams(url.search);
  params.delete("dpl");
  if (Array.from(params.keys()).length > 0) return null;
  return url.origin + url.pathname;
}

/*
 * The offline document's stylesheet and scripts are hashed Next chunks whose
 * names this file cannot know, so they are discovered by reading the
 * precached HTML once at install time. Without the stylesheet the offline page
 * renders as unstyled markup; without the scripts (V-35) the gate code on it
 * cannot run, and the gate is exactly where there is no signal.
 *
 * A KNOWN LIMIT. The precached page carries the server-action ids of the
 * deploy that installed this worker. After a later deploy those ids are stale,
 * so the offline page never calls a server action: it only reads IndexedDB,
 * and queued check-ins are handed over from live pages (`GateHandshake`
 * with `live`), which always carry current ids.
 */
function offlineAssetUrls(html) {
  const found = new Set();
  const pattern = /(?:href|src)="(\/_next\/static\/[^"]+\.(?:css|js)(?:\?[^"]*)?)"/g;
  let match = pattern.exec(html);
  while (match !== null) {
    found.add(match[1].replace(/&amp;/g, "&"));
    match = pattern.exec(html);
  }
  return Array.from(found);
}

async function precacheOfflineAssets(shell) {
  try {
    const response = await shell.match(OFFLINE_URL);
    if (!response) return;
    const html = await response.clone().text();
    const assets = await caches.open(ASSET_CACHE);
    await Promise.all(
      offlineAssetUrls(html).map(async (path) => {
        try {
          const url = new URL(path, self.location.origin);
          const key = assetCacheKey(url);
          if (!key) return;
          const fetched = await fetch(url.href);
          if (isStorableResponse(fetched)) await assets.put(key, fetched);
        } catch {
          /* One missing chunk costs that chunk, never the install. */
        }
      }),
    );
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
        await precacheOfflineAssets(cache);
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
          .filter((name) => name.startsWith("vallo-") && !CURRENT_CACHES.includes(name))
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
async function handleAsset(request, key) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(key);
  const allowWrite = !saveDataRequested(request);

  const network = fetch(request)
    .then((response) => {
      if (allowWrite && isStorableResponse(response)) {
        cache.put(key, response.clone()).catch(() => {
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

  if (isCacheableAssetPath(url.pathname)) {
    const key = assetCacheKey(url);
    if (key) {
      event.respondWith(handleAsset(request, key));
      return;
    }
  }

  // Everything else, including every API and authenticated data response, is
  // left entirely alone: no interception, no cache, no stale answer.
});

/* =========================================================================
 *                              THE PUSH HALF
 * =========================================================================
 *
 * WITHOUT THIS, WEB PUSH DOES NOTHING VISIBLE. A push arrives at a service
 * worker and a service worker has to CHOOSE to display it. A browser that
 * receives a push its worker does not show may put up its own "this site has
 * been updated in the background" notice instead, which is worse than a plain
 * one of ours. So every branch below ends in `showNotification`, including
 * the branches where the payload could not be read at all.
 *
 * NOTHING HERE TOUCHES THE CACHE AND NOTHING ABOVE TOUCHES A NOTIFICATION.
 * The two halves share this file and nothing else, which is what makes it
 * safe for them to share a registration.
 *
 * WHAT THE SERVER SENDS. `lib/push/transport/webpush.ts` encrypts exactly
 * this object and nothing else:
 *
 *     { title, body, href, tag, urgent }
 *
 * Every field is re-checked here. The sender already refuses an off-origin
 * href; this refuses it again, because a notification is a place a tap leaves
 * the application from and it is not a place to take a sender's word for a
 * destination. A push service cannot read the ciphertext, but a compromised
 * application server could, and the second check costs four lines.
 */

/* The only icon this file names. It is in SHELL_ASSETS above, so it is
   already on disk and a notification has an icon with no network at all. A
   notification with no icon falls back to the browser's own mark, which on
   Android is a grey circle nobody recognises.

   THERE IS DELIBERATELY NO `badge`. Android draws the badge as a flat
   monochrome silhouette in the status bar, and there is no monochrome Vallo
   mark in `public/`. Pointing at one that does not exist looks like care and
   behaves exactly like omitting it, so it is omitted and the missing asset is
   recorded in `docs/push/FIRST_NOTIFICATION.md` instead. */
const PUSH_ICON = "/pwa/icon-192.png";

/* Where a tap goes when the payload names nowhere. Always a truthful
   destination: the list holds every notification the person has. */
const PUSH_FALLBACK_HREF = "/notifications";

/*
 * ON-DEVICE COLLAPSING, WHICH IS A DIFFERENT PROBLEM FROM THE SERVER'S.
 *
 * `lib/push/policy.ts` folds a backlog at the moment one drain run sends it.
 * It cannot fold what it already sent. A person who leaves their phone on the
 * table for an hour gets one push per drain, five minutes apart, and the
 * shade fills up with rows the server thinks it has already been careful
 * about. This is the only place that can see what is actually on the screen.
 *
 * Above this many ordinary Vallo notifications, they become one that says how
 * many. Three matches COLLAPSE_THRESHOLD in the policy on purpose: two
 * different answers to "how many is too many" would be worse than either.
 */
const DEVICE_COLLAPSE_AT = 3;

/*
 * Read one push payload into the notification it should become.
 *
 * Pure: it takes a parsed value and returns a description. Every guard here
 * is a branch a test can reach without a browser, which is the reason it is a
 * function rather than a block inside the listener.
 */
function notificationFromPayload(raw) {
  const payload = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  const title =
    typeof payload.title === "string" && payload.title.trim().length > 0
      ? payload.title
      : "Vallo";
  const body = typeof payload.body === "string" ? payload.body : "";
  const tag =
    typeof payload.tag === "string" && payload.tag.trim().length > 0 ? payload.tag : "vallo";
  const urgent = payload.urgent === true;
  const actions = pushActionsFrom(payload.actions);

  return {
    title,
    tag,
    urgent,
    options: {
      body,
      icon: PUSH_ICON,
      /* The collapse key. A second notification with the same tag REPLACES
         the first rather than stacking, which is what keeps eleven messages
         in one conversation to one row in the shade. */
      tag,
      /* RE-ALERT ONLY FOR THE URGENT, AND THIS IS NOT A DETAIL.

         The tag is per person per kind, so "your withdrawal failed" replaces
         "your wallet was credited" on the same row. Replacing silently is
         right for a conversation and wrong for money: the person would never
         learn the second thing happened. Urgent replacements buzz again.
         Ordinary ones do not, because re-alerting for a replacement is how a
         phone ends up buzzing eleven times for one conversation anyway. */
      renotify: urgent,
      /* Money and security stay on the screen until they are dealt with.
         Ignored on platforms that do not support it, which is fine: it can
         only ever make an urgent notification easier to miss, never a
         non-urgent one harder to dismiss. */
      requireInteraction: urgent,
      /* B11: an fyi (a like, a follow) never wakes the phone. Never urgent. */
      silent: payload.quiet === true && !urgent,
      /* Everything the tap handler needs, and nothing that identifies a
         device. `count` is what makes a summary countable; see below. */
      data: {
        href: safePushHref(payload.href),
        urgent,
        count: 1,
        /* V-53: where each button goes, keyed by its id. */
        actionHrefs: Object.fromEntries(actions.map((a) => [a.action, a.href])),
      },
      /* V-53: at most two buttons, each a destination inside Vallo. A
         browser that draws none simply ignores this. */
      actions: actions.map((a) => ({ action: a.action, title: a.title })),
    },
  };
}

/*
 * A destination, or the notifications list.
 *
 * Only a path on our own origin is ever carried. `//host` is a
 * protocol-relative URL and leaves the origin, and so do "/\\host" and a
 * tab or newline after the slash. This mirrors `lib/push/same-origin.ts`
 * (a test runs both over the same escapes) deliberately: the
 * sender checks and the receiver checks, and neither trusts the other.
 */
function safePushHref(href) {
  if (typeof href !== "string") return PUSH_FALLBACK_HREF;
  const trimmed = href.trim();
  if (trimmed.charAt(0) !== "/" || trimmed.length > 2000) return PUSH_FALLBACK_HREF;
  /* "/\\host" and "/\t/host" resolve off the origin just as "//host" does. */
  if (/[\\\u0000-\u001f\u007f]/.test(trimmed)) return PUSH_FALLBACK_HREF;
  let resolved;
  try {
    resolved = new URL(trimmed, "https://vallo.invalid");
  } catch (_) {
    return PUSH_FALLBACK_HREF;
  }
  if (resolved.origin !== "https://vallo.invalid") return PUSH_FALLBACK_HREF;
  return resolved.pathname + resolved.search + resolved.hash;
}

/*
 * The buttons, re-checked. The sender builds them from a fixed list
 * (`lib/push/actions.ts`); this refuses anything that is not a short id, a
 * short title and a path on our own origin, and keeps two at most.
 */
function pushActionsFrom(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (out.length >= 2) break;
    if (!item || typeof item !== "object") continue;
    const id = typeof item.id === "string" && /^[a-z-]{1,24}$/.test(item.id) ? item.id : null;
    const title = typeof item.title === "string" && item.title.length > 0 && item.title.length <= 40 ? item.title : null;
    const href = safePushHref(item.href);
    if (!id || !title || href === PUSH_FALLBACK_HREF) continue;
    out.push({ action: id, title, href });
  }
  return out;
}

/* How many real events an already-displayed notification stands for. */
function representedCount(notification) {
  const data = notification && notification.data;
  const count = data && data.count;
  return typeof count === "number" && count >= 1 ? count : 1;
}

/*
 * Decide what the shade should look like once this one arrives.
 *
 * Returns either the single notification, or a summary plus the list of
 * notifications to close first. Pure, and separated from the listener for the
 * same reason as above: the awkward cases here (a replacement must not count
 * as an arrival; an urgent row must never be folded or closed) are exactly
 * the ones that are painful to reach through a browser.
 */
function planShade(existing, incoming) {
  /* URGENT IS NEVER FOLDED AND NEVER CLOSED. A reversed transaction does not
     become "4 updates", and it does not disappear because four messages
     arrived after it. */
  if (incoming.urgent) return { close: [], show: incoming };

  const ordinary = (existing || []).filter(
    (notification) => !(notification.data && notification.data.urgent === true),
  );

  /* A notification with this tag is being REPLACED, not added to. Counting it
     as an arrival would collapse the shade after three messages in one
     conversation, which is the thing the tag exists to prevent. */
  const replacing = ordinary.some((notification) => notification.tag === incoming.tag);
  const already = ordinary.reduce(
    (total, notification) => total + representedCount(notification),
    0,
  );
  const total = replacing ? Math.max(already, 1) : already + 1;

  if (total <= DEVICE_COLLAPSE_AT) return { close: [], show: incoming };

  return {
    close: ordinary,
    show: {
      title: "Vallo",
      tag: "vallo-summary",
      urgent: false,
      options: {
        body: `${total} things happened while you were away`,
        icon: PUSH_ICON,
        tag: "vallo-summary",
        /* A summary that grows is a summary worth looking at again. */
        renotify: true,
        requireInteraction: false,
        /* THE LIST, NOT THE NEWEST ITEM. A summary that opens one of the
           things it is summarising hides the others. */
        data: { href: PUSH_FALLBACK_HREF, urgent: false, count: total },
      },
    },
  };
}

self.addEventListener("push", (event) => {
  let parsed = null;
  if (event.data) {
    try {
      parsed = event.data.json();
    } catch {
      /* Not JSON, or not decryptable. `notificationFromPayload` turns null
         into the plain Vallo notification, which still tells the person
         something is waiting and still opens the list. */
    }
  }

  const incoming = notificationFromPayload(parsed);

  event.waitUntil(
    (async () => {
      let existing = [];
      try {
        /* Not supported everywhere, and it throws rather than returning
           nothing on some older Android browsers. An empty list is the safe
           reading: it shows the individual notification, which is never
           wrong, only sometimes noisier than it could be. */
        existing = (await self.registration.getNotifications()) || [];
      } catch {
        existing = [];
      }

      const plan = planShade(existing, incoming);
      for (const notification of plan.close) {
        try {
          notification.close();
        } catch {
          /* Already dismissed by the person between the read and here. */
        }
      }
      await self.registration.showNotification(plan.show.title, plan.show.options);
    })(),
  );
});

/*
 * THE TAP.
 *
 * Three outcomes in preference order, and the order is the whole point:
 *
 *  1. A tab already open ON THAT EXACT PAGE is focused and left alone.
 *     Navigating it would throw away a half-typed reply.
 *  2. Any other Vallo tab is navigated to the destination and focused, so a
 *     person ends the day with one Vallo tab rather than nine.
 *  3. Only when there is no Vallo tab at all is a new window opened.
 *
 * At scope `/` every Vallo tab is visible here and every one of them is
 * controlled by this worker, which is what makes `navigate` legal. Under the
 * old `/api/push/` scope steps 1 and 2 could not see anything and every tap
 * fell through to step 3.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  /* V-53: a button carries its own destination; the body of the
     notification carries the default one. */
  const byAction =
    event.action && data.actionHrefs && typeof data.actionHrefs === "object"
      ? data.actionHrefs[event.action]
      : undefined;
  const href = safePushHref(byAction !== undefined ? byAction : data.href);

  event.waitUntil(
    (async () => {
      let clientList = [];
      try {
        clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      } catch {
        clientList = [];
      }

      const ours = clientList.filter((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      const target = new URL(href, self.location.origin).href;

      const exact = ours.find((client) => client.url === target);
      if (exact && typeof exact.focus === "function") {
        return exact.focus();
      }

      const anyTab = ours[0];
      if (anyTab) {
        if (typeof anyTab.navigate === "function") {
          try {
            const navigated = await anyTab.navigate(target);
            /* `navigate` resolves to null for a client it could not move.
               Focusing the original is better than opening a second tab. */
            if (navigated && typeof navigated.focus === "function") return navigated.focus();
          } catch {
            /* An uncontrolled client refuses to be navigated. Fall through
               and at least bring the person back to Vallo. */
          }
        }
        if (typeof anyTab.focus === "function") return anyTab.focus();
      }

      return self.clients.openWindow(target);
    })(),
  );
});

/*
 * THE SUBSCRIPTION THAT ROTATES UNDER YOU.
 *
 * A browser may replace a push subscription without the page being open, and
 * if nobody re-registers it the device goes silent for ever with nothing
 * anywhere saying so. The new subscription is sent straight back. The request
 * carries cookies, so it lands as the right person or it is refused; there is
 * no path here by which one person's device is recorded against another.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const old = event.oldSubscription;
        const applicationServerKey =
          (old && old.options && old.options.applicationServerKey) || null;
        const fresh =
          event.newSubscription ||
          (applicationServerKey
            ? await self.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
              })
            : null);
        if (!fresh) return;

        const json = fresh.toJSON();
        const keys = json.keys || {};
        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            platform: "web",
            token: fresh.endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
          }),
        });
      } catch {
        /* Nothing useful to do and nowhere useful to say it. The device goes
           quiet until the page is next opened, which re-registers. */
      }
    })(),
  );
});
