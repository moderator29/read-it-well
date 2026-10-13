/**
 * THE CYAN BADGE ON A NOTIFICATIONS SECTION COUNTS UNREAD, AND ONLY UNREAD.
 *
 * It counted every row, so a day whose two notices were both read said "2" in
 * the unread colour (C5's finding, Round 3). Mounted for real in Chromium with
 * the f4 deck's notifications: once all marked read (no badge may draw; the
 * old code drew one per section), and once as committed, where each badge
 * must equal its own group's unread rows and say so in words.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss("app/(app)/notifications/notifications.css");

function entry(allRead: boolean): string {
  return `
    import { getDictionary } from "@vallo/i18n";
    import { LiveNotifications } from "@/app/(app)/notifications/LiveNotifications";
    import { PERSON } from "@/app/(dev)/preview/_fixtures/people";
    import { NOTIFICATIONS } from "@/app/(dev)/preview/f4/fixtures";
    import { mount } from "@/lib/testing/browser-root";
    const rows = ${allRead ? "NOTIFICATIONS.map((n) => ({ ...n, read: true }))" : "NOTIFICATIONS"};
    mount(
      <div style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        <LiveNotifications
          initial={rows}
          userId={PERSON.id}
          now={Date.parse("2026-09-19T12:00:00.000Z")}
          copy={getDictionary("en").experienceInbox.notifications}
          locale="en"
        />
      </div>,
    );
  `;
}

describe.skipIf(!hasBrowser && !process.env.CI)("the notifications section badge", () => {
  it("draws nothing for a section whose rows are all read", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(true), css: CSS });
    try {
      await page.locator('[data-testid^="notifications-"]').first().waitFor();
      expect(await page.locator(".nf-notif__count").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("counts each section's unread rows and says unread", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(false), css: CSS });
    try {
      await page.locator('[data-testid^="notifications-"]').first().waitFor();
      const sections = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>(".nf-notif__group")].map((group) => ({
          badge: group.querySelector(".nf-notif__count")?.textContent ?? null,
          label: group.querySelector(".nf-notif__count")?.getAttribute("aria-label") ?? null,
          unread: group.querySelectorAll(".nf-notif__row--unread").length,
        })),
      );
      expect(sections.length).toBeGreaterThan(0);
      for (const section of sections) {
        if (section.unread === 0) {
          expect(section.badge).toBeNull();
        } else {
          expect(Number(section.badge)).toBe(section.unread);
          expect(section.label).toBe(`${section.unread} unread`);
        }
      }
    } finally {
      await close();
    }
  });
});
