/**
 * NO SIGNAL IS NOT A FAULT (13 October 2026, the layout and loading audit).
 *
 * An error boundary that catches a screen failing to load while the phone is
 * offline says so in one calm line, in the same words in the app, agent and
 * host boundaries, with no reference to quote; and it retries the segment once
 * by itself when the signal returns. Driven in a real Chromium, offline by the
 * browser's own switch, so `navigator.onLine` and the `online` and `offline`
 * events are the real ones.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = (module: string) => `
  import { mount } from "@/lib/testing/browser-root";
  import Boundary from "${module}";
  mount(<Boundary error={Object.assign(new Error("boom"), { digest: "d1" })} reset={() => { window.__resets = (window.__resets || 0) + 1; }} />);
`;

const BOUNDARIES = [
  ["the app's", "@/app/(app)/error"],
  ["the agent workspace's", "@/app/agent/error"],
  ["the host workspace's", "@/app/host/error"],
] as const;

describe.skipIf(!hasBrowser && !process.env.CI)("the error boundaries, offline", () => {
  for (const [name, module] of BOUNDARIES) {
    it(`${name} boundary speaks of the connection, not a fault, and retries when the signal returns`, async () => {
      const { page, close } = await mountInBrowser({ entry: entry(module), css: "" });
      try {
        /* Online: the ordinary failure, with its reference. */
        expect(await page.locator("body").innerText()).toMatch(/Reference/);
        expect(await page.locator("body").innerText()).not.toMatch(/You are offline/);

        await page.context().setOffline(true);
        await page.waitForFunction(() => document.body.innerText.includes("You are offline"));
        const text = await page.locator("body").innerText();
        expect(text).toContain("This screen loads again by itself when you are back online.");
        expect(text).not.toMatch(/Reference|quote it to support|Quote this to support/);
        expect(await page.evaluate(() => (window as unknown as { __resets?: number }).__resets ?? 0)).toBe(0);

        await page.context().setOffline(false);
        await page.waitForFunction(() => ((window as unknown as { __resets?: number }).__resets ?? 0) >= 1);
        expect(await page.evaluate(() => (window as unknown as { __resets?: number }).__resets)).toBe(1);
      } finally {
        await close();
      }
    });
  }
});
