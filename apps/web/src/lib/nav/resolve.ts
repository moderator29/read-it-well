/**
 * Turning a path into the screen above it, and deciding what Back does.
 *
 * This module reads `route-parents.ts` and nothing else. It touches no DOM, no
 * router and no browser global, which is what lets every rule below be proved
 * in `resolve.test.ts` without a browser: the whole decision a back control
 * takes is a pure function of a handful of facts, and `chooseBack` is that
 * function. `docs/BACK_NAVIGATION.md` is the table it produces.
 *
 * MATCHING, AND WHY SPECIFICITY IS NOT OPTIONAL HERE.
 *
 * `/messages/share/listing/abc` matches both `/messages/share/listing/[id]`
 * and, if somebody ever adds one, `/messages/share/[kind]/[id]`. A literal
 * segment beats a dynamic one, compared left to right, which is the same rule
 * the router itself uses. Segment counts must match exactly; there are no
 * catch-all routes in this application and none are supported here.
 *
 * THE RULE (founder, 29 September 2026: "there are many back buttons that
 * take me to places they're not supposed to").
 *
 * Back returns to THE SCREEN YOU CAME FROM when that screen is inside the
 * product and safe to return to, and otherwise to the DECLARED PARENT. The
 * previous rule was "history only when the previous entry IS the parent", and
 * that rule sent a listing opened from Home to Search, a profile opened from
 * a post to the feed, a booking opened from Notifications to Plans, and a
 * help page opened from a workspace drawer to the consumer Home: a screen the
 * person had never seen, every time. The parent is right for a cold deep link
 * and wrong for somebody who walked in, so it is now the fallback it should
 * have been.
 *
 * "SAFE" IS WRITTEN DOWN, NOT GUESSED (`refuseHistory`). The screen behind is
 * refused, and the declared parent used instead, when it is:
 *
 *   - unknowable (no Navigation API, or not ours): no proof, no history;
 *   - a door (sign in, sign up, the auth callback, the password reset, the
 *     welcome intro, a redirect route): back must never re-open the login page
 *     for somebody who is signed in, which was the founder's first example;
 *   - a flow (a form or a payment that ends in a navigation: a new message, a
 *     checkout, a review, a sign-up form): back must never return to a form
 *     somebody already submitted;
 *   - carrying a success flag (`?done=`), which is a redirect's receipt;
 *   - BELOW the current screen (a child of it): that is the entry a previous
 *     "up" left behind, and returning to it is a loop;
 *   - in a DIFFERENT workspace, when the current screen is inside one (and
 *     is not its landing): Back inside the admin, agent or host console never
 *     crosses into another console. A consumer screen behind a workspace
 *     screen IS returned to (a help page opened from the agent drawer, a
 *     listing flow opened from the Create sheet), because that is where the
 *     person was.
 *
 * THE PARENT IS REPLACED, NOT PUSHED. When the parent is used, the current
 * entry is replaced by it, so the browser's own back afterwards goes where it
 * would have gone and never back to the screen the person just left. A push
 * left a stack of up-navigations the browser then replayed in reverse.
 *
 * SAME-SCREEN ENTRIES ARE STEPPED OVER. A search re-filtered three times, a
 * form step and an opened sheet each leave entries at the same address. The
 * candidate is the nearest entry at a DIFFERENT address (`previous-entry.ts`
 * measures the distance), so one press leaves the screen rather than undoing
 * a filter.
 */

import { ROUTE_PARENTS, type ParentRoute } from "./route-parents";

/** Where a route sits in the hierarchy. */
export type BackTarget =
  /** A declared parent, with its dynamic segments already filled in. */
  | { kind: "parent"; pattern: string; href: string }
  /** The top of the hierarchy. Nothing is above this. */
  | { kind: "root"; pattern: string }
  /** Not in `route-parents.ts`. Loud, never guessed at. */
  | { kind: "no-parent-declared" };

