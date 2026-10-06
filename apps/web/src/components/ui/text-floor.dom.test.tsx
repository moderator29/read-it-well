/**
 * THE 12PX FLOOR, IN CHROMIUM (north star section 5: nothing below 12px; W12's
 * sub-12px text, Session 3). Em-relative parts of a figure (Amount's kobo and
 * suffix, a chip's or a segment's count) shrink with the figure they sit
 * beside, so on a small parent they fell under the floor (the kobo measured
 * 10.54px, a chip's count 11.2px). Each is now `max(<its proportion>, 0.75rem)`.
 *
 * This mounts them at their SMALLEST sizes in the product's real compiled
 * cascade and asserts that EVERY visible text node computes to 12px or more.
 * It also checks that the figure's baseline holds: the kobo shares the
 * naira's baseline whatever size it is floored to.
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
import { appCss } from "@/lib/testing/locale-fit";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  import { Amount } from "@/components/ui/Amount";
  import { Chip } from "@/components/ui/Chip";
  import { Segmented } from "@/components/ui/Segmented";
  mount(
    <div id="stage" style={{ padding: 16, display: "grid", gap: 12 }}>
      {/* The default muted part, at the smallest figure sizes the product sets money at. */}
      <div id="amt14" style={{ fontSize: 14 }}><Amount minorUnits={4275050} showFraction suffix="/night" /></div>
      <div id="amt16" style={{ fontSize: 16 }}><Amount minorUnits={4275050} showFraction /></div>
      <div id="amt48" style={{ fontSize: 48 }}><Amount minorUnits={4275050} showFraction suffix="/night" /></div>
      {/* The call sites that set their own proportion, at a small figure. */}
      <div style={{ fontSize: 16 }}>
        <Amount minorUnits={4275050} showFraction secondaryClassName="text-[length:max(0.5em,0.75rem)] font-semibold opacity-70" />
        <Amount minorUnits={4275050} showFraction secondaryClassName="text-[length:max(0.34em,0.75rem)] font-bold" />
        <Amount minorUnits={4275050} showFraction secondaryClassName="nf-money-kobo" />
        <Amount minorUnits={4275050} showFraction secondaryClassName="nf-history-kobo" />
        <Amount minorUnits={4275050} showFraction secondaryClassName="nf-doc__kobo" />
      </div>
      <Chip size="sm" count={3} onSelectedChange={() => {}}>Filter</Chip>
      <Chip size="md" count={12} onSelectedChange={() => {}}>Filter</Chip>
      <Chip size="sm" shape="pill" count={3} onSelectedChange={() => {}}>Pill</Chip>
      <Segmented
        label="View"
        size="sm"
        value="a"
        onChange={() => {}}
        options={[{ value: "a", label: "One", count: 4 }, { value: "b", label: "Two", count: 9 }]}
      />
    </div>
  );
`;

/** Every visible, non-empty text node in the stage, with the font size it computes to. */
const textSizes = (page: Page) =>
  page.evaluate(() => {
    const out: { text: string; px: number; where: string }[] = [];
    const walker = document.createTreeWalker(document.getElementById("stage")!, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? "").trim();
      const el = n.parentElement;
      if (!text || !el || el.closest(".sr-only")) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      out.push({ text, px: parseFloat(getComputedStyle(el).fontSize), where: el.className || el.tagName });
    }
    return out;
  });

describe.skipIf(!hasBrowser && !process.env.CI)("the 12px floor", () => {
  it("every text node of an Amount's kobo and suffix, a chip's count and a segment's count is at least 12px", async () => {
    const css = await appCss("app/css/money-surface.css", "app/css/money-history.css", "app/css/document.css");
    const { page, close } = await mountInBrowser({ entry, css, viewport: { width: 390, height: 844 } });
    try {
      const sizes = await textSizes(page);
      /* Sanity: the kobo, the suffix and the counts are really in the sample. */
      const texts = sizes.map((s) => s.text).join("|");
      for (const needle of [".50", "/night", "3", "12", "4", "9"]) expect(texts, needle).toContain(needle);
      const under = sizes.filter((s) => s.px < 12 - 0.01);
      expect(under, JSON.stringify(under)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("the kobo keeps the naira's baseline, at the smallest and the largest figure", async () => {
    const css = await appCss();
    const { page, close } = await mountInBrowser({ entry, css, viewport: { width: 390, height: 844 } });
    try {
      for (const id of ["amt14", "amt48"]) {
        const gap = await page.evaluate((host) => {
          const root = document.getElementById(host)!;
          const kobo = [...root.querySelectorAll("span")].find((s) => s.textContent?.startsWith("."))!;
          const probe = (el: Element, atEnd: boolean) => {
            const r = document.createRange();
            r.selectNodeContents(el);
            r.collapse(!atEnd);
            const marker = document.createElement("span");
            marker.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
            r.insertNode(marker);
            const y = marker.getBoundingClientRect().bottom;
            marker.remove();
            return y;
          };
          /* Baselines via zero-size baseline-aligned markers before the kobo and inside it. */
          return Math.abs(probe(root, false) - probe(kobo, false));
        }, id);
        expect(gap, id).toBeLessThan(0.5);
      }
    } finally {
      await close();
    }
  });
});
