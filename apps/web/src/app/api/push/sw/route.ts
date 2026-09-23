/**
 * GET /api/push/sw. THE WORKER THAT USED TO TURN A PUSH INTO A NOTIFICATION,
 * NOW SERVING NOTHING BUT ITS OWN RETIREMENT.
 *
 * ===========================================================================
 * WHAT MOVED, AND WHY THIS PATH STILL ANSWERS.
 *
 * The push handlers are in `apps/web/public/sw.js`, at scope `/`, alongside
 * the offline shell. That is where they belong and the reasoning is written
 * at the head of that file: a notification's whole job is to put a person
 * back in the application, and `clients.matchAll()` only returns pages inside
 * the worker's scope, so at the narrower scope `/api/push/` a tap could never
 * see an already-open Vallo tab and always opened a second one.
 *
 * A DELETED ROUTE WOULD NOT HAVE RETIRED ANYTHING. A service worker is not
 * removed by deleting its script. A browser that has one installed keeps
 * running it, keeps its own push subscription, and keeps displaying; deleting
 * the script only makes the next update check fail, and a failed update check
 * on a 404 leaves the existing worker exactly where it was. A handset in that
 * state would show TWO notifications for one event, one from each worker,
 * with nothing on the device saying why.
 *
 * So the path still answers, with a worker whose only instruction is to take
 * itself off the device. `enrol.ts` also calls `unregister()` directly on the
 * old registration, which is faster; this is the belt to that pair of braces,
 * and it works for a device that never enrols again.
 *
 * ===========================================================================
 * HOW MANY DEVICES THIS AFFECTS: AS FAR AS CAN BE ESTABLISHED, NONE.
 *
 * `enrolWeb` fetches `/api/push/key` and returns `not_configured` before it
 * reaches `navigator.serviceWorker.register`, so a deployment with no VAPID
 * key never registered anything. No deployment has ever had one. That is a
 * reading of the code rather than a reading of a device, which is why this
 * file exists anyway.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * `self.registration.unregister()` inside a worker takes that worker off the
 * device, and takes its push subscription with it. Called from `install` so
 * it runs the moment a browser checks this script for an update, which is
 * every navigation within scope and at least once every twenty four hours.
 *
 * NOTHING ELSE. No push listener, no notificationclick listener. A retired
 * worker that still displayed would be the duplicate this is here to prevent.
 */
const RETIREMENT = `/*
 * Vallo: this worker has been retired.
 *
 * Push moved to /sw.js at scope /, where a tap can see the tabs you already
 * have open. This script exists only to take its predecessor off the device.
 */
self.addEventListener("install", function (event) {
  event.waitUntil(
    self.registration
      .unregister()
      .catch(function () {
        /* Nothing further to try. The next update check runs this again. */
      }),
  );
});
`;

export function GET(): Response {
  return new Response(RETIREMENT, {
    status: 200,
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      /* An update check that is answered from a cache retires nobody. */
      "Cache-Control": "no-cache, no-store, must-revalidate",
      /* Unchanged, and deliberately not widened. This script must never be
         able to claim `/`: the worker that owns `/` is the one with the
         offline shell in it, and a registration at the same scope replaces
         rather than joins. */
      "Service-Worker-Allowed": "/api/push/",
    },
  });
}
