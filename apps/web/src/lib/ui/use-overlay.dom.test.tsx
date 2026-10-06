/**
 * `useOverlay`, mounted for real in Chromium: a modal overlay (the default)
 * does exactly what it always did, and a non-modal one (`modal: false`, the
 * inner navigation menu) does not lock the page, trap Tab or move focus, but
 * still closes on Escape and on the Android back button's Escape, and joins the
 * overlay registry so that button knows it is there.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = (modal: boolean) => `
  import { useRef, useState } from "react";
  import { useOverlay } from "@/lib/ui/use-overlay";
  import { overlayIsOpen } from "@/lib/ui/overlay-registry";
  import { mount } from "@/lib/testing/browser-root";
  window.__registry = overlayIsOpen;
  function Harness() {
    const [open, setOpen] = useState(false);
    const panel = useRef(null);
    useOverlay({ open, onClose: () => setOpen(false), panelRef: panel, ${modal ? "" : "modal: false,"} });
    return (
      <div style={{ height: 3000 }}>
        <button id="opener" onClick={() => setOpen(true)}>Open</button>
        {open ? (
          <div ref={panel} tabIndex={-1} id="panel">
            <button id="inside-a">Inside A</button>
            <button id="inside-b">Inside B</button>
          </div>
        ) : null}
        <button id="after">After</button>
      </div>
    );
  }
  mount(<Harness />);
`;

const registry = (page: import("playwright-core").Page) => page.evaluate(() => (window as unknown as { __registry: () => boolean }).__registry());

describe.skipIf(!hasBrowser && !process.env.CI)("useOverlay", () => {
  it("modal (the default): locks the body, traps Tab, closes on Escape, returns focus to the opener", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(true) });
    try {
      await page.locator("#opener").focus();
      await page.locator("#opener").click();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
      expect(await registry(page)).toBe(true);
      /* Focus moved in, and Tab wraps rather than leaving. */
      expect(await page.evaluate(() => document.activeElement?.id)).toBe("inside-a");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement?.id)).toBe("inside-a");
      await page.keyboard.press("Escape");
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
      expect(await page.evaluate(() => document.activeElement?.id)).toBe("opener");
      expect(await registry(page)).toBe(false);
    } finally {
      await close();
    }
  });

  it("non-modal: no scroll lock, Tab walks out, focus is left alone, and it is in the registry", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(false) });
    try {
      await page.locator("#opener").click();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
      expect(await registry(page)).toBe(true);
      /* The page still scrolls. */
      await page.evaluate(() => window.scrollTo(0, 400));
      expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(400);
      /* No focus pulled in; Tab goes from the last control straight on past it. */
      expect(await page.evaluate(() => document.activeElement?.id)).not.toBe("inside-a");
      await page.locator("#inside-b").focus();
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement?.id)).toBe("after");
    } finally {
      await close();
    }
  });

  it("non-modal closes on Escape with focus inside it, and on the Escape the Android back button dispatches", async () => {
    for (const how of ["key", "dispatch"]) {
      const { page, close } = await mountInBrowser({ entry: entry(false) });
      try {
        await page.locator("#opener").click();
        expect(await page.locator("#panel").count()).toBe(1);
        if (how === "key") {
          await page.locator("#inside-a").focus();
          await page.keyboard.press("Escape");
        }
        else
          await page.evaluate(() =>
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })),
          );
        await page.waitForFunction(() => document.querySelector("#panel") === null);
        expect(await registry(page), how).toBe(false);
      } finally {
        await close();
      }
    }
  });

  it("non-modal leaves a real Escape to a field elsewhere, so an open menu does not swallow it", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(false) });
    try {
      await page.locator("#opener").click();
      await page.locator("#after").focus();
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
      expect(await page.locator("#panel").count()).toBe(1);
      expect(await registry(page)).toBe(true);
    } finally {
      await close();
    }
  });

  it("non-modal does not take focus back from wherever the person went", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(false) });
    try {
      await page.locator("#opener").click();
      await page.locator("#after").focus();
      /* Android Back's synthetic Escape closes it wherever focus is. */
      await page.evaluate(() =>
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })),
      );
      await page.waitForFunction(() => document.querySelector("#panel") === null);
      expect(await page.evaluate(() => document.activeElement?.id)).toBe("after");
    } finally {
      await close();
    }
  });
});
