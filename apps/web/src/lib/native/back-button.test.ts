import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROOT, ROUTE_PARENTS } from "@/lib/nav/route-parents";
import { chooseBack } from "@/lib/nav/resolve";
import { previousEntryPath, type NavigationLike } from "@/lib/nav/previous-entry";

/**
 * ANDROID'S HARDWARE BACK BUTTON, DRIVEN RATHER THAN DESCRIBED.
 *
 * `lib/nav/resolve.test.ts` already proves `chooseBack` and `isAppRoot`, which
 * is the ARITHMETIC of the decision. It does not touch `startBackButton`, and
 * `startBackButton` is the thing a person's thumb actually reaches: it is where
 * the overlay check, the exit and the hand-off to the router are sequenced, and
 * a wrong answer there CLOSES THE APPLICATION. A proof of the arithmetic is not
 * a proof of the handler, in the same way that a grep proving a component is
 * imported is not a proof that it drew.
 *
 * SO THIS FILE REGISTERS THE REAL LISTENER AND PRESSES THE REAL BUTTON.
 * `@capacitor/app` is the one thing stubbed, because it is the device boundary
 * and there is no device in this process. Everything above it is the shipped
 * code: the real `startBackButton`, the real `isAppRoot`, the real
 * `route-parents.ts`. The stub captures the callback Capacitor would hold and
 * `press()` invokes it exactly as the platform would.
 *
 * WHAT THIS CANNOT PROVE, SAID PLAINLY RATHER THAN IMPLIED AWAY. It cannot
 * prove that Capacitor delivers the `backButton` event on a real handset, that
 * `App.exitApp()` really closes the task, or that the web view's own gesture
 * navigation does not fire first. Those need a device or an emulator and there
 * is neither on this machine. What it does prove is every branch this
 * repository owns, on the real code, including the two that were the defect.
 */

/** The listener Capacitor is holding, and the calls the device would have got. */
type Bridge = {
  press: () => void;
  exits: number;
  removals: number;
  listening: boolean;
};

const bridge: Bridge = { press: () => {}, exits: 0, removals: 0, listening: false };

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: async (event: string, handler: () => void) => {
      if (event !== "backButton") throw new Error(`unexpected listener: ${event}`);
      bridge.press = handler;
      bridge.listening = true;
      return {
        remove: async () => {
          bridge.removals += 1;
          bridge.listening = false;
        },
      };
    },
    exitApp: async () => {
      bridge.exits += 1;
    },
  },
}));

/* Imported AFTER the mock is declared, which `vi.mock` hoisting handles, and
   dynamically so the module graph is built with the stub in place. */
const { startBackButton } = await import("./back-button");

/**
 * The two browser globals `back-button.ts` reads, and nothing else.
 *
 * `document.body.style.overflow` is how it asks whether an overlay is up, and
 * `window.location.pathname` is how it asks where the person is standing. This
 * suite runs in Node, so both are built here rather than through jsdom: a
 * hand-built pair is a shorter list of assumptions than a whole DOM, and every
 * property below is one the module under test genuinely touches.
 */
type Fake = {
  setPath: (path: string) => void;
  openOverlay: () => void;
  closeOverlay: () => void;
  escapes: number;
};

function installGlobals(): Fake {
  const state = { escapes: 0, overflow: "" };
  const body = { style: { get overflow() { return state.overflow; }, set overflow(v: string) { state.overflow = v; } } };

  const documentLike = {
    body,
    dispatchEvent: (event: { type: string }) => {
      if (event.type === "keydown") state.escapes += 1;
      return true;
    },
  };

  /* `back-button.ts` constructs a `KeyboardEvent`; Node has no such class, so
     the smallest honest stand-in is one that records the key it was built
     with. The assertion below is that an Escape was dispatched at the
     document, which is the contract `lib/ui/use-overlay.ts` listens on. */
  class FakeKeyboardEvent {
    type = "keydown";
    key: string;
    constructor(_type: string, init: { key: string }) {
      this.type = _type;
      this.key = init.key;
    }
  }

  const windowLike = { location: { pathname: "/" } };

  Object.assign(globalThis, {
    document: documentLike,
    window: windowLike,
    KeyboardEvent: FakeKeyboardEvent,
  });

  return {
    setPath: (path: string) => {
      windowLike.location.pathname = path;
    },
    openOverlay: () => {
      body.style.overflow = "hidden";
    },
    closeOverlay: () => {
      body.style.overflow = "";
    },
    get escapes() {
      return state.escapes;
    },
  } as Fake;
}

let fake: Fake;
let stop: () => void;
let backs: string[];

beforeEach(async () => {
  bridge.exits = 0;
  bridge.removals = 0;
  backs = [];
  fake = installGlobals();
  stop = await startBackButton(() => {
    backs.push(globalThis.window.location.pathname);
  });
});

afterEach(() => {
  stop();
});

