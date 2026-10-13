/**
 * THE HERO FIGURE UNDER TEXT ZOOM (auditor A8, NIT: "the figure under text
 * zoom"). Chromium, the real `HistoryHero` (HeroBand, HeroFigure, CountedText,
 * the odometer at rest), on a 390px phone with the 16px side gutter.
 *
 * Text zoom is the reader's font size: the root font size doubled, which is
 * what WCAG 1.4.4 (resize text to 200%) asks to survive. The hero figure is
 * one line by design (`white-space: nowrap`, a money figure is never broken),
 * so the question is whether it still FITS its column at 200%: while it counts
 * up, and at rest, for a short total (the `lg` figure) and the longest the
 * money history draws (the `md` figure). A figure wider than its column runs
 * off the screen or makes the page scroll sideways, and the end of a money
 * figure is the part that matters.
 *
 * Measured before the fix (`clean-17.css`, `.nf-hero-figure__value`): at 200%
 * ₦450,000.00 painted 551px at 72px in its column, ₦45,000,000.00 574px at
 * 56px, and ₦450,000,000.00 overflowed by 11px even at 100%.
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
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT * 2 });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = `${productCss("app/css/controls.css", "app/css/clean-17.css", "app/css/money-history.css", "app/css/motion-kit.css", "app/css/motion.css")}
  body { margin: 0; }`;

/* A short total and the longest one the history's `md` figure is for (twelve digits and more with the kobo). */
const TOTALS = { "lg, ₦450,000.00": 45_000_000, "md, ₦45,000,000.00": 4_500_000_000, "md, ₦450,000,000.00": 45_000_000_000 } as const;

const entry = (minor: number) => `
  import { mount } from "@/lib/testing/browser-root";
  import { HistoryHero } from "@/components/app/money-history/HistoryHero";
  mount(
    <main style={{ padding: "0 16px" }}>
      <HistoryHero label="You paid" totalMinor={${minor}} locale="en" note="Payments that have already moved." id="t" />
    </main>,
  );
`;

type Fit = { font: number; figure: number; column: number; page: number; viewport: number };

/** The figure line's painted width against its column, and the page's width against the viewport. */
const fit = (page: Page): Promise<Fit> =>
  page.evaluate(() => {
    const value = document.querySelector(".nf-hero-figure__value") as HTMLElement;
    /* The column is the figure's own box: the band's padding is rem, so it grows with the text too. */
    const column = value.parentElement as HTMLElement;
    const range = document.createRange();
    range.selectNodeContents(value);
    return {
      font: Number.parseFloat(getComputedStyle(value).fontSize),
      figure: range.getBoundingClientRect().width,
      column: column.clientWidth,
      page: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    };
  });

describe.skipIf(!hasBrowser && !process.env.CI)("the hero figure under text zoom", () => {
  for (const [name, minor] of Object.entries(TOTALS)) {
    it(`${name}: fits its column while counting and at rest, at 100% and 200% text`, async () => {
      const atRest: Record<number, Fit> = {};
      for (const zoom of [100, 200]) {
        const { page, close } = await mountInBrowser({
          entry: entry(minor),
          css: CSS,
          init: `document.documentElement.style.fontSize = "${zoom}%";`,
        });
        try {
          const counting = await fit(page);
          await page.waitForTimeout(1200);
          const rest = await fit(page);
          for (const [when, m] of [["counting", counting], ["at rest", rest]] as const) {
            const where = `${zoom}% ${when}: figure ${m.figure.toFixed(0)}px at ${m.font}px in a ${m.column}px column`;
            expect(m.figure, where).toBeLessThanOrEqual(m.column + 0.5);
            expect(m.page, `${where}; the page scrolls sideways`).toBeLessThanOrEqual(m.viewport);
          }
          atRest[zoom] = rest;
        } finally {
          await close();
        }
      }
      /* Text zoom still enlarges it until the figure fills its column (90% or more of it: the cap is the size that
         fills it, less the hairline); it is never cut to make room. A long figure can end smaller at 200% than at
         100%, because the hero band's padding is rem and takes 40px more of a phone's width; it is still whole. */
      const [one, two] = [atRest[100]!, atRest[200]!];
      expect(
        two.font >= one.font || two.figure >= two.column * 0.9,
        `200%: ${two.font}px filling ${two.figure.toFixed(0)} of ${two.column}px, against ${one.font}px at 100%`,
      ).toBe(true);
    });
  }
});
