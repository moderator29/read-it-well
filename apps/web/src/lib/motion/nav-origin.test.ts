import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expandMove, originKind, originPoint } from "./nav-origin";

const phone = { width: 390, height: 844 };
const desk = { width: 1440, height: 900 };

describe("what a tap opens from", () => {
  it("a card or a row is a container: it grows into the page", () => {
    expect(originKind({ x: 16, y: 300, width: 358, height: 72 }, phone)).toBe("expand");
    expect(originKind({ x: 18, y: 700, width: 170, height: 260 }, phone)).toBe("expand");
  });

  it("an icon, a chip or a text link opens from its point", () => {
    expect(originKind({ x: 329, y: 8, width: 44, height: 44 }, phone)).toBe("point");
    expect(originKind({ x: 120, y: 502, width: 73, height: 82 }, phone)).toBe("point");
    expect(originKind({ x: 300, y: 650, width: 73, height: 22 }, phone)).toBe("point");
  });

  it("something that is already most of the screen has nowhere to grow", () => {
    expect(originKind({ x: 0, y: 0, width: 390, height: 700 }, phone)).toBe("point");
  });
});

describe("the point", () => {
  it("is the element's centre", () => {
    expect(originPoint({ x: 100, y: 200, width: 100, height: 50 }, phone)).toEqual({ x: 150, y: 225 });
  });

  it("stays on screen for an element half scrolled away", () => {
    expect(originPoint({ x: 300, y: 800, width: 200, height: 200 }, phone)).toEqual({ x: 390, y: 844 });
    expect(originPoint({ x: -300, y: -200, width: 100, height: 100 }, phone)).toEqual({ x: 0, y: 0 });
  });
});

describe("the move of the dissolving snapshot", () => {
  it("carries the centre to the middle of the screen, a little above centre", () => {
    const rect = { x: 16, y: 600, width: 358, height: 80 };
    const m = expandMove(rect, phone);
    expect(rect.x + rect.width / 2 + m.dx).toBe(195);
    expect(rect.y + rect.height / 2 + m.dy).toBeCloseTo(844 * 0.42, 0);
  });

  it("grows toward the screen's width, never past its ceiling and never shrinking", () => {
    expect(expandMove({ x: 0, y: 0, width: 195, height: 100 }, phone).scale).toBe(2);
    expect(expandMove({ x: 0, y: 0, width: 130, height: 100 }, phone).scale).toBe(2.4);
    expect(expandMove({ x: 0, y: 0, width: 390, height: 100 }, phone).scale).toBe(1);
    expect(expandMove({ x: 0, y: 0, width: 300, height: 300 }, desk).scale).toBe(2.4);
  });
});

/* ------------------------------------------------------ the lent name */

function fakeEl(rect: { left: number; top: number; width: number; height: number }) {
  const props = new Map<string, string>();
  return {
    style: {
      viewTransitionName: "",
      setProperty: (k: string, v: string) => props.set(k, v),
      removeProperty: (k: string) => props.delete(k),
      get name() {
        return props.get("view-transition-name");
      },
    },
    getBoundingClientRect: () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height }),
    querySelector: () => null,
    closest: () => null,
  };
}

describe("lending and returning the name", () => {
  let root: { dataset: Record<string, string | undefined>; attrs: Map<string, string>; vars: Map<string, string> };

  beforeEach(() => {
    vi.useFakeTimers();
    const attrs = new Map<string, string>();
    const vars = new Map<string, string>();
    root = { dataset: {}, attrs, vars };
    vi.stubGlobal("HTMLElement", Object);
    vi.stubGlobal("document", {
      documentElement: {
        dataset: root.dataset,
        style: { setProperty: (k: string, v: string) => vars.set(k, v) },
        setAttribute: (k: string, v: string) => attrs.set(k, v),
        removeAttribute: (k: string) => attrs.delete(k),
        hasAttribute: (k: string) => attrs.has(k),
      },
    });
    vi.stubGlobal("window", {
      location: { pathname: "/home", href: "http://localhost/home" },
      innerWidth: 390,
      innerHeight: 844,
      matchMedia: () => ({ matches: false }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("names a tapped card, writes its point when the page arrives, and takes the name back", async () => {
    const m = await import("./nav-origin");
    const card = fakeEl({ left: 16, top: 400, width: 358, height: 90 });
    const anchor = { ...card, getAttribute: () => "/messages/t1", closest: () => null };
    m.captureOrigin(anchor as unknown as HTMLAnchorElement, new URL("http://localhost/messages/t1"));
    expect(anchor.style.name).toBe(m.ORIGIN_NAME);

    (window.location as { pathname: string }).pathname = "/messages/t1";
    m.applyOrigin("/messages/t1", "forward");
    expect(root.attrs.get("data-nav-origin")).toBe("expand");
    expect(root.vars.get("--nf-tap-x")).toBe("195px");
    expect(root.vars.get("--nf-tap-y")).toBe("445px");

    m.settleOrigin();
    vi.advanceTimersByTime(800);
    expect(anchor.style.name).toBeUndefined();
    expect(root.attrs.has("data-nav-origin")).toBe(false);
  });

  it("lends nothing under Calm, Off or data saver", async () => {
    const m = await import("./nav-origin");
    for (const [key, value] of [
      ["motion", "calm"],
      ["motion", "off"],
      ["saveData", "on"],
    ] as const) {
      root.dataset.motion = undefined;
      root.dataset.saveData = undefined;
      root.dataset[key] = value;
      const card = fakeEl({ left: 16, top: 400, width: 358, height: 90 });
      const anchor = { ...card, getAttribute: () => "/x", closest: () => null };
      m.captureOrigin(anchor as unknown as HTMLAnchorElement, new URL("http://localhost/x"));
      expect(anchor.style.name).toBeUndefined();
    }
  });

  it("a tab switch or a move back never grows from a point", async () => {
    const m = await import("./nav-origin");
    const card = fakeEl({ left: 16, top: 400, width: 358, height: 90 });
    const anchor = { ...card, getAttribute: () => "/search", closest: () => null };
    m.captureOrigin(anchor as unknown as HTMLAnchorElement, new URL("http://localhost/search"));
    m.applyOrigin("/search", "tab");
    expect(root.attrs.has("data-nav-origin")).toBe(false);
  });
});
