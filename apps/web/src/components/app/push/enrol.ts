"use client";

import { looksNative } from "@/lib/native/platform";

/**
 * TURNING A YES INTO A DEVICE THE SERVER CAN REACH.
 *
 * ===========================================================================
 * THE ORDER IS THE WHOLE THING, AND IT IS THE OPPOSITE OF THE OBVIOUS ONE.
 *
 * Nothing in this file may run before a person has said Yes on the Vallo
 * screen. `components/app/push/moments.ts` decides whether that screen is
 * shown; `PushPrompt` shows it; only its Yes handler calls `enrol`. The
 * system prompt is reached on the LAST line of a deliberate sequence, never
 * on a page load, because there is one system prompt per install and a
 * refusal to it is, on iOS, permanent.
 *
 * ===========================================================================
 * THE WEBSITE MUST NOT CHANGE, WHICH IS WHY THERE IS NO STATIC IMPORT OF ANY
 * CAPACITOR PACKAGE HERE.
 *
 * `lib/native/boot.ts` sets the rule for this repository: the same bundle
 * serves the website in a phone browser and the shell on a handset, and a
 * visitor to the website pays for nothing native. `looksNative()` reads an
 * injected global and imports nothing. Below that, the native path reaches
 * the plugin through `Capacitor.registerPlugin`, which is the documented way
 * to call a native plugin WITHOUT importing its JavaScript package.
 *
 * THAT CHOICE ALSO MEANS `@capacitor/push-notifications` IS NOT NEEDED FOR
 * THE WEB BUILD TO COMPILE. It is needed by `cap sync` to put the native
 * implementation into the Android and iOS projects, and it is declared in
 * `package.json` for exactly that. A web build with the package absent still
 * builds and still runs; the native branch simply finds no plugin and says
 * so, which is the same way every other native capability here degrades.
 */

export type EnrolOutcome =
  | { ok: true; deviceRef: string; platform: "web" | "ios" | "android" }
  | {
      ok: false;
      reason:
        /* The person, or a previous permanent refusal, said no. */
        | "permission_denied"
        /* No push in this browser at all: an old Android browser, or iOS
           Safari on a site that has not been installed to the home screen. */
        | "unsupported"
        /* The deployment has no VAPID key, so there is nothing to subscribe
           against. Nothing the person can do. */
        | "not_configured"
        /* The subscription or token was obtained and the server would not
           record it. */
        | "not_saved"
        | "failed";
    };

/** What the browser or operating system says right now, without asking. */
export function currentPermission(): "granted" | "denied" | "default" | "unsupported" {
  if (typeof window === "undefined") return "unsupported";
  if (looksNative()) {
    /* The native permission is not readable synchronously, and guessing
       `granted` here would let a caller skip the Vallo screen. `default` is
       the honest answer: ask properly. */
    return "default";
  }
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  const state = Notification.permission;
  return state === "granted" || state === "denied" ? state : "default";
}

/**
 * Enrol this device.
 *
 * MUST BE CALLED FROM A USER GESTURE, IN THE SAME TICK AS THE CLICK.
 * `Notification.requestPermission()` is gated on user activation, and an
 * `await` before it in some browsers loses that activation and the prompt
 * never appears. So the permission is requested FIRST, before the service
 * worker registration and before the key is fetched, even though that is the
 * less natural order to write.
 */
export async function enrol(): Promise<EnrolOutcome> {
  if (typeof window === "undefined") return { ok: false, reason: "unsupported" };
  return looksNative() ? enrolNative() : enrolWeb();
}

async function enrolWeb(): Promise<EnrolOutcome> {
  if (currentPermission() === "unsupported") return { ok: false, reason: "unsupported" };

  /* FIRST, AND SYNCHRONOUSLY FROM THE GESTURE. See the note above. */
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return { ok: false, reason: "failed" };
  }
  if (permission !== "granted") return { ok: false, reason: "permission_denied" };

  let publicKey: string;
  try {
    const response = await fetch("/api/push/key", { cache: "no-store" });
    const body = (await response.json()) as { configured?: boolean; publicKey?: string };
    if (!body.configured || typeof body.publicKey !== "string") {
      return { ok: false, reason: "not_configured" };
    }
    publicKey = body.publicKey;
  } catch {
    return { ok: false, reason: "not_configured" };
  }

  try {
    /* Registered at its own path's scope, NOT at `/`. A registration at `/`
       would replace `public/sw.js` and silently uninstall the offline shell.
       See the note in `app/api/push/sw/route.ts`. */
    const registration = await navigator.serviceWorker.register("/api/push/sw", { scope: "/api/push/" });
    await navigator.serviceWorker.ready.catch(() => undefined);

    /* An existing subscription is reused rather than replaced. Unsubscribing
       and re-subscribing mints a new endpoint and leaves the old row to be
       discovered as dead later, which is churn for nothing. */
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        /* Required by every browser: a push must result in something the
           person can see. It is also the honest description of what this
           feature is for. */
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(publicKey),
      }));

    const json = subscription.toJSON();
    const keys = json.keys ?? {};
    if (!keys.p256dh || !keys.auth) return { ok: false, reason: "failed" };

    return postRegistration({
      platform: "web",
      token: subscription.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      deviceLabel: browserLabel(),
    });
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/**
 * The Capacitor plugin, reached through the registry rather than imported.
 *
 * `registerPlugin` returns a proxy bound to the native implementation. If the
 * plugin is not in the native project, calls reject, which the catch below
 * turns into `unsupported` rather than a crash.
 */