/** Why the screen behind was not used. For tests, the doc and dev warnings. */
export type HistoryRefusal =
  | "no-previous"
  | "not-in-app"
  | "undeclared"
  | "door"
  | "flow"
  | "success-flag"
  | "descendant"
  | "other-workspace";

/** What a back control should actually do. */
export type BackDecision =
  /** Walk history `delta` entries back (1 is the entry directly behind). */
  | { action: "back"; href: string; delta: number; reason: "history-is-parent" | "history-is-origin" }
  /** Replace the current entry with `href`. */
  | {
      action: "replace";
      href: string;
      reason: "declared-parent" | "root-fallback" | "no-parent-declared";
      refused?: HistoryRefusal;
    }
  | { action: "exit"; reason: "root" };

export type MatchedRoute = { pattern: string; params: Readonly<Record<string, string>> };

const DYNAMIC = /^\[(.+)\]$/;

/**
 * Strip the query, the hash and any trailing slash, and guarantee a leading
 * one. `usePathname()` already hands us a bare path, but the Navigation API
 * hands us a full URL and the hardware back button hands us
 * `window.location.pathname`, so the three are levelled here rather than at
 * three call sites.
 */
export function normalisePath(input: string): string {
  const bare = (input.split("?")[0] ?? "").split("#")[0] ?? "";
  const leading = bare.startsWith("/") ? bare : `/${bare}`;
  if (leading.length > 1 && leading.endsWith("/")) return leading.slice(0, -1);
  return leading;
}

function segments(path: string): string[] {
  const trimmed = normalisePath(path);
  return trimmed === "/" ? [] : trimmed.slice(1).split("/");
}

/**
 * Score a candidate against a path, left to right.
 *
 * `null` means it does not match at all. Otherwise the array holds 2 for a
 * literal segment and 1 for a dynamic one, and candidates are compared
 * element by element, so a literal at position 0 outranks a literal at
 * position 1 no matter what follows.
 */
function score(pattern: string, path: string): number[] | null {
  const want = segments(pattern);
  const have = segments(path);
  if (want.length !== have.length) return null;
  const out: number[] = [];
  for (let i = 0; i < want.length; i += 1) {
    const expected = want[i] ?? "";
    const actual = have[i] ?? "";
    if (DYNAMIC.test(expected)) {
      if (actual === "") return null;
      out.push(1);
    } else if (expected === actual) {
      out.push(2);
    } else {
      return null;
    }
  }
  return out;
}

function beats(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i += 1) {
    const mine = a[i] ?? 0;
    const theirs = b[i] ?? 0;
    if (mine !== theirs) return mine > theirs;
  }
  return false;
}

/** The most specific pattern in the map that this path matches, if any. */
export function matchRoute(path: string): MatchedRoute | null {
  let best: { pattern: string; score: number[] } | null = null;
  for (const pattern of Object.keys(ROUTE_PARENTS)) {
    const candidate = score(pattern, path);
    if (!candidate) continue;
    if (!best || beats(candidate, best.score)) best = { pattern, score: candidate };
  }
  if (!best) return null;

  const want = segments(best.pattern);
  const have = segments(path);
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i += 1) {
    const dynamic = DYNAMIC.exec(want[i] ?? "");
    const name = dynamic?.[1];
    if (name) params[name] = have[i] ?? "";
  }
  return { pattern: best.pattern, params };
}

/**
 * Fill a parent pattern's dynamic segments from the ones captured on the child.
 *
 * A parent naming a segment the child never captured is a fault in the map, not
 * a runtime condition, so it throws rather than shipping a literal `[handle]`
 * into the address bar. `every declared parent resolves` in the test file walks
 * the whole map and is where that fault gets caught.
 */
