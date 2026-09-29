import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { purchaseLines } from "./purchase-lines";
import type { Listing } from "@/lib/listings/types";

/**
 * THE HONESTY RULE, ASSERTED ON THE SALE SIDE.
 *
 * The twin of `move-in-lines.test.ts`, and it exists for the same reason with
 * a much bigger number attached. The two facts this file keeps apart are an
 * UNDECLARED cost, which carries no number at all, and a DECLARED ZERO, which
 * is a seller saying there is no such fee. Collapsing them is the whole defect
 * the feature exists to prevent: an undeclared agency fee drawn as a nought
 * reads as a promise nobody made, and a declared nought hidden reads as
 * nothing at all when it is the best news on the page.
 *
 * `purchaseLines` is the only place that decides which is which, so it is the
 * only place worth asserting. The component around it turns
 * `minor === undefined` into the words and a declared zero agency fee into "No
 * agency fee"; both branches read this function's output and nothing else.
 */

const copy = getDictionary("en").purchase;

function listing(over: Partial<Listing>): Listing {
  return {
    id: "s1",
    title: "A four bedroom",
    city: "Lagos",
    area: "Lekki",
    kind: "home",
    intent: "sale",
    priceMinor: 18_000_000_000,
    salePriceMinor: 18_000_000_000,
    currency: "NGN",
    bedrooms: 4,
    bathrooms: 4,
    rating: 0,
    reviewCount: 0,
    verified: false,
    amenities: [],
    photos: [],
    ...over,
  } as Listing;
}

function line(rows: ReturnType<typeof purchaseLines>, key: string) {
  const found = rows.find((row) => row.key === key);
  if (!found) throw new Error(`no ${key} line`);
  return found;
}

describe("purchaseLines", () => {
  it("lists every cost a buyer meets, declared or not", () => {
    const rows = purchaseLines(listing({}), copy);
    expect(rows.map((row) => row.key)).toEqual([
      "price",
      "agency",
      "legal",
      "consent",
      "stamp",
      "registration",
    ]);
  });

  it("leaves an undeclared cost with no figure at all, never a zero", () => {
    const rows = purchaseLines(listing({}), copy);
    expect(line(rows, "agency").minor).toBeUndefined();
    expect(line(rows, "legal").minor).toBeUndefined();
    expect(line(rows, "consent").minor).toBeUndefined();
    expect(line(rows, "stamp").minor).toBeUndefined();
    expect(line(rows, "registration").minor).toBeUndefined();
  });

  it("keeps a declared zero, because a stated zero is a different fact", () => {
    const rows = purchaseLines(listing({ saleAgencyFeeMinor: 0 }), copy);
    expect(line(rows, "agency").minor).toBe(0);
    /* And the one beside it stays undeclared: declaring one cost says nothing
       about the next, which is the mistake a derived breakdown would make. */
    expect(line(rows, "legal").minor).toBeUndefined();
  });

  it("holds a declared zero apart from an undeclared cost on every statutory line", () => {
    const declared = purchaseLines(
      listing({
        governorsConsentFeeMinor: 0,
        stampDutyMinor: 0,
        surveyRegistrationFeeMinor: 0,
      }),
      copy,
    );
    for (const key of ["consent", "stamp", "registration"]) {
      expect(line(declared, key).minor).toBe(0);
      expect(line(purchaseLines(listing({}), copy), key).minor).toBeUndefined();
    }
  });

  it("carries every declared figure through in kobo, untouched", () => {
    const rows = purchaseLines(
      listing({
        salePriceMinor: 18_000_000_000,
        saleAgencyFeeMinor: 900_000_000,
        saleLegalFeeMinor: 900_000_000,
        governorsConsentFeeMinor: 500_000_000,
        stampDutyMinor: 150_000_000,
        surveyRegistrationFeeMinor: 50_000_000,
      }),
      copy,
    );
    expect(rows.map((row) => row.minor)).toEqual([
      18_000_000_000, 900_000_000, 900_000_000, 500_000_000, 150_000_000, 50_000_000,
    ]);
  });

  it("treats a zero asking price as undeclared rather than as a free property", () => {
    expect(line(purchaseLines(listing({ salePriceMinor: 0 }), copy), "price").minor).toBeUndefined();
  });

  it("treats an absent asking price as undeclared", () => {
    expect(
      line(purchaseLines(listing({ salePriceMinor: undefined }), copy), "price").minor,
    ).toBeUndefined();
  });

  it("says who keeps each cost, and never guesses", () => {
    const rows = purchaseLines(listing({}), copy);
    expect(line(rows, "price").keeper).toBe(copy.keptBySeller);
    expect(line(rows, "agency").keeper).toBe(copy.keptByAgent);
    expect(line(rows, "legal").keeper).toBe(copy.keptByAgent);
    expect(line(rows, "consent").keeper).toBe(copy.keptByState);
    expect(line(rows, "stamp").keeper).toBe(copy.keptByState);
    expect(line(rows, "registration").keeper).toBe(copy.keptByState);
  });

  it("says a transfer needs the consent, and states no percentage anywhere", () => {
    const rows = purchaseLines(listing({}), copy);
    expect(line(rows, "consent").basis).toBe(copy.consentBasis);
    /* Rule 15. Four of these six have a conventional percentage and not one of
       them is printed, because a rate that is usually five per cent is not
       five per cent and a figure the database cannot produce is not printed. */
    for (const row of rows) {
      expect(`${row.label} ${row.basis ?? ""}`).not.toMatch(/\d|per cent|%/);
    }
  });

  it("contributes nothing to a total from an undeclared cost", () => {
    const rows = purchaseLines(listing({ saleAgencyFeeMinor: 0 }), copy);
    const total = rows.reduce((sum, row) => sum + (row.minor ?? 0), 0);
    /* The asking price and a declared zero. The four undeclared lines are
       still LISTED, and they add nothing. */
    expect(total).toBe(18_000_000_000);
  });

  it("draws its objects from one artwork family, all untwinned", () => {
    const twinned = new Set([
      "alert-triangle",
      "clock-expired",
      "coin-naira",
      "contract-sign",
      "doc-cross",
      "doc-review",
      "hourglass",
      "id-card-check",
      "info",
      "keys-handover",
      "ledger-book",
      "payment-failed",
      "payment-received",
      "payment-sent",
      "progress-ring",
      "receipt-check",
      "savings-pot",
      "seal-check",
      "seal-cross",
      "seal-pending",
      "transfer-arrow",
      "wallet-out",
      "wallet-plus",
    ]);
    const icons = purchaseLines(listing({}), copy).map((row) => row.icon);
    expect(icons.filter((icon) => twinned.has(icon))).toEqual([]);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("gives each row its own line glyph, the one the listing page draws", () => {
    const glyphs = purchaseLines(listing({}), copy).map((row) => row.glyph);
    expect(glyphs).toEqual(["price-tag", "briefcase", "scale", "certificate", "stamp", "survey"]);
  });
});
