/**
 * SlidePagination, mounted for real in Chromium at a desktop width: the
 * indicator is measured against the real slots and travels on a transform, the
 * first paint does not slide, the keyboard works, and it is gone on a phone.
 */
import type { Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { PORTED_CSS, axeViolations } from "./ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = (opts: { count?: number; start?: number } = {}) => `
  import { useState } from "react";
  import { SlidePagination } from "@/components/ui/SlidePagination";
  import { MotionProvider } from "@/components/app/MotionProvider";
  import { mount } from "@/lib/testing/browser-root";
  function Harness() {
    const [page, setPage] = useState(${opts.start ?? 1});
    window.__page = page;
    return (
      <MotionProvider><div style={{ padding: 24 }}>
        <SlidePagination
          page={page}
          pageCount={${opts.count ?? 20}}
          onChange={setPage}
          label="Table pages"
          previousLabel="Previous page"
          nextLabel="Next page"
          pageLabel={(n) => "Page " + n}
        />
      </div></MotionProvider>
    );
  }
  mount(<Harness />);
`;
const DESKTOP = { width: 1280, height: 800 };
const pageNo = (page: Page) => page.evaluate(() => (window as unknown as { __page: number }).__page);
const thumbLeft = (page: Page) => page.locator(".nf-slidepag__thumb").evaluate((el) => el.getBoundingClientRect().left);

describe.skipIf(!hasBrowser && !process.env.CI)("SlidePagination", () => {
  it("marks the current page and places the indicator exactly under it", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ start: 3 }), css: PORTED_CSS, viewport: DESKTOP });
    try {
      const current = page.getByRole("button", { name: "Page 3" });
      expect(await current.getAttribute("aria-current")).toBe("page");
      const thumb = (await page.locator(".nf-slidepag__thumb").boundingBox())!;
      const box = (await current.boundingBox())!;
      expect(Math.abs(thumb.x - box.x)).toBeLessThan(1.5);
      expect(Math.abs(thumb.width - box.width)).toBeLessThan(1.5);
    } finally {
      await close();
    }
  });

  it("slides the indicator to the chosen page on a spring, through the positions in between", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS, viewport: DESKTOP });
    try {
      const start = await thumbLeft(page);
      /* Sampled inside the page, one reading per frame, so nothing is missed. */
      const samples = await page.evaluate(
        () =>
          new Promise<number[]>((resolve) => {
            const out: number[] = [];
            const thumb = document.querySelector(".nf-slidepag__thumb") as HTMLElement;
            (document.querySelector('[aria-label="Page 5"]') as HTMLElement).click();
            const tick = () => {
              out.push(thumb.getBoundingClientRect().left);
              if (out.length < 45) requestAnimationFrame(tick);
              else resolve(out);
            };
            tick();
          }),
      );
      expect(await pageNo(page)).toBe(5);
      const end = await thumbLeft(page);
      const box = (await page.getByRole("button", { name: "Page 5" }).boundingBox())!;
      expect(Math.abs(end - box.x)).toBeLessThan(1.5);
      expect(end).toBeGreaterThan(start);
      /* It has not teleported: frames lie strictly between the two. */
      expect(samples.filter((v) => v > start + 2 && v < end - 2).length).toBeGreaterThan(2);
    } finally {
      await close();
    }
  });

  it("turns round from where it is when a second page is chosen mid-flight", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS, viewport: DESKTOP });
    try {
      await page.getByRole("button", { name: "Page 5" }).click();
      await page.waitForTimeout(40);
      await page.getByRole("button", { name: "Page 1" }).click();
      await page.waitForTimeout(800);
      const box = (await page.getByRole("button", { name: "Page 1" }).boundingBox())!;
      expect(Math.abs((await thumbLeft(page)) - box.x)).toBeLessThan(1.5);
    } finally {
      await close();
    }
  });

  it("does not slide in from the left on first paint", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ start: 3 }), css: PORTED_CSS, viewport: DESKTOP });
    try {
      const box = (await page.getByRole("button", { name: "Page 3" }).boundingBox())!;
      expect(Math.abs((await thumbLeft(page)) - box.x)).toBeLessThan(1.5);
    } finally {
      await close();
    }
  });

  it("steps with previous and next, and disables them at the ends", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ count: 3 }), css: PORTED_CSS, viewport: DESKTOP });
    try {
      const prev = page.getByRole("button", { name: "Previous page" });
      const next = page.getByRole("button", { name: "Next page" });
      expect(await prev.isDisabled()).toBe(true);
      await next.click();
      await next.click();
      expect(await pageNo(page)).toBe(3);
      expect(await next.isDisabled()).toBe(true);
      await prev.click();
      expect(await pageNo(page)).toBe(2);
    } finally {
      await close();
    }
  });

  it("keeps ellipsis out of the accessibility tree and the order reachable by Tab", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ start: 10 }), css: PORTED_CSS, viewport: DESKTOP });
    try {
      expect(await page.locator(".nf-slidepag__gap").count()).toBe(2);
      expect(await page.locator(".nf-slidepag__gap").first().getAttribute("aria-hidden")).toBe("true");
      await page.getByRole("button", { name: "Previous page" }).focus();
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("Page 1");
      await page.keyboard.press("Enter");
      expect(await pageNo(page)).toBe(1);
    } finally {
      await close();
    }
  });

  it("is not drawn on a phone, and is from 768 up", async () => {
    const phone = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      expect(await phone.page.getByRole("navigation", { name: "Table pages" }).isVisible()).toBe(false);
    } finally {
      await phone.close();
    }
    const tablet = await mountInBrowser({ entry: entry(), css: PORTED_CSS, viewport: { width: 768, height: 800 } });
    try {
      expect(await tablet.page.getByRole("navigation", { name: "Table pages" }).isVisible()).toBe(true);
    } finally {
      await tablet.close();
    }
  });

  it("jumps instead of sliding under reduced motion", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS, viewport: DESKTOP, reducedMotion: true });
    try {
      await page.getByRole("button", { name: "Page 5" }).click();
      await page.waitForTimeout(60);
      const box = (await page.getByRole("button", { name: "Page 5" }).boundingBox())!;
      expect(Math.abs((await thumbLeft(page)) - box.x)).toBeLessThan(1.5);
    } finally {
      await close();
    }
  });

  it("passes axe in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry: entry({ start: 5 }), css: PORTED_CSS, viewport: DESKTOP });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await page.waitForTimeout(400);
        expect(await axeViolations(page), theme).toEqual([]);
      } finally {
        await close();
      }
    }
  });
});
