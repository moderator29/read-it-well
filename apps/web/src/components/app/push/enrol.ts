"use client";

import { looksNative } from "@/lib/native/platform";

import {
  clearLocalDevice,
  isIosHomeScreenApp,
  readLocalDevice,
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
      /*
       * WHICH STEP FAILED, AND WHAT THE BROWSER CALLED THE ERROR.
       *
       * Every real attempt from the iPhone home screen app on 23 September
       * died in the browser before the register POST was sent (the database
       * logs show the settings page read `push_tokens` thirty times and no
       * write ever arrived), and "That did not work" could not say where. The
       * step and the DOMException name are shown with the failure sentence so
       * the next attempt names its own cause. Neither carries a token or a key.
       */
      step?: EnrolStep;
      detail?: string;
    };

export type EnrolStep = "permission" | "key" | "worker" | "ready" | "subscribe" | "keys" | "register";

/** A short reference for a failure, e.g. `subscribe/NotAllowedError`, or null. */
export function failureReference(outcome: EnrolOutcome): string | null {
  if (outcome.ok || !outcome.step) return null;
  const detail = (outcome.detail ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  return detail ? `${outcome.step}/${detail}` : outcome.step;
}

function errorName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error && typeof error.name === "string") {
    return error.name;
  }
  return "Error";
}

/* A promise that settles within `ms` or rejects with a TimeoutError. Used on
   the two waits that can hang for ever on a worker that never activates. */
function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error("timed out");
      error.name = "TimeoutError";
      reject(error);
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/* Two keys are the same key when their bytes are. */
function sameKey(a: ArrayBuffer | null | undefined, b: ArrayBuffer): boolean {
  if (!a) return false;
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

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
       `granted` here would let a caller skip the Vallo screen. F-15: the
       shell reads the real answer at launch (`readNativePermission`, from
       `lib/native/boot.ts`) and it is remembered here; until that read has
       answered, `default` is the honest answer: ask properly. */
    return nativePermissionSeen ?? "default";
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

  /* FIRST, AND SYNCHRONOUSLY FROM THE GESTURE. See the note above. Skipped
     when the permission is already granted: there is nothing to ask, and on
     WebKit `pushManager.subscribe` needs no gesture once it is granted. */
  let permission: NotificationPermission;
  try {
    permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  } catch (error) {
    return { ok: false, reason: "failed", step: "permission", detail: errorName(error) };
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
    if (refused) return { ok: false, reason: refused, step: "key", detail: String(response.status) };

    const body = (await response.json()) as { configured?: boolean; publicKey?: string };
    if (!body.configured || typeof body.publicKey !== "string") {
      return { ok: false, reason: "not_configured", step: "key" };
    }
    publicKey = body.publicKey;
  } catch (error) {
    /* The fetch itself did not complete: offline, DNS, a proxy. Not a
       statement about our configuration, so it does not claim to be one. */
    return { ok: false, reason: "failed", step: "key", detail: errorName(error) };
  }

  /* ONE WORKER AT `/`, WHICH IS `public/sw.js`, AND IT CARRIES THE PUSH
     HANDLERS ITSELF. Registering the same script at the same scope is
     idempotent: if `ServiceWorkerRegistrar` has already installed it, this
     resolves with the registration that exists rather than replacing it.

     It is called here anyway rather than trusting the registrar, because
     the registrar is production-only and a person granting the permission
     must end up with a worker whatever the build. */
  let registration: ServiceWorkerRegistration;
  try {
    registration = await within(navigator.serviceWorker.register("/sw.js", { scope: "/" }), 15_000);
  } catch (error) {
    return { ok: false, reason: "failed", step: "worker", detail: errorName(error) };
  }
  try {
    /* `ready` never rejects: a worker that fails to activate leaves it
       pending for ever, and the button on "Just a moment" for ever with it.
       Bounded, so the person is told instead. */
    registration = await within(navigator.serviceWorker.ready, 15_000);
  } catch (error) {
    return { ok: false, reason: "failed", step: "ready", detail: errorName(error) };
  }
  await retireLegacyPushWorker();

  const serverKey = urlBase64ToBuffer(publicKey);
  let subscription: PushSubscription;
  try {
    /* An existing subscription is reused rather than replaced, WHEN IT WAS
       MADE WITH TODAY'S KEY. One made against an earlier key would be
       registered happily and then refused by the push service on the first
       send, so it is dropped and a fresh one taken. */
    let existing = await registration.pushManager.getSubscription();
    if (existing && !sameKey(existing.options?.applicationServerKey, serverKey)) {
      await existing.unsubscribe().catch(() => false);
      existing = null;
    }
    subscription =
      existing ??
      (await registration.pushManager.subscribe({
        /* Required by every browser: a push must result in something the
           person can see. It is also the honest description of what this
           feature is for. */
        userVisibleOnly: true,
        applicationServerKey: serverKey,
      }));
  } catch (error) {
    return { ok: false, reason: "failed", step: "subscribe", detail: errorName(error) };
  }

  const json = subscription.toJSON();
  const keys = json.keys ?? {};
  if (!keys.p256dh || !keys.auth) return { ok: false, reason: "failed", step: "keys" };

  return postRegistration({
    platform: "web",
    token: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    deviceLabel: browserLabel(),
  });
}

/**
 * The Capacitor plugin, reached through the registry rather than imported.
 *
 * `registerPlugin` returns a proxy bound to the native implementation. If the
 * plugin is not in the native project, calls reject, which the catch below
 * turns into `unsupported` rather than a crash.
 */
type NativeReceive = "granted" | "denied" | "prompt" | "prompt-with-rationale";

