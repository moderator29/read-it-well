/**
 * A CHOSEN FILTER TILE GIVES ITS ONE SMALL PUSH, MOUNTED FOR REAL (Chromium,
 * the product's tokens and catalogue.css; auditor A7 S1).
 *
 * The first version listened in the bubble phase, after React had already
 * re-rendered the tile as chosen, so "became chosen" was never true and the
 * pop never played. The listener is now in the capture phase. A tap on an
 * unchosen tile plays a Web Animations pop (a script animation, told apart
 * from the tile's own CSS transitions); a tap that turns a tile off plays
 * none; and reduced motion, Calm and Off play none at all.
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

const CSS = productCss("app/css/catalogue.css");

const entry = `
  import { useState } from "react";
  import { mount } from "@/lib/testing/browser-root";
  import { useSelectPop } from "@/lib/motion/select-pop";
  function Panel() {
    useSelectPop();
    const [on, setOn] = useState<string[]>([]);
    return (
      <div data-select-pop="" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 16 }}>
        {["Pool", "Garden", "Parking"].map((name) => (
          <button key={name} type="button" className="nf-filters__tile" aria-pressed={on.includes(name)}
            onClick={() => setOn((now) => (now.includes(name) ? now.filter((n) => n !== name) : [...now, name]))}>
            {name}
          </button>
        ))}
      </div>
    );
  }
  mount(<Panel />);
`;

/** The script animations on a tile (not its CSS transitions): the pop is one of these. */
const pops = (page: Page, name: string) =>
  page.getByRole("button", { name }).evaluate((el) =>
    el
      .getAnimations()
      .filter((a) => !(a instanceof CSSTransition) && !(a instanceof CSSAnimation))
      .map((a) => (a.effect as KeyframeEffect).getKeyframes().map((k) => k.scale)),
  );

const afterTwoFrames = (page: Page) =>
  page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));

describe.skipIf(!hasBrowser && !process.env.CI)("the filter tile's select pop", () => {
  it("pops when an unchosen tile is chosen, and not when it is turned off", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      expect(await pops(page, "Pool")).toEqual([]);
      await page.getByRole("button", { name: "Pool" }).click();
      await afterTwoFrames(page);
      expect(await pops(page, "Pool"), "choosing a tile pops it").toEqual([["1", "1.03", "1"]]);
      /* Only the tapped tile pops. */
      expect(await pops(page, "Garden")).toEqual([]);

      await page.waitForTimeout(400);
      expect(await pops(page, "Pool")).toEqual([]);
      await page.getByRole("button", { name: "Pool" }).click();
      await afterTwoFrames(page);
      expect(await page.getByRole("button", { name: "Pool" }).getAttribute("aria-pressed")).toBe("false");
      expect(await pops(page, "Pool"), "turning a tile off plays no pop").toEqual([]);
    } finally {
      await close();
    }
  });

  it("pops from the keyboard too", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      await page.getByRole("button", { name: "Garden" }).focus();
      await page.keyboard.press("Enter");
      await afterTwoFrames(page);
      expect(await pops(page, "Garden")).toEqual([["1", "1.03", "1"]]);
    } finally {
      await close();
    }
  });

  it("plays nothing under reduced motion, Calm or Off", async () => {
    const quiet: { name: string; opts: Record<string, unknown> }[] = [
      { name: "reduced", opts: { reducedMotion: true } },
      { name: "calm", opts: { motion: "calm" } },
      { name: "off", opts: { motion: "off" } },
    ];
    for (const { name, opts } of quiet) {
      const { page, close } = await mountInBrowser({ entry, css: CSS, ...opts });
      try {
        await page.getByRole("button", { name: "Pool" }).click();
        await afterTwoFrames(page);
        expect(await pops(page, "Pool"), name).toEqual([]);
      } finally {
        await close();
      }
    }
  });

  it("plays nothing under data saving: the tile is still chosen, and no pop runs", async () => {
    /* The data-saver signal the way `lib/ui/data-saver.ts` reads it: the
       browser's own `navigator.connection.saveData`. The pop reads it at tap
       time, so setting it after the page has mounted is a tap under saving. */
    const { page, close } = await mountInBrowser({
      entry,
      css: CSS,
      init: `Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true });`,
    });
    try {
      await page.getByRole("button", { name: "Pool" }).click();
      await afterTwoFrames(page);
      expect(await page.getByRole("button", { name: "Pool" }).getAttribute("aria-pressed")).toBe("true");
      expect(await pops(page, "Pool"), "data saver").toEqual([]);
    } finally {
      await close();
    }
  });
});
