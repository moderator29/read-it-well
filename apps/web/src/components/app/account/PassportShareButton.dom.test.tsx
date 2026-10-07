/**
 * "Turn it off" on the passport's share sheet, in a real Chromium (audit A7):
 * the row says it is working while the server answers, and an action that
 * THROWS still gives the sheet its own dismiss back (it used to ignore "Not
 * now" for good, because the guard was reset only on an answer).
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
  import { getDictionary } from "@vallo/i18n";
  import { PassportShareButton } from "@/components/app/account/PassportShareButton";
  import { mount } from "@/lib/testing/browser-root";
  mount(<PassportShareButton copy={getDictionary("en").experienceAccount.passport} dismissLabel="Not now" />);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the passport share sheet", () => {
  it("shows the row working while the server answers, and takes no second tap", async () => {
    const { page, close } = await mountInBrowser({
      entry,
      actions: { setRenterPassport: "() => new Promise(() => {})" },
    });
    try {
      await page.getByTestId("passport-share").click();
      const row = page.getByRole("button", { name: /Turn it off/ });
      await row.click();
      await page.waitForFunction(() =>
        [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("Turn it off") && b.getAttribute("aria-busy") === "true"),
      );
      expect(await row.isDisabled()).toBe(true);
      expect(await page.getByTestId("asi-pending-off").count()).toBe(1);
    } finally {
      await close();
    }
  });

  it("hands the sheet its dismiss back when the action throws", async () => {
    const { page, close } = await mountInBrowser({
      entry,
      actions: { setRenterPassport: 'async () => { throw new Error("dropped"); }' },
    });
    try {
      await page.getByTestId("passport-share").click();
      await page.getByRole("button", { name: /Turn it off/ }).click();
      /* The row is usable again once the throw has been handled. */
      await page.waitForFunction(() =>
        [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("Turn it off") && !b.disabled),
      );
      /* And it says so, on the sheet's own line, rather than closing silently. */
      expect(await page.getByTestId("passport-share-sheet").innerText()).toContain(
        "That did not go through. Your passport is still on.",
      );
      await page.getByRole("button", { name: "Not now" }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid="passport-share-sheet"]') === null, null, { timeout: 5000 });
    } finally {
      await close();
    }
  });
});
