/**
 * CARD ENTRY ON SCROLL, MOUNTED FOR REAL (Chromium, the product's tokens and
 * list-views.css): the cards the page opens on are left to the list stagger,
 * the ones below the fold are held and float in once as they scroll into view
 * in staggered rows, and nothing moves under reduced motion, Calm, Off or data
 * saving. Waits are polls on the state they are waiting for, never fixed
 * times, so the test holds on a loaded machine.
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

const entryWith = (saver: boolean) => `
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
  ${saver ? `Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true });` : ""}
  mount(
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 16 }}>
      {Array.from({ length: 40 }, (_, i) => <Card key={i} index={i} />)}
    </div>,
  );
`;

const entry = entryWith(false);

const cards = (page: import("playwright-core").Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-card]")].map((el) => ({
      i: Number(el.dataset.card),
      entry: el.dataset.entry ?? null,
      delay: el.style.getPropertyValue("--nf-entry-delay"),
      float: el.style.getPropertyValue("--nf-entry-float"),
    })),
  );

const heldCount = (page: import("playwright-core").Page) =>
  page.evaluate(() => document.querySelectorAll('[data-card][data-entry="pending"]').length);

describe.skipIf(!hasBrowser && !process.env.CI)("card entry on scroll", () => {
  it("leaves the first screen alone, holds the rest, releases each once in staggered rows", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      /* The observer's first report is asynchronous: wait for it, not for a time. */
      await expect.poll(() => heldCount(page), { message: "the cards below the fold are held" }).toBeGreaterThan(20);
      const first = await cards(page);
      /* 844px tall phone: the first rows are on screen and never held. */
      expect(first.slice(0, 4).every((card) => card.entry === null)).toBe(true);
      expect(first.slice(-6).every((card) => card.entry === "pending")).toBe(true);
      expect(await page.locator('[data-card="39"]').evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
      /* The seeded float: 50, 70 or 90px by index. */
      expect(new Set(first.map((card) => card.float))).toEqual(new Set(["50px", "70px", "90px"]));

      /* One jump to the bottom: the last rows arrive in the same report, so a
         row is staggered 60ms a card. */
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect
        .poll(async () => (await cards(page)).slice(-6).every((card) => card.entry === "in"), {
          message: "the cards that scrolled into view are released",
        })
        .toBe(true);

      const after = await cards(page);
      /* The first screen's cards were never touched. */
      expect(after.slice(0, 4).every((card) => card.entry === null)).toBe(true);
      const delays = after.filter((card) => card.entry === "in").map((card) => Number.parseInt(card.delay, 10));
      expect(delays.every((ms) => ms % 60 === 0 && ms <= 300)).toBe(true);
      /* At least one card waits its row-mate's 60ms: the rows are staggered, not simultaneous. */
      expect(delays).toContain(0);
      expect(delays.some((ms) => ms === 60)).toBe(true);
      expect(await page.locator('[data-card="39"]').evaluate((el) => getComputedStyle(el).animationName)).toBe(
        "nf-scroll-in",
      );
      await expect
        .poll(() => page.locator('[data-card="39"]').evaluate((el) => getComputedStyle(el).opacity), {
          message: "the released card finishes its entrance",
        })
        .toBe("1");
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
        /* The list's own entrance (`nf-card-in`, which this harness's
           stylesheet does not quiet under Calm) finishes on its own: poll for it. */
        await expect
          .poll(() => page.locator('[data-card="39"]').evaluate((el) => getComputedStyle(el).opacity), { message: name })
          .toBe("1");
        expect((await cards(page)).every((card) => card.entry === null), name).toBe(true);
      } finally {
        await close();
      }
    }
  });

  it("does nothing under data saving", async () => {
    /* The data-saver signal the way `lib/ui/data-saver.ts` reads it
       (`navigator.connection.saveData`), set after the imports and before the
       cards mount, because the hook reads it when it mounts. */
    const { page, close } = await mountInBrowser({ entry: entryWith(true), css: CSS });
    try {
      await page.waitForTimeout(900);
      expect((await cards(page)).every((card) => card.entry === null), "no card is held").toBe(true);
      expect(await page.locator('[data-card="39"]').evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
      expect(await page.locator("[data-entry]").count()).toBe(0);
    } finally {
      await close();
    }
  });
});
