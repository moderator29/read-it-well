/**
 * The pending ring and the Button's `loading`, mounted for real in Chromium on
 * the product's own button and symbol sheets. The standing rule is that nothing
 * loops forever and nothing is a spinner, yet a control that is waiting must
 * still SAY so. So this holds the ring to:
 *
 *   - the arc is drawn ONCE (a finite iteration count of one), to three
 *     quarters, and then HELD there however long the wait: never mid-draw, never
 *     restarted, never spinning;
 *   - nothing on the page is an infinite animation while it waits;
 *   - the state is said to a screen reader on the control itself: `aria-busy` on
 *     the button (the ring is decoration), with the button inert while it waits
 *     and the label left in place;
 *   - the standalone ring waits 300ms before it draws, so a quick arrival never
 *     flickers one;
 *   - a reader who asked for less motion still sees the arc, held, with no
 *     drawing; and axe passes in each state.
 *
 * Fixtures are slot words; nothing is a name or an amount.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { PORTED_CSS, axeViolations } from "@/components/ui/ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

/* A page with a Button whose loading the test flips, and a plain button with a PendingRing. */
function entry(opts: { morph?: boolean; loading?: boolean } = {}): string {
  return `
    import { useState } from "react";
    import { Button } from "@/components/ui/Button";
    import { PendingRing } from "@/components/ui/PendingRing";
    import { mount } from "@/lib/testing/browser-root";
    window.__presses = 0;
    function Harness() {
      const [loading, setLoading] = useState(${opts.loading ?? true});
      return (
        <div style={{ padding: 16, display: "grid", gap: 12, width: 320 }}>
          <button id="flip" type="button" onClick={() => setLoading((v) => !v)}>flip</button>
          <Button id="the-button" variant="primary" ${opts.morph ? "morph" : ""} loading={loading} onClick={() => { window.__presses += 1; }}>The action, slot</Button>
          <button id="plain" type="button" className="nf-btn nf-btn--secondary" aria-busy={loading || undefined}>
            {loading ? <PendingRing size={20} data-testid="ring" /> : null}
            <span>A plain control, slot</span>
          </button>
        </div>
      );
    }
    mount(<Harness />);
  `;
}

/* The arc inside one control: where it is drawn to, and how it is animated. */
const arc = (page: Page, scope: string) =>
  page.evaluate((sel) => {
    const el = document.querySelector(`${sel} .nf-btn__arc`) as SVGElement | null;
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      offset: parseFloat(s.strokeDashoffset),
      name: s.animationName,
      duration: s.animationDuration,
      delay: s.animationDelay,
      count: s.animationIterationCount,
      fill: s.animationFillMode,
    };
  }, scope);

/* Every animation on the page: is any of them endless? */
const endless = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.effect && a.effect.getComputedTiming().iterations === Infinity)
      .map((a) => (a as CSSAnimation).animationName ?? a.id),
  );

