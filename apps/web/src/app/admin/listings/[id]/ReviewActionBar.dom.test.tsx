/**
 * The listing desk's decision bar, mounted in Chromium with `reviewListing`
 * staged: Reject waits for a reason the server will take, as Ask for more
 * already did, and a listing that is with the lister for changes cannot be
 * approved from here until they send it back.
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

const entry = (status: string) => `
  import { mount } from "@/lib/testing/browser-root";
  import { ReviewActionBar } from "@/app/admin/listings/[id]/ReviewActionBar";
  mount(<ReviewActionBar listingId="5f2504e0-4f89-41d3-9a0c-0305e82c3301" status="${status}" nextHref={null} queueHref="/admin/listings" />);
`;

const ACTIONS = { reviewListing: `async () => ({ ok: true, data: null })` };

describe.runIf(hasBrowser)("the listing decision bar", () => {
  it("holds Reject until there is a reason, then asks for the second press", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("SUBMITTED"), actions: ACTIONS, viewport: { width: 1280, height: 800 } });
    try {
      const reject = page.locator("[data-desk-decline]");
      expect(await reject.isDisabled()).toBe(true);
      await page.locator("#rv-reason").fill("no");
      expect(await reject.isDisabled()).toBe(true);
      await page.locator("#rv-reason").fill("The photographs are of a different flat.");
      expect(await reject.isDisabled()).toBe(false);

      await reject.click();
      expect(await reject.innerText()).toContain("Press again to reject");
      expect(await page.evaluate(() => ((window as unknown as { __calls?: unknown[] }).__calls ?? []).length)).toBe(0);
      await reject.click();
      await page.waitForFunction(() => ((window as unknown as { __calls?: unknown[] }).__calls ?? []).length === 1);
      const [name, input] = await page.evaluate(() => (window as unknown as { __calls: [string, Record<string, unknown>][] }).__calls[0]!);
      expect(name).toBe("reviewListing");
      expect(input).toMatchObject({ decision: "reject", notes: "The photographs are of a different flat." });
    } finally {
      await close();
    }
  });

  it("takes a reason chip as the reason", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("SUBMITTED"), actions: ACTIONS, viewport: { width: 1280, height: 800 } });
    try {
      expect(await page.locator("[data-desk-decline]").isDisabled()).toBe(true);
      await page.getByText("Photos seen on another listing").click();
      expect(await page.locator("[data-desk-decline]").isDisabled()).toBe(false);
    } finally {
      await close();
    }
  });

  it("does not offer Approve on a listing that is with the lister for changes", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("MORE_INFO_REQUIRED"), actions: ACTIONS, viewport: { width: 1280, height: 800 } });
    try {
      expect(await page.locator("[data-desk-approve]").isDisabled()).toBe(true);
      expect(await page.locator('[data-testid="rv-with-lister"]').innerText()).toContain("with the lister");
      await page.locator("#rv-reason").fill("Add a photo of the kitchen too.");
      expect(await page.getByRole("button", { name: "Ask for more" }).isDisabled()).toBe(false);
    } finally {
      await close();
    }
  });

  it("offers Publish, not Approve, once a listing is approved", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("APPROVED"), actions: ACTIONS, viewport: { width: 1280, height: 800 } });
    try {
      const approve = page.locator("[data-desk-approve]");
      expect(await approve.innerText()).toContain("Publish");
      expect(await approve.isDisabled()).toBe(false);
    } finally {
      await close();
    }
  });
});
