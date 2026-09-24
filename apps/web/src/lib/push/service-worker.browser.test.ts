import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * THE HALF OF PUSH THAT CAN BE PROVED IN THIS CONTAINER, PROVED IN A REAL
 * BROWSER, AND LABELLED AS THAT HALF.
 *
 * ===========================================================================
 * WHAT THIS DOES.
 *
 * A real Chromium registers the real `apps/web/public/sw.js` at scope `/`,
 * and a real `push` event is delivered to it. Not a stub, not a call to a
 * function that looks like a handler: the browser's own service worker
 * machinery runs the shipped file, and the notification it builds is read
 * back out of the browser with `registration.getNotifications()`, which is
 * the same object a person's lock screen is drawn from.
 *
 * The push is injected locally through the DevTools protocol
 * (`ServiceWorker.deliverPushMessage`), which is how Chrome's own DevTools
 * "Push" button works. **NOTHING LEAVES THIS MACHINE.** There is no push
 * service, no subscription, no VAPID pair and no network in this test, which
 * is exactly why it can run here when `transport/live-proof.test.ts` cannot.
 *
 * ===========================================================================
 * WHAT IT PROVES, AND THE THREE THINGS IT DOES NOT. Read both lists.
 *
 * PROVED: that the file we ship parses and installs as a service worker in a
 * production browser engine; that a `push` event carrying our payload shape
 * produces a notification; and that the notification's title, body, icon,
 * tag, destination and alerting behaviour are the ones intended, as the
 * browser recorded them rather than as our own stub recorded them.
 *
 * NOT PROVED, first: that anything reached a device. Nothing has. There is no
 * push service in this test and no handset anywhere near it.
 *
 * NOT PROVED, second: the encryption. The payload here is handed to the
 * browser in the clear. The RFC 8291 chain is proved separately in
 * `transport/webpush.test.ts` against an independently written receiver.
 *
 * NOT PROVED, third: the tap. `notificationclick` cannot be synthesised from
 * outside the browser, so where a tap lands is proved in
 * `service-worker.test.ts`, which runs the same shipped file's own
 * `notificationclick` listener against recorded clients.
 *
 * ===========================================================================
 * IT REPORTS NOT RUN RATHER THAN FAILING WHEN THE HOST CANNOT HOST IT.
 *
 * Same rule as `transport/live-proof.test.ts`, for the same reason: a test
 * that cannot pass in an environment is red by construction, and a red suite
 * costs every writer on this tree at once. The preflight is a file existence
 * check and costs milliseconds.
 *
 * ===========================================================================
 * THIS FILE TOOK MAIN RED TWICE ON THE DAY IT WAS WRITTEN. WHAT WAS ACTUALLY
 * WRONG, BECAUSE IT WAS NOT WHAT IT LOOKED LIKE EITHER TIME.
 *
 * It passed eight consecutive times on its own and failed inside the full
 * suite, which is the same defect wearing a different coat both times.
 *
 * FAULT ONE, A FIXED PORT. It listened on 8532. Other processes run
 * servers on the same machine, the port was taken, and `server.listen` emitted an
 * `error` event that nothing was listening for, so the promise wrapped around
 * it NEVER SETTLED. A collision that should have been an instant failure
 * became a 120 second hook timeout. Both halves are fixed: the operating
 * system is asked for a free port, and the `error` event is wired to the
 * rejection, because a promise over an event emitter that is only wired to
 * the success event turns every failure into a hang.
 *
 * FAULT TWO, AND IT IS THE REAL ONE. The coordinator saw
 * `expected [] to have a length of 1`: the list came back EMPTY, not wrong.
 * `clearShade` was returning as soon as it read an empty list, and an empty
 * list is also what you read when the PREVIOUS case's notification has not
 * landed yet. It then landed, inside the next case, and polluted the
 * arithmetic of the fold. Proved by watching one leak across a loop
 * boundary. `clearShade` now requires the list to be empty on several
 * consecutive reads, so a late arrival is caught rather than inherited.
 *
 * FAULT THREE, UNDER LOAD: A PUSH STILL IN FLIGHT WHEN THE WAIT GAVE UP.
 *
 * With five copies of the full suite on one four-core machine, one push was
 * still not on the list 20 seconds after it was delivered. The log of the
 * expired wait read [A booking, A listing] where "A follow" was due. The fold
 * case then delivered its fourth push on top of the late third, ran past its
 * 60 seconds, and, because a case that times out keeps running, its late
 * pushes landed in the next case, which counted "5 things" where it had sent
 * four. Two red tests, one cause: a wait that watched the list for an
 * outcome instead of waiting for the handler that produces it.
 *
 * `ServiceWorker.deliverPushMessage` resolves before the handler has run (0
 * times out of 12 was the notification present when it resolved), and the
 * handler runs inside `event.waitUntil`, which nothing outside the worker can
 * see settle. So the page is told. The worker under test is served byte for
 * byte at `/shipped-sw.js` and imported by a harness at `/sw.js` (`HARNESS`
 * below) whose only addition wraps `ExtendableEvent.prototype.waitUntil` for
 * push events and posts `pushHandled` to the page when the shipped handler's
 * promise settles. Nothing test-only goes into `public/sw.js`.
 *
 * Every push is now delivered only after the previous one was handled, so
 * nothing is in flight across a step or a case, and a case that has run out
 * of time stops delivering (its `signal` is aborted). What is still polled is
 * the one effect the handler does not wait for: `notification.close()`
 * returns nothing, so a fold's closes reach the list just after the summary.
 * That wait has a budget; when it expires the real list is asserted and
 * printed. Nothing is retried.
 */

