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
 * FAULT ONE, A FIXED PORT. It listened on 8532. Five other workers run
 * servers in this tree, the port was taken, and `server.listen` emitted an
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
 * ===========================================================================
 * WHY THIS POLLS AT ALL, ASKED PROPERLY RATHER THAN ASSUMED.
 *
 * Because the browser offers nothing else. It was measured, not guessed:
 * `ServiceWorker.deliverPushMessage` resolves BEFORE the worker's handler has
 * run, 0 times out of 12 was the notification already present when the call
 * resolved. The worker's `push` handler runs inside `event.waitUntil` and
 * nothing outside the worker can observe that settling; adding a `postMessage`
 * to `public/sw.js` for a test to listen to would be putting test-only code
 * in a shipped artefact.
 *
 * So the only observable is `registration.getNotifications()`, which is
 * eventually consistent, and the instrument polls it. THE BUDGET BELOW IS NOT
 * A TUNING KNOB. Every wait here completes in tens of milliseconds on an idle
 * machine; the budget is the point at which a genuine failure is REPORTED,
 * and it is generous because a test box running twenty workers schedules a
 * browser round trip whenever it feels like it. When it expires, the actual
 * contents of the list are asserted against the expectation and the
 * difference is printed. A timeout here is never reported as a pass, and
 * nothing is retried.
 */

/**
 * How long a wait may take before a failure is REPORTED. See the note at the
 * head: not a tuning knob, and not a retry. Idle, every wait here settles in
 * tens of milliseconds.
 */
const SETTLE_BUDGET_MS = 20_000;

/** Consecutive empty reads required before the shade is believed empty. */
const QUIET_READS = 3;

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
const PAGE = `<!doctype html><meta charset="utf-8"><title>Vallo notification proof</title>`;

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

beforeAll(async () => {
  ready = preflight();
  if (!ready.ok) return;

  server = createServer((request, response) => {
    if (request.url === "/sw.js") {
      response.writeHead(200, {
        "Content-Type": "text/javascript; charset=utf-8",
        "Service-Worker-Allowed": "/",
        /* See the note on PROFILE. Nothing about this run may come from a
           cache, because the thing under test is the file on disk. */
        "Cache-Control": "no-store, no-cache, must-revalidate",
      });
      response.end(SW_SOURCE);
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
     with another worker's server; and a listen that fails now fails instead
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

  deliver = async (data: string) => {
    await cdp.send("ServiceWorker.deliverPushMessage", {
      origin,
      registrationId: registrationId as unknown as string,
      data,
    });
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
   * EMPTY, AND STILL EMPTY, WHICH IS NOT THE SAME THING.
   *
   * This is fault two at the head. An empty list is what you read after
   * closing everything, and it is ALSO what you read while the previous
   * case's notification is still in flight, because `showNotification`
   * resolves inside the worker long after the call that caused it returned.
   * The first version returned on the first empty read, inherited the
   * straggler, and the fold then counted four things when it should have
   * counted three. So the list has to be empty several reads running, and
   * anything that turns up in between is closed and the count starts again.
   */
  clearShade = async () => {
    const deadline = Date.now() + SETTLE_BUDGET_MS;
    let quiet = 0;
    while (Date.now() < deadline) {
      const present = (await readShade?.()) ?? [];
      if (present.length === 0) {
        quiet += 1;
        if (quiet >= QUIET_READS) return;
      } else {
        quiet = 0;
        await page.evaluate(async () => {
          const registration = await navigator.serviceWorker.ready;
          for (const notification of await registration.getNotifications()) notification.close();
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("the notification list would not settle empty between cases");
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
 * Deliver one push and read the shade back once it looks like `until`.
 *
 * A PREDICATE RATHER THAN A SLEEP, and rather than a row count. The browser
 * builds the notification asynchronously, so a fixed wait is either a flake
 * or four seconds of nothing. A row count is not enough either: a push that
 * REPLACES an existing row leaves the count unchanged, so polling on the
 * count returns the row from before the push and the test passes on stale
 * state. That exact mistake was made here first and is why this comment is
 * long.
 *
 * When the predicate never holds, this returns whatever is on the shade after
 * four seconds and the caller's assertions fail on it. A timeout must never
 * be reported as a pass; it is reported as the wrong shade, which is what it
 * is.
 */
async function push(payload: unknown, until: (shade: Displayed[]) => boolean): Promise<Displayed[]> {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  await deliver?.(body);
  const deadline = Date.now() + SETTLE_BUDGET_MS;
  let shade: Displayed[] = [];
  while (Date.now() < deadline) {
    shade = (await readShade?.()) ?? [];
    if (until(shade)) return shade;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  /* The budget expired. Return what is actually there so the caller's
     assertions fail ON THE REAL CONTENTS and print the difference. A wait
     that ran out is never reported as a pass and nothing is retried. */
  return shade;
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
    await clearShade?.();

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
  }, 60_000);

  it("keeps money on the screen and lets it buzz again", async (testContext) => {
    if (!hosted(testContext)) return;
    await clearShade?.();

    const shade = await push(
      { title: "Withdrawal failed", body: "We could not pay out", href: "/wallet", tag: "vallo-wallet", urgent: true },
      rows(1),
    );

    expect(shade[0]?.title).toBe("Withdrawal failed");
    expect(shade[0]?.renotify).toBe(true);
    expect(shade[0]?.requireInteraction).toBe(true);
    expect(shade[0]?.data?.urgent).toBe(true);
  }, 60_000);

  it("refuses a destination that leaves our origin", async (testContext) => {
    if (!hosted(testContext)) return;
    await clearShade?.();

    const shade = await push(
      { title: "Have a look", href: "https://evil.example/steal", tag: "vallo-listing" },
      rows(1),
    );

    expect(shade[0]?.data?.href).toBe("/notifications");
  }, 60_000);

  it("still shows something when the payload is not readable", async (testContext) => {
    if (!hosted(testContext)) return;
    await clearShade?.();

    /* What an undecryptable push looks like from inside the worker. A browser
       that receives a push its worker does not display may substitute its own
       "site updated in the background" notice, which is worse than ours. */
    const shade = await push("this is not json {", rows(1));

    expect(shade).toHaveLength(1);
    expect(shade[0]?.title).toBe("Vallo");
    expect(shade[0]?.data?.href).toBe("/notifications");
  }, 60_000);

  it("replaces rather than stacks when the same tag arrives twice", async (testContext) => {
    if (!hosted(testContext)) return;
    await clearShade?.();

    await push({ title: "Amara replied", tag: "vallo-message", href: "/messages/9f2" }, rows(1));
    const shade = await push(
      { title: "Amara replied again", tag: "vallo-message", href: "/messages/9f2" },
      rowsTitled(1, "Amara replied again"),
    );

    expect(shade).toHaveLength(1);
    expect(shade[0]?.title).toBe("Amara replied again");
  }, 60_000);

  it("folds a fourth ordinary notification into one summary", async (testContext) => {
    if (!hosted(testContext)) return;
    await clearShade?.();

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
  }, 60_000);

  it("leaves an urgent notification standing when it folds the rest", async (testContext) => {
    if (!hosted(testContext)) return;
    await clearShade?.();

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
  }, 60_000);
});
