/**
 * DragToConfirm's two answers, read from the browser's computed animations
 * (round 5, the money moment): a confirmed MONEY slide lands its tick and then
 * takes the one payoff pop; a refusal cuts the handle home and says so in
 * 160ms instead of surfacing the words on a spring. A quiet reader gets the
 * settled state with nothing moving. CRAFT_DOCTRINE 5, MOTION_SYSTEM 2.
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
import { PORTED_CSS } from "./ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

function entry(money: boolean, behaviour: string): string {
  return `
    import { DragToConfirm } from "@/components/ui/DragToConfirm";
    import { mount } from "@/lib/testing/browser-root";
    const extra = ${JSON.stringify(money ? { money: true, armedLabel: "Press again to confirm" } : {})};
    mount(
      <div style={{ width: 340, padding: 16 }}>
        <DragToConfirm
          label="Slide to pay"
          confirmingLabel="Paying"
          confirmedLabel="Paid"
          keyboardLabel="Pay"
          errorLabel="Not paid"
          onConfirm={${behaviour}}
          data-testid="dtc"
          {...extra}
        />
      </div>
    );
  `;
}

async function slide(page: Page) {
  const handle = page.getByRole("button", { name: "Pay" });
  const box = (await handle.boundingBox())!;
  const track = (await page.getByTestId("dtc").boundingBox())!;
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + track.width / 2, y, { steps: 4 });
  await page.mouse.move(x + track.width, y, { steps: 4 });
  await page.mouse.up();
}

const motionOf = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const cs = getComputedStyle(document.querySelector(sel)!);
    return {
      name: cs.animationName,
      duration: cs.animationDuration,
      delay: cs.animationDelay,
      iterations: cs.animationIterationCount,
    };
  }, selector);

describe.skipIf(!hasBrowser && !process.env.CI)("DragToConfirm, the money answer in motion", () => {
  it("a confirmed money slide lands the tick, then pops once (1.04, 180ms) after it", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(true, "async () => true"), css: PORTED_CSS });
    try {
      await slide(page);
      await page.waitForSelector('[data-testid=dtc][data-state="confirmed"]');
      const tick = await motionOf(page, ".nf-dtc__handle > *");
      expect(tick.name).toBe("nf-dtc-tick");
      expect(tick.duration).toBe("0.24s");
      const pop = await motionOf(page, ".nf-dtc__handle");
      expect(pop).toEqual({ name: "nf-dtc-pop", duration: "0.18s", delay: "0.24s", iterations: "1" });
      /* The pop is on `scale`, so the handle stays at the end of its track. */
      const peak = await page.evaluate(() => {
        const sheet = [...document.styleSheets].flatMap((s) => [...s.cssRules]);
        const find = (rules: CSSRule[]): CSSKeyframesRule | undefined => {
          for (const r of rules) {
            if (r instanceof CSSKeyframesRule && r.name === "nf-dtc-pop") return r;
            if ("cssRules" in r) {
              const hit = find([...(r as CSSGroupingRule).cssRules]);
              if (hit) return hit;
            }
          }
          return undefined;
        };
        const kf = find(sheet);
        return kf ? [...kf.cssRules].map((k) => (k as CSSKeyframeRule).style.cssText) : [];
      });
      expect(peak).toEqual(["scale: 1.04;"]);
    } finally {
      await close();
    }
  });

  it("a non-money confirmation lands its tick and does not pop: the pop is the payoff's alone", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(false, "() => true"), css: PORTED_CSS });
    try {
      await slide(page);
      await page.waitForSelector('[data-testid=dtc][data-state="confirmed"]');
      expect((await motionOf(page, ".nf-dtc__handle > *")).name).toBe("nf-dtc-tick");
      expect((await motionOf(page, ".nf-dtc__handle")).name).toBe("none");
    } finally {
      await close();
    }
  });

  it("a refused payment cuts the handle home at once and says so in 160ms, no spring", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(true, "async () => false"), css: PORTED_CSS });
    try {
      await slide(page);
      /* Read in the same task the failure lands in: a spring would still have
         the handle near the far end of the track here. */
      const at = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const root = document.querySelector("[data-testid=dtc]")!;
            const read = () =>
              resolve(new DOMMatrix(getComputedStyle(root.querySelector(".nf-dtc__handle")!).transform).m41);
            if (root.hasAttribute("data-failed")) return read();
            new MutationObserver((_, obs) => {
              if (root.hasAttribute("data-failed")) {
                obs.disconnect();
                requestAnimationFrame(read);
              }
            }).observe(root, { attributes: true });
          }),
      );
      expect(Math.abs(at)).toBeLessThan(0.5);
      const words = await motionOf(page, ".nf-dtc__label:not(.nf-dtc__label--status)");
      expect(words.name).toBe("nf-dtc-status-in");
      expect(words.duration).toBe("0.16s");
      expect(await page.getByTestId("dtc").textContent()).toContain("Not paid");
    } finally {
      await close();
    }
  });

  it("under reduced motion the answer is the settled state: no tick landing, no pop, the refusal words at once", async () => {
    const ok = await mountInBrowser({ entry: entry(true, "async () => true"), css: PORTED_CSS, reducedMotion: true });
    try {
      await slide(ok.page);
      await ok.page.waitForSelector('[data-testid=dtc][data-state="confirmed"]');
      expect((await motionOf(ok.page, ".nf-dtc__handle")).name).toBe("none");
      expect((await motionOf(ok.page, ".nf-dtc__handle > *")).name).toBe("none");
      /* Still says it: the confirmed words and the tick are there. */
      expect(await ok.page.locator('[role="status"]').textContent()).toBe("Paid");
    } finally {
      await ok.close();
    }
    const refused = await mountInBrowser({ entry: entry(true, "async () => false"), css: PORTED_CSS, reducedMotion: true });
    try {
      await slide(refused.page);
      await refused.page.waitForSelector("[data-testid=dtc][data-failed]");
      expect((await motionOf(refused.page, ".nf-dtc__label:not(.nf-dtc__label--status)")).name).toBe("none");
      expect(await refused.page.locator('[role="status"]').textContent()).toBe("Not paid");
    } finally {
      await refused.close();
    }
  });
});