/**
 * How long one push may take to be handled before the case fails and names
 * it. Idle, a push is handled in tens of milliseconds; this is where a push
 * that never runs is reported, not a tuning knob.
 */
const HANDLED_BUDGET_MS = 60_000;

/** How long the list may take to show the closes of a handled push. */
const SETTLE_BUDGET_MS = 20_000;

/** A case delivers at most five pushes, each with its own budget above. */
const CASE_TIMEOUT_MS = 5 * HANDLED_BUDGET_MS;

/**
 * A FRESH BROWSER PROFILE EVERY RUN, AND THIS IS NOT TIDINESS.
 *
 * The first version of this file reused one directory under /tmp. A service
 * worker and its script live in that directory, so a run inherited the worker
 * the PREVIOUS run had installed. The harness was then checked by breaking
 * the shipped worker on purpose, and IT STILL PASSED: it was testing
 * yesterday's file. That is the blind light exactly, inside the instrument
 * built to see.
 *
 * A fresh profile costs about a second and removes the whole class. The
 * script is also served `no-store`, so nothing can come out of an HTTP cache
 * either.
 */
const PROFILE = mkdtempSync(join(tmpdir(), "vallo-sw-proof-"));

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public");
const SW_SOURCE = readFileSync(join(PUBLIC_DIR, "sw.js"), "utf8");
const ICON = readFileSync(join(PUBLIC_DIR, "pwa", "icon-192.png"));

const CHROMIUM_CANDIDATES = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
];

/**
 * A page that does nothing but exist, so the worker has a client to control
 * and a place from which `getNotifications()` can be called.
 */
const PAGE = `<!doctype html><meta charset="utf-8"><title>Vallo notification proof</title>
<script>
window.__handled = [];
navigator.serviceWorker.addEventListener("message", (event) => {
  if (event.data && typeof event.data.pushHandled === "number") window.__handled.push(event.data);
});
</script>`;

/**
 * The worker the browser registers: the shipped file, imported unchanged,
 * plus a report of when each push handler has settled. See fault three.
 */