type PushPlugin = {
  requestPermissions: () => Promise<{ receive: "granted" | "denied" | "prompt" | "prompt-with-rationale" }>;
  register: () => Promise<void>;
  addListener: (
    event: "registration" | "registrationError",
    handler: (payload: { value?: string; error?: string }) => void,
  ) => Promise<{ remove: () => Promise<void> }>;
};

async function enrolNative(): Promise<EnrolOutcome> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return { ok: false, reason: "unsupported" };

    const plugin = Capacitor.registerPlugin<PushPlugin>("PushNotifications");

    /* Alert, badge and sound in ONE request. Asking for them separately
       produces several prompts, and each one is a fresh chance to be
       refused. Capacitor's `requestPermissions` asks for all three. */
    const permission = await plugin.requestPermissions();
    if (permission.receive !== "granted") return { ok: false, reason: "permission_denied" };

    /* THE TOKEN ARRIVES ON A LISTENER, NOT AS A RETURN VALUE. `register()`
       resolves as soon as the request is made; the token comes back from
       APNs or FCM moments later on the `registration` event. Code that
       treats `register()` resolving as success registers nobody, which is a
       very easy mistake to make and an invisible one. */
    const token = await new Promise<string | null>((resolve) => {
      let done = false;
      const settle = (value: string | null): void => {
        if (done) return;
        done = true;
        resolve(value);
      };

      /* A handset with no network gets neither event. Ten seconds, then the
         person is told it did not work rather than being left on a spinner. */
      const timer = setTimeout(() => settle(null), 10_000);

      void plugin.addListener("registration", (payload) => {
        clearTimeout(timer);
        settle(typeof payload.value === "string" ? payload.value : null);
      });
      void plugin.addListener("registrationError", () => {
        clearTimeout(timer);
        settle(null);
      });
      void plugin.register().catch(() => {
        clearTimeout(timer);
        settle(null);
      });
    });

    if (!token) return { ok: false, reason: "failed" };

    const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
    return postRegistration({ platform, token, deviceLabel: platform === "ios" ? "iPhone" : "Android" });
  } catch {
    return { ok: false, reason: "unsupported" };
  }
}

async function postRegistration(body: {
  platform: "web" | "ios" | "android";
  token: string;
  p256dh?: string;
  auth?: string;
  deviceLabel?: string;
}): Promise<EnrolOutcome> {
  try {
    const response = await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!response.ok) return { ok: false, reason: "not_saved" };
    const result = (await response.json()) as { ok?: boolean; deviceRef?: string };
    if (!result.ok || typeof result.deviceRef !== "string") return { ok: false, reason: "not_saved" };
    return { ok: true, deviceRef: result.deviceRef, platform: body.platform };
  } catch {
    return { ok: false, reason: "not_saved" };
  }
}

/**
 * The application server key, as the bytes `subscribe` wants.
 *
 * It arrives as base64url and `applicationServerKey` takes a buffer. Browsers
 * accept a base64 string in some versions and not others, and the failure is
 * an `InvalidCharacterError` that says nothing about which. Converting here
 * works everywhere.
 */
function urlBase64ToBuffer(base64Url: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  /* Built over an explicit ArrayBuffer and returned as one. A Uint8Array
     over a SharedArrayBuffer is not a `BufferSource` as far as the DOM types
     are concerned, and the difference only shows up at the call site. */
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let index = 0; index < raw.length; index += 1) {
    view[index] = raw.charCodeAt(index);
  }
  return buffer;
}

/**
 * A name for this device, for its owner's eyes only.
 *
 * Coarse on purpose. It is shown back to the person so they can tell their
 * phone from their laptop on the settings screen, and it is never used to
 * identify anybody. A full user agent string would be a fingerprint stored
 * beside a token, which is a great deal more than the job needs.
 */
function browserLabel(): string {
  const agent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(agent)) return "iPhone or iPad";
  if (/Android/i.test(agent)) return "Android phone";
  if (/Macintosh/i.test(agent)) return "Mac";
  if (/Windows/i.test(agent)) return "Windows PC";
  return "This device";
}
