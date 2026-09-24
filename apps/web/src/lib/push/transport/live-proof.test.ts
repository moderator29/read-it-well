import { createECDH } from "node:crypto";
import { createServer } from "node:http";
import { connect } from "node:net";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { encryptForSubscription, vapidAuthorization } from "./webpush";

/**
 * THE ONE PROOF THAT NEEDS THE WIRE, AND IT SAYS SO WHEN IT CANNOT HAVE IT.
 *
 * ===========================================================================
 * WHAT THIS PROVES THAT NOTHING ELSE CAN.
 *
 * `webpush.test.ts` decrypts what this code encrypts using an independently
 * written receiver, which proves the ECDH, HKDF and AES chain against itself.
 * It cannot prove that a REAL browser, subscribed through a REAL push service,
 * receives and opens what we send. Only carrying one message the whole way
 * proves that, and that is what this does: a real Chromium mints a real
 * subscription, this code encrypts to it, the message goes to the push
 * service's own endpoint, and the service worker reports the plaintext it
 * read back.
 *
 * If this passes, web push works end to end and the only thing left between
 * Vallo and a person's lock screen is the VAPID pair in the environment.
 *
 * ===========================================================================
 * IT IS SKIPPED, NOT FAILED, WHEN THE HOST CANNOT REACH THE WIRE.
 *
 * A test that cannot pass in an environment is not a flake, it is red by
 * construction, and a red suite costs every writer on this tree at once. A
 * proof that needs the network must report THAT IT DID NOT RUN. It must never
 * report that it passed, and it must never go red for the absence of
 * something it was never given.
 *
 * So it preflights, in about a second, and when the preflight fails it prints
 * NOT RUN with the reason and skips. Vitest then reports it as skipped, which
 * is the honest word: not green, not red, not run.
 *
 * ===========================================================================
 * WHY IT DOES NOT RUN IN THIS CONTAINER, MEASURED ON 23 SEPTEMBER.
 *
 * Subscribing and sending are different hosts and only one of them is
 * permitted here.
 *
 *   fcm.googleapis.com                  reachable   where a push is DELIVERED
 *   fcmregistrations.googleapis.com     reachable
 *   mtalk.google.com:5228               BLOCKED     where a registration
 *                                                   COMPLETES
 *   android.clients.google.com          BLOCKED
 *   updates.push.services.mozilla.com   BLOCKED     CONNECT tunnel 403
 *
 * So `pushManager.subscribe()` hangs for ever: Chrome cannot finish
 * registering, there is no endpoint, and there is nothing to send to. The
 * sending side works from here and the subscribing side does not, which is a
 * property of the sandbox rather than of this code.
 *
 * A second, separate trap worth keeping written down: CHROME REFUSES THE PUSH
 * API IN INCOGNITO, and every ordinary Playwright context is incognito. It
 * says so in a console line and then fails with `Registration failed -
 * permission denied`, which reads like a permissions bug and is not one. That
 * is why this uses `launchPersistentContext`.
 */

const CHROMIUM_CANDIDATES = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
];

