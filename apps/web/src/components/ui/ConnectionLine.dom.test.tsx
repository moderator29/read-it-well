/**
 * THE OFFLINE LINE, NOT THE OFFLINE WALL (8 October 2026). The founder saw a
 * full-screen "No connection" card on TestFlight where the page he had just
 * been on should have been. A page this phone kept now opens with no signal
 * (`public/sw.js`), and what a person is told is one small line at the top of
 * that page: never a block over it, never focus taken, never an alert.
 *
 * In a real Chromium: the line appears when the browser goes offline and
 * says what is on screen; a document the worker answered from the phone says
 * so while the phone reports signal; and when the connection returns the page
 * refreshes itself in place and the line says so, then leaves.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const copy = getDictionary("en").details.connection;
const CSS = productCss("app/css/details.css");

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  import { ConnectionLine } from "@/components/ui/ConnectionLine";
  mount(<main><h1>The page you were on</h1><button>Still works</button><ConnectionLine /></main>);
`;

/* The worker's Server-Timing mark on a page it answered from the phone. */
const KEPT_DOCUMENT = `
  const original = performance.getEntriesByType.bind(performance);
  performance.getEntriesByType = (type) =>
    type === "navigation" ? [{ serverTiming: [{ name: "vallo-kept", description: "kept", duration: 0 }] }] : original(type);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the connection line", () => {
  it("says nothing while the page came from the network and the phone is online", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      expect(await page.getByTestId("connection-line").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("going offline draws a small status line over the page, not a wall in front of it", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      await page.context().setOffline(true);
      const line = page.getByTestId("connection-line");
      await line.waitFor();
      expect(await line.textContent()).toContain(copy.offline);
      expect(await line.getAttribute("role")).toBe("status");
      /* The page is still the page: its heading is visible, its button still
         takes a click, and the line takes no pointer events. */
      expect(await page.getByRole("heading", { name: "The page you were on" }).isVisible()).toBe(true);
      expect(await line.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
      const box = await line.locator(".nf-connection__pill").boundingBox();
      expect(box!.height).toBeLessThan(60);
      await page.getByRole("button", { name: "Still works" }).click({ timeout: 2_000 });
    } finally {
      await close();
    }
  });

  it("a page the worker answered from the phone says so, then refreshes itself when the signal returns", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS, init: KEPT_DOCUMENT });
    try {
      const line = page.getByTestId("connection-line");
      await line.waitFor();
      expect(await line.getAttribute("data-state")).toBe("kept");
      expect(await line.textContent()).toContain(copy.kept);

      await page.evaluate(() => window.dispatchEvent(new Event("online")));
      await page.waitForFunction(() => document.querySelector("[data-testid=connection-line]")?.getAttribute("data-state") === "back");
      expect(await line.textContent()).toContain(copy.back);
      const calls = await page.evaluate(() => (window as unknown as { __router: { calls: unknown[][] } }).__router.calls);
      expect(calls.filter(([name]) => name === "refresh")).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("the words are short, plain and free of em dashes", () => {
    for (const line of [copy.offline, copy.kept, copy.back]) {
      expect(line.length).toBeLessThan(60);
      expect(line).not.toMatch(/—/);
    }
  });
});
