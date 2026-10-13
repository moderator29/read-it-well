/**
 * "Ownership seen" on a search result card: drawn with the date the search
 * page read for the whole shelf, on the short grid card as on the full one,
 * and never on an example listing or without a date. The real card, mounted
 * in Chromium.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const ENTRY = `
  import { getDictionary } from "@vallo/i18n";
  import { mount } from "@/lib/testing/browser-root";
  import { ListingCard } from "@/components/app/ListingCard";
  import { RENTAL } from "@/app/(dev)/preview/f3/fixtures";
  const t = getDictionary("en");
  const REAL = { ...RENTAL, isDemo: false };
  const DEMO = { ...RENTAL, isDemo: true };
  const SEEN = { seenAt: "2026-10-12T09:00:00Z", label: t.supply.register.owner.proof.seenMark };
  mount(
    <div style={{ width: 358 }}>
      <div id="brief"><ListingCard listing={REAL} locale="en" t={t} brief dense ownershipSeen={SEEN} /></div>
      <div id="full"><ListingCard listing={REAL} locale="en" t={t} ownershipSeen={SEEN} /></div>
      <div id="none"><ListingCard listing={REAL} locale="en" t={t} brief dense /></div>
      <div id="demo"><ListingCard listing={DEMO} locale="en" t={t} ownershipSeen={SEEN} /></div>
    </div>,
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("Ownership seen on a search card", () => {
  it("draws the mark with its words where a date was read, and nowhere else", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY });
    try {
      const mark = (id: string) => page.locator(`#${id} [data-testid="ownership-seen"]`);
      expect(await mark("brief").count()).toBe(1);
      expect(await mark("brief").textContent()).toBe("Ownership seen");
      expect(await mark("full").count()).toBe(1);
      expect(await mark("none").count()).toBe(0);
      expect(await mark("demo").count()).toBe(0);
    } finally {
      await close();
    }
  });
});
