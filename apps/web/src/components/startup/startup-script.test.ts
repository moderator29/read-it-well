/**
 * The startup's inline script, run against a small stand-in for the page, so
 * what it does to the door's time and WHEN the flag is released can be tested
 * to the millisecond without a browser (D31; MOTION_SYSTEM.md sections 1 and
 * 3). The real thing, with a real finger, a real stylesheet and a blocked
 * main thread, is `StartupSequence.dom.test.tsx`.
 *
 * Since round 5 the door is the stylesheet's (`--nf-startup-door`, 1150ms),
 * and this script only moves that number. What this holds it to:
 *   - ready early it does nothing to the door: the stylesheet opens it;
 *   - a page still streaming moves the door to the four-second ceiling, and
 *     its arrival moves it back, to now or to 1150ms;
 *   - a tap or a key before the door moves it to now; a tap's own click is
 *     eaten once and only once; a pointer after the door is the member's,
 *     judged by when the finger came down, not when a busy thread said so;
 *   - nothing can leave `data-splash="on"` behind, and the door's time is
 *     pinned on what is timed from it before the root lets go;
 *   - the native splash comes down on the first frames whatever the gate said.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GHOST_CLICK_CAP_MS,
  GHOST_CLICK_WINDOW_MS,
  STARTUP_CEILING_MS,
  STARTUP_DOOR_MS,
  STARTUP_GATE_SCRIPT,
  STARTUP_RELEASE_MS,
  STARTUP_SCRIPT,
} from "./startup-script";

/*
 * Node's EventTarget reads `removeEventListener(type, fn, true)` as a
 * non-capture removal (it only reads `{ capture }` objects there), where a
 * browser reads the boolean. The script uses the boolean form, as browsers
 * expect, so the stand-in normalises it the way a browser does.
 */
class Target extends EventTarget {
  override addEventListener(type: string, fn: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
    super.addEventListener(type, fn, typeof options === "boolean" ? { capture: options } : options);
  }
  override removeEventListener(type: string, fn: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
    super.removeEventListener(type, fn, typeof options === "boolean" ? { capture: options } : options);
  }
}

/** An inline style: what the script writes on the root and on a pinned stage. */
function style() {
  const props = new Map<string, string>();
  return {
    props,
    setProperty: (k: string, v: string) => void props.set(k, v),
    removeProperty: (k: string) => void props.delete(k),
    getPropertyValue: (k: string) => props.get(k) ?? "",
  };
}

type Page = {
  root: { dataset: Record<string, string | undefined>; style: ReturnType<typeof style> };
  document: EventTarget & { readyState: string };
  window: EventTarget & { Capacitor?: unknown };
  overlay: EventTarget;
  stage: { style: ReturnType<typeof style> };
  hides: unknown[];
  /** The sequence's clock: what the overlay's door animation reads now. */
  now: () => number;
};

function page({ loading = true, pending = false, native = false } = {}): Page {
  const t0 = Date.now();
  const now = () => Date.now() - t0;
  const root = { dataset: { splash: "on" } as Record<string, string | undefined>, style: style() };
  const overlay = Object.assign(new Target(), { getAnimations: () => [{ currentTime: now() }] });
  const stage = { style: style() };
  const comments = pending ? [{ data: "$?" }, { data: "/$" }] : [{ data: "$" }, { data: "/$" }];
  const document = Object.assign(new Target(), {
    readyState: loading ? "loading" : "interactive",
    documentElement: root,
    body: {},
    querySelector: (selector: string) => (selector === ".nf-startup" ? overlay : null),
    querySelectorAll: (selector: string) => (selector === "[data-startup-pin]" ? [stage] : []),
    createTreeWalker: () => {
      let i = -1;
      return { nextNode: () => comments[++i] ?? null };
    },
  });
  const hides: unknown[] = [];
  const window = Object.assign(new Target(), {
    Capacitor: native
      ? { isNativePlatform: () => true, nativePromise: (...args: unknown[]) => (hides.push(args), Promise.resolve()) }
      : undefined,
  });
  return { root, document, window, overlay, stage, hides, now };
}

function run(p: Page, { reduced = false, broken = false, seconds = false } = {}): void {
  const fn = new Function(
    "document",
    "window",
    "setTimeout",
    "clearTimeout",
    "requestAnimationFrame",
    "getComputedStyle",
    "performance",
    STARTUP_SCRIPT,
  );
  fn(
    p.document,
    p.window,
    (cb: () => void, ms: number) => setTimeout(cb, ms),
    (id: number) => clearTimeout(id),
    (cb: () => void) => (cb(), 0),
    () => {
      if (broken) throw new Error("no style");
      const quiet = seconds ? " 0.6s" : " 600ms";
      const full = seconds ? ` ${STARTUP_DOOR_MS / 1000}s` : ` ${STARTUP_DOOR_MS}ms`;
      return { getPropertyValue: (k: string) => p.root.style.getPropertyValue(k) || (reduced ? quiet : full) };
    },
    { now: () => Date.now() },
  );
}

/** The door's time as the stylesheet now reads it. */
const door = (p: Page) => p.root.style.getPropertyValue("--nf-startup-door") || "stylesheet";

