/**
 * ONE RECEIPT, ON SCREEN AND IN THE INBOX (north star 16.5: "a receipt email
 * matches the on-screen receipt exactly, because a receipt that differs looks
 * forged").
 *
 * The receipt model is built once, from a paid stay shaped like the checkout
 * read, and the document sheet is mounted for real in Chromium with the
 * product's own tokens and document.css. Every string the model holds must
 * appear on the paper in the receipt's order; `lib/email/receipt.test.ts`
 * holds the email to the same sequence, so the two cannot differ.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { RECEIPT_FIXTURE } from "@/lib/email/fixtures";
import { stayReceipt, type ReceiptModel } from "./receipt-model";
import { inOrder, receiptSequence as sequence } from "@/lib/email/receipt-order";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const WEB = join(__dirname, "..", "..", "..", "..");
const read = (...parts: string[]) => readFileSync(join(WEB, ...parts), "utf8");
const CSS = [
  read("..", "..", "packages", "design-tokens", "src", "tokens.css"),
  "*, ::before, ::after { box-sizing: border-box; } body { margin: 0; font-family: sans-serif; background: var(--nf-surface-canvas); color: var(--nf-content-primary); } p, h1, h2, h3, dl, dd { margin: 0; }",
  read("src", "app", "css", "document.css"),
].join("\n");

const t = getDictionary("en");
const MODEL = stayReceipt(RECEIPT_FIXTURE, t, "en") as ReceiptModel;

describe.skipIf(!hasBrowser && !process.env.CI)("the receipt on screen", () => {
  it("draws the same lines in the same order as the email, and nothing else on the paper", async () => {
    const entry = `
      import { ReceiptSheet } from "@/components/app/money/ReceiptSheet";
      import { mount } from "@/lib/testing/browser-root";
      mount(<main style={{ padding: 16 }}><ReceiptSheet receipt={${JSON.stringify(MODEL)}} headingId="r" /></main>);
    `;
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      const sheet = page.getByTestId("receipt-sheet");
      await sheet.waitFor();
      const text = (await sheet.innerText()).replace(/\s+/g, " ");
      expect(inOrder(text, sequence(MODEL))).toEqual([]);
      /* The figure is stated once as the hero and once as the total, and
         appears nowhere else: no row on the paper the model did not hold. */
      expect(text.split(MODEL.figure).length - 1).toBe(2);
      /* Confirmed is said in words beside a filled mark, never by colour alone. */
      expect(await page.locator(".nf-doc__state--done .nf-doc__mark").count()).toBe(MODEL.confirmations.length);
    } finally {
      await close();
    }
  });
});
