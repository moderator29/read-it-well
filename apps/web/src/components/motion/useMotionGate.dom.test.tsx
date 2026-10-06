/**
 * The motion gate follows the setting live (D49.3), mounted in Chromium.
 *
 * The gallery's motion switch calls `applyMotion`, which used to set the root
 * attributes without sending `MOTION_EVENT`, and `useMotionGate` listened only
 * for that event, so every mounted primitive kept a stale gate until it was
 * remounted. Now `applyMotion` sends the event when it changed anything, and
 * the gate also watches the root's own attributes, so a change by any hand is
 * heard.
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

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const ENTRY = `
  import { useMotionGate } from "@/components/motion/useMotionGate";
  import { applyMotion, DEFAULT_MOTION, MOTION_EVENT } from "@/lib/motion/motion-pref";
  import { mount } from "@/lib/testing/browser-root";
  window.__events = 0;
  window.addEventListener(MOTION_EVENT, () => { window.__events += 1; });
  window.__apply = (level) => applyMotion({ ...DEFAULT_MOTION, level });
  function Probe() {
    const { quiet, ambient } = useMotionGate();
    return <p data-testid="gate">{(quiet ? "quiet" : "moving") + " " + (ambient ? "ambient" : "still")}</p>;
  }
  mount(<Probe />);
`;

const gate = (page: Page) => page.getByTestId("gate").textContent();
const events = (page: Page) => page.evaluate(() => (window as unknown as { __events: number }).__events);
const apply = (page: Page, level: string) =>
  page.evaluate((l) => (window as unknown as { __apply: (level: string) => void }).__apply(l), level);

describe.skipIf(!hasBrowser && !process.env.CI)("useMotionGate", () => {
  it("hears applyMotion: the event is sent once per real change, and the gate follows", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: "" });
    try {
      await page.getByTestId("gate").waitFor();
      expect(await gate(page)).toBe("moving ambient");
      await apply(page, "calm");
      await page.waitForFunction(() => document.querySelector("[data-testid=gate]")?.textContent === "quiet still");
      expect(await events(page)).toBe(1);
      /* The same level again changes nothing and says nothing. */
      await apply(page, "calm");
      expect(await events(page)).toBe(1);
      await apply(page, "standard");
      await page.waitForFunction(() => document.querySelector("[data-testid=gate]")?.textContent === "moving ambient");
      expect(await events(page)).toBe(2);
    } finally {
      await close();
    }
  });

  it("follows the root's attributes even when nobody sends the event", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: "" });
    try {
      await page.getByTestId("gate").waitFor();
      await page.evaluate(() => document.documentElement.setAttribute("data-motion", "off"));
      await page.waitForFunction(() => document.querySelector("[data-testid=gate]")?.textContent === "quiet still");
      await page.evaluate(() => document.documentElement.removeAttribute("data-motion"));
      await page.waitForFunction(() => document.querySelector("[data-testid=gate]")?.textContent === "moving ambient");
      await page.evaluate(() => document.documentElement.setAttribute("data-save-data", "on"));
      await page.waitForFunction(() => document.querySelector("[data-testid=gate]")?.textContent === "moving still");
      expect(await events(page)).toBe(0);
    } finally {
      await close();
    }
  });
});
