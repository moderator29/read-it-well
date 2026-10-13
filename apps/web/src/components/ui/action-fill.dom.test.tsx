/**
 * EVERY SELECTED CONTROL PAINTS THE CURRENT BRAND ACTION RAMP, NOT THE OLD ONE
 * (auditor A8, fifth audit: "the old blue ramp still paints selected segments,
 * the pill segmented control and the switch's on layer, through
 * `--nf-act-fill`"). Chromium, the product's tokens, buttons.css, chips.css and
 * controls.css, in night (the default) and paper.
 *
 * The old ramp was literal stops, #1A75FF over #0066FF over #005CEB, whose top
 * row measured 4.30:1 under a white label (hover #2E82FF 3.8:1). The current
 * action ramp is built from `--nf-act-blue` (the guide's brand blue, #0066FF),
 * and the primary button reads the same token, so there is one source.
 *
 * For each control (the primary, the quiet segmented capsule, the solid pill
 * capsule, a selected segment link, and the switch's on layer) the test reads
 * the PAINTED gradient as the browser computes it and asks:
 *   1. it is the primary's gradient, stop for stop (one fill, no drift);
 *   2. its middle stop is `--nf-act-blue` as the theme resolves it;
 *   3. every stop holds 4.5:1 under the white label (`--nf-act-on`), so the
 *      top row that failed on the old ramp cannot come back;
 *   4. no stop is one of the old ramp's literal colours.
 * Check 3 and 4 fail on the old tokens; `button-system-css.test.ts` holds the
 * source side (the ramp is written from `--nf-act-blue`, with no literal hex).
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

const CSS = `@layer base, components;
  ${productCss("app/css/chips.css", "app/css/controls.css")}
  @layer base {
    .nf-segmented { position: relative; display: inline-flex; padding: 4px; }
    .nf-segmented__item, .nf-segmented__link { position: relative; z-index: 1; display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; }
  }`;

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  import { Button } from "@/components/ui/Button";
  import { Segmented } from "@/components/ui/Segmented";
  import { Switch } from "@/components/ui/Switch";
  const options = [{ value: "a", label: "Label text" }, { value: "b", label: "Other" }];
  mount(
    <div style={{ display: "grid", gap: 24, padding: 24, background: "var(--nf-surface-canvas)" }}>
      <div data-part="primary"><Button variant="primary">Label text</Button></div>
      <div data-part="control"><Segmented label="View" value="a" onChange={() => {}} variant="quiet" options={options} /></div>
      <div data-part="pill"><Segmented label="Kind" value="a" onChange={() => {}} variant="solid" options={options} /></div>
      <nav data-part="link" className="nf-segmented nf-segmented--quiet" aria-label="Bookings">
        <a className="nf-segmented__link" href="#a" aria-current="true">Label text</a>
        <a className="nf-segmented__link" href="#b">Other</a>
      </nav>
      <div data-part="switch"><Switch checked onCheckedChange={() => {}} aria-label="Alerts" /></div>
    </div>,
  );
`;

/** The old ramp's literal stops (rest, hover, both themes), as "r g b" channel triples. */
const OLD_STOPS = [
  [26, 117, 255],
  [0, 92, 235],
  [46, 130, 255],
  [10, 108, 255],
  [0, 98, 240],
  [0, 94, 235],
  [0, 100, 242],
].map((c) => c.join(" "));

type Painted = { image: string; stops: string[] };
type Read = { parts: Record<"primary" | "control" | "pill" | "link" | "switch", Painted>; blue: string; on: string };

describe.skipIf(!hasBrowser && !process.env.CI)("the selected controls' fill", () => {
  it("is the primary's brand action ramp, every stop 4.5:1 under white, in night and paper", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      /* The capsule is placed after the first layout. */
      await expect.poll(() => page.locator(".nf-segmented__capsule").count()).toBe(2);
      for (const theme of ["dark", "light"]) {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        const read: Read = await page.evaluate(() => {
          /* Each stop resolved to sRGB by painting it: a computed gradient may still say color-mix(). */
          const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d")!;
          const srgb = (colour: string) => {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = "black";
            ctx.fillStyle = colour;
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            return [r, g, b].join(" ");
          };
          /* The colour of each stop: the top-level arguments after the angle, less their position. */
          const stopsOf = (image: string) => {
            const inner = image.slice(image.indexOf("(") + 1, image.lastIndexOf(")"));
            const args: string[] = [];
            let depth = 0;
            let from = 0;
            for (let i = 0; i < inner.length; i++) {
              if (inner[i] === "(") depth++;
              else if (inner[i] === ")") depth--;
              else if (inner[i] === "," && depth === 0) {
                args.push(inner.slice(from, i).trim());
                from = i + 1;
              }
            }
            args.push(inner.slice(from).trim());
            return args
              .filter((a) => !/^(\d|to )/.test(a) && !/deg$/.test(a))
              .map((a) => srgb(a.replace(/\s+-?[\d.]+%$/, "")));
          };
          const paint = (el: Element, pseudo?: string) => {
            const image = getComputedStyle(el, pseudo).backgroundImage;
            return { image, stops: stopsOf(image) };
          };
          const probe = document.createElement("span");
          document.body.append(probe);
          probe.style.color = "var(--nf-act-blue)";
          const blue = srgb(getComputedStyle(probe).color);
          probe.style.color = "var(--nf-act-on)";
          const on = srgb(getComputedStyle(probe).color);
          probe.remove();
          const q = (s: string) => document.querySelector(s)!;
          return {
            blue,
            on,
            parts: {
              primary: paint(q('[data-part="primary"] .nf-btn')),
              control: paint(q('[data-part="control"] .nf-segmented__capsule')),
              pill: paint(q('[data-part="pill"] .nf-segmented__capsule')),
              link: paint(q('[data-part="link"] [aria-current="true"]')),
              switch: paint(q('[data-part="switch"] [role="switch"]'), "::before"),
            },
          };
        });

        const lum = (rgb: string) => {
          const [r = 0, g = 0, b = 0] = (rgb.match(/\d+/g) ?? []).map(Number).map((v) => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const ratio = (a: string, b: string) => {
          const [x, y] = [lum(a), lum(b)];
          return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
        };

        const primary = read.parts.primary;
        expect(primary.stops.length, `${theme}: the primary paints a gradient (${primary.image})`).toBe(3);
        for (const [name, part] of Object.entries(read.parts)) {
          expect(part.stops, `${theme} ${name}: the primary's fill (${part.image})`).toEqual(primary.stops);
          expect(part.stops[1], `${theme} ${name}: the middle stop is --nf-act-blue`).toBe(read.blue);
          for (const stop of part.stops) {
            expect(ratio(stop, read.on), `${theme} ${name}: ${stop} under ${read.on}`).toBeGreaterThanOrEqual(4.5);
            expect(OLD_STOPS, `${theme} ${name}: ${stop} is an old ramp stop`).not.toContain(stop);
          }
        }
      }
    } finally {
      await close();
    }
  });
});
