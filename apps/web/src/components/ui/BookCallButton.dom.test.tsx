/**
 * BookCallButton, mounted for real in Chromium: a real link or button with the
 * label as its name, the capsule widens on hover, focus and press (clip-path,
 * not layout), it is a full capsule without a pill token, and both themes pass.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { PORTED_CSS, axeViolations } from "./ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = (as: "link" | "button") => `
  import { BookCallButton } from "@/components/ui/BookCallButton";
  import { mount } from "@/lib/testing/browser-root";
  window.__clicks = 0;
  mount(<div style={{ padding: 24 }}>${
    as === "link"
      ? `<BookCallButton href="#call">Call label</BookCallButton>`
      : `<BookCallButton onClick={() => { window.__clicks += 1; }}>Call label</BookCallButton>`
  }</div>);
`;
const clip = (page: import("playwright-core").Page) => page.locator(".nf-callcap__capsule").evaluate((el) => getComputedStyle(el).clipPath);

describe.skipIf(!hasBrowser && !process.env.CI)("BookCallButton", () => {
  it("is a link with href, or a button with onClick, named by its label", async () => {
    const link = await mountInBrowser({ entry: entry("link"), css: PORTED_CSS });
    try {
      const a = link.page.getByRole("link", { name: "Call label" });
      expect(await a.getAttribute("href")).toBe("#call");
    } finally {
      await link.close();
    }
    const button = await mountInBrowser({ entry: entry("button"), css: PORTED_CSS });
    try {
      await button.page.getByRole("button", { name: "Call label" }).click();
      expect(await button.page.evaluate(() => (window as unknown as { __clicks: number }).__clicks)).toBe(1);
    } finally {
      await button.close();
    }
  });

  it("widens the capsule on hover, on keyboard focus and on press", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("button"), css: PORTED_CSS, viewport: { width: 1000, height: 600 } });
    try {
      const rest = await clip(page);
      expect(rest).toContain("64%");
      await page.getByRole("button", { name: "Call label" }).hover();
      await page.waitForTimeout(700);
      const hovered = await clip(page);
      expect(hovered).not.toBe(rest);
      expect(hovered).not.toContain("64%");
      expect(await page.locator(".nf-callcap__call").evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
      expect(await page.locator(".nf-callcap__rest").evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(0);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(700);
      expect(await clip(page)).toBe(rest);
      await page.keyboard.press("Tab");
      await page.waitForTimeout(700);
      expect(await clip(page)).toBe(hovered);
    } finally {
      await close();
    }
  });

  it("animates paint and opacity, never layout", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("button"), css: PORTED_CSS });
    try {
      const props = await page.locator(".nf-callcap__capsule").evaluate((el) => getComputedStyle(el).transitionProperty);
      expect(props).toBe("clip-path");
      const rest = await page.locator(".nf-callcap__rest").evaluate((el) => getComputedStyle(el).transitionProperty);
      expect(rest).toBe("opacity, transform");
    } finally {
      await close();
    }
  });

  it("is a full capsule on the Island radius, 64px tall, a 44px target at least", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("button"), css: PORTED_CSS });
    try {
      const m = await page.getByRole("button", { name: "Call label" }).evaluate((el) => ({
        r: getComputedStyle(el).borderTopLeftRadius,
        h: el.getBoundingClientRect().height,
      }));
      expect(m.r).toBe("32px");
      expect(m.h).toBe(64);
    } finally {
      await close();
    }
  });

  it("jumps with no transition under reduced motion", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("button"), css: PORTED_CSS, reducedMotion: true });
    try {
      expect(await page.locator(".nf-callcap__capsule").evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
    } finally {
      await close();
    }
  });

  it("passes axe in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry: entry("link"), css: PORTED_CSS });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        expect(await axeViolations(page), theme).toEqual([]);
      } finally {
        await close();
      }
    }
  });
});
