/**
 * THE CANCEL CONTROLS ARE LEGIBLE IN BOTH THEMES (auditor A7 N4 and A8),
 * MOUNTED FOR REAL (Chromium, the product's tokens and the button system).
 *
 * "Cancel this agreement" sits as a secondary beside another action on the
 * Awaiting you card; "Yes, cancel it" is the confirming act inside its sheet.
 * The rose label on glass measured about 3.9:1 at night. The trigger now keeps
 * the secondary's own ink and says "destructive" with a full-strength rose
 * edge; so does the confirm, because the solid destructive button's white
 * label does not clear 4.5:1 at night. Axe cannot score text or a border over
 * a gradient, so the ratios are measured here from the computed styles, in both themes, at rest, pointed at and pressed:
 *
 *   the edge against the button's own fill     at least 3:1 (a non-text boundary)
 *   the label against the button's own fill    at least 4.5:1
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
import { axeViolations } from "@/components/ui/ported-test-css";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss();

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  import { CancelAgreement } from "@/components/app/agreements/AgreementControls";
  mount(
    <div style={{ padding: 16, background: "var(--nf-surface-canvas)" }}>
      <CancelAgreement agreementId="agr_1" variant="secondary" />
    </div>,
  );
`;

const actions = {
  amendAgreement: "async () => ({ ok: true })",
  cancelAgreement: "async () => ({ ok: true })",
  confirmAgreement: "async () => ({ ok: true })",
  createClaimEvidenceUpload: "async () => ({ ok: true })",
  fileGuaranteeClaim: "async () => ({ ok: true })",
};

/** The three colours a button is judged on, as sRGB, composited over its own fill. */
async function measure(button: Locator) {
  return button.evaluate((el) => {
    const rgba = (value: string) => {
      const c = document.createElement("canvas").getContext("2d")!;
      c.fillStyle = "black";
      c.fillStyle = value;
      c.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data;
      return [r!, g!, b!, a! / 255];
    };
    const over = (top: number[], under: number[]) =>
      [0, 1, 2].map((i) => top[i]! * top[3]! + under[i]! * (1 - top[3]!));
    const luminance = (c: number[]) => {
      const f = (v: number) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!);
    };
    const ratio = (a: number[], b: number[]) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi! + 0.05) / (lo! + 0.05);
    };
    const style = getComputedStyle(el);
    /* The page ground under the button, for a fill that is not opaque. */
    const ground = rgba(getComputedStyle(document.documentElement).getPropertyValue("--nf-surface-canvas").trim());
    const fill = over(rgba(style.backgroundColor), [ground[0]!, ground[1]!, ground[2]!, 1]);
    const edge = over(rgba(style.borderTopColor), fill.concat(1));
    const ink = over(rgba(style.color), fill.concat(1));
    return { edge: ratio(edge, fill), label: ratio(ink, fill) };
  });
}

/** At rest, pointed at, and pressed: the three states the edge has to survive. */
async function states(page: Page, button: Locator) {
  const rest = await measure(button);
  await button.hover();
  await page.waitForTimeout(350);
  const hover = await measure(button);
  await page.mouse.down();
  await page.waitForTimeout(350);
  const press = await measure(button);
  /* Leave without clicking, so the next state starts from rest. */
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await page.waitForTimeout(350);
  return { rest, hover, press };
}

describe.skipIf(!hasBrowser && !process.env.CI)("the cancel controls on the agreement card", () => {
  it("the trigger's edge clears 3:1 and its label 4.5:1 against its own fill, at rest, hovered and pressed, in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry, css: CSS, actions });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        const trigger = page.getByRole("button", { name: "Cancel this agreement" });
        expect(await trigger.isVisible(), theme).toBe(true);
        expect(await axeViolations(page), theme).toEqual([]);
        const all = await states(page, trigger);
        for (const [state, ratios] of Object.entries(all)) {
          expect(ratios.edge, `${theme} ${state}: edge against the fill`).toBeGreaterThanOrEqual(3);
          expect(ratios.label, `${theme} ${state}: label against the fill`).toBeGreaterThanOrEqual(4.5);
        }
      } finally {
        await close();
      }
    }
  });

  it("the confirming button in its sheet wears the same edge and clears the same ratios, in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry, css: CSS, actions });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await page.getByRole("button", { name: "Cancel this agreement" }).click();
        const confirm = page.getByRole("button", { name: "Yes, cancel it" });
        await confirm.waitFor();
        await page.waitForTimeout(500);
        const all = await states(page, confirm);
        for (const [state, ratios] of Object.entries(all)) {
          expect(ratios.edge, `${theme} ${state}: edge against the fill`).toBeGreaterThanOrEqual(3);
          expect(ratios.label, `${theme} ${state}: label against the fill`).toBeGreaterThanOrEqual(4.5);
        }
      } finally {
        await close();
      }
    }
  });
});
