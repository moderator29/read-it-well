/**
 * TrendLine's period morph, mounted for real in Chromium (D49.3).
 *
 * The morph used to `setState` inside its animation frame loop, so one change
 * of period reconciled both paths and the table twin about 23 times. It now
 * writes each frame onto the elements, so a change of period is one React
 * commit, and the line still visibly travels between the two shapes and
 * lands exactly on the new one.
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

const CSS = productCss("app/css/charts.css");

const ENTRY = `
  import { useState } from "react";
  import { TrendLine } from "@/components/ui/charts/TrendLine";
  import { axisTicks } from "@/components/ui/charts/chart-rules";
  import { mount } from "@/lib/testing/browser-root";
  const fmt = (n) => "N" + n;
  const pt = (key, value) => ({ key, tick: key, label: "Day " + key, value, display: fmt(value) });
  const A = [pt("1", 1), pt("2", 2), pt("3", 3), pt("4", 4)];
  const B = [pt("1", 9), pt("2", 1), pt("3", 8), pt("4", 2)];
  /* A point's label is read only by a render (the table twin's rows), never
     by a morph frame, so reads of it count renders of the new period. A
     Profiler would be simpler and reports nothing in a production build. */
  window.__renders = 0;
  Object.defineProperty(B[0], "label", { get() { window.__renders += 1; return "Day 1"; } });
  function Harness() {
    const [points, setPoints] = useState(A);
    window.__toB = () => setPoints(B);
    return (
      <div style={{ width: 360 }}>
        <TrendLine points={points} yTicks={axisTicks(9, fmt)} label="Requests" periodHead="Day" valueHead="Requests" />
      </div>
    );
  }
  mount(<Harness />);
`;

const lineD = () => document.querySelector("svg path[stroke-linecap]")!.getAttribute("d");

describe.skipIf(!hasBrowser && !process.env.CI)("TrendLine's period morph", () => {
  it("travels between the two lines without a React render per frame, and lands on the new one", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await page.waitForFunction(() => document.querySelector("svg path[stroke-linecap]") !== null);
      await page.waitForTimeout(800);
      const before = await page.evaluate(lineD);
      /* Sample the drawn line on every frame of the morph. */
      const frames = await page.evaluate(
        () =>
          new Promise<string[]>((done) => {
            const seen: string[] = [];
            const w = window as unknown as { __toB: () => void };
            w.__toB();
            const began = performance.now();
            const tick = () => {
              seen.push(document.querySelector("svg path[stroke-linecap]")!.getAttribute("d") ?? "");
              if (performance.now() - began < 700) requestAnimationFrame(tick);
              else done(seen);
            };
            requestAnimationFrame(tick);
          }),
      );
      const renders = await page.evaluate(() => (window as unknown as { __renders: number }).__renders);
      /* The new period renders once (twice at most), never once per frame. */
      expect(renders).toBeGreaterThanOrEqual(1);
      expect(renders).toBeLessThanOrEqual(2);
      /* The line moved through shapes in between rather than cutting. */
      expect(new Set(frames).size).toBeGreaterThan(4);
      expect(frames[0]).not.toBe(frames[frames.length - 1]);
      /* And it rests exactly where React drew the new period. */
      const after = await page.evaluate(lineD);
      expect(after).not.toBe(before);
      expect(frames[frames.length - 1]).toBe(after);
    } finally {
      await close();
    }
  });
});