type PushPlugin = {
  requestPermissions: () => Promise<{ receive: NativeReceive }>;
  checkPermissions?: () => Promise<{ receive: NativeReceive }>;
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
    nativePermissionSeen = fromReceive(permission.receive);
    if (permission.receive !== "granted") return { ok: false, reason: "permission_denied" };

    const token = await nativeToken(plugin);

    if (!token) return { ok: false, reason: "failed" };

    const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
    return postRegistration({ platform, token, deviceLabel: platform === "ios" ? "iPhone" : "Android" });
  } catch {
    return { ok: false, reason: "unsupported" };
  }
}

/**
 * Ask the plugin for this device's token and wait for it to arrive on the
 * listener. Null on an error or after ten seconds without an answer.
 */
function nativeToken(plugin: PushPlugin): Promise<string | null> {
  /* THE TOKEN ARRIVES ON A LISTENER, NOT AS A RETURN VALUE. `register()`
     resolves as soon as the request is made; the token comes back from
     APNs or FCM moments later on the `registration` event. Code that
     treats `register()` resolving as success registers nobody, which is a
     very easy mistake to make and an invisible one. */
  return new Promise<string | null>((resolve) => {
    let done = false;
    /* Every attempt used to add a fresh `registration` and
       `registrationError` pair and never remove it, so a person who tried
       twice had two listeners posting two registrations. Both handles are
       kept and removed the moment this attempt settles. */
    const handles: Array<Promise<{ remove: () => Promise<void> }>> = [];
    const settle = (value: string | null): void => {
      if (done) return;
      done = true;
      for (const handle of handles) void handle.then((h) => h.remove()).catch(() => undefined);
      resolve(value);
    };

    /* A handset with no network gets neither event. Ten seconds, then the
       person is told it did not work rather than being left on a spinner. */
    const timer = setTimeout(() => settle(null), 10_000);

    handles.push(
      plugin.addListener("registration", (payload) => {
        clearTimeout(timer);
        settle(typeof payload.value === "string" ? payload.value : null);
      }),
      plugin.addListener("registrationError", () => {
        clearTimeout(timer);
        settle(null);
      }),
    );
    void plugin.register().catch(() => {
      clearTimeout(timer);
      settle(null);
    });
  });
}

/** The answer the shell last read from the operating system (F-15). */
let nativePermissionSeen: "granted" | "denied" | "default" | null = null;

function fromReceive(receive: NativeReceive): "granted" | "denied" | "default" {
  return receive === "granted" ? "granted" : receive === "denied" ? "denied" : "default";
}

/**
 * F-15: the real notification permission on a handset, read WITHOUT asking.
 * `checkPermissions` never shows a prompt. Remembered so `currentPermission`
 * stops answering `default` to somebody who already said yes, which offered
 * them the Vallo explainer again.
 */
export async function readNativePermission(): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (typeof window === "undefined" || !looksNative()) return "unsupported";
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return "unsupported";
    const plugin = Capacitor.registerPlugin<PushPlugin>("PushNotifications");
    if (typeof plugin.checkPermissions !== "function") return "unsupported";
    const { receive } = await plugin.checkPermissions();
    nativePermissionSeen = fromReceive(receive);
    return nativePermissionSeen;
  } catch {
    return "unsupported";
  }
}

/**
 * F-14: at launch, a device that was enrolled before and still has the
 * permission re-registers silently, so a token APNs or FCM rotated is not left
 * stale until the provider answers "gone". It never prompts and never runs for
 * a device that was not enrolled on this install: the rule at the top of this
 * file (nothing before a Yes on the Vallo screen) holds. The server upserts
 * the same token, so an unchanged token is a no-op there.
 *
 * Returns what happened, for the boot log and the test; the person sees
 * nothing either way.
 */
export async function refreshNativeRegistration(): Promise<"refreshed" | "skipped" | "failed"> {
  if (typeof window === "undefined" || !looksNative()) return "skipped";
  if (!readLocalDevice()) return "skipped";
  try {
    const permission = await readNativePermission();
    if (permission !== "granted") return "skipped";
    const { Capacitor } = await import("@capacitor/core");
    const plugin = Capacitor.registerPlugin<PushPlugin>("PushNotifications");
    const token = await nativeToken(plugin);
    if (!token) return "failed";
    const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
    const outcome = await postRegistration({ platform, token, deviceLabel: platform === "ios" ? "iPhone" : "Android" });
    return outcome.ok ? "refreshed" : "failed";
  } catch {
    return "failed";
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
    if (refused) return failedAndForgotten(refused, String(response.status));
    if (!response.ok) return failedAndForgotten("not_saved", String(response.status));
    const result = (await response.json()) as { ok?: boolean; deviceRef?: string };
    if (!result.ok || typeof result.deviceRef !== "string" || result.deviceRef.length === 0) {
      return failedAndForgotten("not_saved", "no-ref");
    }
    /* THE ONLY PLACE A DEVICE IS RECORDED AS ON. The server has just said it
       holds a live row for this token and named it. See `device-state.ts`. */
    writeLocalDevice({
      deviceRef: result.deviceRef,
      endpoint: body.platform === "web" ? body.token : null,
    });
    return { ok: true, deviceRef: result.deviceRef, platform: body.platform };
  } catch (error) {
    return failedAndForgotten("not_saved", errorName(error));
  }
}

/* A failed registration also forgets any earlier one, so a stale record can
   never be the thing that lights the control after a refusal. */
function failedAndForgotten(reason: EnrolFailureReason, detail?: string): EnrolOutcome {
  clearLocalDevice();
  return { ok: false, reason, step: "register", ...(detail ? { detail } : {}) };
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