/** An event, stamped `ago` milliseconds before now (a busy thread hands it over late). */
function event(type: string, init: Record<string, unknown> = {}, ago = 0): Event {
  const e = Object.assign(new Event(type, { cancelable: true }), init);
  Object.defineProperty(e, "timeStamp", { value: Date.now() - ago });
  return e;
}

function animation(target: EventTarget, type: "animationstart" | "animationend", name: string): void {
  const e = Object.assign(new Event(type), { animationName: name });
  target.dispatchEvent(e);
}

function click(target: EventTarget): Event {
  const e = new Event("click", { cancelable: true });
  target.dispatchEvent(e);
  return e;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the startup's door", () => {
  it("ready early, leaves the door to the stylesheet and releases the flag after it", () => {
    const p = page();
    run(p);
    p.document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(door(p)).toBe("stylesheet");
    vi.advanceTimersByTime(STARTUP_DOOR_MS);
    animation(p.overlay, "animationstart", "nf-startup-door");
    expect(p.root.dataset.startup).toBe("open");
    expect(p.root.dataset.splash).toBe("on");
    animation(p.overlay, "animationend", "nf-startup-door");
    expect(p.root.dataset.splash).toBe("done");
  });

  it("reads the stylesheet's door in seconds as well as milliseconds (a minified build writes 1.15s)", () => {
    const p = page({ loading: false });
    run(p, { seconds: true });
    vi.advanceTimersByTime(STARTUP_DOOR_MS + STARTUP_RELEASE_MS - 1);
    expect(p.root.dataset.splash).toBe("on");
    vi.advanceTimersByTime(1);
    expect(p.root.dataset.splash).toBe("done");

    const quiet = page({ pending: true });
    run(quiet, { reduced: true, seconds: true });
    vi.advanceTimersByTime(200);
    quiet.document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(door(quiet)).toBe("600ms");
  });

  it("releases the flag after the door even when the door never reports (a hidden overlay, a hidden tab)", () => {
    const p = page({ loading: false });
    run(p);
    vi.advanceTimersByTime(STARTUP_DOOR_MS + STARTUP_RELEASE_MS - 1);
    expect(p.root.dataset.splash).toBe("on");
    vi.advanceTimersByTime(1);
    expect(p.root.dataset.splash).toBe("done");
    expect(p.root.dataset.startup).toBe("open");
  });

  it("pins the door's time on what is timed from it, then lets go of the root's", () => {
    const p = page();
    run(p);
    vi.advanceTimersByTime(300);
    p.document.dispatchEvent(event("keydown", { key: "a" }));
    expect(door(p)).toBe("300ms");
    animation(p.overlay, "animationend", "nf-startup-door");
    expect(p.stage.style.getPropertyValue("--nf-startup-door")).toBe("300ms");
    expect(p.root.style.getPropertyValue("--nf-startup-door")).toBe("");
    expect(p.root.dataset.splash).toBe("done");
  });

  it("holds while the page is still streaming, at the four-second ceiling, and opens when it arrives", () => {
    const p = page({ pending: true });
    run(p);
    expect(door(p)).toBe(`${STARTUP_CEILING_MS}ms`);
    vi.advanceTimersByTime(2000);
    expect(p.root.dataset.splash).toBe("on");
    p.document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(door(p)).toBe("2000ms");
  });

  it("an early arrival hands the door back to the beats' own time, not to now", () => {
    const p = page({ pending: true });
    run(p);
    vi.advanceTimersByTime(400);
    p.document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(door(p)).toBe(`${STARTUP_DOOR_MS}ms`);
  });

  it("is never on for more than the ceiling and the release together, on a stalled stream", () => {
    const p = page({ pending: true });
    run(p);
    vi.advanceTimersByTime(STARTUP_CEILING_MS + STARTUP_RELEASE_MS);
    expect(p.root.dataset.splash).toBe("done");
  });

  it("opens on the first key, once, and ignores a lone modifier", () => {
    const p = page({ pending: true });
    run(p);
    vi.advanceTimersByTime(500);
    p.document.dispatchEvent(event("keydown", { key: "Shift" }));
    expect(p.root.dataset.startup).toBeUndefined();
    p.document.dispatchEvent(event("keydown", { key: "5" }));
    expect(p.root.dataset.startup).toBe("open");
    expect(door(p)).toBe("500ms");
    vi.advanceTimersByTime(100);
    p.document.dispatchEvent(event("keydown", { key: "6" }));
    expect(door(p)).toBe("500ms");
  });

  it("opens on a tap, and eats that tap's click once so it cannot land on what is beneath", () => {
    const p = page();
    run(p);
    vi.advanceTimersByTime(250);
    p.document.dispatchEvent(event("pointerdown"));
    expect(p.root.dataset.startup).toBe("open");
    expect(door(p)).toBe("250ms");
    p.document.dispatchEvent(event("pointerup"));
    expect(click(p.window).defaultPrevented).toBe(true);
    expect(click(p.window).defaultPrevented).toBe(false);
  });

  it("judges a tap by when the finger came down, not when a busy thread handed it over", () => {
    const p = page();
    run(p);
    vi.advanceTimersByTime(1300);
    /* Down at 1100, before the door; delivered at 1300, after it. */
    p.document.dispatchEvent(event("pointerdown", {}, 200));
    expect(click(p.window).defaultPrevented).toBe(true);
  });

  it("never eats a tap that came after the door had opened by itself", () => {
    const p = page({ loading: false });
    run(p);
    vi.advanceTimersByTime(STARTUP_DOOR_MS + 50);
    p.document.dispatchEvent(event("pointerdown"));
    expect(click(p.window).defaultPrevented).toBe(false);
    expect(door(p)).toBe("stylesheet");
  });

  it("disarms the click guard soon after the finger lifts, so a later tap is never eaten", () => {
    const p = page();
    run(p);
    p.document.dispatchEvent(event("pointerdown"));
    p.document.dispatchEvent(event("pointerup"));
    vi.advanceTimersByTime(GHOST_CLICK_WINDOW_MS);
    expect(click(p.window).defaultPrevented).toBe(false);
  });

  it("disarms the click guard at its cap when no click and no lift ever come", () => {
    const p = page();
    run(p);
    p.document.dispatchEvent(event("pointerdown"));
    vi.advanceTimersByTime(GHOST_CLICK_CAP_MS);
    expect(click(p.window).defaultPrevented).toBe(false);
  });

  it("under reduced motion works against the stylesheet's quieter door (600ms)", () => {
    const p = page({ pending: true });
    run(p, { reduced: true });
    vi.advanceTimersByTime(200);
    p.document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(door(p)).toBe("600ms");
    vi.advanceTimersByTime(400 + STARTUP_RELEASE_MS);
    expect(p.root.dataset.splash).toBe("done");
  });

  it("releases at once when the overlay is missing, or when anything in it throws", () => {
    const missing = page();
    missing.document = Object.assign(missing.document, { querySelector: () => null });
    run(missing);
    expect(missing.root.dataset.splash).toBe("done");

    const broken = page();
    run(broken, { broken: true });
    expect(broken.root.dataset.splash).toBe("done");
    expect(broken.root.dataset.startup).toBe("open");
  });

  it("does nothing to the page when the gate said no, but still takes the native splash down", () => {
    const off = page({ native: true });
    off.root.dataset.splash = undefined;
    run(off);
    vi.advanceTimersByTime(STARTUP_CEILING_MS + STARTUP_RELEASE_MS);
    expect(off.root.dataset.startup).toBeUndefined();
    expect(off.root.dataset.splash).toBeUndefined();
    expect(off.hides).toEqual([["SplashScreen", "hide", { fadeOutDuration: 160 }]]);

    const on = page({ native: true });
    run(on);
    expect(on.hides).toHaveLength(1);
  });
});

