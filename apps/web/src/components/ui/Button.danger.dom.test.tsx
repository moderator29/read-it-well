/**
 * THE DESTRUCTIVE BUTTON'S LABEL IS LEGIBLE, MEASURED ON WHAT IS PAINTED (W12;
 * Chromium, the product's tokens and the button system).
 *
 * The solid `danger` button's white label measured 3.84:1 at night, on the
 * bright rose fill. Axe cannot score text over a gradient and a computed
 * `background-color` is not the paint, so this takes the fill from a screenshot
 * of the button with its label hidden, samples it on a grid inside the border,
 * and holds the label colour to 4.5:1 against the WORST of those pixels, in
 * both themes, at rest, pointed at and pressed.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Locator, Page } from "playwright-core";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { PORTED_CSS } from "@/components/ui/ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  import { Button } from "@/components/ui/Button";
  mount(
    <div style={{ padding: 16, background: "var(--nf-surface-canvas)" }}>
      <Button variant="danger">Yes, delete it</Button>
    </div>,
  );
`;

/** The label's colour, and the lowest label-to-fill ratio over the painted fill. */
async function worstRatio(page: Page, button: Locator): Promise<number> {
  const label = await button.evaluate((el) => getComputedStyle(el).color);
  await button.evaluate((el) => {
    (el as HTMLElement).dataset.keepColor = getComputedStyle(el).color;
    (el.querySelector(".nf-btn__label") as HTMLElement).style.color = "transparent";
  });
  const png = (await button.screenshot()).toString("base64");
  await button.evaluate((el) => {
    (el.querySelector(".nf-btn__label") as HTMLElement).style.color = "";
  });
  return page.evaluate(
    async ({ png, label }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const c = canvas.getContext("2d")!;
      c.drawImage(img, 0, 0);
      const probe = document.createElement("canvas").getContext("2d")!;
      probe.fillStyle = "black";
      probe.fillStyle = label;
      probe.fillRect(0, 0, 1, 1);
      const ink = [...probe.getImageData(0, 0, 1, 1).data];
      const luminance = (r: number, g: number, b: number) => {
        const f = (v: number) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const inkL = luminance(ink[0]!, ink[1]!, ink[2]!);
      let worst = Infinity;
      const inset = 6;
      for (let x = inset; x < img.width - inset; x += 4) {
        for (let y = inset; y < img.height - inset; y += 4) {
          const [r, g, b] = c.getImageData(x, y, 1, 1).data;
          const l = luminance(r!, g!, b!);
          const ratio = (Math.max(inkL, l) + 0.05) / (Math.min(inkL, l) + 0.05);
          worst = Math.min(worst, ratio);
        }
      }
      return worst;
    },
    { png, label },
  );
}

describe.skipIf(!hasBrowser && !process.env.CI)("the danger button", () => {
  it("keeps its label at 4.5:1 or better on the painted fill, at rest, hovered and pressed, in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        const button = page.getByRole("button", { name: "Yes, delete it" });
        expect(await worstRatio(page, button), `${theme} rest`).toBeGreaterThanOrEqual(4.5);
        await button.hover();
        await page.waitForTimeout(350);
        expect(await worstRatio(page, button), `${theme} hover`).toBeGreaterThanOrEqual(4.5);
        await page.mouse.down();
        await page.waitForTimeout(350);
        expect(await worstRatio(page, button), `${theme} press`).toBeGreaterThanOrEqual(4.5);
        await page.mouse.move(0, 0);
        await page.mouse.up();
      } finally {
        await close();
      }
    }
  });
});
