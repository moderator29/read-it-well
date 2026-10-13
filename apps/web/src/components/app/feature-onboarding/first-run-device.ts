import { safeReturnPath } from "@/lib/security/return-path";
import { firstRunPath, isMountedFirstRun, type MountedFirstRun } from "./first-runs";

/**
 * THE DEVICE'S MEMORY OF WHICH FIRST RUNS IT HAS SHOWN.
 *
 * North star 14.1 wants a first run remembered per member, server side, so it
 * survives a device change. That record is Session 2's (request W7-R1) and
 * does not exist yet. Until it does, this device remembers instead, so the
 * rule that holds today is the weaker, SAFE one: a first run is shown at most
 * once per device, and never blocks.
 *
 * A COOKIE, NOT localStorage, for the reason `welcome/first-run-seen.ts` gave:
 * the server reads it before it paints, so a member who has seen a first run
 * is never shown a frame of it and snapped away, and the gate can decide in
 * the page rather than after hydration. Every page that gates is signed-in,
 * and a signed-in session lives in cookies, so a browser that refuses this
 * cookie has refused the session too; the passed flag below covers the rest.
 *
 * WRITTEN WHEN THE FIRST RUN IS SHOWN, NOT WHEN IT IS FINISHED. "At most once"
 * is the promise, so leaving half way through still counts as seen: a member
 * who walked away from a first run does not meet it again on their next tap.
 *
 * The value is a list of feature keys joined by dots (`host.passport`). It
 * names features, never a person, and lasts the 400 days browsers now allow.
 */
export const FEATURE_RUNS_COOKIE = "vallo_feature_runs";
export const FEATURE_RUNS_MAX_AGE = 60 * 60 * 24 * 400;

/**
 * The flag a first run's exits carry ONLY when the cookie would not stick,
 * so a gate cannot send the member back into the first run they just left.
 */
export const FEATURE_RUN_PASSED_PARAM = "shown";

/** The features a cookie value records, ignoring anything it does not know. */
export function parseFeatureRuns(value: string | null | undefined): Set<MountedFirstRun> {
  const out = new Set<MountedFirstRun>();
  for (const part of (value ?? "").split(".")) {
    if (isMountedFirstRun(part)) out.add(part);
  }
  return out;
}

/** The cookie value with one more feature recorded, in a stable order. */
export function withFeatureRun(value: string | null | undefined, feature: MountedFirstRun): string {
  const seen = parseFeatureRuns(value);
  seen.add(feature);
  return [...seen].sort().join(".");
}

/** The exact Set-Cookie style string the client writes. Exported for the test. */
export function featureRunsCookieString(value: string, secure: boolean): string {
  return [
    `${FEATURE_RUNS_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${FEATURE_RUNS_MAX_AGE}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

function readCookie(): string | null {
  const prefix = `${FEATURE_RUNS_COOKIE}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  }
  return null;
}

/**
 * Record on this device that a first run was shown. Client only. Returns
 * whether the record is really there afterwards, so the caller falls back to
 * the passed flag rather than trust a write the browser silently refused.
 */
export function rememberFeatureRun(feature: MountedFirstRun): boolean {
  if (typeof document === "undefined") return false;
  try {
    document.cookie = featureRunsCookieString(
      withFeatureRun(readCookie(), feature),
      window.location.protocol === "https:",
    );
    return parseFeatureRuns(readCookie()).has(feature);
  } catch {
    return false;
  }
}

/**
 * Where a first run may hand the member on to: a same-origin path through the
 * platform's one return-path guard, and never another first run (a loop with
 * extra steps). Anything else falls back to the feature's own home.
 */
export function firstRunNext(raw: string | null | undefined, home: string): string {
  if (!raw) return home;
  const q = raw.indexOf("?");
  const pathname = q === -1 ? raw : raw.slice(0, q);
  const search = q === -1 ? "" : raw.slice(q);
  const safe = safeReturnPath(pathname, search);
  if (!safe) return home;
  if (/^\/first-run(?:[/?#]|$)/.test(pathname)) return home;
  return safe;
}

/** Append the passed flag to a same-origin path, for the cookie-refused case. */
export function withFeatureRunPassed(path: string): string {
  const [base, hash = ""] = path.split("#", 2) as [string, string?];
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}${FEATURE_RUN_PASSED_PARAM}=1${hash ? `#${hash}` : ""}`;
}

/** What a store can say about one member and one feature. */
export type FirstRunAnswer = "seen" | "unseen" | "unknown";

/**
 * Should this page send the member to the feature's first run? Pure, so the
 * three-way rule is tested without a request: a server answer wins; without
 * one the device's cookie decides; the passed flag always means no.
 */
export function shouldShowFirstRun(input: {
  server: FirstRunAnswer;
  deviceSeen: boolean;
  passed: boolean;
}): boolean {
  if (input.passed) return false;
  if (input.server === "seen") return false;
  if (input.server === "unseen") return true;
  return !input.deviceSeen;
}

/** The first run's address, carrying where the member was going. */
export function firstRunHref(feature: MountedFirstRun, next: string): string {
  return `${firstRunPath(feature)}?next=${encodeURIComponent(next)}`;
}

