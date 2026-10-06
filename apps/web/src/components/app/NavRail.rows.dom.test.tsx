/**
 * THE POINTER RAIL'S ROWS ARE 44 TALL TARGETS THAT STILL DRAW 40 (W12: "nav
 * rows at 40px"; Chromium at 1440 by 900 with a mouse, the product's tokens
 * and the side navigation's own stylesheets).
 *
 * On a short desktop screen the rail keeps its dense rhythm: a 40px pitch, a
 * plate that paints 40px, as the old row's did. The row's box is now 44 (a
 * 2px transparent border top and bottom with a -2px margin handing the 4px
 * back to the list), so the target clears the floor without moving
 * anything a person sees. Measured: the box height, the pitch between rows,
 * and that the hover plate is clipped to the padding box.
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

const CSS = productCss("app/side-nav.css", "app/css/nav-island.css", "app/css/shell-m.css");

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <nav className="nf-nav nf-nav--rail" style={{ width: 260 }}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {["Home", "Search", "Around", "Plans"].map((label) => (
          <li key={label}><a href="#" className="nf-nav__row" data-row={label}><span className="nf-nav__label">{label}</span></a></li>
        ))}
      </ul>
    </nav>,
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the pointer rail's rows", () => {
  it("are 44 tall boxes on a 40 pitch, with the plate kept inside the border", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS, viewport: { width: 1440, height: 900 } });
    try {
      expect(await page.evaluate(() => matchMedia("(pointer: fine)").matches)).toBe(true);
      const rows = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>("[data-row]")).map((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return { top: r.top, h: r.height, clip: s.backgroundClip, border: s.borderTopWidth, margin: s.marginTop };
        }),
      );
      expect(rows).toHaveLength(4);
      for (const row of rows) {
        expect(row.h, "a 44px target").toBeGreaterThanOrEqual(43.5);
        expect(row.clip).toBe("padding-box");
        /* The plate is the padding box: 44 less two 2px borders, the old 40. */
        expect(row.border).toBe("2px");
        expect(row.h - 4).toBeCloseTo(40, 0);
      }
      /* The list's rhythm is the old 40px pitch: nothing moved. */
      for (let i = 1; i < rows.length; i += 1) {
        expect(rows[i]!.top - rows[i - 1]!.top).toBeCloseTo(40, 0);
      }
    } finally {
      await close();
    }
  });
});
