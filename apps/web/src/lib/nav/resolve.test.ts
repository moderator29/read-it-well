import { describe, expect, it } from "vitest";
import { ROOT, ROUTE_PARENTS } from "./route-parents";
import { chooseBack, fillPattern, isAppRoot, matchRoute, normalisePath, parentOf } from "./resolve";
import { previousEntryPath, type NavigationLike } from "./previous-entry";

/**
 * The hierarchy, proved.
 *
 * Every back control on the platform now goes through `chooseBack`, so this
 * file is where the founder's three arrival routes are settled: a redirect, a
 * sign-in bounce and a deep link. In all three the browser's previous entry is
 * NOT the parent, and in all three the old control went there anyway. Each has
 * a test below that fails the moment the parent check is removed.
 *
 * `every declared parent resolves` is the sweep: it walks the whole of
 * `route-parents.ts`, builds a concrete path for each pattern, and insists the
 * parent it names is itself a route in the map. That is what stops an entry
 * pointing at a screen that does not exist, or at a `[handle]` the child never
 * captured, and it is the check a human reads the map against.
 */

/** A concrete path for a pattern: `/u/[handle]/edit` -> `/u/sample-handle/edit`. */
function sampleFor(pattern: string): string {
  if (pattern === "/") return "/";
  return `/${pattern
    .slice(1)
    .split("/")
    .map((segment) => {
      const dynamic = /^\[(.+)\]$/.exec(segment);
      return dynamic ? `sample-${dynamic[1]}` : segment;
    })
    .join("/")}`;
}

const PATTERNS = Object.keys(ROUTE_PARENTS);

