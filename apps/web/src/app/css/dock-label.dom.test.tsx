/**
 * THE DOCK LABEL DOES NOT JITTER AS IT GROWS (A8 NIT 8; shell-m.css). A
 * multi-word label that fits on one line wrapped to two while its max-width was
 * still small and back to one as it grew. It now stays nowrap while it
 * animates and may wrap only once settled (the Hausa fix, which needs the wrap
 * for a label too long for the slot, is kept: `components/locale-fit`).
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

const CSS = productCss("app/css/shell-m.css");

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  window.__choose = () => document.getElementById("link")!.setAttribute("data-on", "");
  window.__leave = () => document.getElementById("link")!.removeAttribute("data-on");
  mount(<nav className="nf-tabbar" style={{ width: 360 }}>
    <a className="nf-tab"><span id="link" className="nf-tab__link"><span id="label" className="nf-tab__label">My trips</span></span></a>
  </nav>);
`;

const probe = (page: Page) =>
  page.evaluate(() => {
    const el = document.getElementById("label")!;
    return { ws: getComputedStyle(el).whiteSpace, lines: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) };
  });

describe.skipIf(!hasBrowser && !process.env.CI)("the dock label", () => {
  it("stays on one line while it grows, and may wrap only once settled", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      await page.evaluate(() => (window as unknown as { __choose: () => void }).__choose());
      /* Sample across the transition: never more than one line, and nowrap until it has arrived. */
      const seen: { ws: string; lines: number }[] = [];
      for (let i = 0; i < 8; i++) {
        seen.push(await probe(page));
        await page.waitForTimeout(25);
      }
      expect(seen.every((s) => s.lines <= 1), JSON.stringify(seen)).toBe(true);
      expect(seen[0]!.ws).toBe("nowrap");
      await page.waitForTimeout(450);
      expect(await probe(page)).toEqual({ ws: "normal", lines: 1 });
      /* Leaving goes back to nowrap at once, so it does not wrap on the way out either. */
      await page.evaluate(() => (window as unknown as { __leave: () => void }).__leave());
      expect((await probe(page)).ws).toBe("nowrap");
    } finally {
      await close();
    }
  });
});