const HARNESS = `
const realWaitUntil = ExtendableEvent.prototype.waitUntil;
let pushes = 0;
ExtendableEvent.prototype.waitUntil = function (promise) {
  if (this.type !== "push") return realWaitUntil.call(this, promise);
  const seq = ++pushes;
  const settled = Promise.resolve(promise).then(() => "ok", (error) => "error: " + error);
  return realWaitUntil.call(this, settled.then(async (outcome) => {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    for (const client of clients) client.postMessage({ pushHandled: seq, outcome });
  }));
};
importScripts("/shipped-sw.js");
`;

type Displayed = {
  title: string;
  body: string;
  tag: string;
  icon: string;
  data: { href?: string; urgent?: boolean; count?: number } | null;
  renotify: boolean;
  requireInteraction: boolean;
};

type Ready =
  | { ok: true; chromium: string }
  | { ok: false; reason: string };

function preflight(): Ready {
  const chromium = CHROMIUM_CANDIDATES.find((path) => existsSync(path));
  if (!chromium) {
    return { ok: false, reason: `no Chromium binary at any of: ${CHROMIUM_CANDIDATES.join(", ")}` };
  }
  return { ok: true, chromium };
}

let ready: Ready = { ok: false, reason: "preflight has not run" };
let origin = "";
let server: Server | null = null;
let context: { close: () => Promise<void> } | null = null;
let deliver: ((data: string) => Promise<void>) | null = null;
let readShade: (() => Promise<Displayed[]>) | null = null;
let clearShade: (() => Promise<void>) | null = null;
/** Pushes delivered so far; the harness numbers the ones it handles the same way. */
let delivered = 0;

