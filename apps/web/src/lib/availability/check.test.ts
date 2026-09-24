import { describe, expect, it } from "vitest";
import { checkFromRow, isAvailabilityAnswer, isLaterDate, laterWindow } from "./check";

const ROW = {
  id: "c1",
  conversation_id: "t1",
  listing_id: "l1",
  asker_id: "renter",
  lister_id: "agent",
  asked_at: "2026-09-24T09:00:00Z",
  answer: null,
  available_from: null,
  answered_at: null,
};

describe("a still-available question as the card reads it", () => {
  it("knows who is reading it", () => {
    expect(checkFromRow(ROW, "agent")?.viewer).toBe("lister");
    expect(checkFromRow(ROW, "renter")?.viewer).toBe("asker");
  });

  it("carries a date only with a later answer", () => {
    const later = checkFromRow({ ...ROW, answer: "available_later", available_from: "2026-10-15", answered_at: "x" }, "agent");
    expect(later?.availableFrom).toBe("2026-10-15");
    const now = checkFromRow({ ...ROW, answer: "available", available_from: "2026-10-15", answered_at: "x" }, "agent");
    expect(now?.availableFrom).toBeNull();
  });

  it("refuses a row it cannot read and an answer outside the three", () => {
    expect(checkFromRow(null, "agent")).toBeNull();
    expect(checkFromRow({ ...ROW, id: undefined }, "agent")).toBeNull();
    expect(checkFromRow({ ...ROW, answer: "maybe" }, "agent")?.answer).toBeNull();
    expect(isAvailabilityAnswer("let")).toBe(true);
    expect(isAvailabilityAnswer("maybe")).toBe(false);
  });

  it("accepts a later date from tomorrow to a year out, the same window as the database", () => {
    expect(laterWindow("2026-09-24")).toEqual({ min: "2026-09-25", max: "2027-09-25" });
    expect(isLaterDate("2026-09-24", "2026-09-24")).toBe(false);
    expect(isLaterDate("2026-09-25", "2026-09-24")).toBe(true);
    expect(isLaterDate("2027-09-26", "2026-09-24")).toBe(false);
    expect(isLaterDate("25/09/2026", "2026-09-24")).toBe(false);
  });
});
