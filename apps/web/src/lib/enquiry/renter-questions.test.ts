import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { addQuestion, removeQuestion, MAX_RENTER_QUESTIONS, openQuestionKeys, renterQuestions, type RenterQuestionFacts } from "./renter-questions";

const copy = getDictionary("en").memberKit.questions;

const BARE: RenterQuestionFacts = { intent: "rent", pricePeriod: "year" };

describe("renter question chips (B6)", () => {
  it("asks the five most common questions of a listing that states nothing", () => {
    expect(openQuestionKeys(BARE)).toEqual(["available", "caution", "term", "water", "meter"]);
  });

  it("never offers more than five", () => {
    expect(renterQuestions(BARE, copy).length).toBe(MAX_RENTER_QUESTIONS);
    expect(renterQuestions(null, copy).length).toBeLessThanOrEqual(MAX_RENTER_QUESTIONS);
  });

  it("leaves out what the listing already answers", () => {
    const keys = openQuestionKeys({
      ...BARE,
      minimumTenancyMonths: 12,
      utilities: { waterSupply: "BOREHOLE", prepaidMeter: true, hasEstateAccess: false },
    } as RenterQuestionFacts);
    expect(keys).not.toContain("term");
    expect(keys).not.toContain("water");
    expect(keys).not.toContain("meter");
    expect(keys).toEqual(["available", "caution", "power", "service", "viewing"]);
  });

  it("drops the caution question when there is none, or the record answers it", () => {
    expect(openQuestionKeys({ ...BARE, cautionDepositMinor: 0 })).not.toContain("caution");
    expect(openQuestionKeys(BARE, { cautionRecord: true })).not.toContain("caution");
    /* A stated caution amount still leaves the refund question open. */
    expect(openQuestionKeys({ ...BARE, cautionDepositMinor: 25_000_000 })).toContain("caution");
  });

  it("drops the term question on monthly rent", () => {
    expect(openQuestionKeys({ ...BARE, pricePeriod: "month" })).not.toContain("term");
  });

  it("drops the Saturday question when the lister has open viewing slots", () => {
    const all = {
      ...BARE,
      cautionDepositMinor: 0,
      minimumTenancyMonths: 12,
      serviceChargeMinor: 0,
      utilities: { waterSupply: "BOREHOLE", prepaidMeter: true, powerBackup: "GENERATOR", hasEstateAccess: false },
    } as RenterQuestionFacts;
    expect(openQuestionKeys(all)).toEqual(["available", "viewing"]);
    expect(openQuestionKeys(all, { viewingSlots: true })).toEqual(["available"]);
  });

  it("asks a sale listing no rent questions", () => {
    const keys = openQuestionKeys({ intent: "sale" });
    expect(keys).not.toContain("caution");
    expect(keys).not.toContain("term");
    expect(keys).not.toContain("service");
  });

  it("words each chip from the dictionary", () => {
    const [first] = renterQuestions(BARE, copy);
    expect(first).toEqual({ key: "ask_available", label: copy.available.label, text: copy.available.text });
  });

  it("adds a sentence to the draft once", () => {
    expect(addQuestion("", "Is it still available?")).toBe("Is it still available?");
    expect(addQuestion("Hello.", "Is it still available?")).toBe("Hello. Is it still available?");
    expect(addQuestion("Hello. Is it still available?", "Is it still available?")).toBe("Hello. Is it still available?");
  });

  it("takes a sentence back out", () => {
    expect(removeQuestion("Hello. Is it still available? Thanks", "Is it still available?")).toBe("Hello. Thanks");
    expect(removeQuestion("Hello.", "Is it still available?")).toBe("Hello.");
  });
});
