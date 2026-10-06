/**
 * THE VERIFICATION-PASSED PAYOFF, IN CHROMIUM (the product's tokens and the
 * component's own stylesheet; Session 3, C1; MOTION_SYSTEM "Verification
 * passed: shield assembles, tick embosses, pop").
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

const CSS = productCss("components/verification/verified-payoff.css");
const KEY = "verification-passed:tier-1";

const entryWith = (opts: { play?: boolean; seen?: boolean; saver?: boolean; dialog?: boolean; closing?: boolean } = {}) => `
  import { mount } from "@/lib/testing/browser-root";
  import { VerifiedPayoff } from "@/components/verification/VerifiedPayoff";
  ${opts.seen ? `localStorage.setItem("nf-seen:${KEY}", "1");` : `localStorage.removeItem("nf-seen:${KEY}");`}
  ${opts.saver ? `Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true });` : ""}
  window.__removeDialog = () => document.getElementById("dlg")?.remove();
  mount(<div>
    ${opts.dialog ? `<div id="dlg" role="dialog" aria-modal="true"${opts.closing ? " data-closing" : ""}>sheet</div>` : ""}
    <VerifiedPayoff play={${opts.play ?? true}} seenKey="${KEY}">
      <span id="shield" style={{ display: "block", width: 56, height: 56, background: "currentColor" }} />
    </VerifiedPayoff>
  </div>);
`;

type Parts = { shield: number; disc: number; tick: number; root: number };
const counts = (page: Page): Promise<Parts> =>
  page.evaluate(() => {
    const n = (el: Element | null) => (el ? el.getAnimations().length : 0);
    const mark = document.querySelector(".nf-vpass")!;
    return {
      shield: n(mark.querySelector(".nf-vpass__shield")),
      disc: n(mark.querySelector(".nf-vpass__badge")),
      tick: n(mark.querySelector(".nf-vpass__tick")),
      root: n(mark),
    };
  });

describe.skipIf(!hasBrowser && !process.env.CI)("the verification-passed payoff", () => {
  it("assembles the shield, draws the tick, then pops once, and rests on the final state", async () => {
    const { page, close } = await mountInBrowser({ entry: entryWith(), css: CSS });
    try {
      await page.waitForTimeout(60);
      expect(await counts(page)).toEqual({ shield: 1, disc: 1, tick: 1, root: 1 });
      const timing = await page.evaluate(() =>
        [".nf-vpass__shield", ".nf-vpass__badge", ".nf-vpass__tick", ".nf-vpass"].map((sel) => {
          const a = document.querySelector(sel)!.getAnimations()[0]!;
          const t = a.effect!.getTiming();
          const frames = (a.effect as KeyframeEffect).getKeyframes();
          return { delay: t.delay, duration: t.duration, fill: t.fill, from: frames[0]!, to: frames[frames.length - 1]!, mid: frames[1]!, count: frames.length };
        }),
      );
      const [shield, disc, tick, pop] = timing;
      /* The shield first, on land at the slow rung; the tick after it; the pop last. */
      expect(shield!.delay).toBe(0);
      expect(shield!.duration).toBe(380);
      /* The shield is server rendered, so it is already drawn: it rises and scales, and never fades. */
      expect(shield!.from.opacity).toBeUndefined();
      /* The first and last keyframes are the drawn state (no jump on the first frame); the dip is the middle one, 30% in. */
      expect(shield!.count).toBe(3);
      expect(shield!.from.transform).toBe("none");
      expect(shield!.to.transform).toBe("none");
      expect(shield!.mid.transform).toContain("scale(0.86)");
      expect(shield!.mid.offset).toBeCloseTo(0.3, 5);
      /* The disc is one animation for its whole life: in, held through the pop, out (960ms end). */
      expect(disc!.delay).toBe(380);
      expect(disc!.duration).toBe(580);
      expect(tick!.delay).toBe(380);
      expect(tick!.from.strokeDashoffset).toBe("1");
      expect(pop!.delay).toBe(620);
      expect(pop!.duration).toBe(180);
      expect(String(pop!.to.transform)).toBe("none");
      /* Opacity and transform only (and the tick's own stroke), nothing that lays out. */
      for (const part of [shield, disc, pop]) {
        expect(Object.keys(part!.from).filter((k) => !["offset", "easing", "composite", "computedOffset", "opacity", "transform"].includes(k))).toEqual([]);
      }
      /* Across the whole payoff: the shield never drops below full opacity (no flash before it
         assembles), and the disc is really there (held at full through the pop)... */
      const seen = await page.evaluate(
        () =>
          new Promise<{ shieldMin: number; discMax: number }>((done) => {
            const shieldEl = document.querySelector(".nf-vpass__shield")!;
            const discEl = document.querySelector(".nf-vpass__badge")!;
            let shieldMin = 1;
            let discMax = 0;
            const t0 = performance.now();
            const tick = () => {
              shieldMin = Math.min(shieldMin, Number(getComputedStyle(shieldEl).opacity));
              discMax = Math.max(discMax, Number(getComputedStyle(discEl).opacity));
              if (performance.now() - t0 < 1000) requestAnimationFrame(tick);
              else done({ shieldMin, discMax });
            };
            tick();
          }),
      );
      expect(seen.shieldMin).toBe(1);
      expect(seen.discMax).toBe(1);
      await page.waitForTimeout(300);
      expect(await counts(page)).toEqual({ shield: 0, disc: 0, tick: 0, root: 0 });
      const rest = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector(".nf-vpass__shield")!);
        const d = getComputedStyle(document.querySelector(".nf-vpass__badge")!);
        return [s.opacity, s.transform, d.opacity, getComputedStyle(document.querySelector(".nf-vpass__tick")!).strokeDashoffset];
      });
      /* ...and at rest it is gone again: the plate is as it was (disc opacity 0). */
      expect(rest).toEqual(["1", "none", "0", "0px"]);
      expect(await page.evaluate((k) => localStorage.getItem(`nf-seen:${k}`), KEY), "marked seen when it played").toBe("1");
    } finally {
      await close();
    }
  });

  it("plays nothing when this device has seen it, or the record says it is not news", async () => {
    for (const [name, opts] of [["seen", { seen: true }], ["not news", { play: false }]] as const) {
      const { page, close } = await mountInBrowser({ entry: entryWith(opts), css: CSS });
      try {
        await page.waitForTimeout(150);
        expect(await counts(page), name).toEqual({ shield: 0, disc: 0, tick: 0, root: 0 });
      } finally {
        await close();
      }
    }
  });

  it("plays nothing under reduced motion, Calm, Off or data saving, and leaves the final state", async () => {
    const quiet: { name: string; entry: string; opts: Record<string, unknown> }[] = [
      { name: "reduced", entry: entryWith(), opts: { reducedMotion: true } },
      { name: "calm", entry: entryWith(), opts: { motion: "calm" } },
      { name: "off", entry: entryWith(), opts: { motion: "off" } },
      { name: "data saver", entry: entryWith({ saver: true }), opts: {} },
    ];
    for (const { name, entry, opts } of quiet) {
      const { page, close } = await mountInBrowser({ entry, css: CSS, ...opts });
      try {
        await page.waitForTimeout(150);
        expect(await counts(page), name).toEqual({ shield: 0, disc: 0, tick: 0, root: 0 });
        expect(await page.evaluate(() => getComputedStyle(document.querySelector(".nf-vpass__shield")!).opacity), name).toBe("1");
        /* No disc in a quiet mode: the plate looks exactly as it did before. */
        expect(await page.evaluate(() => getComputedStyle(document.querySelector(".nf-vpass__badge")!).opacity), name).toBe("0");
        /* Not marked seen: a quiet reader has not been shown it. */
        expect(await page.evaluate((k) => localStorage.getItem(`nf-seen:${k}`), KEY), name).toBeNull();
      } finally {
        await close();
      }
    }
  });

  it("waits while a modal dialog is open over the page, then plays", async () => {
    const { page, close } = await mountInBrowser({ entry: entryWith({ dialog: true }), css: CSS });
    try {
      await page.waitForTimeout(200);
      expect(await counts(page)).toEqual({ shield: 0, disc: 0, tick: 0, root: 0 });
      expect(await page.evaluate((k) => localStorage.getItem(`nf-seen:${k}`), KEY)).toBeNull();
      await page.evaluate(() => (window as unknown as { __removeDialog: () => void }).__removeDialog());
      await page.waitForTimeout(80);
      expect(await counts(page)).toEqual({ shield: 1, disc: 1, tick: 1, root: 1 });
    } finally {
      await close();
    }
  });

  it("does not wait for a sheet that is already leaving (data-closing)", async () => {
    const { page, close } = await mountInBrowser({ entry: entryWith({ dialog: true, closing: true }), css: CSS });
    try {
      await page.waitForTimeout(60);
      expect(await counts(page)).toEqual({ shield: 1, disc: 1, tick: 1, root: 1 });
    } finally {
      await close();
    }
  });

  it("changes nothing about the plate's layout: the art and what sits beside it are where they were", async () => {
    const plate = (wrapped: boolean) => `
      import { mount } from "@/lib/testing/browser-root";
      import { VerifiedPayoff } from "@/components/verification/VerifiedPayoff";
      const art = <span id="art" className="grid size-14 shrink-0 place-items-center" style={{ display: "grid", width: 56, height: 56 }}><span style={{ width: 56, height: 56, background: "currentColor" }} /></span>;
      mount(
        <section style={{ width: 360, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            ${wrapped ? `<VerifiedPayoff play={false} seenKey="${KEY}">{art}</VerifiedPayoff>` : "{art}"}
            <div id="text" style={{ flex: 1 }}>Title and body of the plate</div>
          </div>
        </section>,
      );
    `;
    const measure = async (wrapped: boolean) => {
      const { page, close } = await mountInBrowser({ entry: plate(wrapped), css: CSS });
      try {
        await page.waitForTimeout(80);
        return await page.evaluate(() => {
          const r = (id: string) => {
            const b = document.getElementById(id)!.getBoundingClientRect();
            return [b.x, b.y, b.width, b.height];
          };
          const section = document.querySelector("section")!.getBoundingClientRect();
          return { art: r("art"), text: r("text"), section: [section.width, section.height] };
        });
      } finally {
        await close();
      }
    };
    expect(await measure(true)).toEqual(await measure(false));
  });
});
