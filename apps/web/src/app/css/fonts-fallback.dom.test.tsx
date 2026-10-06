/**
 * TYPE THAT SETTLES, IN CHROMIUM (W2, round 5; CRAFT-PRINCIPLES 2.5).
 *
 * The first paint is drawn in a fallback face and the second in Inter or
 * Poppins; `fonts.css` scales a face the device already has so the two
 * occupy the same box. This mounts the product's own `fonts.css` twice, once
 * with every woff2 withheld (the first paint on a slow link) and once with
 * every woff2 inlined (the settled screen), and compares the boxes of real
 * strings: a paragraph wraps to the same number of lines, a label and a
 * figure keep their width to within a few per cent, regular and bold.
 *
 * It needs one of the faces the fallbacks are built on (Arial or its metric
 * twins, or Roboto) on the machine running it, and says so when there is
 * none rather than passing. The old file named only `local(Arial)`, which
 * neither Linux nor Android has, so here it fell through to the system face
 * and the label moved 6 per cent when Inter landed.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const WEB = join(__dirname, "..", "..", "..");
const FONTS = readFileSync(join(WEB, "src/app/css/fonts.css"), "utf8");
const inline = (css: string) =>
  css.replace(/url\("\/fonts\/(v2\/[^"]+\.woff2)"\)/g, (_, name: string) =>
    `url("data:font/woff2;base64,${readFileSync(join(WEB, "public/fonts", name)).toString("base64")}")`,
  );
/* Withheld: every web face fails, as it has not arrived yet. */
const withheld = (css: string) => css.replace(/url\("\/fonts\/v2\/[^"]+\.woff2"\)/g, 'url("/withheld.woff2")');

/* The two stacks as tokens.css builds them. */
const STACKS = `
  :root {
    --t-display: var(--nf-font-poppins), var(--nf-font-inter), ui-sans-serif, system-ui, sans-serif;
    --t-sans: var(--nf-font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  body { margin: 0; }
  .t { display: inline-block; white-space: nowrap; }
  .t-para { display: block; width: 358px; font: 400 16px/1.5 var(--t-sans); }
`;

const SAMPLES = [
  { id: "body", font: "sans", size: 16, weight: 400, text: "See what you will actually pay before you call anybody." },
  { id: "label400", font: "sans", size: 15, weight: 400, text: "Check your payout details" },
  { id: "label600", font: "sans", size: 15, weight: 600, text: "Check your payout details" },
  { id: "digits600", font: "sans", size: 19, weight: 600, text: "2,800,000", tnum: true },
  { id: "figure", font: "display", size: 44, weight: 600, text: "₦450,000.00", tnum: true },
] as const;

const PARA =
  "Homes, land, hotels and shortlets across Nigeria. See what you will actually pay before you call anybody, know who is behind every listing, and keep the record. Vallo Stays carries hotels, apartments, guest houses, resorts and restaurant tables on the same account and the same inbox.";

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  mount(<div>
    ${SAMPLES.map(
      (s) =>
        `<div><span id="${s.id}" className="t" style={{ fontFamily: "var(--t-${s.font})", fontSize: ${s.size}, fontWeight: ${s.weight}${"tnum" in s ? ', fontVariantNumeric: "tabular-nums"' : ""} }}>${s.text}</span></div>`,
    ).join("\n")}
    <p id="para" className="t-para">${PARA}</p>
    <span id="naira" className="t" style={{ fontFamily: "var(--t-display)", fontSize: 44, fontWeight: 600 }}>₦</span>
  </div>);
`;

type Boxes = Record<string, { w: number; h: number }>;
const boxes = async (page: Page): Promise<Boxes> => {
  await page.evaluate(async () => {
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => null)));
    await document.fonts.ready;
  });
  return page.evaluate((ids) => {
    const out: Record<string, { w: number; h: number }> = {};
    for (const id of ids) {
      const r = document.getElementById(id)!.getBoundingClientRect();
      out[id] = { w: r.width, h: r.height };
    }
    return out;
  }, [...SAMPLES.map((s) => s.id), "para"]);
};

/* Whether this machine has a face the fallbacks can be built on at all. */
const deviceHasBase = (page: Page) =>
  page.evaluate(async () => {
    const probe = new FontFace("t-probe", "local(Arial), local(ArialMT), local('Liberation Sans'), local(Arimo), local(Roboto)");
    return probe.load().then(
      () => true,
      () => false,
    );
  });

describe.skipIf(!hasBrowser && !process.env.CI)("the fallback faces hold the box", () => {
  it("draws the first paint in the same box as the settled one: lines, labels and figures", async () => {
    const before = await mountInBrowser({ entry, css: withheld(FONTS) + STACKS });
    const after = await mountInBrowser({ entry, css: inline(FONTS) + STACKS });
    try {
      if (!(await deviceHasBase(before.page))) {
        console.warn("fonts-fallback: no Arial, Liberation Sans, Arimo or Roboto on this machine; not checked");
        return;
      }
      const first = await boxes(before.page);
      const settled = await boxes(after.page);
      /* The paragraph wraps to the same lines, so nothing below it moves. */
      expect(first.para!.h).toBe(settled.para!.h);
      const drift = Object.fromEntries(
        SAMPLES.map((s) => [s.id, Math.abs(first[s.id]!.w - settled[s.id]!.w) / settled[s.id]!.w]),
      );
      for (const id of ["body", "label400", "label600", "digits600"]) expect(drift[id], id).toBeLessThan(0.015);
      expect(drift.figure, "figure").toBeLessThan(0.03);
    } finally {
      await before.close();
      await after.close();
    }
  });

  it("draws the hero figure's naira sign in Inter once the faces have landed, never in a Poppins fallback", async () => {
    const { page, close } = await mountInBrowser({ entry, css: inline(FONTS) + STACKS });
    try {
      await boxes(page);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("DOM.enable");
      await cdp.send("CSS.enable");
      const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#naira" });
      const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
      expect(fonts.map((f) => f.familyName)).toEqual(["Inter"]);
    } finally {
      await close();
    }
  });
});