beforeAll(async () => {
  ready = preflight();
  if (!ready.ok) return;

  server = createServer((request, response) => {
    if (request.url === "/sw.js" || request.url === "/shipped-sw.js") {
      response.writeHead(200, {
        "Content-Type": "text/javascript; charset=utf-8",
        "Service-Worker-Allowed": "/",
        /* See the note on PROFILE. Nothing about this run may come from a
           cache, because the thing under test is the file on disk. */
        "Cache-Control": "no-store, no-cache, must-revalidate",
      });
      response.end(request.url === "/sw.js" ? HARNESS : SW_SOURCE);
      return;
    }
    if (request.url === "/pwa/icon-192.png") {
      response.writeHead(200, { "Content-Type": "image/png" });
      response.end(ICON);
      return;
    }
    if (request.url === "/manifest.webmanifest") {
      response.writeHead(200, { "Content-Type": "application/manifest+json" });
      response.end(JSON.stringify({ name: "Vallo", short_name: "Vallo" }));
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(PAGE);
  });
  /* AN EPHEMERAL PORT, AND THE `error` EVENT WIRED TO THE REJECTION. Port 0
     asks the operating system for one that is free, so this cannot collide
     with another process's server; and a listen that fails now fails instead
     of hanging. See fault one at the head for what the fixed port cost. */
  const port = await new Promise<number>((resolve, reject) => {
    const listening = server;
    if (!listening) {
      reject(new Error("no server"));
      return;
    }
    listening.once("error", reject);
    listening.listen(0, "127.0.0.1", () => {
      const address = listening.address();
      if (address && typeof address === "object") resolve(address.port);
      else reject(new Error("the server reported no port"));
    });
  });
  origin = `http://127.0.0.1:${port}`;

  /* Imported here rather than at the top, so a host without playwright-core
     skips at the preflight instead of failing to collect the file. */
  const { chromium } = await import("playwright-core");

  /* A PERSISTENT context. Chrome disables parts of the notification and push
     machinery in incognito, and every ordinary Playwright context is
     incognito. This is the same trap `transport/live-proof.test.ts` records. */
  const browserContext = await chromium.launchPersistentContext(PROFILE, {
    executablePath: ready.chromium,
    args: ["--no-sandbox"],
  });
  context = browserContext;

  await browserContext.grantPermissions(["notifications"], { origin });
  const page = await browserContext.newPage();
  await page.goto(`${origin}/`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
  });

  const cdp = await browserContext.newCDPSession(page);
  let registrationId: string | null = null;
  cdp.on("ServiceWorker.workerRegistrationUpdated", (event) => {
    for (const registration of event.registrations) {
      if (registration.scopeURL === `${origin}/` && !registration.isDeleted) {
        registrationId = registration.registrationId;
      }
    }
  });
  await cdp.send("ServiceWorker.enable");
  for (let attempt = 0; attempt < 50 && registrationId === null; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (registrationId === null) {
    ready = { ok: false, reason: "Chromium never reported a service worker registration id" };
    return;
  }

  /*
   * ONE PUSH AT A TIME, AND DONE MEANS HANDLED. The harness numbers each push
   * the worker receives; this waits for the page to hear that number back,
   * which is the shipped handler's own `waitUntil` promise settling. See
   * fault three at the head.
   */
  deliver = async (data: string) => {
    delivered += 1;
    const seq = delivered;
    await cdp.send("ServiceWorker.deliverPushMessage", {
      origin,
      registrationId: registrationId as unknown as string,
      data,
    });
    await settle(seq);
  };

  const settle = async (seq: number) => {
    if (seq === 0) return;
    try {
      await page.waitForFunction(
        (n) => (window as unknown as { __handled: unknown[] }).__handled.length >= n,
        seq,
        { timeout: HANDLED_BUDGET_MS, polling: 25 },
      );
    } catch {
      throw new Error(`push ${seq} was delivered and its handler had not settled after ${HANDLED_BUDGET_MS} ms`);
    }
    const outcome = await page.evaluate(
      (n) =>
        (window as unknown as { __handled: { pushHandled: number; outcome: string }[] }).__handled.find(
          (entry) => entry.pushHandled === n,
        )?.outcome ?? "missing",
      seq,
    );
    if (outcome !== "ok") throw new Error(`push ${seq}: the shipped handler ended with ${outcome}`);
  };

  readShade = async () =>
    page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const notifications = await registration.getNotifications();
      return notifications.map((notification) => ({
        title: notification.title,
        body: notification.body,
        tag: notification.tag,
        icon: notification.icon,
        data: notification.data ?? null,
        /* `renotify` is on the object the browser built and is missing from
           the DOM lib's `Notification`. Read through an index rather than
           cast the whole notification, so every other field below keeps its
           real type. */
        renotify: (notification as unknown as { renotify: boolean }).renotify,
        requireInteraction: notification.requireInteraction,
      }));
    }) as Promise<Displayed[]>;

  /*
   * EMPTY BETWEEN CASES, WITH NOTHING STILL ON ITS WAY. Fault two was a
   * notification from the previous case landing after the list had read
   * empty. Every delivered push is first waited for (a case that timed out
   * may have left one in flight), so once the list is closed and reads empty
   * nothing else can arrive.
   */
  clearShade = async () => {
    await settle(delivered);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      for (const notification of await registration.getNotifications()) notification.close();
    });
    const deadline = Date.now() + SETTLE_BUDGET_MS;
    while (Date.now() < deadline) {
      if (((await readShade?.()) ?? []).length === 0) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("the notification list would not read empty after every row was closed");
  };
}, 120_000);

afterAll(async () => {
  await context?.close();
  server?.close();
  try {
    rmSync(PROFILE, { recursive: true, force: true });
  } catch {
    /* A leftover profile directory costs disk, never correctness. */
  }
});

/**
 * Deliver one push, wait for its handler, and read the shade back once it
 * looks like `until`.
 *
 * A PREDICATE RATHER THAN A ROW COUNT. A push that REPLACES an existing row
 * leaves the count unchanged, and a fold closes rows one at a time after the
 * summary is up, so the list is read until it has the expected shape. When
 * the predicate never holds, this returns what is on the list and the
 * caller's assertions fail on the real contents. Nothing is retried.
 *
 * A case that has run out of time (`signal` aborted) delivers nothing more,
 * so a slow case cannot push into the next one.
 */
