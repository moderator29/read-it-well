/**
 * THE CANCEL TRIGGER IS LEGIBLE IN BOTH THEMES (auditor A7 N4), MOUNTED FOR
 * REAL (Chromium, the product's tokens and the button system).
 *
 * "Cancel this agreement" sits as a secondary beside another action on the
 * Awaiting you card. Its label was the error colour on glass, about 3.9:1 at
 * night. It is now the button's own ink with a rose edge; axe holds both
 * themes to its rules; because axe cannot score text over a gradient, the
 * contrast of the label against the page ground is measured here as well, and
 * the edge is what says it is destructive.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
  import { Button } from "@/components/ui/Button";
  mount(
    <div style={{ padding: 16, background: "var(--nf-surface-canvas)" }}>
      <CancelAgreement agreementId="agr_1" variant="secondary" />
      <Button variant="secondary">Plain secondary</Button>
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

describe.skipIf(!hasBrowser && !process.env.CI)("the cancel trigger on the agreement card", () => {
  it("passes axe in both themes, and keeps a rose edge on its own ink", async () => {
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry, css: CSS, actions });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        const button = page.getByRole("button", { name: "Cancel this agreement" });
        expect(await button.isVisible(), theme).toBe(true);
        expect(await axeViolations(page), theme).toEqual([]);
        const probe = await button.evaluate((el) => {
          /* Any CSS colour to sRGB bytes, through a 1px canvas, so oklab and
             color-mix results compare like with like. */
          const rgb = (value: string) => {
            const c = document.createElement("canvas").getContext("2d")!;
            c.fillStyle = "black";
            c.fillStyle = value;
            c.fillRect(0, 0, 1, 1);
            const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
            return [r!, g!, b!];
          };
          const luminance = ([r, g, b]: number[]) => {
            const f = (v: number) => {
              const x = v / 255;
              return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
            };
            return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
          };
          const ratio = (a: number[], b: number[]) => {
            const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
            return (hi! + 0.05) / (lo! + 0.05);
          };
          const style = getComputedStyle(el);
          const root = getComputedStyle(document.documentElement);
          const ink = rgb(style.color);
          const error = rgb(root.getPropertyValue("--nf-state-error").trim());
          const canvas = rgb(root.getPropertyValue("--nf-surface-canvas").trim());
          return {
            inkIsError: ink.join() === error.join(),
            inkOnCanvas: ratio(ink, canvas),
            edge: style.borderTopColor,
            inkRaw: style.color,
          };
        });
        /* The label is not the rose word, and the word clears 4.5:1 on the page ground. */
        expect(probe.inkIsError, `${theme} label is not the error colour`).toBe(false);
        expect(probe.inkOnCanvas, `${theme} label contrast`).toBeGreaterThanOrEqual(4.5);
        /* The edge is what says "destructive": it differs from a plain secondary's. */
        const plainEdge = await page
          .getByRole("button", { name: "Plain secondary" })
          .evaluate((el) => getComputedStyle(el).borderTopColor);
        expect(probe.edge, `${theme} edge is rose, not the glass edge`).not.toBe(plainEdge);
      } finally {
        await close();
      }
    }
  });
});
