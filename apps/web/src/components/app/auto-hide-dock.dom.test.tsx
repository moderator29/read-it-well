/**
 * THE DOCK DOES NO WORK WHILE A LIST SCROLLS, ONLY WHEN IT DECIDES (W2, round
 * 5; "no scroll-linked work"). `AutoHideDock` reads the scroll once a frame;
 * it used to set a fresh decision object every frame, so the dock rendered at
 * the frame rate for the whole of a scroll. Counted in Chromium over forty
 * frames of scrolling down and twenty up: the dock renders
 * when it hides and when it comes back. Counted as React commits through the
 * DevTools hook (the harness bundles React for production, where Profiler is
 * silent but the hook still hears every commit).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

/* Installed before React loads: React reports every commit to this hook. */
const HOOK = `
  window.__renders = 0;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: false, supportsFiber: true, renderers: new Map(),
    inject() { return 1; }, checkDCE() {}, onScheduleFiberRoot() {},
    onCommitFiberRoot() { window.__renders += 1; }, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {},
  };
`;

const ENTRY = `
  import { mount } from "@/lib/testing/browser-root";
  import { AutoHideDock } from "@/components/app/AutoHideDock";
  mount(<div style={{ height: 6000 }}>
    <AutoHideDock label="Main" route="/home"><a href="/home">Home</a></AutoHideDock>
  </div>);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the auto-hiding dock", () => {
  it("commits a handful of times over a scroll (to hide, to return), not once a frame", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: "", init: HOOK });
    try {
      const result = await page.evaluate(async () => {
        const w = window as unknown as { __renders: number };
        const frame = () => new Promise((ok) => requestAnimationFrame(() => ok(null)));
        await frame();
        const before = w.__renders;
        const nav = () => document.querySelector("nav")!.getAttribute("data-dock-hidden");
        for (let i = 0; i < 40; i++) {
          window.scrollBy(0, 24);
          await frame();
        }
        const hiddenAfterDown = nav();
        for (let i = 0; i < 20; i++) {
          window.scrollBy(0, -24);
          await frame();
        }
        await frame();
        return { renders: w.__renders - before, hiddenAfterDown, hiddenAfterUp: nav() };
      });
      /* It still does its job: hidden going down, back going up. */
      expect(result.hiddenAfterDown).toBe("true");
      expect(result.hiddenAfterUp).toBeNull();
      /* Old code: 59 commits over the same sixty frames. */
      expect(result.renders).toBeLessThanOrEqual(4);
    } finally {
      await close();
    }
  });
});
