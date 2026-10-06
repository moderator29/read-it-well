/**
 * A SHEET'S LEAVE IS SEEN, MOUNTED FOR REAL (Chromium, the product's tokens
 * and overlays.css; auditor A7 N1).
 *
 * `Sheet` used to return null the instant `open` turned false, so the 240ms
 * exit the stylesheet declares ran on nothing. It now stays mounted, closed,
 * inert and click-through while the transition runs, then goes. Focus is back
 * on the opener at the moment of close, not after the animation; reduced
 * motion removes it at once; and opening again during the leave takes the
 * same sheet back up.
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
import { PORTED_CSS } from "@/components/ui/ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = `
  import { useState } from "react";
  import { mount } from "@/lib/testing/browser-root";
  import { Sheet } from "@/components/ui/Sheet";
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <div>
        <button type="button" id="opener" onClick={() => setOpen(true)}>Open it</button>
        <button type="button" id="behind" onClick={() => ((window as any).__behind = ((window as any).__behind ?? 0) + 1)}>Behind</button>
        <Sheet open={open} onOpenChange={setOpen} title="A sheet" closeLabel="Close" testId="the-sheet">
          <input id="field" aria-label="A field" />
        </Sheet>
      </div>
    );
  }
  mount(<Harness />);
`;

const sheet = (page: Page) => page.locator('[data-testid="the-sheet"]');

/** The panel's running CSS transitions on transform. */
const leaving = (page: Page) =>
  sheet(page).evaluate((el) =>
    el
      .getAnimations()
      .filter((a) => a instanceof CSSTransition && a.transitionProperty === "transform" && a.playState === "running")
      .length,
  );

async function openIt(page: Page) {
  await page.locator("#opener").click();
  await sheet(page).waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="the-sheet"]')?.getAttribute("data-open") === "true");
  await page.waitForTimeout(450);
}

describe.skipIf(!hasBrowser && !process.env.CI)("the sheet's leave", () => {
  it("stays mounted, closing, inert and click-through while the leave runs, then goes", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await openIt(page);
      expect(await page.locator("#field").evaluate((el) => document.activeElement === el || el.closest("[role=dialog]")?.contains(document.activeElement))).toBe(true);

      await page.keyboard.press("Escape");
      await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));
      /* Still there, marked closing, and the transform transition is running. */
      expect(await sheet(page).count()).toBe(1);
      expect(await sheet(page).getAttribute("data-closing")).toBe("true");
      expect(await sheet(page).evaluate((el) => el.hasAttribute("inert"))).toBe(true);
      expect(await sheet(page).getAttribute("data-open")).toBe("false");
      expect(await leaving(page), "the leave transition is running").toBeGreaterThan(0);
      /* Focus is on the opener already, not after the animation. */
      expect(await page.evaluate(() => document.activeElement?.id)).toBe("opener");
      /* The scrim and the panel let a tap through to the page behind. */
      expect(await page.locator(".nf-sheet-backdrop").evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
      expect(await sheet(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");

      /* The leave token is 240ms; the sheet is gone shortly after it. */
      await page.waitForTimeout(600);
      expect(await sheet(page).count()).toBe(0);
      expect(await page.locator(".nf-sheet-backdrop").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("is removed at once under reduced motion", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS, reducedMotion: true });
    try {
      await openIt(page);
      await page.keyboard.press("Escape");
      await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));
      expect(await sheet(page).count()).toBe(0);
      expect(await page.evaluate(() => document.activeElement?.id)).toBe("opener");
    } finally {
      await close();
    }
  });

  it("is removed at once under Calm and Off", async () => {
    for (const motion of ["calm", "off"] as const) {
      const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS, motion });
      try {
        await openIt(page);
        await page.keyboard.press("Escape");
        await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));
        expect(await sheet(page).count(), motion).toBe(0);
      } finally {
        await close();
      }
    }
  });

  it("opens again during the leave, on the same sheet", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await openIt(page);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
      expect(await sheet(page).getAttribute("data-closing")).toBe("true");
      await page.locator("#opener").click();
      await page.waitForFunction(() => document.querySelector('[data-testid="the-sheet"]')?.getAttribute("data-open") === "true");
      /* Past the leave's own end: it must not have been unmounted by it. */
      await page.waitForTimeout(700);
      expect(await sheet(page).count()).toBe(1);
      expect(await sheet(page).evaluate((el) => el.hasAttribute("inert") || el.hasAttribute("data-closing"))).toBe(false);
      expect(await sheet(page).evaluate((el) => el.contains(document.activeElement))).toBe(true);
    } finally {
      await close();
    }
  });
});
