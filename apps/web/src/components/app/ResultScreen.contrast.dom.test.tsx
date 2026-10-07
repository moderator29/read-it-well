/**
 * THE RESULT SCREEN AND THE RESULT SHEET CLEAR THEIR CONTRAST, MEASURED (Chromium
 * at 390, the product's real compiled cascade, both themes, every state).
 *
 * Axe cannot resolve a translucent sheet or a tinted plate, so the ratios are read
 * from the computed styles, as the agreement cancel test does: every piece of text
 * (the verdict, the sentence, the fact lines, the footnote) against the ground it
 * is painted on, at least 4.5:1; every glyph on a state plate against the plate's
 * own fill, at least 3:1 (a non-text mark). The ground is the element's own
 * background composited up through its ancestors over the page canvas. Button
 * labels are left to the button system's tests: they sit on a gradient.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { appCss } from "@/lib/testing/locale-fit";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const STATES = ["sent", "received", "confirmed", "pending", "review", "failed", "expired", "missing"] as const;
const SHEET_STATES = STATES.filter((state) => state !== "missing");
const NEEDS_CONSEQUENCE = new Set(["pending", "review", "failed"]);

const screen = (state: string) => `
  import { ResultScreen } from "@/components/app/ResultSheet";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <div style={{ padding: 16, background: "var(--nf-surface-canvas)", minHeight: "100vh" }}>
      <ResultScreen
        state="${state}"
        verdict="This is the verdict"
        consequence="This is the sentence that says what happens next."
        footnote={<span>Reference ABC123. Quote it to support.</span>}
        actions={[{ label: "Do the thing", href: "/", tone: "primary" }, { label: "Get help", href: "/help", tone: "quiet" }]}
      />
    </div>,
  );
`;

const sheet = (state: string) => `
  import { ResultSheet } from "@/components/app/ResultSheet";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <div style={{ padding: 16, background: "var(--nf-surface-canvas)", minHeight: "100vh" }}>
      <ResultSheet
        open
        onOpenChange={() => {}}
        state="${state}"
        verdict="This is the verdict"
        ${NEEDS_CONSEQUENCE.has(state) ? 'consequence="This is the sentence that says what happens next."' : ""}
        fact={{ amountMinor: 1250000, subject: "Two-bedroom flat in Yaba", at: "6 Oct 2026, 09:41", reference: "VAL-123456" }}
        footnote={<span>Quote the reference to support.</span>}
        actions={[{ label: "Do the thing", href: "/", tone: "primary" }, { label: "Get help", href: "/help", tone: "quiet" }]}
      />
    </div>,
  );
`;

type Reading = { what: string; ratio: number; need: number };

/** Every text and every plate glyph under `scope`, with its ratio against what it sits on. */
async function measure(page: Page, scope: string): Promise<Reading[]> {
  await page.evaluate(async () => document.fonts.ready);
  await page.waitForTimeout(700);
  return page.evaluate((sel) => {
    const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
    const rgba = (value: string): number[] => {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = "black";
      probe.fillStyle = value;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
      return [r!, g!, b!, a! / 255];
    };
    const over = (top: number[], under: number[]) => [0, 1, 2].map((i) => top[i]! * top[3]! + under[i]! * (1 - top[3]!));
    const lum = (c: number[]) => {
      const f = (v: number) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!);
    };
    const ratio = (a: number[], b: number[]) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi! + 0.05) / (lo! + 0.05);
    };
    const canvas = rgba(getComputedStyle(document.documentElement).getPropertyValue("--nf-surface-canvas").trim());
    /* What an element is painted on: its ancestors' fills, nearest first, until one is opaque. */
    const groundOf = (el: Element | null): number[] => {
      const layers: number[][] = [];
      for (let node = el; node; node = node.parentElement) {
        const bg = rgba(getComputedStyle(node).backgroundColor);
        if (bg[3]! > 0) layers.push(bg);
        if (bg[3] === 1) break;
      }
      let ground = [canvas[0]!, canvas[1]!, canvas[2]!];
      for (const layer of layers.reverse()) ground = over(layer, ground.concat(1));
      return ground;
    };
    const say = (el: Element) => `${el.tagName.toLowerCase()}.${String(el.getAttribute("class") ?? "").split(/\s+/).slice(0, 2).join(".")}`;
    const root = document.querySelector(sel) ?? document.body;
    const out: { what: string; ratio: number; need: number }[] = [];
    for (const el of root.querySelectorAll("*")) {
      /* A button's label sits on the button's own gradient fill, which a flat ground cannot
         stand for; the button system has its own measured tests (the agreement cancel one). */
      if (el.closest("svg, .nf-btn")) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0);
      if (own.length === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden") continue;
      const ground = groundOf(el);
      const ink = over(rgba(style.color), ground.concat(1));
      out.push({ what: `text ${say(el)} "${(el.textContent ?? "").trim().slice(0, 30)}"`, ratio: ratio(ink, ground), need: 4.5 });
    }
    for (const plate of root.querySelectorAll(".nf-plate")) {
      const fill = over(rgba(getComputedStyle(plate).backgroundColor), groundOf(plate.parentElement).concat(1));
      for (const glyph of plate.querySelectorAll("svg")) {
        const ink = over(rgba(getComputedStyle(glyph).color), fill.concat(1));
        out.push({ what: `glyph on ${say(plate)}`, ratio: ratio(ink, fill), need: 3 });
      }
    }
    return out;
  }, scope);
}

function failures(found: Reading[]): string[] {
  return found.filter((r) => r.ratio < r.need).map((r) => `${r.what}: ${r.ratio.toFixed(2)} (needs ${r.need})`);
}

describe.skipIf(!hasBrowser && !process.env.CI)("result screen and sheet contrast", () => {
  for (const theme of ["dark", "light"] as const) {
    it(`ResultScreen, every state, ${theme}`, async () => {
      const css = await appCss();
      const bad: string[] = [];
      for (const state of STATES) {
        const { page, close } = await mountInBrowser({ entry: screen(state), css });
        try {
          await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
          const found = await measure(page, "#root");
          expect(found.length, `${state} measured something`).toBeGreaterThanOrEqual(4);
          bad.push(...failures(found).map((line) => `${state}: ${line}`));
        } finally {
          await close();
        }
      }
      expect(bad).toEqual([]);
    });

    it(`ResultSheet, every state, ${theme}`, async () => {
      const css = await appCss();
      const bad: string[] = [];
      for (const state of SHEET_STATES) {
        const { page, close } = await mountInBrowser({ entry: sheet(state), css });
        try {
          await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
          await page.getByRole("dialog").waitFor();
          const found = await measure(page, '[role="dialog"]');
          expect(found.length, `${state} measured something`).toBeGreaterThanOrEqual(4);
          bad.push(...failures(found).map((line) => `${state}: ${line}`));
        } finally {
          await close();
        }
      }
      expect(bad).toEqual([]);
    });
  }
});
