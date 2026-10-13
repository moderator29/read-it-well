/**
 * A PAIR OF INLINE BUTTONS WRAPS INSTEAD OF OVERFLOWING ITS ROW (Chromium;
 * auditor A8 on the inline-button rule).
 *
 * An inline button keeps its label's width (`flex-shrink: 0`, so a lone button
 * beside a long sibling never gives up a subpixel and wraps its label), which
 * means a row of two of them has nowhere to shrink to: the agreement's
 * "Save the new terms" and "Keep the current terms" overflowed a 326px row by
 * 103px. The row wraps (`flex-wrap`), so the second button drops under the
 * first, at the same gap, and each stays a 44px target. When the pair fits it
 * is one row, exactly as before.
 *
 * Tailwind is not part of this harness, so the three utilities the row uses
 * (`flex`, `flex-wrap`, `gap-inline`) are given here as the plain CSS they
 * are, and a source check holds the real component to using them. The control
 * case is the same row without the wrap, to prove the measurement can fail.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
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

const UTILITIES = `
  .flex { display: flex; }
  .flex-wrap { flex-wrap: wrap; }
  .gap-inline { gap: var(--nf-gap-inline); }
  .grid { display: grid; }
  .block { display: block; }
  .mt-2xs { margin-top: var(--nf-space-2xs); }
`;
const CSS = `${PORTED_CSS}\n${UTILITIES}`;

const actions = {
  amendAgreement: "async () => ({ ok: true })",
  cancelAgreement: "async () => ({ ok: true })",
  confirmAgreement: "async () => ({ ok: true })",
  createClaimEvidenceUpload: "async () => ({ ok: true })",
  fileGuaranteeClaim: "async () => ({ ok: true })",
};

const realEntry = `
  import { mount } from "@/lib/testing/browser-root";
  import { AmendTerms } from "@/components/app/agreements/AgreementControls";
  mount(
    <div id="frame" style={{ width: 326 }}>
      <AmendTerms agreementId="agr_1" moveIn="2026-11-01" handoverOn="2026-11-01" notes="" minDate="2026-10-01" />
    </div>,
  );
`;

const controlEntry = `
  import { mount } from "@/lib/testing/browser-root";
  import { Button } from "@/components/ui/Button";
  mount(
    <div id="frame" style={{ width: 326 }}>
      <div className="flex gap-inline" id="row">
        <Button variant="primary">Save the new terms</Button>
        <Button variant="quiet">Keep the current terms</Button>
      </div>
    </div>,
  );
`;

/** The row's own overflow, and each button's box, inside the 326px frame. */
const measure = (page: Page, rowSelector: string) =>
  page.evaluate((selector) => {
    const frame = document.getElementById("frame")!;
    const row = document.querySelector(selector) as HTMLElement;
    const frameRect = frame.getBoundingClientRect();
    return {
      overflow: row.scrollWidth - row.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      buttons: Array.from(row.querySelectorAll("button")).map((button) => {
        const r = button.getBoundingClientRect();
        return { h: r.height, right: r.right - frameRect.left, left: r.left - frameRect.left, top: r.top };
      }),
    };
  }, rowSelector);

describe.skipIf(!hasBrowser && !process.env.CI)("a pair of inline buttons in a 326px row", () => {
  it("the agreement's pair wraps: no overflow, each button a 44px target inside the row", async () => {
    const { page, close } = await mountInBrowser({ entry: realEntry, css: CSS, actions });
    try {
      await page.getByRole("button", { name: "Change the terms" }).click();
      await page.getByRole("button", { name: "Keep the current terms" }).waitFor();
      const m = await measure(page, "form > div.flex");
      expect(m.buttons).toHaveLength(2);
      expect(m.overflow, "the row does not overflow").toBeLessThanOrEqual(0);
      expect(m.pageOverflow, "the page does not scroll sideways").toBeLessThanOrEqual(0);
      for (const b of m.buttons) {
        expect(b.h, "a 44px target").toBeGreaterThanOrEqual(43.5);
        expect(b.left).toBeGreaterThanOrEqual(-0.5);
        expect(b.right).toBeLessThanOrEqual(326.5);
      }
      /* Too narrow for both on one line, so the second wrapped under the first. */
      expect(m.buttons[1]!.top).toBeGreaterThan(m.buttons[0]!.top);
    } finally {
      await close();
    }
  });

  it("the same pair without the wrap overflows, so the measurement can fail", async () => {
    const { page, close } = await mountInBrowser({ entry: controlEntry, css: CSS });
    try {
      const m = await measure(page, "#row");
      expect(m.overflow).toBeGreaterThan(40);
    } finally {
      await close();
    }
  });

  it("the real row carries the wrap in source, and a pair that fits stays on one line", async () => {
    const source = readFileSync(join(process.cwd(), "src/components/app/agreements/AgreementControls.tsx"), "utf8");
    expect(source).toContain('<div className="flex flex-wrap gap-inline">');
    const { page, close } = await mountInBrowser({
      entry: realEntry.replace("width: 326", "width: 640"),
      css: CSS,
      actions,
    });
    try {
      await page.getByRole("button", { name: "Change the terms" }).click();
      await page.getByRole("button", { name: "Keep the current terms" }).waitFor();
      const m = await measure(page, "form > div.flex");
      expect(m.buttons[1]!.top).toBe(m.buttons[0]!.top);
    } finally {
      await close();
    }
  });
});
