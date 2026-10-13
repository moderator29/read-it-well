import { describe, expect, it } from "vitest";
import {
  asksDiner,
  billOpen,
  cleanCode,
  nairaToMinor,
  readBill,
  readSeating,
  reviewable,
  showsCode,
  spacedCode,
} from "./seating";

const row = {
  reservation_id: "r1",
  check_in_code: "042817",
  outcome: null,
  outcome_by: null,
  outcome_at: null,
  restaurant_answer: null,
  diner_asked_at: null,
  diner_answer: null,
  disputed_at: null,
  dispute_resolved_at: null,
};
const seat = readSeating(row)!;
const at = "2026-10-13T19:00:00Z";
const hours = (h: number) => new Date(Date.parse(at) + h * 3_600_000);

describe("the check-in code", () => {
  it("is read, spaced and cleaned", () => {
    expect(seat.checkInCode).toBe("042817");
    expect(spacedCode("042817")).toBe("042 817");
    expect(cleanCode("042 817")).toBe("042817");
    expect(cleanCode("4281")).toBeNull();
    expect(readSeating({ ...row, check_in_code: "12ab56" })).toBeNull();
  });

  it("shows while the table is confirmed and undecided", () => {
    expect(showsCode({ status: "CONFIRMED", reservedFor: at }, seat, hours(-2))).toBe(true);
    expect(showsCode({ status: "PENDING", reservedFor: at }, seat, hours(-2))).toBe(false);
    expect(showsCode({ status: "CONFIRMED", reservedFor: at }, { ...seat, outcome: "SEATED" }, hours(1))).toBe(false);
  });
});

describe("did you dine", () => {
  it("is asked only a day after an unmarked table", () => {
    const table = { status: "CONFIRMED", reservedFor: at };
    expect(asksDiner(table, seat, hours(5))).toBe(false);
    expect(asksDiner(table, seat, hours(25))).toBe(true);
    expect(asksDiner(table, { ...seat, restaurantAnswer: "SEATED" }, hours(25))).toBe(false);
    expect(asksDiner(table, { ...seat, dinerAnswer: "dined" }, hours(25))).toBe(false);
  });
});

describe("reviews and bills", () => {
  it("only a seated table without an open dispute is reviewable", () => {
    expect(reviewable(seat)).toBe(false);
    expect(reviewable({ ...seat, outcome: "SEATED" })).toBe(true);
    expect(reviewable({ ...seat, outcome: "SEATED", disputed: true })).toBe(false);
  });

  it("reads naira as typed into kobo", () => {
    expect(nairaToMinor("12,500")).toBe(1_250_000);
    expect(nairaToMinor("12500.5")).toBe(1_250_050);
    expect(nairaToMinor("0")).toBeNull();
    expect(nairaToMinor("abc")).toBeNull();
  });

  it("opens the bill around the table's time", () => {
    const table = { status: "COMPLETED", reservedFor: at };
    expect(billOpen(table, hours(-4))).toBe(false);
    expect(billOpen(table, hours(1))).toBe(true);
    expect(billOpen(table, hours(80))).toBe(false);
    expect(billOpen({ status: "CANCELLED", reservedFor: at }, hours(1))).toBe(false);
  });

  it("refuses a bill row that is not one", () => {
    expect(readBill({ id: "b", reservation_id: "r", amount_minor: 5000, status: "paid" })?.status).toBe("paid");
    expect(readBill({ id: "b", reservation_id: "r", amount_minor: -1, status: "paid" })).toBeNull();
  });
});