/** Can a TCP connection be opened, within a short budget? */
function canReach(host: string, port: number, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    const done = (ok: boolean): void => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

type Preflight = { ok: true; chromium: string } | { ok: false; reason: string };

/**
 * Everything that has to be true before this can mean anything.
 *
 * Kept cheap and kept first. The whole point is that the ordinary suite pays
 * about a second for the knowledge that it cannot run, rather than two
 * minutes for a timeout.
 */
async function preflight(): Promise<Preflight> {
  const chromium = CHROMIUM_CANDIDATES.find((path) => existsSync(path));
  if (!chromium) {
    return { ok: false, reason: `no Chromium binary at any of: ${CHROMIUM_CANDIDATES.join(", ")}` };
  }
  /* The host a Chrome push registration COMPLETES over. Without it
     `subscribe()` hangs rather than failing, which is the worst shape. */
  if (!(await canReach("mtalk.google.com", 5228))) {
    return {
      ok: false,
      reason:
        "mtalk.google.com:5228 is not reachable, so Chrome cannot complete a push registration and subscribe() would hang for ever",
    };
  }
  return { ok: true, chromium };
}

const SERVICE_WORKER = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("push", (event) => {
  /* DECRYPTED HERE, BY THE BROWSER, WITH THE SUBSCRIPTION'S OWN PRIVATE KEY.
     If a single byte of the sender's encryption were wrong this would throw
     and report DECRYPT_FAILED, which is the failure a push service cannot
     see and answers 201 to anyway. */
  let text = "DECRYPT_FAILED";
  try { text = event.data ? event.data.text() : "(empty)"; } catch (error) { text = "DECRYPT_FAILED"; }
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    for (const client of clients) client.postMessage({ received: text });
    await self.registration.showNotification("proof", { body: text });
  })());
});
`;

const PAGE = `<!doctype html><meta charset="utf-8"><title>push proof</title><script>
window.__received = new Promise((resolve) => {
  navigator.serviceWorker.addEventListener("message", (event) => resolve(event.data && event.data.received));
});
window.__subscribe = async (key) => {
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const raw = atob(key.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: bytes.buffer,
  });
  return JSON.stringify(subscription.toJSON());
};
</script>`;

function base64Url(value: Buffer): string {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("web push, carried the whole way to a real browser", () => {
  it("encrypts to a real subscription and the service worker reads it back", async (context) => {
    const ready = await preflight();
    if (!ready.ok) {
      /* THE WORDS THE COORDINATOR ASKED FOR, and the reason beside them, so
         nobody has to rediscover which host is blocked. */
      /* `warn`, not `log`: the house lint permits only warn and error, and
         warn is the right level anyway. A proof that did not run is a gap in
         what is known, which is worth a raised voice, not a note. */
      console.warn(
        [
          "",
          "  NOT RUN: the live web push proof did not run on this host.",
          `  Reason: ${ready.reason}.`,
          "  This is not a failure. Nothing was proved and nothing was disproved.",
          "  Run it where outbound TCP to mtalk.google.com:5228 is permitted, or",
          "  use POST /api/push/self-test from a real phone against a deployment",
          "  that has NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY set.",
          "",
        ].join("\n"),
      );
      context.skip();
      return;
    }

    /* An EPHEMERAL VAPID pair, for this run only. Never written down, never
       stored, never the platform's. A VAPID pair is self generated and costs
       nothing, which is the whole reason web push is the transport that can
       be proved without waiting for anybody. */
    const vapid = createECDH("prime256v1");
    vapid.generateKeys();
    const vapidPublic = base64Url(vapid.getPublicKey());
    const vapidPrivate = base64Url(vapid.getPrivateKey());

    const server = createServer((request, response) => {
      if (request.url === "/sw.js") {
        response.writeHead(200, { "Content-Type": "text/javascript", "Service-Worker-Allowed": "/" });
        response.end(SERVICE_WORKER);
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(PAGE);
    });
    /* A port the operating system picks and a profile of this run's own, so
       two copies of the suite on one machine cannot collide on either. */
    const PORT = await new Promise<number>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === "object") resolve(address.port);
        else reject(new Error("the proof server reported no port"));
      });
    });
    const profile = mkdtempSync(join(tmpdir(), "vallo-push-proof-"));

    /* Imported here rather than at the top so a host without playwright-core
       installed skips at the preflight instead of failing to collect. */
    const { chromium } = await import("playwright-core");

    /* A PERSISTENT context. Chrome refuses the Push API in incognito and
       every ordinary Playwright context is incognito. */
    const browserContext = await chromium.launchPersistentContext(profile, {
      executablePath: ready.chromium,
      args: ["--no-sandbox"],
    });

    try {
      await browserContext.grantPermissions(["notifications"], { origin: `http://localhost:${PORT}` });
      const page = await browserContext.newPage();
      await page.goto(`http://localhost:${PORT}/`);

      const subscriptionJson = await page.evaluate(
        (key) => (window as unknown as { __subscribe: (key: string) => Promise<string> }).__subscribe(key),
        vapidPublic,
      );
      const subscription = JSON.parse(subscriptionJson) as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const message = JSON.stringify({ title: "Vallo", body: "a real one", href: "/notifications" });
      const encrypted = encryptForSubscription({
        payload: Buffer.from(message, "utf8"),
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });
      const authorization = vapidAuthorization({
        endpoint: subscription.endpoint,
        publicKey: vapidPublic,
        privateKey: vapidPrivate,
        subject: "mailto:hello@vallospaces.com",
      });

      const response = await fetch(subscription.endpoint, {
        method: "POST",
        headers: {
          "Content-Encoding": "aes128gcm",
          "Content-Type": "application/octet-stream",
          TTL: "60",
          Urgency: "high",
          Authorization: authorization,
        },
        body: new Uint8Array(encrypted.body),
      });
      console.warn(`  push service answered ${response.status} from ${new URL(subscription.endpoint).host}`);
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);

      /* AND THE PART A STATUS CODE CANNOT TELL US. A push service accepts a
         ciphertext it cannot read, so a 201 proves the transport and not the
         encryption. This is the encryption. */
      const received = await page.evaluate(
        () =>
          Promise.race([
            (window as unknown as { __received: Promise<string> }).__received,
            new Promise<string>((resolve) => setTimeout(() => resolve("TIMEOUT"), 30_000)),
          ]),
      );
      expect(received).toBe(message);
    } finally {
      await browserContext.close();
      server.close();
      rmSync(profile, { recursive: true, force: true });
    }
  }, 120_000);
});