describe("the map itself", () => {
  it("every declared parent resolves to a route that is also in the map", () => {
    const broken: string[] = [];
    for (const pattern of PATTERNS) {
      if (ROUTE_PARENTS[pattern] === ROOT) continue;
      const path = sampleFor(pattern);
      const target = parentOf(path);
      if (target.kind !== "parent") {
        broken.push(`${pattern}: resolved to ${target.kind}`);
        continue;
      }
      if (!matchRoute(target.href)) {
        broken.push(`${pattern}: parent "${target.href}" is not a route in the map`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("every route climbs to a root, so no back control can loop", () => {
    const stuck: string[] = [];
    for (const pattern of PATTERNS) {
      let path = sampleFor(pattern);
      let steps = 0;
      for (;;) {
        const target = parentOf(path);
        if (target.kind === "root") break;
        if (target.kind === "no-parent-declared" || steps > 12) {
          stuck.push(`${pattern}: stopped at "${path}" after ${steps} step(s)`);
          break;
        }
        path = target.href;
        steps += 1;
      }
    }
    expect(stuck).toEqual([]);
  });

  it("names its roots and nothing else", () => {
    const roots = PATTERNS.filter((p) => ROUTE_PARENTS[p] === ROOT);
    expect(roots.sort()).toEqual(["/", "/home", "/stays", "/welcome"]);
  });

  it("puts a dynamic route under the shelf it came off, not under home", () => {
    /* The founder's own two examples. */
    expect(parentOf("/listing/c7f2")).toEqual({
      kind: "parent",
      pattern: "/listing/[id]",
      href: "/search",
    });
    expect(parentOf("/messages/c7f2")).toEqual({
      kind: "parent",
      pattern: "/messages/[id]",
      href: "/messages",
    });
  });

  it("sends the two browsing screens back to the landing page (C3.2)", () => {
    /* The founder, 23 September: browsing is signed in only, so the back
       control on search and around goes to "/", never to `/home`, which lands
       a signed-out reader on the sign-in wall. */
    expect(parentOf("/search")).toMatchObject({ kind: "parent", href: "/" });
    expect(parentOf("/search?q=lekki")).toMatchObject({ kind: "parent", href: "/" });
    expect(parentOf("/around")).toMatchObject({ kind: "parent", href: "/" });
  });

  it("carries a captured segment into the parent", () => {
    expect(parentOf("/u/ada/followers")).toMatchObject({ href: "/u/ada" });
    expect(parentOf("/rent/move-in/c7f2")).toMatchObject({ href: "/listing/c7f2" });
    expect(parentOf("/bookings/b1/review")).toMatchObject({ href: "/bookings/b1" });
  });

  it("prefers a literal segment over a dynamic one", () => {
    /* `/messages/share/into/[id]` and `/messages/share/listing/[id]` differ
       only in a literal, and each names a different parent. A matcher that
       took the first match, or scored them equal, would send a share picker
       back to the wrong thing. */
    expect(parentOf("/messages/share/into/abc")).toMatchObject({ href: "/messages/abc" });
    expect(parentOf("/messages/share/listing/abc")).toMatchObject({ href: "/listing/abc" });
    expect(parentOf("/messages/share/stay/abc")).toMatchObject({ href: "/stay/abc" });
    expect(parentOf("/messages/share/booking/abc")).toMatchObject({ href: "/bookings/abc" });
    /* `/messages/new` is a literal and must not be read as `/messages/[id]`. */
    expect(parentOf("/messages/new")).toMatchObject({ pattern: "/messages/new" });
    expect(parentOf("/profile/setup/agent")).toMatchObject({ pattern: "/profile/setup/agent" });
  });

  it("does not silently invent a parent for a route nobody declared", () => {
    expect(parentOf("/invented/screen")).toEqual({ kind: "no-parent-declared" });
    /* Not "strip the last segment". A guess that is usually right is the thing
       that hid this defect for as long as it hid. */
    expect(parentOf("/settings/account/danger")).toEqual({ kind: "no-parent-declared" });
  });
});

describe("normalisePath", () => {
  it("levels the three shapes the callers hand in", () => {
    expect(normalisePath("/search?beds=2&city=lagos")).toBe("/search");
    expect(normalisePath("/search#results")).toBe("/search");
    expect(normalisePath("/settings/")).toBe("/settings");
    expect(normalisePath("/")).toBe("/");
    expect(normalisePath("settings")).toBe("/settings");
  });

  it("matches a route despite a query string, which is how every search arrives", () => {
    expect(parentOf("/listing/c7f2?from=search")).toMatchObject({ href: "/search" });
  });
});

describe("fillPattern", () => {
  it("refuses a parent that names a segment the child never captured", () => {
    expect(() => fillPattern("/u/[handle]", {})).toThrow(/does not capture/);
  });
});

/* --------------------------------------------------------------- arrivals */

const AT_ADMIN_KYC = { path: "/admin/kyc", fallback: "/home", surface: "web" } as const;

describe("however the person arrived", () => {
  it("a sign-in bounce does not send back to the login page", () => {
    /* The founder's first sentence: inside the Console, press back, land on the
       login page. `/sign-in` is genuinely in-app, so the old guard said yes. */
    expect(
      chooseBack({ ...AT_ADMIN_KYC, previousPath: "/sign-in", previousIsInApp: true }),
    ).toEqual({ action: "push", href: "/admin", reason: "declared-parent" });
  });

  it("a redirect does not send back to the redirector", () => {
    expect(
      chooseBack({
        path: "/profile/setup/agent",
        fallback: "/home",
        surface: "web",
        previousPath: "/profile/setup",
        previousIsInApp: true,
      }),
    ).toEqual({ action: "back", href: "/profile/setup", reason: "history-is-parent" });

    /* ...and the same screen reached via `/welcome`, which is where the
       onboarding redirect lands people, goes to the declared parent instead. */
    expect(
      chooseBack({
        path: "/profile/setup/agent",
        fallback: "/home",
        surface: "web",
        previousPath: "/welcome",
        previousIsInApp: true,
      }),
    ).toEqual({ action: "push", href: "/profile/setup", reason: "declared-parent" });
  });

  it("a cold deep link lands on the parent rather than out of the product", () => {
    /* A push notification opens `/messages/abc` in a fresh tab. There is no
       previous entry at all, which is what used to leave people on the landing
       page or on `about:blank`. */
    expect(
      chooseBack({
        path: "/messages/abc",
        fallback: "/home",
        surface: "web",
        previousPath: null,
        previousIsInApp: false,
      }),
    ).toEqual({ action: "push", href: "/messages", reason: "declared-parent" });
  });

  it("a deep link with foreign history behind it never goes back", () => {
    /* Opened from another application: there IS a previous entry and it is not
       ours. Both proofs fail, and either one failing is enough. */
    expect(
      chooseBack({
        path: "/listing/c7f2",
        fallback: "/home",
        surface: "web",
        previousPath: "/listing/c7f2",
        previousIsInApp: false,
      }),
    ).toEqual({ action: "push", href: "/search", reason: "declared-parent" });
  });

  it("uses history only when the previous entry IS the parent", () => {
    /* The case worth preserving: a filtered search, opened into a listing.
       Going back restores the filters and the scroll position; pushing
       `/search` would throw the hunt away. */
    expect(
      chooseBack({
        path: "/listing/c7f2",
        fallback: "/home",
        surface: "web",
        previousPath: "/search?beds=2&city=lagos&verified=1",
        previousIsInApp: true,
      }),
    ).toEqual({ action: "back", href: "/search", reason: "history-is-parent" });
  });

  it("needs BOTH proofs, not either", () => {
    const parentButNotProvablyInApp = chooseBack({
      path: "/listing/c7f2",
      fallback: "/home",
      surface: "web",
      previousPath: "/search",
      previousIsInApp: false,
    });
    expect(parentButNotProvablyInApp.action).toBe("push");

    const inAppButNotTheParent = chooseBack({
      path: "/listing/c7f2",
      fallback: "/home",
      surface: "web",
      previousPath: "/saved",
      previousIsInApp: true,
    });
    expect(inAppButNotTheParent.action).toBe("push");
  });

  it("falls through to the caller's fallback only where nothing is declared", () => {
    expect(
      chooseBack({
        path: "/invented/screen",
        fallback: "/around",
        surface: "web",
        previousPath: "/around",
        previousIsInApp: true,
      }),
    ).toEqual({ action: "push", href: "/around", reason: "no-parent-declared" });
  });
});

/* ---------------------------------------------------------------- android */

describe("the Android hardware button", () => {
  it("closes the application only at a declared root", () => {
    for (const root of ["/", "/home", "/stays", "/welcome"]) {
      expect(isAppRoot(root)).toBe(true);
      expect(
        chooseBack({
          path: root,
          fallback: "/home",
          surface: "android",
          previousPath: null,
          previousIsInApp: false,
        }),
      ).toEqual({ action: "exit", reason: "root" });
    }
  });

  it("never sends the welcome intro to /home, which a stranger meets as the sign-in wall", () => {
    /* The founder: the intro is not skippable. `/welcome` named `/home` as
       its parent, so the hardware back went past the intro in one press. */
    expect(parentOf("/welcome")).toEqual({ kind: "root", pattern: "/welcome" });
    expect(parentOf("/welcome?tour=1")).toEqual({ kind: "root", pattern: "/welcome" });
    expect(
      chooseBack({
        path: "/welcome",
        fallback: "/home",
        surface: "android",
        previousPath: null,
        previousIsInApp: false,
      }),
    ).toEqual({ action: "exit", reason: "root" });
  });

  it("does not close the application on a cold deep link into a conversation", () => {
    /* This is the press that used to make the shell disappear: no in-app
       history, so the old handler called `App.exitApp()` on somebody standing
       inside a thread they had just opened from a notification. */
    expect(isAppRoot("/messages/abc")).toBe(false);
    expect(
      chooseBack({
        path: "/messages/abc",
        fallback: "/home",
        surface: "android",
        previousPath: null,
        previousIsInApp: false,
      }),
    ).toEqual({ action: "push", href: "/messages", reason: "declared-parent" });
  });

  it("never closes the application on a route nobody declared", () => {
    expect(isAppRoot("/invented/screen")).toBe(false);
    expect(
      chooseBack({
        path: "/invented/screen",
        fallback: "/home",
        surface: "android",
        previousPath: null,
        previousIsInApp: false,
      }),
    ).toEqual({ action: "push", href: "/home", reason: "no-parent-declared" });
  });

  it("holds no route inside the Console as an exit point", () => {
    for (const pattern of PATTERNS.filter((p) => p.startsWith("/admin"))) {
      expect(isAppRoot(sampleFor(pattern))).toBe(false);
    }
  });
});

/* -------------------------------------------------- the one available proof */

function navigationWith(urls: string[], index: number): NavigationLike {
  return {
    currentEntry: { index },
    entries: () => urls.map((url) => ({ url: `https://vallospaces.com${url}` })),
  };
}

describe("previousEntryPath", () => {
  /* The name deliberately avoids spelling the router call out: the static scan
     in `tests/session-memory.spec.mjs` blanks comments but not strings, and a
     test NAME containing it reads as an unguarded back control. */
  it("reads the entry a history step would land on", () => {
    expect(previousEntryPath(navigationWith(["/search", "/listing/c7f2"], 1))).toBe("/search");
  });

  it("answers null at the first entry, where there is nothing behind", () => {
    expect(previousEntryPath(navigationWith(["/listing/c7f2"], 0))).toBe(null);
  });

  it("answers null rather than guessing when the browser has no Navigation API", () => {
    /* Safari and Firefox. No URL means no proof, which means the declared
       parent gets pushed. See the header of `previous-entry.ts`. */
    expect(previousEntryPath(null)).toBe(null);
    expect(previousEntryPath({})).toBe(null);
  });

  it("answers null for a disposed entry rather than throwing at a back control", () => {
    expect(previousEntryPath({ currentEntry: { index: 1 }, entries: () => [{ url: null }] })).toBe(
      null,
    );
    expect(
      previousEntryPath({
        currentEntry: { index: 1 },
        entries: () => {
          throw new Error("disposed");
        },
      }),
    ).toBe(null);
  });
});
