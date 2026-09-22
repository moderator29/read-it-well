/**
 * Turning a path into the screen above it.
 *
 * This module reads `route-parents.ts` and nothing else. It touches no DOM, no
 * router and no browser global, which is what lets every rule below be proved
 * in `resolve.test.ts` without a browser: the whole decision a back control
 * takes is a pure function of four facts, and `chooseBack` is that function.
 *
 * MATCHING, AND WHY SPECIFICITY IS NOT OPTIONAL HERE.
 *
 * `/messages/share/listing/abc` matches both `/messages/share/listing/[id]`
 * and, if somebody ever adds one, `/messages/share/[kind]/[id]`. A literal
 * segment beats a dynamic one, compared left to right, which is the same rule
 * the router itself uses and the reason the four share entries in the map can
 * each name a different parent. Segment counts must match exactly; there are no
 * catch-all routes in this application and none are supported here, because a
 * catch-all with a single declared parent would be a guess wearing a
 * declaration's clothes.
 *
 * THE PROOF `chooseBack` DEMANDS BEFORE IT WILL USE HISTORY.
 *
 * Going back through history is better than pushing the parent when, and only
 * when, the previous entry IS the parent: it restores the scroll position, the
 * filters and the list the person had, which is the thing a push throws away.
 * So history is used only when both of these hold:
 *
 *   1. the previous entry is provably inside this application, which is what
 *      `canGoBackInApp()` answers, and
 *   2. the previous entry's path is provably equal to the declared parent.
 *
 * Fact 2 needs a URL, and only the Navigation API can supply one (see
 * `previous-entry.ts`). Everywhere it is missing, `previousPath` arrives here
 * as `null`, the proof fails, and the declared parent is pushed. That is the
 * failure direction this whole module is built around: a push costs a restored
 * scroll position, and a wrong `router.back()` costs the person the screen they
 * were on.
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

/** What a back control should actually do. */
export type BackDecision =
  | { action: "back"; href: string; reason: "history-is-parent" }
  | { action: "push"; href: string; reason: "declared-parent" }
  | { action: "push"; href: string; reason: "root-fallback" }
  | { action: "push"; href: string; reason: "no-parent-declared" }
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

export type BackInput = {
  /** Where the person is now. */
  path: string;
  /** Where to go when this route has no declared parent. */
  fallback: string;
  /**
   * The previous history entry's path, when it can be known, and `null`
   * whenever it cannot. See `previous-entry.ts`.
   */
  previousPath: string | null;
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
    return { action: "push", href: input.fallback, reason: "no-parent-declared" };
  }

  if (target.kind === "root") {
    if (input.surface === "android") return { action: "exit", reason: "root" };
    return { action: "push", href: input.fallback, reason: "root-fallback" };
  }

  /* Both proofs, or neither. A previous entry that is in-app but is some other
     screen is exactly the case that put people on the login page. */
  const previous = input.previousPath === null ? null : normalisePath(input.previousPath);
  if (input.previousIsInApp && previous !== null && previous === target.href) {
    return { action: "back", href: target.href, reason: "history-is-parent" };
  }

  return { action: "push", href: target.href, reason: "declared-parent" };
}
