/**
 * "Try again" on the offline screen, in a real Chromium (audit A5): where the
 * screen stands in for a page that could not load, it reloads that page; at
 * `/offline` itself there is nothing to retry, and it goes to the front page
 * instead of reloading this screen forever.
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

const entry = `
  import { RetryButton } from "@/app/offline/RetryButton";
  import { mount } from "@/lib/testing/browser-root";
  mount(<RetryButton label="Try again" statusOnline="Online" statusOffline="Offline" />);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the offline screen's Try again", () => {
  it("at /offline itself, goes to the front page rather than reloading the offline screen", async () => {
    const { page, close } = await mountInBrowser({ entry, url: "http://vallo.test/offline" });
    try {
      await Promise.all([page.waitForURL("http://vallo.test/home"), page.getByRole("button", { name: "Try again" }).click()]);
      expect(new URL(page.url()).pathname).toBe("/home");
    } finally {
      await close();
    }
  });

  it("standing in for another page, reloads that page", async () => {
    const { page, close } = await mountInBrowser({ entry, url: "http://vallo.test/search" });
    try {
      await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Try again" }).click()]);
      expect(new URL(page.url()).pathname).toBe("/search");
    } finally {
      await close();
    }
  });
});
