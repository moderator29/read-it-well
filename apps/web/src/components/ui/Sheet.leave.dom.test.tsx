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

/** Escape through the document, as the overlay hook hears it, so the close and the first reading are one task. */
const CLOSE_AND_READ = `
  new Promise((resolve) => {
    const panel = () => document.querySelector('[data-testid="the-sheet"]');
    const read = () => {
      const p = panel();
      const scrim = document.querySelector(".nf-sheet-backdrop");
      return {
        present: Boolean(p),
        closing: p ? p.getAttribute("data-closing") : null,
        inert: p ? p.hasAttribute("inert") : false,
        open: p ? p.getAttribute("data-open") : null,
        focus: document.activeElement ? document.activeElement.id : null,
        scrimEvents: scrim ? getComputedStyle(scrim).pointerEvents : null,
        panelEvents: p ? getComputedStyle(p).pointerEvents : null,
      };
    };
    let started = null;
    const onRun = (event) => {
      if (event.target === panel() && event.propertyName === "transform" && !started) started = read();
    };
    const onEnd = (event) => {
      if (event.target !== panel() || event.propertyName !== "transform") return;
      document.removeEventListener("transitionrun", onRun, true);
      document.removeEventListener("transitionend", onEnd, true);
      resolve({ started, ended: read() });
    };
    document.addEventListener("transitionrun", onRun, true);
    document.addEventListener("transitionend", onEnd, true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    setTimeout(() => resolve({ started, ended: null, timeout: true }), 5000);
  })
`;

type Reading = {
  present: boolean;
  closing: string | null;
  inert: boolean;
  open: string | null;
  focus: string | null;
  scrimEvents: string | null;
  panelEvents: string | null;
};

const settled = (page: Page) =>
  expect
    .poll(() => sheet(page).evaluate((el) => el.getAnimations().length), { message: "the open transition has finished" })
    .toBe(0);

async function openIt(page: Page) {
  await page.locator("#opener").click();
  await sheet(page).waitFor();
  await expect.poll(() => sheet(page).getAttribute("data-open")).toBe("true");
  await settled(page);
}

describe.skipIf(!hasBrowser && !process.env.CI)("the sheet's leave", () => {
  it("stays mounted, closing, inert and click-through while the leave runs, then goes", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await openIt(page);
      expect(await page.locator("#field").evaluate((el) => document.activeElement === el || el.closest("[role=dialog]")?.contains(document.activeElement))).toBe(true);

      /* Both readings come from events inside one evaluate: when the leave
         transition was created, and when it ended. Nothing here waits a fixed
         time, so a loaded machine cannot make it read a closed sheet late. */
      const { started, ended } = (await page.evaluate(CLOSE_AND_READ)) as { started: Reading | null; ended: Reading | null };
      /* When the leave starts: still there, closing, inert, not open. */
      expect(started, "the leave transition ran").not.toBeNull();
      expect(started!.present).toBe(true);
      expect(started!.closing).toBe("true");
      expect(started!.inert).toBe(true);
      expect(started!.open).toBe("false");
      /* The scrim and the panel let a tap through to the page behind. */
      expect(started!.scrimEvents).toBe("none");
      expect(started!.panelEvents).toBe("none");
      /* When it ends the sheet is still mounted, and focus was already on the
         opener: it came back at the moment of close, not after the animation. */
      expect(ended, "the leave transition ended").not.toBeNull();
      expect(ended!.present).toBe(true);
      expect(ended!.focus).toBe("opener");

      await sheet(page).waitFor({ state: "detached" });
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
      await expect.poll(() => sheet(page).count()).toBe(0);
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
        await expect.poll(() => sheet(page).count(), { message: motion }).toBe(0);
      } finally {
        await close();
      }
    }
  });

  it("opens again during the leave, on the same sheet", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await openIt(page);
      /* Close, and as soon as the leave has started, open again. */
      await page.evaluate(`
        new Promise((resolve) => {
          const panel = () => document.querySelector('[data-testid="the-sheet"]');
          const onRun = (event) => {
            if (event.target !== panel() || event.propertyName !== "transform") return;
            document.removeEventListener("transitionrun", onRun, true);
            resolve(true);
          };
          document.addEventListener("transitionrun", onRun, true);
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        })
      `);
      expect(await sheet(page).getAttribute("data-closing")).toBe("true");
      await page.locator("#opener").click();
      await expect.poll(() => sheet(page).getAttribute("data-open")).toBe("true");
      /* The open transition runs to its end on the same sheet: the leave's own
         end (event or timer) must not have unmounted it. */
      await settled(page);
      expect(await sheet(page).count()).toBe(1);
      expect(await sheet(page).evaluate((el) => el.hasAttribute("inert") || el.hasAttribute("data-closing"))).toBe(false);
      expect(await sheet(page).evaluate((el) => el.contains(document.activeElement))).toBe(true);
    } finally {
      await close();
    }
  });
});