export function fillPattern(pattern: string, params: Readonly<Record<string, string>>): string {
  const filled = segments(pattern).map((segment) => {
    const dynamic = DYNAMIC.exec(segment);
    if (!dynamic) return segment;
    const name = dynamic[1] ?? "";
    const value = params[name];
    if (value === undefined) {
      throw new Error(
        `route-parents: parent "${pattern}" needs a [${name}] the child route does not capture`,
      );
    }
    return value;
  });
  return filled.length === 0 ? "/" : `/${filled.join("/")}`;
}

/** Where this path's back control belongs, regardless of how anybody arrived. */
export function parentOf(path: string): BackTarget {
  const matched = matchRoute(path);
  if (!matched) return { kind: "no-parent-declared" };
  /* `matched.pattern` came out of `Object.keys(ROUTE_PARENTS)`, so the lookup
     cannot miss; `noUncheckedIndexedAccess` cannot know that, and an undefined
     here would mean an undeclared route, which is what it is treated as. */
  const parent: ParentRoute | undefined = ROUTE_PARENTS[matched.pattern];
  if (parent === undefined) return { kind: "no-parent-declared" };
  if (parent === null) return { kind: "root", pattern: matched.pattern };
  return { kind: "parent", pattern: matched.pattern, href: fillPattern(parent, matched.params) };
}

/**
 * Is this the top of the hierarchy?
 *
 * The one question Android's hardware back button asks before it is allowed to
 * close the application. An undeclared route answers NO, deliberately: the cost
 * of being wrong here is the shell disappearing mid-task, so a route nobody has
 * placed in the hierarchy is never an exit point.
 */
export function isAppRoot(path: string): boolean {
  return parentOf(path).kind === "root";
}

/* ----------------------------------------------------- what is safe behind */

/**
 * Doors: screens a signed-in person must never be sent back into, and the
 * redirect routes that are never a screen at all. `/sign-up/finish` is NOT
 * here: it is the terms gate, and a person who opened the terms from it goes
 * back to it.
 */
const DOORS: readonly string[] = [
  "/sign-in",
  "/sign-in/email",
  "/sign-up",
  "/sign-up/email",
  "/sign-up/verify",
  "/forgot-password",
  "/forgot-password/code",
  "/reset-password",
  "/auth/callback",
  "/welcome",
  "/start",
  "/open",
  "/home-or-landing",
  "/admin/enter",
  "/s/[token]",
  "/offline",
];

/**
 * Flows: forms and payments that end in a navigation. Back never returns to
 * one of these through history (a submitted form, a paid checkout), unless it
 * IS the declared parent, which only the auth steps are. Opened cold, each has
 * its own declared parent like any other screen.
 */
const FLOWS: readonly string[] = [
  "/messages/new",
  "/messages/share/into/[id]",
  "/messages/share/listing/[id]",
  "/messages/share/stay/[id]",
  "/messages/share/booking/[id]",
  "/stories/new",
  "/around/new",
  "/support/new",
  "/u/[handle]/edit",
  "/tenancy/[id]/complaint",
  "/bookings/[bookingId]/review",
  "/checkout",
  "/checkout/[bookingId]",
  "/pay/crypto/[reference]",
  "/rent/pay/[inspectionId]",
  "/rent/review/[paymentId]",
  "/rent/move-in/[listingId]",
  "/profile/setup/[role]",
  "/profile/setup/agent",
  "/profile/setup/firm",
  "/profile/setup/owner",
  "/verification",
  "/settings/phone",
  "/settings/passcode",
  "/agent/list",
  "/agent/listings/[listingId]/mandate",
  "/host/apply",
  "/host/start",
  "/host/transfer",
];

/** A workspace, by address, and the screen it opens on. */
const WORKSPACES: readonly { name: string; prefix: string; landing: string }[] = [
  { name: "admin", prefix: "/admin", landing: "/admin" },
  { name: "agent", prefix: "/agent", landing: "/agent/dashboard" },
  { name: "host", prefix: "/host", landing: "/host" },
];

