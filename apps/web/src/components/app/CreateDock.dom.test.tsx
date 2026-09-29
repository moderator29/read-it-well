/**
 * The dock's centre "+" and its Create sheet, mounted for real in Chromium
 * (lib/testing/mount-in-browser): which rows a host and a non-host are
 * offered, that Switch workspace is signed-in only and fires the workspace
 * sheet's named event, and that closing the sheet hands focus back to the
 * "+" it was opened from.
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

function entry({ isHost, signedIn }: { isHost: boolean; signedIn: boolean }): string {
  return `
    import { getDictionary } from "@vallo/i18n";
    import { mount } from "@/lib/testing/browser-root";
    import { shellDictionary } from "@/lib/i18n/shell-dictionary";
    import { CreateDock } from "@/components/app/CreateDock";
    import { PROFILE_SWITCHER_EVENT } from "@/components/supply/profile-switcher-event";
    window.__switchAsked = 0;
    window.addEventListener(PROFILE_SWITCHER_EVENT, (event) => {
      window.__switchAsked += 1;
      event.preventDefault();
    });
    const t = shellDictionary(getDictionary("en"));
    mount(
      <CreateDock
        t={t}
        listHref="/profile/setup"
        isHost={${JSON.stringify(isHost)}}
        signedIn={${JSON.stringify(signedIn)}}
      />,
    );
  `;
}

const ROWS = ["create-list", "create-post", "create-viewing"];

describe.skipIf(!hasBrowser && !process.env.CI)("CreateDock", () => {
  it("offers a non-host the three create rows and Switch workspace, and no stay row", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ isHost: false, signedIn: true }) });
    try {
      await page.getByRole("button", { name: "Create" }).click();
      await page.getByRole("dialog").waitFor();
      for (const id of ROWS) expect(await page.getByTestId(id).count()).toBe(1);
      expect(await page.getByTestId("create-stay").count()).toBe(0);
      expect(await page.getByTestId("create-switch-workspace").count()).toBe(1);
      expect(await page.getByTestId("create-post").getAttribute("href")).toBe("/around?compose=1");
    } finally {
      await close();
    }
  });

  it("adds the stay row for a host", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ isHost: true, signedIn: true }) });
    try {
      await page.getByRole("button", { name: "Create" }).click();
      await page.getByRole("dialog").waitFor();
      for (const id of [...ROWS, "create-stay"]) expect(await page.getByTestId(id).count()).toBe(1);
      expect(await page.getByTestId("create-stay").getAttribute("href")).toBe("/host/rooms");
    } finally {
      await close();
    }
  });

  it("hides Switch workspace when signed out", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ isHost: false, signedIn: false }) });
    try {
      await page.getByRole("button", { name: "Create" }).click();
      await page.getByRole("dialog").waitFor();
      expect(await page.getByTestId("create-switch-workspace").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("fires the workspace sheet's event from Switch workspace, once", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ isHost: false, signedIn: true }) });
    try {
      await page.getByRole("button", { name: "Create" }).click();
      await page.getByTestId("create-switch-workspace").click();
      await page.waitForFunction(() => (window as unknown as { __switchAsked: number }).__switchAsked === 1);
      expect(await page.evaluate(() => (window as unknown as { __switchAsked: number }).__switchAsked)).toBe(1);
    } finally {
      await close();
    }
  });

  it("returns focus to the + when the sheet closes", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ isHost: false, signedIn: true }) });
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
