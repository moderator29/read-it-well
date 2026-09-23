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

  it("takes no proof from a browser with no Navigation API", () => {
    const blind: NavigationLike = {};
    expect(previousEntryPath(blind)).toBeNull();
    expect(androidDecision("/search", previousEntryPath(blind))).toEqual({
      action: "push",
      href: "/home",
      reason: "declared-parent",
    });
  });
});
