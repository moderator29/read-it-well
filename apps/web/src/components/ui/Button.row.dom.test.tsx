/**
 * AN INLINE BUTTON WRAPS ONLY WHEN ITS ROW IS NARROWER THAN ITS LABEL
 * (Chromium; auditor A8 on 8e3788bee). The rule that stops an inline button
 * outgrowing its row must not shrink a button beside a long sibling in a
 * flex row (it used to keep its label's width through `nowrap`), and must not
 * override a component's own width cap (the passcode action's 22rem).
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

const STYLES = productCss("app/css/passcode.css");

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  import { Button } from "@/components/ui/Button";
  mount(
    <div style={{ width: 358, padding: 0 }}>
      <div id="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <p style={{ minWidth: 0, margin: 0 }}>A long sibling line of text that would happily take every pixel of this row if it could</p>
        <Button variant="quiet" size="sm" data-testid="in-row">Show all 24</Button>
      </div>
      <div style={{ width: 600 }}>
        <Button variant="primary" className="nf-passcode__cta" data-testid="capped">Sign in again</Button>
      </div>
      <div style={{ width: 200 }}>
        <Button variant="secondary" data-testid="narrow">Sign in to run your own Price Check</Button>
      </div>
    </div>,
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("an inline Button in its row", () => {
  it("keeps its label's width beside a shrinking sibling, keeps a component cap, and wraps only in a narrower row", async () => {
    const { page, close } = await mountInBrowser({ entry, css: STYLES });
    try {
      const box = (id: string) =>
        page.getByTestId(id).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { w: r.width, h: r.height, max: getComputedStyle(el).maxWidth, ws: getComputedStyle(el).whiteSpace };
        });
      const inRow = await box("in-row");
      expect(inRow.h).toBeLessThanOrEqual(44.5);
      expect(inRow.w).toBeGreaterThan(90);
      const capped = await box("capped");
      expect(capped.max).toBe("352px");
      expect(capped.w).toBeLessThanOrEqual(352);
      /* The danger fill's guard tests the exact relative-colour form it uses. */
      expect(await page.evaluate(() => CSS.supports("color", "oklch(from red min(l, 0.5) c h)"))).toBe(true);
      const narrow = await box("narrow");
      expect(narrow.w).toBeLessThanOrEqual(200);
      expect(narrow.ws).toBe("normal");
    } finally {
      await close();
    }
  });
});
