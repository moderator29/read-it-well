"use client";

import { looksNative } from "@/lib/native/platform";

import {
  clearLocalDevice,
  isIosHomeScreenApp,
  writeLocalDevice,
  type EnrolFailureReason,
} from "./device-state";

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
      /*
       * See `device-state.ts` for the list and what each one means.
       *
       * "not_configured" and "signed_out" are told apart because they are
       * told apart nowhere else: the first is ours and the person can do
       * nothing, the second is theirs and signing in fixes it. Collapsing them
       * told the founder push was not set up on a deployment where it was.
       */
      reason: EnrolFailureReason;
    };

/**
 * How a reply from one of our push routes reads, as a failure, or null when it
 * is not one. A 401 or 403 is ALWAYS "signed_out": the proxy answers
 * `{"code":"sign-in-required"}` and `/api/push/register` answers
 * `{"reason":"signed_out"}`, and both mean no session reached us. A 503 from
 * register is the deployment with no database, which is ours.
 */
export function replyFailure(status: number): EnrolFailureReason | null {
  if (status === 401 || status === 403) return "signed_out";
  if (status === 503) return "not_configured";
  return null;
}

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
 * The endpoint of the Web Push subscription this browser holds right now, for
 * `deviceIsLive` in `device-state.ts`. `undefined` on native, where there is
 * no endpoint to compare; `null` when the browser holds no subscription, or
 * cannot say. Asks nothing and changes nothing: no permission prompt, no
 * worker registration.
 */
export async function currentEndpoint(): Promise<string | null | undefined> {
  if (typeof window === "undefined") return null;
  if (looksNative()) return undefined;
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return null;
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? subscription.endpoint : null;
  } catch {
    return null;
  }
}

/** For the copy: is this the iPhone home screen app, with its own sign-in? */
export function onIosHomeScreenApp(): boolean {
  if (typeof window === "undefined") return false;
  let displayModeStandalone = false;
  try {
    displayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  } catch {
    displayModeStandalone = false;
  }
  return isIosHomeScreenApp({
    userAgent: navigator.userAgent,
    navigatorStandalone: (navigator as Navigator & { standalone?: boolean }).standalone,
    displayModeStandalone,
  });
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

    /*
     * A 401 IS NOT A MISSING KEY. The route is public now, so this should not
     * happen; it is kept because it DID happen, on the live site, to the first
     * device anybody ever tried to register, and a reply this specific must
     * never again be flattened into "not set up".
     */
    const refused = replyFailure(response.status);
    if (refused) return { ok: false, reason: refused };

    const body = (await response.json()) as { configured?: boolean; publicKey?: string };
    if (!body.configured || typeof body.publicKey !== "string") {
      return { ok: false, reason: "not_configured" };
    }
    publicKey = body.publicKey;
  } catch {
    /* The fetch itself did not complete: offline, DNS, a proxy. Not a
       statement about our configuration, so it does not claim to be one. */
    return { ok: false, reason: "failed" };
  }

  try {
    /* ONE WORKER AT `/`, WHICH IS `public/sw.js`, AND IT NOW CARRIES THE PUSH
       HANDLERS ITSELF. Registering the same script at the same scope is
       idempotent: if `ServiceWorkerRegistrar` has already installed it, this
       resolves with the registration that exists rather than replacing it.

       It is called here anyway rather than trusting the registrar, because
       the registrar is production-only and a person granting the permission
       must end up with a worker whatever the build. */
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready.catch(() => undefined);
    await retireLegacyPushWorker();

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

    return await postRegistration({
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

/**
 * THE WORKER THAT USED TO DO THIS JOB, TAKEN OFF ANY HANDSET THAT HAS IT.
 *
 * Push handlers were briefly served from `/api/push/sw` at scope
 * `/api/push/`, to avoid displacing the offline shell at `/`. They now live
 * in `public/sw.js`, and a stale registration at the old scope would hold a
 * push subscription of its own: the row in `push_tokens` would still be live,
 * the old worker would still display, and the person would get TWO
 * notifications for one event with no way to tell which worker to blame.
 *
 * So it is unregistered before the new subscription is taken. Unregistering
 * a registration also drops its push subscription, so nothing is left holding
 * an endpoint.
 *
 * WHETHER ANY DEVICE ACTUALLY HAS ONE: almost certainly none does, because
 * `enrolWeb` above returns `not_configured` and never reaches the register
 * call when there is no VAPID key, and no deployment has ever had one. This
 * runs anyway. "Almost certainly none" is not a thing to build on, and the
 * cost of being wrong is a duplicate notification on somebody's lock screen.
 */
async function retireLegacyPushWorker(): Promise<void> {
  try {
    const stale = await navigator.serviceWorker.getRegistration("/api/push/sw");
    if (!stale) return;
    if (!stale.scope.endsWith("/api/push/")) return;
    await stale.unregister();
  } catch {
    /* Nothing to do about it and nothing worth telling the person. The worst
       case is the duplicate this is trying to avoid, which is visible and
       which they can report. */
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
    /* THE REGISTER CALL IS WHERE A MISSING SESSION NOW SHOWS UP. With the
       key route open, a home screen app with no session of its own gets the
       key, subscribes, and is refused here. That is "signed_out", not
       "not_saved": the fix is to sign in inside the app, and saying "try
       again in a moment" would send the person round the same loop. */
    const refused = replyFailure(response.status);
    if (refused) return failedAndForgotten(refused);
    if (!response.ok) return failedAndForgotten("not_saved");
    const result = (await response.json()) as { ok?: boolean; deviceRef?: string };
    if (!result.ok || typeof result.deviceRef !== "string" || result.deviceRef.length === 0) {
      return failedAndForgotten("not_saved");
    }
    /* THE ONLY PLACE A DEVICE IS RECORDED AS ON. The server has just said it
       holds a live row for this token and named it. See `device-state.ts`. */
    writeLocalDevice({
      deviceRef: result.deviceRef,
      endpoint: body.platform === "web" ? body.token : null,
    });
    return { ok: true, deviceRef: result.deviceRef, platform: body.platform };
  } catch {
    return failedAndForgotten("not_saved");
  }
}

/* A failed registration also forgets any earlier one, so a stale record can
   never be the thing that lights the control after a refusal. */
function failedAndForgotten(reason: EnrolFailureReason): EnrolOutcome {
  clearLocalDevice();
  return { ok: false, reason };
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
