import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* No DOM in the unit project, so the root and the window are the smallest
   fakes that answer what nav-direction.ts asks of them. */
function fakeRoot() {
  const attrs = new Map<string, string>();
  return {
    dataset: {} as Record<string, string | undefined>,
    setAttribute: (k: string, v: string) => attrs.set(k, v),
    removeAttribute: (k: string) => attrs.delete(k),
    hasAttribute: (k: string) => attrs.has(k),
    getAttribute: (k: string) => attrs.get(k) ?? null,
  };
}

let root: ReturnType<typeof fakeRoot>;
let doc: Record<string, unknown>;

beforeEach(() => {
  vi.useFakeTimers();
  root = fakeRoot();
  doc = { documentElement: root };
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", {
    location: { href: "http://localhost/search", origin: "http://localhost", pathname: "/search" },
    matchMedia: () => ({ matches: false }),
    setTimeout,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.stubGlobal("CSS", { supports: () => true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("the direction mark", () => {
  it("is written on the root and comes down once the new page settles", async () => {
    const { markNav, settleNav } = await import("./nav-direction");
    markNav("back");
    expect(root.getAttribute("data-nav-dir")).toBe("back");
    settleNav();
    vi.advanceTimersByTime(1000);
    expect(root.hasAttribute("data-nav-dir")).toBe(false);
  });

  it("classifies a link from where the reader is", async () => {
    const { markNavTo } = await import("./nav-direction");
    markNavTo("/listing/abc");
    expect(root.getAttribute("data-nav-dir")).toBe("forward");
  });

  it("ignores a link that leaves the site", async () => {
    const { markNavTo } = await import("./nav-direction");
    markNavTo("https://example.com/elsewhere");
    expect(root.hasAttribute("data-nav-dir")).toBe(false);
  });
});

describe("animateBack", () => {
  it("still goes back where the browser cannot animate it", async () => {
    const { animateBack } = await import("./nav-direction");
    const go = vi.fn();
    animateBack(go);
    expect(go).toHaveBeenCalledTimes(1);
  });

  it("goes back at once, with no transition, when motion is Off", async () => {
    const { animateBack } = await import("./nav-direction");
    const start = vi.fn();
    doc.startViewTransition = start;
    root.dataset.motion = "off";
    const go = vi.fn();
    animateBack(go);
    expect(go).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });

  it("runs the traversal inside a typed view transition otherwise", async () => {
    const { animateBack } = await import("./nav-direction");
    let update: (() => Promise<void>) | undefined;
    let types: string[] = [];
    doc.startViewTransition = (options: { update: () => Promise<void>; types: string[] }) => {
      update = options.update;
      types = options.types;
    };
    const go = vi.fn();
    animateBack(go);
    expect(types).toEqual(["nf-back"]);
    expect(go).not.toHaveBeenCalled();
    const done = update!();
    expect(go).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(400);
    await expect(done).resolves.toBeUndefined();
  });
});
