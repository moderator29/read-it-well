import {
  FIRST_RUN_PASSED_PARAM,
  firstRunHref,
  isFirstRunSeen,
} from "@/components/app/welcome/first-run-seen";

/**
 * Whether a door (`/sign-in` or `/sign-up`) sends this visitor to the
 * onboarding before it paints, and where.
 *
 * THE FOUNDER, 7 October 2026: the first time somebody taps Sign in or Sign up
 * on a device, anywhere (the landing capsule, the nav, a gated action), they
 * see the onboarding carousel first; at its end, or on Skip, they land on the
 * page they asked for. After that, on that device, both doors open straight.
 * So the whole door address (its `next`, its `notice`) is carried as
 * `/welcome?next=...` and comes back intact. This replaces V-18's "a Sign in
 * pressed on purpose never sees it".
 *
 * REMEMBERED PER DEVICE in one first-party cookie (`first-run-seen.ts`), not
 * localStorage: the server reads it, so a returning visitor never sees a slide
 * paint and snap away. A browser that refuses the cookie gets `welcomed=1` on
 * the hand-off instead, so the two screens can never bounce somebody.
 *
 * Ways straight through, each there to stop a loop or a wrong screen:
 *   - the cookie: this device has seen it;
 *   - `welcomed=1`: the storage-blocked hand-off above;
 *   - a session cookie on the request: never shown to a signed-in member;
 *   - any notice except `sign-in-required`: the account notices (a spent
 *     link, a sign-out, a passcode lock, an unconfigured platform) are about
 *     somebody who already has an account. `sign-in-required` is the wall in
 *     `proxy.ts` stopping a stranger on a gated action, which is exactly the
 *     first tap the founder means.
 *
 * Pure, so it is tested directly.
 */
export type AuthDoor = "/sign-in" | "/sign-up";

export function doorFirstRunRedirect(input: {
  door: AuthDoor;
  cookie: string | null | undefined;
  /** The request carries a Supabase session cookie. */
  signedIn?: boolean;
  params: Record<string, string | string[] | undefined>;
}): string | null {
  if (isFirstRunSeen(input.cookie)) return null;
  if (input.signedIn) return null;
  const passed = input.params[FIRST_RUN_PASSED_PARAM];
  if (passed === "1" || (Array.isArray(passed) && passed.includes("1"))) return null;
  const notice = input.params.notice;
  const notices = notice === undefined ? [] : Array.isArray(notice) ? notice : [notice];
  if (notices.some((n) => n !== "sign-in-required")) return null;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(input.params)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, v);
  }
  const query = search.toString();
  return firstRunHref(`${input.door}${query ? `?${query}` : ""}`);
}

/** The sign-in door's call, kept by name for its callers and tests. */
export function signInFirstRunRedirect(input: {
  cookie: string | null | undefined;
  signedIn?: boolean;
  params: Record<string, string | string[] | undefined>;
}): string | null {
  return doorFirstRunRedirect({ door: "/sign-in", ...input });
}

/** The cheap "is somebody signed in" read the doors use: a Supabase session cookie. */
export function hasSessionCookie(names: readonly string[]): boolean {
  return names.some((name) => name.startsWith("sb-") && name.includes("-auth-token"));
}
