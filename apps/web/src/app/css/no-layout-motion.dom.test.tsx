/**
 * NOTHING ON A FREQUENT PATH ANIMATES LAYOUT (round 5, W1; the source guard is
 * `no-layout-motion.test.ts`). Read off a real Chromium: what each element
 * transitions, and where its box is on the first frame of the change.
 *
 *   the dock     icon only since 7 October: a tap draws the pill and moves
 *                no box (the chosen word, which used to grow, is gone and
 *                stays hidden even if a label element is passed in);
 *   the bowl     on a touch screen, a focused field snaps the bowl's box once
 *                and the form is DRAWN where the bowl is, on a registered
 *                length that only transforms read;
 *   the bloom    the pointer bloom moves on `translate`, not `left`/`top`;
 *   progress     the fill moves on transform and is the track's width.
 *
 * Each with its reduced-motion answer: the settled state at once.
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

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const DOCK_CSS = productCss("app/css/chrome.css", "app/css/shell-m.css", "app/css/nav-island.css");

const dock = `
  import { mount } from "@/lib/testing/browser-root";
  const Tab = ({ id, on, word }: { id: string; on?: boolean; word: string }) => (
    <li className="nf-tab">
      <a className="nf-tab__link" id={id} aria-current={on ? "page" : undefined}>
        <span className="nf-tab__body" id={id + "-body"}>
          <span className="nf-tab__icon" id={id + "-icon"} style={{ width: 24, height: 24 }} />
          <span className="nf-tab__label" id={id + "-label"}>{word}</span>
        </span>
      </a>
    </li>
  );
  window.__choose = () => document.getElementById("b")!.setAttribute("data-on", "");
  mount(<div className="nf-dockrow" style={{ padding: 16 }}>
    <ul className="nf-tabbar" style={{ display: "flex", width: 320, listStyle: "none", margin: 0, padding: 0 }}>
      <Tab id="a" on word="Home" />
      <Tab id="b" word="Saved" />
      <Tab id="c" word="Trips" />
    </ul>
  </div>);
`;

const box = (page: Page, id: string) =>
  page.evaluate((i) => {
    const r = document.getElementById(i)!.getBoundingClientRect();
    return { x: r.left + r.width / 2, w: r.width };
  }, id);
const css = (page: Page, id: string, prop: string) =>
  page.evaluate(([i, p]) => (getComputedStyle(document.getElementById(i!)!) as unknown as Record<string, string>)[p!] ?? "", [id, prop] as const);

describe.skipIf(!hasBrowser && !process.env.CI)("no layout motion on the frequent paths", () => {
  it("a tap moves nothing in the dock: the glyph stays centred and every slot keeps its width", async () => {
    const { page, close } = await mountInBrowser({ entry: dock, css: DOCK_CSS });
    try {
      /* The body carries no translate (there is no word for the glyph to make room for). */
      expect(await css(page, "b-body", "transitionProperty")).not.toContain("translate");

      const iconBefore = await box(page, "b-icon");
      const slotBefore = await box(page, "b");
      expect(Math.abs(iconBefore.x - slotBefore.x)).toBeLessThan(1);

      /* The frame the change lands on, measured in the same task as the tap. */
      const first = await page.evaluate(() => {
        (window as unknown as { __choose: () => void }).__choose();
        const at = (i: string) => {
          const r = document.getElementById(i)!.getBoundingClientRect();
          return { x: r.left + r.width / 2, w: r.width };
        };
        return { icon: at("b-icon"), slot: at("b"), label: at("b-label") };
      });
      expect(Math.abs(first.icon.x - first.slot.x), `glyph ${first.icon.x} centre ${first.slot.x}`).toBeLessThan(1);
      expect(first.label.w, "no word takes room").toBe(0);

      await page.waitForTimeout(600);
      const settledIcon = await box(page, "b-icon");
      const settledSlot = await box(page, "b");
      expect(Math.abs(settledIcon.x - settledSlot.x)).toBeLessThan(1);
      expect(Math.abs(settledSlot.w - slotBefore.w), "the chosen slot keeps its share").toBeLessThan(1);
      expect(await css(page, "b-label", "display")).toBe("none");
    } finally {
      await close();
    }
  });

  it("under reduced motion the dock is settled at once", async () => {
    const { page, close } = await mountInBrowser({ entry: dock, css: DOCK_CSS, reducedMotion: true });
    try {
      expect(await css(page, "b-body", "transitionDuration")).toBe("0s");
      await page.evaluate(() => (window as unknown as { __choose: () => void }).__choose());
      expect(await css(page, "b-label", "display")).toBe("none");
    } finally {
      await close();
    }
  });

  it("the pointer bloom and the progress fill move on transform", async () => {
    const entry = `
      import { mount } from "@/lib/testing/browser-root";
      import { Progress } from "@/components/ui/Progress";
      mount(<div>
        <div className="nf-ambient"><span /><span /><span /><span id="bloom" /></div>
        <div style={{ width: 300 }}><Progress value={40} label="Upload" /></div>
      </div>);
    `;
    /* Tailwind's `block h-full` stood in for, since the harness compiles no utilities. */
    const css2 = productCss("app/css/ambient.css") + '[role="progressbar"] { height: 6px; overflow: hidden } [role="progressbar"] > span { display: block; height: 100% }';
    const { page, close } = await mountInBrowser({ entry, css: css2 });
    try {
      expect(await css(page, "bloom", "transitionProperty")).toBe("translate");
      /* The fill is the track's width, set on a transform (its transition
         class is Tailwind's `transition-transform`, held by the source guard). */
      const fill = await page.evaluate(() => {
        const bar = document.querySelector('[role="progressbar"]')!;
        const span = bar.firstElementChild as HTMLElement;
        return { inline: span.style.width, transform: span.style.transform, cls: span.className, w: span.getBoundingClientRect().width, track: bar.getBoundingClientRect().width };
      });
      expect(fill.inline).toBe("");
      expect(fill.transform).toBe("translateX(-60%)");
      expect(fill.cls).toMatch(/\btransition-transform\b/);
      expect(fill.w).toBeCloseTo(fill.track, 0);
      /* 40 per cent of the track is lit: the fill's right edge, after the slide. */
      await page.waitForTimeout(600);
      const right = await page.evaluate(() => {
        const bar = document.querySelector('[role="progressbar"]')!;
        return (bar.firstElementChild as HTMLElement).getBoundingClientRect().right - bar.getBoundingClientRect().left;
      });
      expect(right).toBeCloseTo(120, 0);
    } finally {
      await close();
    }
  });
});
