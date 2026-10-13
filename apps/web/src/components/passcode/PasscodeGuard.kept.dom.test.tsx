/**
 * THE GUARD ON A COPY THE PHONE KEPT (13 October 2026, the startup track).
 *
 * The service worker now opens the last screen at once from the phone, and
 * that copy was rendered while the session was unlocked. In a real Chromium:
 *
 *   - before the guard has decided, a kept copy's guarded page is not drawn
 *     (`app/css/passcode.css`), and a page the network answered is untouched;
 *   - a kept copy's `mint` (the sign-in it was rendered after) is ignored, so
 *     a new tab meets the lock and the page stays out of sight behind it;
 *   - a tab that was unlocked in this session shows the kept page at once;
 *   - a page the network answered still honours `mint`, as before.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss("app/css/passcode.css");
const ACTIONS = { lockPasscodeAction: "async () => undefined" };

const guarded = (mint: boolean) => `
  import { getDictionary } from "@vallo/i18n";
  import { PasscodeGuard } from "@/components/passcode/PasscodeGuard";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <PasscodeGuard copy={getDictionary("en").passcode} locale="en" length={6} mint={${mint}} name="Ada">
      <main><p data-testid="secret">Secret page content</p></main>
    </PasscodeGuard>,
  );
`;

/* The worker's two marks on a kept copy: the root attribute and the timing. */
const KEPT = `
  document.documentElement.setAttribute("data-vallo-kept", "");
  const original = performance.getEntriesByType.bind(performance);
  performance.getEntriesByType = (type) =>
    type === "navigation" ? [{ serverTiming: [{ name: "vallo-kept", description: "instant", duration: 0 }] }] : original(type);
`;
const TAB_UNLOCKED = `sessionStorage.setItem("vallo.passcode.tab", "1");`;

const secretVisibility = (page: import("playwright-core").Page) =>
  page.getByTestId("secret").evaluate((el) => getComputedStyle(el).visibility);

describe.skipIf(!hasBrowser && !process.env.CI)("the passcode guard on a kept copy", () => {
  it("keeps a kept copy's guarded page out of sight until the guard has decided, and a network page untouched", async () => {
    const plain = `
      import { mount } from "@/lib/testing/browser-root";
      mount(<div className="contents" data-passcode-guarded=""><p data-testid="secret">Secret page content</p></div>);
    `;
    const kept = await mountInBrowser({ entry: plain, css: CSS, init: KEPT });
    try {
      expect(await secretVisibility(kept.page)).toBe("hidden");
      await kept.page.evaluate(() => document.documentElement.setAttribute("data-guard-ready", ""));
      expect(await secretVisibility(kept.page)).toBe("visible");
    } finally {
      await kept.close();
    }
    const network = await mountInBrowser({ entry: plain, css: CSS });
    try {
      expect(await secretVisibility(network.page)).toBe("visible");
    } finally {
      await network.close();
    }
  });

  it("ignores a kept copy's mint: a new tab meets the lock, and the page stays hidden behind it", async () => {
    const { page, close } = await mountInBrowser({ entry: guarded(true), css: CSS, init: KEPT, actions: ACTIONS });
    try {
      await page.getByTestId("passcode-lock").waitFor();
      await page.waitForFunction(() => document.documentElement.hasAttribute("data-guard-ready"));
      expect(await secretVisibility(page)).toBe("hidden");
      expect(await page.evaluate(() => sessionStorage.getItem("vallo.passcode.tab"))).toBeNull();
    } finally {
      await close();
    }
  });

  it("shows a kept copy at once to a tab unlocked in this session", async () => {
    const { page, close } = await mountInBrowser({ entry: guarded(false), css: CSS, init: KEPT + TAB_UNLOCKED, actions: ACTIONS });
    try {
      await page.waitForFunction(() => document.documentElement.hasAttribute("data-guard-ready"));
      expect(await page.getByTestId("passcode-lock").count()).toBe(0);
      expect(await secretVisibility(page)).toBe("visible");
    } finally {
      await close();
    }
  });

  it("still honours mint on a page the network answered", async () => {
    const { page, close } = await mountInBrowser({ entry: guarded(true), css: CSS, actions: ACTIONS });
    try {
      await page.waitForFunction(() => sessionStorage.getItem("vallo.passcode.tab") === "1");
      expect(await page.getByTestId("passcode-lock").count()).toBe(0);
      expect(await secretVisibility(page)).toBe("visible");
    } finally {
      await close();
    }
  });
});
