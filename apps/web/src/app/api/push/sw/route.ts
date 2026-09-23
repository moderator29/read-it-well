/**
 * GET /api/push/sw. The service worker that turns a push into a notification.
 *
 * ===========================================================================
 * WHY THIS IS A ROUTE AND NOT A FILE IN `public/`.
 *
 * `apps/web/public/sw.js` already exists, is registered at scope `/` by
 * `components/app/ServiceWorkerRegistrar.tsx`, and belongs to another
 * worker. It is a careful piece of work about offline shells and paid-for
 * bytes on a metered Nigerian data bundle, and it has no push handling.
 *
 * TWO REGISTRATIONS AT THE SAME SCOPE ARE NOT TWO WORKERS, THEY ARE ONE
 * WORKER REPLACING ANOTHER. Registering a push worker at `/` would silently
 * uninstall the offline shell, which would show up weeks later as the
 * dinosaur page coming back and nobody would connect it to push. So this one
 * is served from a route and takes the scope that path gives it,
 * `/api/push/`, where it cannot displace anything.
 *
 * A NARROWER SCOPE COSTS EXACTLY ONE THING and it is worth naming: `push` and
 * `notificationclick` are delivered to this registration whatever its scope,
 * so notifications work completely. But `clients.matchAll()` only returns
 * pages inside the scope, so a tap cannot focus an already-open Vallo tab and
 * opens a new one instead. That is a small blemish, not a failure, and the
 * tidy fix is for the push handlers below to move into `public/sw.js`. That
 * request is recorded in `docs/BUILD_07_LEDGER.md`.
 *
 * ===========================================================================
 * WITHOUT THIS FILE, WEB PUSH DOES NOTHING VISIBLE. A push arrives at a
 * service worker and a service worker has to choose to display it. A browser
 * that receives a push a worker does not show may show its own generic
 * "This site has been updated in the background" notice, which is worse than
 * nothing. Every path below ends in `showNotification`, including the paths
 * where the payload could not be read.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKER = `/*
 * Vallo push worker. Served from /api/push/sw, scope /api/push/.
 * Its only job is to turn a push into a notification and a tap into a page.
 */

self.addEventListener("install", function () {
  /* Take over immediately rather than waiting for every tab to close. A
     worker that will not activate until tomorrow is a worker that does not
     notify today. */
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  /* EVERY BRANCH SHOWS SOMETHING. A push that is received and not displayed
     makes some browsers show their own "site updated in the background"
     notice, which is worse than a plain one of ours. */
  var payload = { title: "Vallo", body: "You have a new notification.", href: "/notifications", tag: "vallo" };

  if (event.data) {
    try {
      var parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.title === "string" && parsed.title.length > 0) payload.title = parsed.title;
        if (typeof parsed.body === "string") payload.body = parsed.body;
        /* Only a path on our own origin. The sender already refuses anything
           else, and this refuses it again: a notification is a place a tap
           leaves the application from, and it is not a place to take the
           sender's word for a destination. */
        if (typeof parsed.href === "string" && parsed.href.charAt(0) === "/" && parsed.href.charAt(1) !== "/") {
          payload.href = parsed.href;
        }
        if (typeof parsed.tag === "string" && parsed.tag.length > 0) payload.tag = parsed.tag;
      }
    } catch (error) {
      /* Not JSON, or not decryptable. The default above still shows. */
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      /* Both are served by the existing icon pipeline. A notification with
         no icon falls back to the browser's own mark, which on Android is a
         grey circle nobody recognises. */
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      /* The collapse key. A second notification with the same tag REPLACES
         the first rather than stacking, which is what keeps eleven messages
         in one conversation to one row in the shade. */
      tag: payload.tag,
      /* Replace silently: re-alerting for a replacement is how a phone ends
         up buzzing eleven times for one conversation anyway. */
      renotify: false,
      data: { href: payload.href },
    }),
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var href = (event.notification.data && event.notification.data.href) || "/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      /* Focus a Vallo tab if one is open and reachable. Outside this
         worker's scope most tabs are not visible here, so this usually falls
         through to openWindow; see the note in the route about why. */
      for (var i = 0; i < clientList.length; i += 1) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) === 0 && "focus" in client) {
          if ("navigate" in client) {
            return client.navigate(href).then(function (navigated) {
              return navigated ? navigated.focus() : client.focus();
            });
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(href);
    }),
  );
});

self.addEventListener("pushsubscriptionchange", function (event) {
  /* THE SUBSCRIPTION THAT ROTATES UNDER YOU. A browser may replace a
     subscription without the page being open, and if nobody re-registers it
     the device goes silent for ever with nothing anywhere saying so. The new
     subscription is sent straight back to the server. The request carries
     cookies, so it lands as the right person or it is refused. */
  event.waitUntil(
    (async function () {
      try {
        var applicationServerKey =
          (event.oldSubscription && event.oldSubscription.options && event.oldSubscription.options.applicationServerKey) ||
          null;
        var fresh =
          event.newSubscription ||
          (applicationServerKey
            ? await self.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey,
              })
            : null);
        if (!fresh) return;
        var json = fresh.toJSON();
        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            platform: "web",
            token: fresh.endpoint,
            p256dh: json.keys && json.keys.p256dh,
            auth: json.keys && json.keys.auth,
          }),
        });
      } catch (error) {
        /* Nothing useful to do and nowhere useful to say it. The device goes
           quiet until the page is next opened, which re-registers. */
      }
    })(),
  );
});
`;

export function GET(): Response {
  return new Response(WORKER, {
    status: 200,
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      /* A stale service worker is a worker that keeps showing the old
         notification shape long after the server changed. Browsers already
         revalidate worker scripts aggressively; this makes it explicit. */
      "Cache-Control": "no-cache, no-store, must-revalidate",
      /* The scope this worker is allowed to claim. It is left at the path's
         own default deliberately: see the note at the head about not
         displacing `public/sw.js`. Stated rather than omitted so that the
         next person to widen it has to mean it. */
      "Service-Worker-Allowed": "/api/push/",
    },
  });
}