describe("the real Android back listener", () => {
  it("binds itself to the backButton event and hands back a teardown", () => {
    expect(bridge.listening).toBe(true);
    stop();
    expect(bridge.removals).toBe(1);
    /* Re-armed so `afterEach` has something to call. */
    bridge.listening = true;
  });

  it("closes the top overlay and goes nowhere, because that is what back does natively", () => {
    fake.setPath("/search");
    fake.openOverlay();
    const before = fake.escapes;

    bridge.press();

    expect(fake.escapes).toBe(before + 1);
    expect(backs).toEqual([]);
    expect(bridge.exits).toBe(0);
  });

  it("leaves the application at a declared root, and only there", () => {
    for (const root of ["/", "/home", "/stays"]) {
      bridge.exits = 0;
      backs = [];
      fake.setPath(root);
      bridge.press();
      expect({ root, exits: bridge.exits, backs }).toEqual({ root, exits: 1, backs: [] });
    }
  });

  it("does NOT close the application on any of the twenty-two routes this pass wired", () => {
    /* The list the walk covers, spelled out rather than derived, so that a
       route quietly losing its entry in `route-parents.ts` fails here. */
    const wired = [
      "/about",
      "/cancellations",
      "/careers",
      "/contact",
      "/delete-account",
      "/docs",
      "/docs/listings",
      "/eula",
      "/help",
      "/privacy",
      "/safety",
      "/standards",
      "/styleguide",
      "/terms",
      "/search",
      "/around",
      "/settings",
      "/preview",
      "/gallery",
      "/offline",
      "/crypto",
      "/crypto/btc",
    ];

    for (const path of wired) {
      bridge.exits = 0;
      backs = [];
      fake.setPath(path);
      bridge.press();
      expect({ path, exits: bridge.exits, backs }).toEqual({ path, exits: 0, backs: [path] });
    }
  });

  /**
   * THE ROUTES THIS PASS ADDED TO THE MAP, PRESSED ON THE REAL HANDLER.
   *
   * Every one of these answered `no-parent-declared` before today. That answer
   * was already SAFE on Android - `isAppRoot` is false for an undeclared route
   * on purpose, so the shell never closed - and it was safe by accident rather
   * than by decision, and the same press on the web went to whatever fallback
   * the component happened to pass. Declaring them changes the destination, so
   * the destination is pressed here rather than reasoned about.
   *
   * The dynamic ones carry a concrete segment, because `isAppRoot("/agreements/[id]")`
   * is a question about the literal five characters `[id]` and not about any
   * address a person can be standing on.
   */
  it("does NOT close the application on any route this pass declared", () => {
    const added = [
      "/agreements",
      "/agreements/2f1d4c6e-0000-4000-8000-000000000001",
      "/price",
      "/price/area/2f1d4c6e-0000-4000-8000-000000000002",
      "/admin/analytics",
      "/admin/listings/2f1d4c6e-0000-4000-8000-000000000003",
      "/admin/operations",
      "/admin/queue",
      "/admin/settings",
      "/admin/supply",
      "/preview/b1b/chooser",
      "/preview/c1/listing-review",
      "/preview/imgc/hotel",
      "/preview/session-b/profile",
      "/preview/session-b/admin/overview",
      "/preview/session-b/admin-money/money",
      "/preview/session-b/admin-review/kyc",
    ];
    for (const path of added) {
      bridge.exits = 0;
      backs = [];
      fake.setPath(path);
      bridge.press();
      expect({ path, exits: bridge.exits, backs }).toEqual({ path, exits: 0, backs: [path] });
    }
  });

  it("never closes the application on a route nobody declared", () => {
    fake.setPath("/a-route-that-is-in-nobodys-map");
    bridge.press();
    expect(bridge.exits).toBe(0);
    expect(backs).toEqual(["/a-route-that-is-in-nobodys-map"]);
  });

  it("reads the live path on every press, not the one it was bound on", () => {
    fake.setPath("/about");
    bridge.press();
    fake.setPath("/home");
    bridge.press();
    expect(backs).toEqual(["/about"]);
    expect(bridge.exits).toBe(1);
  });

  it("stops answering once torn down", () => {
    stop();
    expect(bridge.removals).toBe(1);
    bridge.listening = true;
  });
});

/**
 * The other half of the Android answer: what `NativeRuntime`'s `goBack` does
 * once `startBackButton` has handed control over.
 *
 * `components/app/NativeRuntime.tsx` is a React component and there is no
 * renderer in this suite, so the closure it passes is reproduced here as the
 * four arguments it builds. That is a copy and copies rot, which is why the
 * assertion is written against `route-parents.ts` rather than against a list:
 * the day an entry changes, this reads the new one.
 */
function androidDecision(path: string, previousPath: string | null) {
  return chooseBack({
    path,
    fallback: "/home",
    previousPath,
    previousIsInApp: previousPath !== null,
    surface: "android",
  });
}

