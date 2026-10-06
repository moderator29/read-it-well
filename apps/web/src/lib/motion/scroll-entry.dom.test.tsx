/**
 * CARD ENTRY ON SCROLL, MOUNTED FOR REAL (Chromium, the product's tokens and
 * list-views.css): the cards the page opens on are left to the list stagger,
 * the ones below the fold are held and float in once as they scroll into view
 * in staggered rows, and nothing moves under reduced motion, Calm, Off or data
 * saving. Layout reads during the scroll are counted, because the point of the
 * single observer is that a long list costs the scroll nothing.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss("app/css/animation.css", "app/css/list-views.css");

const entry = `
  import { useRef } from "react";
  import { mount } from "@/lib/testing/browser-root";
  import { useScrollEntry } from "@/lib/motion/scroll-entry";
  function Card({ index }: { index: number }) {
    const ref = useRef<HTMLElement | null>(null);
    useScrollEntry(ref, index);
    return (
      <article ref={ref} className="nf-pcard nf-card-in" data-card={index}
        style={{ ["--card-i" as string]: Math.min(index, 5), height: 260, margin: "0 0 16px", background: "var(--nf-surface-raised)" }}>
        card {index}
      </article>
    );
  }
  mount(
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 16 }}>
      {Array.from({ length: 40 }, (_, i) => <Card key={i} index={i} />)}
    </div>,
  );
`;

const cards = (page: import("playwright-core").Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-card]")].map((el) => ({
      i: Number(el.dataset.card),
      entry: el.dataset.entry ?? null,
      delay: el.style.getPropertyValue("--nf-entry-delay"),
      float: el.style.getPropertyValue("--nf-entry-float"),
    })),
  );

describe.skipIf(!hasBrowser && !process.env.CI)("card entry on scroll", () => {
  it("leaves the first screen alone, holds the rest, releases each once in staggered rows", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      await page.waitForTimeout(250);
      const first = await cards(page);
      /* 844px tall phone: the first rows are on screen and never held. */
      expect(first.slice(0, 4).every((card) => card.entry === null)).toBe(true);
      expect(first.slice(-6).every((card) => card.entry === "pending")).toBe(true);
      expect(await page.locator('[data-card="39"]').evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
      /* The seeded float: 50, 70 or 90px by index. */
      expect(new Set(first.map((card) => card.float))).toEqual(new Set(["50px", "70px", "90px"]));

      /* Count layout reads while scrolling the whole list. */
      await page.evaluate(() => {
        const w = window as unknown as { __reads: number };
        w.__reads = 0;
        const original = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = function () {
          w.__reads += 1;
          return original.call(this);
        };
      });
      const gaps = await page.evaluate(
        () =>
          new Promise<number[]>((resolve) => {
            const gaps: number[] = [];
            let last = performance.now();
            let y = 0;
            const step = () => {
              const now = performance.now();
              gaps.push(now - last);
              last = now;
              y += 40;
              window.scrollTo(0, y);
              if (y < document.documentElement.scrollHeight) requestAnimationFrame(step);
              else resolve(gaps);
            };
            requestAnimationFrame(step);
          }),
      );
      await page.waitForTimeout(900);
      const reads = await page.evaluate(() => (window as unknown as { __reads: number }).__reads);
      expect(reads, "no layout read by the entry code while scrolling").toBe(0);
      expect(Math.max(...gaps), "no long frame while scrolling 40 cards").toBeLessThan(250);

      const after = await cards(page);
      expect(after.slice(0, 4).every((card) => card.entry === null)).toBe(true);
      expect(after.slice(-6).every((card) => card.entry === "in")).toBe(true);
      const delays = after.filter((card) => card.entry === "in").map((card) => Number.parseInt(card.delay, 10));
      expect(delays.every((ms) => ms % 60 === 0 && ms <= 300)).toBe(true);
      expect(await page.locator('[data-card="39"]').evaluate((el) => getComputedStyle(el).animationName)).toBe(
        "nf-scroll-in",
      );
      expect(await page.locator('[data-card="39"]').evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    } finally {
      await close();
    }
  });

  it("does nothing under reduced motion, Calm or Off", async () => {
    const quiet: { name: string; opts: Record<string, unknown> }[] = [
      { name: "reduced", opts: { reducedMotion: true } },
      { name: "calm", opts: { motion: "calm" } },
      { name: "off", opts: { motion: "off" } },
    ];
    for (const { name, opts } of quiet) {
      const { page, close } = await mountInBrowser({ entry, css: CSS, ...opts });
      try {
        /* Long enough for the list's own entrance (`nf-card-in`, which this
           harness's stylesheet does not quiet under Calm) to have finished. */
        await page.waitForTimeout(900);
        expect((await cards(page)).every((card) => card.entry === null), name).toBe(true);
        expect(await page.locator('[data-card="39"]').evaluate((el) => getComputedStyle(el).opacity), name).toBe("1");
      } finally {
        await close();
      }
    }
  });
});
