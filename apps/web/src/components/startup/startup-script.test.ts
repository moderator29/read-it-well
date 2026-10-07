/**
 * The startup's inline script, run against a small stand-in for the page, so
 * what it does to the door's time and WHEN the flag is released can be tested
 * to the millisecond without a browser (D31; MOTION_SYSTEM.md sections 1 and
 * 3). The real thing, with a real finger, a real stylesheet and a blocked
 * main thread, is `StartupSequence.dom.test.tsx`.
 *
 * The door is the stylesheet's (`--nf-startup-door`, 1350ms), and this script
 * only moves that number. What this holds it to:
 *   - it does nothing to the door on its own, and never holds it for a page
 *     still streaming (October 2026: that hold was a still logo for up to
 *     four seconds on /home and /search);
 *   - a tap or a key before the door moves it to now; a tap's own click is
 *     eaten once and only once; a pointer after the door is the member's,
 *     judged by when the finger came down, not when a busy thread said so;
 *   - nothing can leave `data-splash="on"` behind, and the door's time is
 *     pinned on what is timed from it before the root lets go;
 *   - the native splash is told to hide THE MOMENT THE SCRIPT RUNS, with no
 *     frame waited for, whatever the gate said; and on the shell the beats
 *     are held at their first frame until that hide is answered (600ms at
 *     most), and never left held.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GHOST_CLICK_CAP_MS,
  GHOST_CLICK_WINDOW_MS,
  NATIVE_WAIT_MS,
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
  document: EventTarget & { readyState: string; walked: number };
  window: EventTarget & { Capacitor?: unknown };
  overlay: EventTarget;
  stage: { style: ReturnType<typeof style> };
  hides: unknown[];
  /** The sequence's clock: what the overlay's door animation reads now. */
  now: () => number;
};

/**
 * `native`: the shell's bridge is there, and its hide is answered at once
 * ("answers") or never ("hangs"). While the root carries the native wait the
 * stand-in's clock stands still, as the paused animations' does.
 */
function page({ loading = true, pending = false, native = false as false | "answers" | "hangs" } = {}): Page {
  const t0 = Date.now();
  let wokeAt: number | null = null;
  const data: Record<string, string | undefined> = { splash: "on" };
  const dataset = new Proxy(data, {
    set(target, key: string, value) {
      if (key === "startupNative") wokeAt = null;
      target[key] = value;
      return true;
    },
    deleteProperty(target, key: string) {
      if (key === "startupNative" && target[key]) wokeAt = Date.now();
      delete target[key];
      return true;
    },
  });
  const now = () => (data.startupNative === "wait" ? 0 : Date.now() - (wokeAt ?? t0));
  const root = { dataset, style: style() };
  const overlay = Object.assign(new Target(), { getAnimations: () => [{ currentTime: now() }] });
  const stage = { style: style() };
  const comments = pending ? [{ data: "$?" }, { data: "/$" }] : [{ data: "$" }, { data: "/$" }];
  const document = Object.assign(new Target(), {
    readyState: loading ? "loading" : "interactive",
    documentElement: root,
    body: {},
    walked: 0,
    querySelector: (selector: string) => (selector === ".nf-startup" ? overlay : null),
    querySelectorAll: (selector: string) => (selector === "[data-startup-pin]" ? [stage] : []),
    createTreeWalker: () => {
      document.walked++;
      let i = -1;
      return { nextNode: () => comments[++i] ?? null };
    },
  });
  const hides: unknown[] = [];
  const window = Object.assign(new Target(), {
    Capacitor: native
      ? {
          isNativePlatform: () => true,
          nativePromise: (...args: unknown[]) => (hides.push(args), native === "answers" ? Promise.resolve() : new Promise(() => {})),
        }
      : undefined,
  });
  return { root, document, window, overlay, stage, hides, now };
}