function workspaceOf(path: string): { name: string; landing: string } | null {
  const bare = normalisePath(path);
  for (const ws of WORKSPACES) {
    if (bare === ws.prefix || bare.startsWith(`${ws.prefix}/`)) return ws;
  }
  return null;
}

/** Does this path match one of these patterns, by the same matcher? */
function matchesAny(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => score(pattern, path) !== null);
}

/** Is `ancestor` somewhere above `path` in the declared hierarchy? */
export function isAncestor(ancestor: string, path: string): boolean {
  const want = normalisePath(ancestor);
  let at = normalisePath(path);
  for (let steps = 0; steps < 16; steps += 1) {
    const target = parentOf(at);
    if (target.kind !== "parent") return false;
    if (target.href === want) return true;
    at = target.href;
  }
  return false;
}

export function isDoor(path: string): boolean {
  return matchesAny(normalisePath(path), DOORS);
}

export function isFlow(path: string): boolean {
  return matchesAny(normalisePath(path), FLOWS);
}

/**
 * Why the screen behind may NOT be returned to through history, or `null`
 * when it may. `previous` keeps its query, because a success flag lives there.
 */
export function refuseHistory(current: string, previous: string | null, previousIsInApp: boolean): HistoryRefusal | null {
  if (previous === null) return "no-previous";
  if (!previousIsInApp) return "not-in-app";
  const prev = normalisePath(previous);
  const here = normalisePath(current);
  if (matchRoute(prev) === null) return "undeclared";
  if (isDoor(prev)) return "door";
  if (isFlow(prev)) return "flow";
  if (/[?&]done=/.test(previous)) return "success-flag";
  if (prev === here || isAncestor(here, prev)) return "descendant";
  const ws = workspaceOf(here);
  const from = workspaceOf(prev);
  if (ws && from && from.name !== ws.name && here !== ws.landing) return "other-workspace";
  return null;
}

export type BackInput = {
  /** Where the person is now. */
  path: string;
  /** Where to go when this route has no declared parent. */
  fallback: string;
  /**
   * The nearest history entry behind this one AT A DIFFERENT ADDRESS, with its
   * query, when it can be known, and `null` whenever it cannot. See
   * `previous-entry.ts`.
   */
  previousPath: string | null;
  /** How many entries back `previousPath` is. 1 when omitted. */
  previousDistance?: number;
  /** `canGoBackInApp()`: is the previous entry inside this application? */
  previousIsInApp: boolean;
  /**
   * `"android"` is the hardware button, where a root may close the shell.
   * `"web"` is every drawn back control, where a root has no back at all.
   */
  surface: "web" | "android";
};

/** The whole decision, as one pure function. */
export function chooseBack(input: BackInput): BackDecision {
  const target = parentOf(input.path);

  if (target.kind === "no-parent-declared") {
    return { action: "replace", href: input.fallback, reason: "no-parent-declared" };
  }

  if (target.kind === "root") {
    if (input.surface === "android") return { action: "exit", reason: "root" };
    return { action: "replace", href: input.fallback, reason: "root-fallback" };
  }

  const delta = Math.max(1, Math.floor(input.previousDistance ?? 1));
  const previous = input.previousPath === null ? null : normalisePath(input.previousPath);

  /* The declared parent, sitting right behind: always the best answer, because
     it restores the scroll, the filters and the list exactly. */
  if (input.previousIsInApp && previous !== null && previous === target.href) {
    return { action: "back", href: target.href, delta, reason: "history-is-parent" };
  }

  const refused = refuseHistory(input.path, input.previousPath, input.previousIsInApp);
  if (refused === null && previous !== null) {
    return { action: "back", href: previous, delta, reason: "history-is-origin" };
  }

  if (refused === null || refused === "no-previous") {
    return { action: "replace", href: target.href, reason: "declared-parent" };
  }
  return { action: "replace", href: target.href, reason: "declared-parent", refused };
}
