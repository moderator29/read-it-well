/**
 * The startup's inline script, run against a small stand-in for the page, so
 * WHEN the door opens and WHEN the flag is released can be tested to the
 * millisecond without a browser (D31; MOTION_SYSTEM.md sections 1 and 3).
 * The real thing, with a real finger and a real stylesheet, is
 * `StartupSequence.dom.test.tsx`.
 *
 * What this holds the script to, from the audit of 6 October 2026:
 *   - the overlay is never on screen for more than four seconds, whatever
 *     the stream does (a stalled response used to hold it forever);
 *   - a key skips it, once, as a tap does;
 *   - the tap's own click is eaten once and only once;
 *   - nothing can leave `data-splash="on"` behind, including the platform's
 *     reduced-motion setting switching on halfway through;
 *   - under reduced motion it is a crossfade the moment the page is there.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BREATH_CEILING_MS,
  GHOST_CLICK_CAP_MS,
  GHOST_CLICK_WINDOW_MS,
  STARTUP_CEILING_MS,
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

type Page = {
  root: { dataset: Record<string, string | undefined> };
  document: EventTarget & { readyState: string };
  window: EventTarget;
  overlay: EventTarget;
  motion: EventTarget & { matches: boolean };
};

function page({ loading = true, reduced = false } = {}): Page {
  const root = { dataset: { splash: "on" } as Record<string, string | undefined> };
  const overlay = new Target();
  const document = Object.assign(new Target(), {
    readyState: loading ? "loading" : "interactive",
    documentElement: root,
    querySelector: (selector: string) => (selector === ".nf-startup" ? overlay : null),
  });
  const window = new Target();
  const motion = Object.assign(new Target(), { matches: reduced });
  return { root, document, window, overlay, motion };
}

function run(p: Page): void {
  const fn = new Function(
    "document",
    "window",
    "matchMedia",
    "setTimeout",
    "clearTimeout",
    "requestAnimationFrame",
    STARTUP_SCRIPT,
  );
  fn(
    p.document,
    p.window,
    () => p.motion,
    (cb: () => void, ms: number) => setTimeout(cb, ms),
    (id: number) => clearTimeout(id),
    () => 0,
  );
}

function animationEnd(target: EventTarget, name: string): void {
  target.dispatchEvent(Object.assign(new Event("animationend"), { animationName: name }));
}

function click(target: EventTarget): Event {
  const event = new Event("click", { cancelable: true });
  target.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the startup's door", () => {
  it("still completes when the page is ready early: it opens on the breath, not before", () => {
    const p = page();
    run(p);
    vi.advanceTimersByTime(100);
    p.document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(p.root.dataset.startup).toBeUndefined();
    vi.advanceTimersByTime(1050);
    animationEnd(p.overlay, "nf-startup-breath");
    expect(p.root.dataset.startup).toBe("open");
    expect(p.root.dataset.splash).toBe("on");
    animationEnd(p.overlay, "nf-startup-door");
    expect(p.root.dataset.splash).toBe("done");
  });

  it("holds while the page has not arrived, and never past the four-second ceiling", () => {
    const p = page();
    run(p);
    vi.advanceTimersByTime(BREATH_CEILING_MS);
    expect(p.root.dataset.startup).toBeUndefined();
    vi.advanceTimersByTime(STARTUP_CEILING_MS - BREATH_CEILING_MS - 1);
    expect(p.root.dataset.startup).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(STARTUP_CEILING_MS).toBe(4000);
    expect(p.root.dataset.startup).toBe("open");
  });

  it("releases the flag after the door even when the door never reports (a hidden overlay, a hidden tab)", () => {
    const p = page({ loading: false });
    run(p);
    vi.advanceTimersByTime(BREATH_CEILING_MS);
    expect(p.root.dataset.startup).toBe("open");
    expect(p.root.dataset.splash).toBe("on");
    vi.advanceTimersByTime(STARTUP_RELEASE_MS);
    expect(p.root.dataset.splash).toBe("done");
  });

  it("is never on for more than the ceiling and the release together, on a stalled stream", () => {
    const p = page();
    run(p);
    vi.advanceTimersByTime(STARTUP_CEILING_MS + STARTUP_RELEASE_MS);
    expect(p.root.dataset.splash).toBe("done");
  });

  it("opens on the first key, once, and ignores a lone modifier", () => {
    const p = page();
    run(p);
    p.document.dispatchEvent(Object.assign(new Event("keydown"), { key: "Shift" }));
    expect(p.root.dataset.startup).toBeUndefined();
    p.document.dispatchEvent(Object.assign(new Event("keydown"), { key: "5" }));
    expect(p.root.dataset.startup).toBe("open");
  });

  it("opens on a tap, and eats that tap's click once so it cannot land on what is beneath", () => {
    const p = page();
    run(p);
    p.document.dispatchEvent(new Event("pointerdown"));
    expect(p.root.dataset.startup).toBe("open");
    p.document.dispatchEvent(new Event("pointerup"));
    expect(click(p.window).defaultPrevented).toBe(true);
    expect(click(p.window).defaultPrevented).toBe(false);
  });

  it("disarms the click guard soon after the finger lifts, so a later tap is never eaten", () => {
    const p = page();
    run(p);
    p.document.dispatchEvent(new Event("pointerdown"));
    p.document.dispatchEvent(new Event("pointerup"));
    vi.advanceTimersByTime(GHOST_CLICK_WINDOW_MS);
    expect(click(p.window).defaultPrevented).toBe(false);
  });

  it("disarms the click guard at its cap when no click and no lift ever come", () => {
    const p = page();
    run(p);
    p.document.dispatchEvent(new Event("pointerdown"));
    vi.advanceTimersByTime(GHOST_CLICK_CAP_MS);
    expect(click(p.window).defaultPrevented).toBe(false);
  });

  it("never eats a click when the door opened by itself", () => {
    const p = page({ loading: false });
    run(p);
    vi.advanceTimersByTime(BREATH_CEILING_MS);
    p.document.dispatchEvent(new Event("pointerdown"));
    expect(click(p.window).defaultPrevented).toBe(false);
  });

  it("is not stranded when reduced motion switches on halfway through", () => {
    const p = page({ loading: false });
    run(p);
    vi.advanceTimersByTime(500);
    p.motion.matches = true;
    p.motion.dispatchEvent(new Event("change"));
    expect(p.root.dataset.startup).toBe("open");
    vi.advanceTimersByTime(STARTUP_RELEASE_MS);
    expect(p.root.dataset.splash).toBe("done");
  });

  it("under reduced motion is a crossfade the moment the page is there, released by the fade's end", () => {
    const p = page({ reduced: true });
    run(p);
    vi.advanceTimersByTime(50);
    expect(p.root.dataset.startup).toBeUndefined();
    p.document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(p.root.dataset.startup).toBe("open");
    animationEnd(p.overlay, "nf-startup-fade");
    expect(p.root.dataset.splash).toBe("done");
  });

  it("releases at once when the overlay is missing, and does nothing when the gate said no", () => {
    const missing = page();
    missing.document = Object.assign(missing.document, { querySelector: () => null });
    run(missing);
    expect(missing.root.dataset.splash).toBe("done");

    const off = page();
    off.root.dataset.splash = undefined;
    run(off);
    vi.advanceTimersByTime(STARTUP_CEILING_MS + STARTUP_RELEASE_MS);
    expect(off.root.dataset.startup).toBeUndefined();
  });
});

describe("the gate", () => {
  type Gate = { splash?: string; entered: boolean };
  function gate({
    path = "/",
    reduced = false,
    entered = false,
    dataset = {},
  }: {
    path?: string;
    reduced?: boolean;
    entered?: boolean;
    dataset?: Record<string, string>;
  }): Gate {
    const store = new Map<string, string>(entered ? [["nf_entered", "1"]] : []);
    const root = { dataset: { ...dataset } as Record<string, string | undefined> };
    const fn = new Function("document", "sessionStorage", "matchMedia", "location", STARTUP_GATE_SCRIPT);
    fn(
      { documentElement: root },
      { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) },
      () => ({ matches: reduced }),
      { pathname: path },
    );
    return { splash: root.dataset.splash, entered: store.has("nf_entered") };
  }

  it("plays once per session on the app's own pages", () => {
    expect(gate({})).toEqual({ splash: "on", entered: true });
    expect(gate({ entered: true }).splash).toBeUndefined();
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