/** Animation frames that never come: Android's web view under the native splash. */
const noFrames = vi.fn();

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
    noFrames,
    () => {
      if (broken) throw new Error("no style");
      const quiet = seconds ? " 0.5s" : " 500ms";
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
  noFrames.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the startup's door", () => {
  it("leaves the door to the stylesheet (1350ms) and releases the flag after it", () => {
    expect(STARTUP_DOOR_MS).toBe(1350);
    const p = page();
    run(p);
    expect(door(p)).toBe("stylesheet");
    vi.advanceTimersByTime(STARTUP_DOOR_MS);
    animation(p.overlay, "animationstart", "nf-startup-door");
    expect(p.root.dataset.startup).toBe("open");
    expect(p.root.dataset.splash).toBe("on");
    animation(p.overlay, "animationend", "nf-startup-door");
    expect(p.root.dataset.splash).toBe("done");
  });

  it("reads the stylesheet's door in seconds as well as milliseconds (a minified build writes 1.35s)", () => {
    const p = page({ loading: false });
    run(p, { seconds: true });
    vi.advanceTimersByTime(STARTUP_DOOR_MS + STARTUP_RELEASE_MS - 1);
    expect(p.root.dataset.splash).toBe("on");
    vi.advanceTimersByTime(1);
    expect(p.root.dataset.splash).toBe("done");

    const quiet = page();
    run(quiet, { reduced: true, seconds: true });
    vi.advanceTimersByTime(500 + STARTUP_RELEASE_MS - 1);
    expect(quiet.root.dataset.splash).toBe("on");
    vi.advanceTimersByTime(1);
    expect(quiet.root.dataset.splash).toBe("done");
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

  it("never holds the door for a page still streaming: it opens on schedule over the page's own skeleton", () => {
    const p = page({ pending: true });
    run(p);
    expect(door(p)).toBe("stylesheet");
    expect(p.document.walked).toBe(0);
    p.document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(door(p)).toBe("stylesheet");
    vi.advanceTimersByTime(STARTUP_DOOR_MS + STARTUP_RELEASE_MS);
    expect(p.root.dataset.splash).toBe("done");
  });

  it("is never on for more than the door and the release together, under two seconds", () => {
    const p = page({ pending: true });
    run(p);
    expect(STARTUP_DOOR_MS + STARTUP_RELEASE_MS).toBeLessThan(2000);
    vi.advanceTimersByTime(STARTUP_DOOR_MS + STARTUP_RELEASE_MS);
    expect(p.root.dataset.splash).toBe("done");
  });

  it("opens on the first key, once, and ignores a lone modifier", () => {
    const p = page();
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
    vi.advanceTimersByTime(STARTUP_DOOR_MS + 150);
    /* Down 200ms before the door; delivered 150ms after it. */
    p.document.dispatchEvent(event("pointerdown", {}, 350));
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

  it("under reduced motion works against the stylesheet's quieter door (500ms)", () => {
    const p = page();
    run(p, { reduced: true });
    vi.advanceTimersByTime(200);
    p.document.dispatchEvent(event("keydown", { key: "Enter" }));
    expect(door(p)).toBe("200ms");

    const still = page();
    run(still, { reduced: true });
    expect(door(still)).toBe("stylesheet");
    vi.advanceTimersByTime(500 + STARTUP_RELEASE_MS);
    expect(still.root.dataset.splash).toBe("done");
  });

  it("releases at once when the overlay is missing, or when anything in it throws", () => {
    const missing = page();
    missing.document = Object.assign(missing.document, { querySelector: () => null });
    run(missing);
    expect(missing.root.dataset.splash).toBe("done");

    const broken = page({ native: "hangs" });
    run(broken, { broken: true });
    expect(broken.root.dataset.splash).toBe("done");
    expect(broken.root.dataset.startup).toBe("open");
    /* ...and never leaves the page's animations held. */
    expect(broken.root.dataset.startupNative).toBeUndefined();
  });
});

describe("the native splash", () => {
  it("is told to hide the moment the script runs, with no frame waited for, whatever the gate said", () => {
    const off = page({ native: "answers" });
    off.root.dataset.splash = undefined;
    run(off);
    /* Synchronously: no animation frame was asked for, let alone waited on. */
    expect(off.hides).toEqual([["SplashScreen", "hide", { fadeOutDuration: 160 }]]);
    expect(noFrames).not.toHaveBeenCalled();
    vi.advanceTimersByTime(STARTUP_DOOR_MS + STARTUP_RELEASE_MS);
    expect(off.root.dataset.startup).toBeUndefined();
    expect(off.root.dataset.splash).toBeUndefined();
    /* With the sequence off nothing is held. */
    expect(off.root.dataset.startupNative).toBeUndefined();

    const on = page({ native: "answers" });
    run(on);
    expect(on.hides).toHaveLength(1);
    expect(noFrames).not.toHaveBeenCalled();
  });

  it("does nothing native on the web, and holds nothing", () => {
    const p = page();
    run(p);
    expect(p.hides).toHaveLength(0);
    expect(p.root.dataset.startupNative).toBeUndefined();
  });

  it("holds the beats at their first frame until the hide is answered, then runs them in full", async () => {
    const p = page({ native: "answers" });
    run(p);
    expect(p.root.dataset.startupNative).toBe("wait");
    /* The bridge answers on the next microtask. */
    await Promise.resolve();
    await Promise.resolve();
    expect(p.root.dataset.startupNative).toBeUndefined();
    /* The door is the full schedule from the moment the beats started. */
    vi.advanceTimersByTime(STARTUP_DOOR_MS + STARTUP_RELEASE_MS - 1);
    expect(p.root.dataset.splash).toBe("on");
    vi.advanceTimersByTime(1);
    expect(p.root.dataset.splash).toBe("done");
  });

  it("waits 600ms at most for a hide the bridge never answers", () => {
    expect(NATIVE_WAIT_MS).toBe(600);
    const p = page({ native: "hangs" });
    run(p);
    vi.advanceTimersByTime(NATIVE_WAIT_MS - 1);
    expect(p.root.dataset.startupNative).toBe("wait");
    /* Held: the release has not been scheduled against a clock that stood still. */
    expect(p.root.dataset.splash).toBe("on");
    vi.advanceTimersByTime(1);
    expect(p.root.dataset.startupNative).toBeUndefined();
    vi.advanceTimersByTime(STARTUP_DOOR_MS + STARTUP_RELEASE_MS - 1);
    expect(p.root.dataset.splash).toBe("on");
    vi.advanceTimersByTime(1);
    expect(p.root.dataset.splash).toBe("done");
  });

  it("a tap during the wait lifts it and opens the door at once", () => {
    const p = page({ native: "hangs" });
    run(p);
    vi.advanceTimersByTime(200);
    p.document.dispatchEvent(event("pointerdown"));
    expect(p.root.dataset.startupNative).toBeUndefined();
    expect(p.root.dataset.startup).toBe("open");
    expect(door(p)).toBe("0ms");
    vi.advanceTimersByTime(STARTUP_RELEASE_MS);
    expect(p.root.dataset.splash).toBe("done");
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