describe("the gate", () => {
  type Gate = { splash?: string; entered: boolean };
  function gate({
    path = "/",
    reduced = false,
    entered = false,
    refuses = false,
    dataset = {},
  }: {
    path?: string;
    reduced?: boolean;
    entered?: boolean;
    /** Storage that throws on write: a private window, a full quota. */
    refuses?: boolean;
    dataset?: Record<string, string>;
  }): Gate {
    const store = new Map<string, string>(entered ? [["nf_entered", "1"]] : []);
    const root = { dataset: { ...dataset } as Record<string, string | undefined> };
    const fn = new Function("document", "sessionStorage", "matchMedia", "location", STARTUP_GATE_SCRIPT);
    fn(
      { documentElement: root },
      {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          if (refuses) throw new Error("QuotaExceededError");
          store.set(k, v);
        },
      },
      () => ({ matches: reduced }),
      { pathname: path },
    );
    return { splash: root.dataset.splash, entered: store.has("nf_entered") };
  }

  it("plays once per session on the app's own pages", () => {
    expect(gate({})).toEqual({ splash: "on", entered: true });
    expect(gate({ entered: true }).splash).toBeUndefined();
  });

  it("marks the session first, and does not play at all where the mark cannot be written", () => {
    /* Otherwise nothing remembers it played, and it plays on every full load. */
    expect(gate({ refuses: true })).toEqual({ splash: undefined, entered: false });
  });

  it("plays, quietly, under the platform's reduced-motion setting (the stylesheet makes it a crossfade)", () => {
    expect(gate({ reduced: true }).splash).toBe("on");
  });

  it("never under Calm, Off, the splash switch or data saver", () => {
    expect(gate({ dataset: { motion: "calm" } }).splash).toBeUndefined();
    expect(gate({ dataset: { motion: "off" } }).splash).toBeUndefined();
    expect(gate({ dataset: { motionSplash: "off" } }).splash).toBeUndefined();
    expect(gate({ dataset: { saveData: "on" } }).splash).toBeUndefined();
  });

  it("never on the console, the auth callback, the API, offline, /open or a shared link", () => {
    for (const path of ["/admin", "/auth/callback", "/api/x", "/offline", "/open", "/s/abc", "/r/abc"]) {
      expect(gate({ path }).splash, path).toBeUndefined();
    }
    expect(gate({ path: "/search" }).splash).toBe("on");
  });
});