describe("where the hardware button sends a person who is not at a root", () => {
  it("pushes the declared parent on a cold deep link, where there is no history at all", () => {
    for (const pattern of Object.keys(ROUTE_PARENTS)) {
      if (ROUTE_PARENTS[pattern] === ROOT) continue;
      if (pattern.includes("[")) continue;
      const decision = androidDecision(pattern, null);
      expect({ pattern, ...decision }).toEqual({
        pattern,
        action: "push",
        href: ROUTE_PARENTS[pattern],
        reason: "declared-parent",
      });
    }
  });

  it("walks history only when the entry behind really is the parent", () => {
    expect(androidDecision("/about", "/")).toEqual({
      action: "back",
      href: "/",
      reason: "history-is-parent",
    });
    /* The founder's case: inside the product, previous entry is the login
       page, and the button must not go there. */
    expect(androidDecision("/settings", "/sign-in")).toEqual({
      action: "push",
      href: "/home",
      reason: "declared-parent",
    });
  });

  /**
   * WHERE THE HARDWARE BUTTON SENDS SOMEBODY ON EACH ROUTE THIS PASS DECLARED.
   *
   * Written as concrete path and concrete destination, because the loop above
   * reads the map and would therefore agree with the map whatever the map said.
   * A table that is derived from the thing it is checking cannot catch a wrong
   * entry; these lines can, and will fail the day somebody re-points one.
   */
  it("sends the hardware button to the destination each new entry names", () => {
    const expected: [string, string][] = [
      ["/agreements", "/home"],
      ["/agreements/2f1d4c6e-0000-4000-8000-000000000001", "/agreements"],
      ["/price", "/home"],
      ["/price/area/2f1d4c6e-0000-4000-8000-000000000002", "/price"],
      ["/admin/analytics", "/admin"],
      ["/admin/listings/2f1d4c6e-0000-4000-8000-000000000003", "/admin/listings"],
      ["/admin/operations", "/admin"],
      ["/admin/queue", "/admin"],
      ["/admin/settings", "/admin"],
      ["/admin/supply", "/admin"],
      /* The four decks with no index page. Before today each of these resolved
         to `/preview/<deck>`, which answers not-found. */
      ["/preview/b1b/chooser", "/preview"],
      ["/preview/c1/listing-review", "/preview"],
      ["/preview/imgc/hotel", "/preview"],
      ["/preview/session-b/profile", "/preview"],
      ["/preview/session-b/admin/overview", "/preview"],
      ["/preview/session-b/admin-review/kyc", "/preview"],
      /* A deck that DOES have an index page keeps its own folder, which is what
         proves the four entries above are not a blanket rule. */
      ["/preview/f3/listing/sale", "/preview/f3/listing"],
      ["/preview/session-b/sweep-stays/checkout", "/preview/session-b/sweep-stays"],
    ];
    for (const [path, href] of expected) {
      expect({ path, ...androidDecision(path, null) }).toEqual({
        path,
        action: "push",
        href,
        reason: "declared-parent",
      });
    }
  });

  /**
   * THE DOOR, AND THE DEFECT THAT WAS SITTING IN IT.
   *
   * `/sign-in`, `/sign-up` and `/auth/callback` all named `/start` as their
   * parent. `/start` is `app/(auth)/start/route.ts`, a 307 to
   * `/welcome?next=/sign-up`, and `planFirstRun` forwards that straight on for
   * any device that has already seen first run. So the hardware button on the
   * sign-in screen pushed a redirect that landed the person on SIGN UP.
   *
   * These three lines are the fix expressed as behaviour rather than as a map
   * entry, and `not /start` is asserted separately so that re-pointing them at
   * any other redirect fails here too.
   */
  it("never sends the door back through a redirect handler", () => {
    for (const door of ["/sign-in", "/sign-up", "/auth/callback"]) {
      const decision = androidDecision(door, null);
      expect({ door, ...decision }).not.toEqual({
        door,
        action: "push",
        href: "/start",
        reason: "declared-parent",
      });
    }
    expect(androidDecision("/sign-in", null)).toEqual({
      action: "push",
      href: "/welcome",
      reason: "declared-parent",
    });
    expect(androidDecision("/sign-up", null)).toEqual({
      action: "push",
      href: "/welcome",
      reason: "declared-parent",
    });
    expect(androidDecision("/auth/callback", null)).toEqual({
      action: "push",
      href: "/sign-in",
      reason: "declared-parent",
    });
  });

  it("takes no proof from a browser with no Navigation API", () => {
    const blind: NavigationLike = {};
    expect(previousEntryPath(blind)).toBeNull();
    /* `/search` declares the landing page as its parent since the founder's
       C3.2 answer (23 September), so the declared parent here is "/". */
    expect(androidDecision("/search", previousEntryPath(blind))).toEqual({
      action: "push",
      href: "/",
      reason: "declared-parent",
    });
  });
});
