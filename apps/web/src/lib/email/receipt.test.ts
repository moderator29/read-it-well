import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { stayReceipt, type ReceiptModel } from "@/components/app/money/receipt-model";
import { RECEIPT_FIXTURE } from "./fixtures";
import { stayReceiptMessage } from "./receipt";
import { inOrder, receiptSequence, visibleText } from "./receipt-order";

/**
 * THE RECEIPT EMAIL IS THE ON-SCREEN RECEIPT (north star 16.5, D23). The
 * model is built once from a paid stay shaped like the checkout read; the
 * email must carry every string of it in the receipt's order, in both
 * renderings, and invent nothing the record does not hold.
 * `ReceiptSheet.dom.test.tsx` holds the paper on screen to the same sequence.
 */
const t = getDictionary("en");
const MODEL = stayReceipt(RECEIPT_FIXTURE, t, "en") as ReceiptModel;

describe("the receipt model", () => {
  it("is a receipt only for money that moved", () => {
    expect(stayReceipt({ ...RECEIPT_FIXTURE, paid: false }, t, "en")).toBeNull();
  });

  it("carries the host's confirmation only once the booking says so", () => {
    expect(MODEL.confirmations).toHaveLength(2);
    expect(stayReceipt({ ...RECEIPT_FIXTURE, status: "PENDING" }, t, "en")!.confirmations).toHaveLength(1);
  });

  it("prints no reference the record does not carry", () => {
    expect(MODEL.reference).toBeNull();
    expect(stayReceipt({ ...RECEIPT_FIXTURE, reference: "  " }, t, "en")!.reference).toBeNull();
  });

  it("is exact to the kobo, and the total is the figure", () => {
    expect(MODEL.figure).toBe(MODEL.total.value);
    expect(MODEL.figure).toContain(".50");
  });
});

describe("the receipt email", () => {
  const email = stayReceiptMessage({ source: RECEIPT_FIXTURE, bookingId: "b-fixture", t, locale: "en" })!;

  it("carries every line of the receipt, in the receipt's order, in both renderings", () => {
    expect(inOrder(visibleText(email.html), receiptSequence(MODEL))).toEqual([]);
    expect(inOrder(email.text.replace(/\s+/g, " "), receiptSequence(MODEL).map((s) => s.replace(/\s+/g, " ")))).toEqual([]);
  });

  it("is drawn on paper", () => {
    expect(email.html).toMatch(/class="rm-sheet"/);
  });
});

