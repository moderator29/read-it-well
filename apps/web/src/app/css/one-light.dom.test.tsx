/**
 * ONE LIGHT, READ OFF CHROMIUM (round 5, W1; the source guard is
 * `one-light.test.ts`). On Paper a Card (`.nf-panel`, the tier shadow) and an
 * element on the old ladder (`.nf-elev-2`) used to be lit by two suns: the
 * card in the blue `0 95 232`, the rung in the neutral `11 13 23`. Their
 * computed shadows now carry the same inks, and at night neither carries the
 * Paper blue. Shadows do not move, so there is no motion answer to hold.
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

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(GLASS_CSS);
const entry = `
  import { mount } from "@/lib/testing/browser-root";
  mount(<div style={{ padding: 24, display: "grid", gap: 24 }}>
    <div className="nf-panel nf-panel--card" id="card" style={{ height: 80 }} />
    <div className="nf-elev-2" id="rung" style={{ height: 80, background: "var(--nf-surface-primary)" }} />
    <div id="float" style={{ height: 40, boxShadow: "var(--nf-float-shadow)" }} />
  </div>);
`;

const inks = (page: Page, id: string) =>
  page.evaluate((i) => {
    const shadow = getComputedStyle(document.getElementById(i)!).boxShadow;
    /* Outer layers only (the rims are insets and are not light), and not the
       transparent placeholders a tier writes for "no shadow". */
    const outer = shadow
      .split(/,(?![^(]*\))/)
      .filter((layer) => !/inset/.test(layer) && !/rgba\([^)]*, 0\)/.test(layer));
    return [...new Set(outer.flatMap((layer) => [...layer.matchAll(/rgba?\((\d+), (\d+), (\d+)/g)].map((m) => `${m[1]} ${m[2]} ${m[3]}`)))].sort();
  }, id);

describe.skipIf(!hasBrowser && !process.env.CI)("one light", () => {
  it("on Paper the card, the old rung and the float are lit in the same two inks", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS, init: 'document.documentElement.dataset.theme = "light";' });
    try {
      const card = await inks(page, "card");
      expect(card).toEqual(["0 95 232", "1 1 24"]);
      expect(await inks(page, "rung")).toEqual(card);
      expect(await inks(page, "float")).toEqual(card);
    } finally {
      await close();
    }
  });

  it("at night no rung carries the Paper ink", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      for (const id of ["rung", "float"]) expect(await inks(page, id)).not.toContain("0 95 232");
    } finally {
      await close();
    }
  });
});