async function pushVia(
  signal: AbortSignal,
  payload: unknown,
  until: (shade: Displayed[]) => boolean,
): Promise<Displayed[]> {
  if (signal.aborted) throw new Error("this case has run out of time; no further push is delivered");
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  await deliver?.(body);
  const deadline = Date.now() + SETTLE_BUDGET_MS;
  let shade: Displayed[] = [];
  while (Date.now() < deadline && !signal.aborted) {
    shade = (await readShade?.()) ?? [];
    if (until(shade)) return shade;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return shade;
}

/** Clears the list and hands the case its own `push`, bound to its signal. */
async function begin(signal: AbortSignal) {
  await clearShade?.();
  return (payload: unknown, until: (shade: Displayed[]) => boolean) => pushVia(signal, payload, until);
}

/** The common case: wait for exactly this many rows. */
function rows(count: number): (shade: Displayed[]) => boolean {
  return (shade) => shade.length === count;
}

/** Wait for this many rows, one of which carries this title. */
function rowsTitled(count: number, title: string): (shade: Displayed[]) => boolean {
  return (shade) => shade.length === count && shade.some((row) => row.title === title);
}

/**
 * Wait for this many rows, one of which carries this tag.
 *
 * NEEDED FOR THE FOLD, and the reason is worth keeping. Folding is close the
 * three, then show the summary, and the browser applies those one at a time.
 * A poll that waits only for "one row" catches the instant when two have been
 * closed and the third is still standing, and reads that as the answer. The
 * first version of this file did exactly that and reported the fold as broken
 * when it was not.
 */
function rowsTagged(count: number, tag: string): (shade: Displayed[]) => boolean {
  return (shade) => shade.length === count && shade.some((row) => row.tag === tag);
}

let announced = false;

/** True when the body should run; prints NOT RUN once and skips otherwise. */
function hosted(context_: { skip: () => void }): boolean {
  if (ready.ok) return true;
  if (!announced) {
    announced = true;
    console.warn(
      [
        "",
        "  NOT RUN: the in-browser service worker proof did not run on this host.",
        `  Reason: ${ready.ok ? "" : ready.reason}.`,
        "  This is not a failure. Nothing was proved and nothing was disproved.",
        "  It needs a Chromium binary and nothing else: no network, no push",
        "  service, no VAPID pair. Run it where one is installed.",
        "",
      ].join("\n"),
    );
  }
  context_.skip();
  return false;
}

describe("a real browser, running the shipped worker, building a real notification", () => {
  it("shows the sender's title, body and icon", async (testContext) => {
    if (!hosted(testContext)) return;
    const push = await begin(testContext.signal);

    const shade = await push(
      {
        title: "Amara replied",
        body: "About the two bedroom in Lekki",
        href: "/messages/9f2",
        tag: "vallo-message",
        urgent: false,
      },
      rows(1),
    );

    expect(shade).toHaveLength(1);
    expect(shade[0]?.title).toBe("Amara replied");
    expect(shade[0]?.body).toBe("About the two bedroom in Lekki");
    expect(shade[0]?.tag).toBe("vallo-message");
    /* THE BROWSER RESOLVED IT, which is the thing a source review cannot do.
       The worker this replaced named `/icons/icon-192.png`, a path that does
       not exist in `public/`. */
    expect(shade[0]?.icon).toBe(`${origin}/pwa/icon-192.png`);
    expect(shade[0]?.data?.href).toBe("/messages/9f2");
    expect(shade[0]?.renotify).toBe(false);
    expect(shade[0]?.requireInteraction).toBe(false);
  }, CASE_TIMEOUT_MS);

  it("keeps money on the screen and lets it buzz again", async (testContext) => {
    if (!hosted(testContext)) return;
    const push = await begin(testContext.signal);

    const shade = await push(
      { title: "Withdrawal failed", body: "We could not pay out", href: "/wallet", tag: "vallo-wallet", urgent: true },
      rows(1),
    );

    expect(shade[0]?.title).toBe("Withdrawal failed");
    expect(shade[0]?.renotify).toBe(true);
    expect(shade[0]?.requireInteraction).toBe(true);
    expect(shade[0]?.data?.urgent).toBe(true);
  }, CASE_TIMEOUT_MS);

  it("refuses a destination that leaves our origin", async (testContext) => {
    if (!hosted(testContext)) return;
    const push = await begin(testContext.signal);

    const shade = await push(
      { title: "Have a look", href: "https://evil.example/steal", tag: "vallo-listing" },
      rows(1),
    );

    expect(shade[0]?.data?.href).toBe("/notifications");
  }, CASE_TIMEOUT_MS);

  it("still shows something when the payload is not readable", async (testContext) => {
    if (!hosted(testContext)) return;
    const push = await begin(testContext.signal);

    /* What an undecryptable push looks like from inside the worker. A browser
       that receives a push its worker does not display may substitute its own
       "site updated in the background" notice, which is worse than ours. */
    const shade = await push("this is not json {", rows(1));

    expect(shade).toHaveLength(1);
    expect(shade[0]?.title).toBe("Vallo");
    expect(shade[0]?.data?.href).toBe("/notifications");
  }, CASE_TIMEOUT_MS);

  it("replaces rather than stacks when the same tag arrives twice", async (testContext) => {
    if (!hosted(testContext)) return;
    const push = await begin(testContext.signal);

    await push({ title: "Amara replied", tag: "vallo-message", href: "/messages/9f2" }, rows(1));
    const shade = await push(
      { title: "Amara replied again", tag: "vallo-message", href: "/messages/9f2" },
      rowsTitled(1, "Amara replied again"),
    );

    expect(shade).toHaveLength(1);
    expect(shade[0]?.title).toBe("Amara replied again");
  }, CASE_TIMEOUT_MS);

  it("folds a fourth ordinary notification into one summary", async (testContext) => {
    if (!hosted(testContext)) return;
    const push = await begin(testContext.signal);

    await push({ title: "A booking", tag: "vallo-booking", href: "/bookings" }, rows(1));
    await push({ title: "A listing", tag: "vallo-listing", href: "/listings" }, rows(2));
    await push({ title: "A follow", tag: "vallo-social", href: "/social" }, rows(3));
    const shade = await push(
      { title: "Amara replied", tag: "vallo-message", href: "/messages/9f2" },
      rowsTagged(1, "vallo-summary"),
    );

    expect(shade).toHaveLength(1);
    expect(shade[0]?.title).toBe("Vallo");
    expect(shade[0]?.body).toBe("4 things happened while you were away");
    expect(shade[0]?.data?.href).toBe("/notifications");
  }, CASE_TIMEOUT_MS);

  it("leaves an urgent notification standing when it folds the rest", async (testContext) => {
    if (!hosted(testContext)) return;
    const push = await begin(testContext.signal);

    await push({ title: "Withdrawal failed", tag: "vallo-wallet", href: "/wallet", urgent: true }, rows(1));
    await push({ title: "A booking", tag: "vallo-booking", href: "/bookings" }, rows(2));
    await push({ title: "A listing", tag: "vallo-listing", href: "/listings" }, rows(3));
    await push({ title: "A follow", tag: "vallo-social", href: "/social" }, rows(4));
    /* The fourth ordinary one. The three ordinary rows fold; the money row is
       not folded, not counted and not closed. */
    const shade = await push(
      { title: "Amara replied", tag: "vallo-message", href: "/messages/9f2" },
      rowsTagged(2, "vallo-summary"),
    );

    expect(shade).toHaveLength(2);
    const titles = shade.map((row) => row.title).sort();
    expect(titles).toEqual(["Vallo", "Withdrawal failed"]);
    const summary = shade.find((row) => row.tag === "vallo-summary");
    expect(summary?.body).toBe("4 things happened while you were away");
  }, CASE_TIMEOUT_MS);
});
