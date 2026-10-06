/**
 * THE REFUSAL REFLOWS, BATCHED, MEASURED IN CHROMIUM (auditor A8, NIT: "the
 * refusal reflows are not batched"). `refusal.test.ts` pins the ORDER of the
 * observer's work on a hand-made DOM (every marker off, one flush, every marker
 * on, then the animations read); this counts what the browser actually did.
 *
 * Twenty `.nf-field`s on the product's controls.css are refused in one task,
 * the way a submit refuses a form. Chromium's own counters (`Performance`
 * domain: `RecalcStyleCount`, `LayoutCount`) are read before and after the
 * observer's callback. Field by field, the old observer recalculated style
 * about twice per field (a forced read after taking the marker off, then
 * `getAnimations()` after putting it on); batched, the whole form costs a
 * handful, whatever its size, and every field still shakes.
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

const FIELDS = 20;

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  import { watchRefusals } from "@/lib/ui/refusal";
  mount(
    <form>
      {Array.from({ length: ${FIELDS} }, (_, i) => (
        <input key={i} className="nf-field" aria-label={"Field " + i} aria-invalid="false" />
      ))}
    </form>,
  );
  (window as unknown as { __stop: () => void }).__stop = watchRefusals(document);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("a refused form", () => {
  it(`recalculates style a handful of times for ${FIELDS} fields, not twice per field, and every field shakes`, async () => {
    const { page, close } = await mountInBrowser({ entry, css: productCss("app/css/controls.css") });
    try {
      await page.waitForFunction(() => document.querySelectorAll(".nf-field").length > 0);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Performance.enable");
      const counters = async () => {
        const { metrics } = await cdp.send("Performance.getMetrics");
        const of = (name: string) => metrics.find((m) => m.name === name)?.value ?? 0;
        return { style: of("RecalcStyleCount"), layout: of("LayoutCount") };
      };
      /* Settle, then count only the refusal: the attribute writes and the observer's callback, in one task. */
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const before = await counters();
      const shaking = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            for (const field of document.querySelectorAll(".nf-field")) field.setAttribute("aria-invalid", "true");
            /* The observer's callback runs at the end of this task's microtasks; read once it has. */
            queueMicrotask(() =>
              queueMicrotask(() =>
                resolve(document.querySelectorAll(".nf-field[data-refused]").length),
              ),
            );
          }),
      );
      const after = await counters();
      await cdp.detach();
      const style = after.style - before.style;
      const layout = after.layout - before.layout;
      expect(shaking, "every refused field shakes").toBe(FIELDS);
      expect(style, `style recalculations for ${FIELDS} refused fields`).toBeLessThanOrEqual(4);
      expect(layout, `layouts for ${FIELDS} refused fields`).toBeLessThanOrEqual(2);
    } finally {
      await close();
    }
  });
});