describe.skipIf(!hasBrowser && !process.env.CI)("a Button that is loading", () => {
  it("says it is busy on the button itself, is inert, keeps its label, and draws a ring that is decoration", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      const button = page.locator("#the-button");
      expect(await button.getAttribute("aria-busy")).toBe("true");
      expect(await button.getAttribute("data-loading")).toBe("true");
      expect(await button.isDisabled()).toBe(true);
      expect(await page.getByRole("button", { name: "The action, slot" }).count()).toBe(1);
      expect(await button.locator(".nf-btn__ring").getAttribute("aria-hidden")).toBe("true");
      expect(await button.locator("svg circle.nf-btn__arc").count()).toBe(1);
      /* A ring, never the old looping spinner. */
      expect(await page.locator(".nf-spinner, [class*='spinner']").count()).toBe(0);
      /* Pressing it does nothing. */
      await button.click({ force: true }).catch(() => undefined);
      expect(await page.evaluate(() => (window as unknown as { __presses: number }).__presses)).toBe(0);
      await page.waitForTimeout(700);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("draws the arc once to three quarters and holds it: one iteration, never restarted, never endless", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      const first = await arc(page, "#the-button");
      expect(first).toMatchObject({ name: "nf-btn-arc-draw", count: "1", fill: "both" });
      /* Not a loop: no animation on the page repeats. */
      expect(await endless(page)).toEqual([]);
      /* After its draw it sits at three quarters, which is the held state. */
      await page.waitForTimeout(1200);
      expect((await arc(page, "#the-button"))!.offset).toBeCloseTo(0.25, 2);
      const states = [];
      for (let i = 0; i < 4; i += 1) {
        await page.waitForTimeout(500);
        states.push((await arc(page, "#the-button"))!.offset);
      }
      /* Held: the same place on every look over the next two seconds. */
      expect(new Set(states.map((v) => v.toFixed(3))).size).toBe(1);
      expect(states[0]).toBeCloseTo(0.25, 2);
      /* And it is finished, not running: the one draw is over, with its end value held by the fill. */
      const running = await page.evaluate(() =>
        document.getAnimations().filter((a) => a.playState === "running" && (a as CSSAnimation).animationName === "nf-btn-arc-draw").length,
      );
      expect(running).toBe(0);
      expect(await endless(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("is bounded however long the wait, including the button's own loading line", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      await page.waitForTimeout(2500);
      const animations = await page.evaluate(() =>
        document.getAnimations().map((a) => ({
          name: (a as CSSAnimation).animationName,
          iterations: a.effect!.getComputedTiming().iterations,
          fill: a.effect!.getComputedTiming().fill,
        })),
      );
      expect(animations.every((a) => Number.isFinite(a.iterations))).toBe(true);
      /* Whatever is still drawn after 2.5s is held by its fill, not by running. */
      expect(animations.every((a) => a.fill === "both" || a.fill === "forwards")).toBe(true);
    } finally {
      await close();
    }
  });

  it("clears the ring, the busy state and the inertness the moment loading ends", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      await page.locator("#flip").click();
      const button = page.locator("#the-button");
      expect(await button.getAttribute("aria-busy")).toBeNull();
      expect(await button.getAttribute("data-loading")).toBeNull();
      expect(await button.isDisabled()).toBe(false);
      expect(await button.locator(".nf-btn__ring").count()).toBe(0);
      await button.click();
      expect(await page.evaluate(() => (window as unknown as { __presses: number }).__presses)).toBe(1);
      /* And it can wait again, drawing afresh. */
      await page.locator("#flip").click();
      expect(await button.getAttribute("aria-busy")).toBe("true");
      expect((await arc(page, "#the-button"))!.count).toBe("1");
    } finally {
      await close();
    }
  });

  it("draws the morph's ring on the same terms: once, held, finite, busy on the button", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ morph: true }), css: PORTED_CSS });
    try {
      const button = page.locator("#the-button");
      expect(await button.getAttribute("aria-busy")).toBe("true");
      expect(await button.getAttribute("data-morph")).toBe("loading");
      await page.waitForTimeout(1500);
      const held = (await arc(page, "#the-button"))!;
      expect(held).toMatchObject({ name: "nf-btn-arc-draw", count: "1" });
      expect(held.offset).toBeCloseTo(0.25, 2);
      expect(await endless(page)).toEqual([]);
      await page.waitForTimeout(1500);
      expect((await arc(page, "#the-button"))!.offset).toBeCloseTo(0.25, 2);
    } finally {
      await close();
    }
  });

  it("under reduced motion shows the arc already held, with no drawing to watch", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS, reducedMotion: true });
    try {
      await page.waitForTimeout(200);
      const a = (await arc(page, "#the-button"))!;
      /* A 1ms draw: the state is stated at once, at its held value. */
      expect(a.duration).toBe("0.001s");
      expect(a.offset).toBeCloseTo(0.25, 2);
      expect(await endless(page)).toEqual([]);
      expect(await page.locator("#the-button").getAttribute("aria-busy")).toBe("true");
    } finally {
      await close();
    }
  });
});

describe.skipIf(!hasBrowser && !process.env.CI)("the pending ring on a control that is not a Button", () => {
  it("is decoration beside a control that carries aria-busy, in the glyph's slot at the size asked", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      const ring = page.getByTestId("ring");
      expect(await ring.getAttribute("aria-hidden")).toBe("true");
      expect(await page.locator("#plain").getAttribute("aria-busy")).toBe("true");
      const box = await ring.locator("svg").evaluate((el) => ({ w: el.getAttribute("width"), h: el.getAttribute("height") }));
      expect(box).toEqual({ w: "20", h: "20" });
      expect(await ring.evaluate((el) => getComputedStyle(el).flexShrink)).toBe("0");
      expect(await page.locator("#plain").innerText()).toBe("A plain control, slot");
      await page.waitForTimeout(900);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("waits 300ms before it draws, then draws once to three quarters and holds", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      const early = (await arc(page, "#plain"))!;
      expect(early).toMatchObject({ name: "nf-btn-arc-draw", delay: "0.3s", count: "1", fill: "both" });
      /* Not a flicker: inside the wait the arc has not started to draw (it sits at its empty start). */
      expect(early.offset).toBeGreaterThan(0.95);
      await page.waitForTimeout(1600);
      const held = (await arc(page, "#plain"))!;
      expect(held.offset).toBeCloseTo(0.25, 2);
      await page.waitForTimeout(1500);
      expect((await arc(page, "#plain"))!.offset).toBeCloseTo(0.25, 2);
      expect(await endless(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("never appears for a wait that ends inside the 300ms", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      await page.locator("#flip").click();
      await page.waitForTimeout(50);
      /* Gone before it drew: nothing was ever shown of the arc. */
      expect(await page.getByTestId("ring").count()).toBe(0);
      expect(await page.locator("#plain").getAttribute("aria-busy")).toBeNull();
    } finally {
      await close();
    }
  });

  it("under reduced motion is simply there, held, after the same short wait", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS, reducedMotion: true });
    try {
      expect((await arc(page, "#plain"))!.duration).toBe("0.001s");
      await page.waitForTimeout(700);
      expect((await arc(page, "#plain"))!.offset).toBeCloseTo(0.25, 2);
      expect(await endless(page)).toEqual([]);
    } finally {
      await close();
    }
  });
});
