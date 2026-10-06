/**
 * TYPING NEVER MOVES THE PAGE (round 5 craft, "a search finds the right
 * place"), in Chromium, on the real results bar.
 *
 * Focusing the empty field offers the recent searches; typing closes them.
 * Both used to happen in the page's flow, so the results jumped down as the
 * keyboard rose and back up on the first letter. Now the list floats under
 * the field and the results hold their place throughout; and with the
 * visible area cut to what a phone shows above its keyboard, the list ends
 * above it and scrolls inside itself. Read from computed layout, no clock.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { GLASS_CSS, productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT * 2 });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(GLASS_CSS, "app/css/catalogue.css", "app/css/member-loop.css");

const SEEDED = JSON.stringify(
  ["Lekki, 2 beds", "Yaba, under 3m", "Ikeja", "Surulere", "Gbagada", "Ajah"].map((label) => ({
    label,
    href: `/search?q=${encodeURIComponent(label)}`,
  })),
);

const ENTRY = `
  import { mount } from "@/lib/testing/browser-root";
  import { getDictionary } from "@vallo/i18n";
  import { ShelfBar } from "@/components/app/search/ShelfBar";
  import { parseShelfQuery } from "@/components/app/search/shelf-query";
  const t = getDictionary("en");
  mount(
    <main style={{ padding: "0 16px" }}>
      <ShelfBar query={parseShelfQuery({})} facts={[]} locale="en" t={t} />
      <ul id="results" style={{ height: 2000, margin: 0 }}><li>First result</li></ul>
    </main>,
  );
`;

const resultsTop = (page: Page) =>
  page.evaluate(() => Math.round(document.getElementById("results")!.getBoundingClientRect().top));

async function open(viewport?: { width: number; height: number }) {
  return mountInBrowser({
    entry: ENTRY,
    css: CSS,
    url: "http://vallo.test/search",
    init: `localStorage.setItem("nf_recent_searches", ${JSON.stringify(SEEDED)});`,
    ...(viewport ? { viewport } : {}),
  });
}

describe.skipIf(!hasBrowser && !process.env.CI)("typing holds the page still", () => {
  it("the results do not move when the recent searches open, or when typing closes them", async () => {
    const { page, close } = await open();
    try {
      const panel = page.getByTestId("recent-searches");
      await expect.poll(() => panel.count()).toBe(1);
      const before = await resultsTop(page);
      await page.locator("#shelf-q").focus();
      await expect.poll(() => panel.isVisible()).toBe(true);
      expect(await resultsTop(page), "opening the list moves nothing").toBe(before);
      /* The list sits under the field, not over it. */
      const gap = await page.evaluate(() => {
        const field = document.querySelector(".nf-shelf-field")!.getBoundingClientRect();
        const list = document.querySelector("[data-testid=recent-searches]")!.getBoundingClientRect();
        return list.top - field.bottom;
      });
      expect(gap).toBeGreaterThanOrEqual(0);
      await page.keyboard.type("L");
      await expect.poll(() => panel.isHidden()).toBe(true);
      expect(await resultsTop(page), "typing moves nothing").toBe(before);
      expect(await page.inputValue("#shelf-q")).toBe("L");
    } finally {
      await close();
    }
  });

  it("with only the room above a keyboard, the list ends inside it and scrolls itself", async () => {
    /* A 390-wide phone with the keyboard up: about 300px left to see. */
    const { page, close } = await open({ width: 390, height: 300 });
    try {
      const panel = page.getByTestId("recent-searches");
      await page.locator("#shelf-q").focus();
      await expect.poll(() => panel.isVisible()).toBe(true);
      await page.waitForTimeout(300);
      const box = await page.evaluate(() => {
        const list = document.querySelector<HTMLElement>("[data-testid=recent-searches]")!;
        return {
          bottom: list.getBoundingClientRect().bottom,
          visible: window.visualViewport!.height,
          scrolls: list.scrollHeight > list.clientHeight && getComputedStyle(list).overflowY === "auto",
        };
      });
      expect(box.bottom).toBeLessThanOrEqual(box.visible);
      expect(box.scrolls).toBe(true);
    } finally {
      await close();
    }
  });
});
