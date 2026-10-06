/**
 * The in-app legal documents are on paper (R3-03), mounted in Chromium.
 *
 * The public /terms, /privacy and /disclaimer were moved onto the shared
 * `DocumentSheet`; their in-app twins under /legal still drew the old canvas
 * reader with a glass contents card, so one release shipped the same legal
 * text in two materials. `LegalDocument` now puts everything that is the
 * document (the date, the contents and every section) on the same printable
 * sheet, and leaves only the product's own header and the way out around it.
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
import { GLASS_CSS, productCss } from "@/lib/testing/product-css";
import { TERMS_SECTIONS } from "@/lib/legal/terms";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(GLASS_CSS, "app/css/typography.css", "app/css/system.css", "app/css/document.css");

const ENTRY = `
  import { TERMS_SECTIONS } from "@/lib/legal/terms";
  import { LegalDocument } from "@/app/(app)/legal/LegalDocument";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <LegalDocument
      title="Terms of service"
      intro="The agreement between you and Vallo."
      updated="25 September 2026"
      sections={TERMS_SECTIONS}
      otherHref="/legal/privacy"
      otherLabel="Privacy policy"
    />
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("LegalDocument", () => {
  it("draws the whole document on the one printable paper sheet, and the product's chrome around it", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      const sheet = page.locator("[data-doc-kind=document]");
      await sheet.waitFor();
      expect(await sheet.count()).toBe(1);
      expect(await sheet.getAttribute("data-doc-print")).toBe("");
      /* The date, the contents and every section are on the paper. */
      expect(await sheet.locator(".nf-legal__meta time").textContent()).toBe("25 September 2026");
      expect(await sheet.locator("nav#legal-contents").count()).toBe(1);
      expect(await sheet.locator("h2.nf-legal__heading").count()).toBe(TERMS_SECTIONS.length);
      /* No glass card inside a document. */
      expect(await sheet.locator(".nf-panel").count()).toBe(0);
      /* The way out is the product's own, outside the paper. */
      expect(await page.locator(".nf-legal__foot").evaluate((el) => el.closest("[data-doc-kind]") === null)).toBe(true);
    } finally {
      await close();
    }
  });

  it("passes axe on paper in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await page.locator("[data-doc-kind=document]").waitFor();
        await page.waitForTimeout(700);
        expect(await axeViolations(page), theme).toEqual([]);
      } finally {
        await close();
      }
    }
  });
});
