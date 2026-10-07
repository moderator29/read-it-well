/**
 * The dock's centre "+" and its Create sheet, mounted for real in Chromium
 * (lib/testing/mount-in-browser): the sheet is three plain options per side
 * and nothing else (handoff A.6), the workspace switch is not in it (it lives
 * on `/profile`, `SwitchRoleRow`), and closing the sheet hands focus back to
 * the "+" it was opened from.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";

/* The browser starts in the hook; each test gets the budget its mount needs. */
vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

function entry({ isHost, side = "property", socialOn = true }: { isHost: boolean; side?: string; socialOn?: boolean }): string {
  return `
    import { getDictionary } from "@vallo/i18n";
    import { mount } from "@/lib/testing/browser-root";
    import { shellDictionary } from "@/lib/i18n/shell-dictionary";
    import { CreateDock } from "@/components/app/CreateDock";
    const t = shellDictionary(getDictionary("en"));
    mount(
      <CreateDock
        t={t}
        listHref="/profile/setup"
        side={${JSON.stringify(side)}}
        isHost={${JSON.stringify(isHost)}}
        socialOn={${JSON.stringify(socialOn)}}
      />,
    );
  `;
}

/** The options as the sheet draws them: the test ids in order, and their words. */
async function optionsOf(page: import("playwright-core").Page) {
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("dialog").waitFor();
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-testid='create-options'] a")].map((a) => ({
      id: a.getAttribute("data-testid"),
      href: a.getAttribute("href"),
      text: a.textContent?.trim(),
      hasArt: a.querySelector("svg, img, .nf-icon-plate") !== null,
    })),
  );
}

describe.skipIf(!hasBrowser && !process.env.CI)("CreateDock", () => {
  it("offers exactly three plain options on the property side, and no workspace row", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ isHost: false }) });
    try {
      const options = await optionsOf(page);
      expect(options.map((o) => o.id)).toEqual(["create-list", "create-post", "create-viewing"]);
      expect(options.map((o) => o.text)).toEqual(["List a property", "Post to the feed", "Book a viewing"]);
      expect(options.map((o) => o.href)).toEqual(["/profile/setup", "/around?compose=1", "/search"]);
      /* Plain: no plate, no glyph, no chevron, and no subtitle line. */
      expect(options.some((o) => o.hasArt)).toBe(false);
      expect(await page.getByTestId("create-switch-workspace").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("gives a host on the property side the same three, not a fourth", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ isHost: true }) });
    try {
      expect((await optionsOf(page)).length).toBe(3);
    } finally {
      await close();
    }
  });

  it("offers the stays side its own three, with a host's listing going to their rooms", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ isHost: true, side: "stays" }) });
    try {
      const options = await optionsOf(page);
      expect(options.map((o) => o.text)).toEqual(["Create a stay listing", "Post to the feed", "Book a stay"]);
      expect(options.map((o) => o.href)).toEqual(["/host/rooms", "/around?compose=1", "/stays/search"]);
    } finally {
      await close();
    }
  });

  it("drops the post option when the social switch is off", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ isHost: false, socialOn: false }) });
    try {
      expect((await optionsOf(page)).map((o) => o.id)).toEqual(["create-list", "create-viewing"]);
    } finally {
      await close();
    }
  });

  it("returns focus to the + when the sheet closes", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ isHost: false }) });
    try {
      const plus = page.getByRole("button", { name: "Create" });
      await plus.focus();
      await page.keyboard.press("Enter");
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "detached" });
      await page.waitForFunction(() => document.activeElement?.hasAttribute("data-dock-create") === true);
      expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("Create");
    } finally {
      await close();
    }
  });
});
