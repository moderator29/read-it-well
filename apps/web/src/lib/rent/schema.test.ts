import { describe, expect, it } from "vitest";

import { MAX_MOVE_IN_DAYS_AHEAD, startRentPaymentSchema, whyNotMoveIn } from "./schema";

describe("startRentPaymentSchema", () => {
  it("accepts an inspection id with or without a move-in day", () => {
    const id = "6f1c2b0e-3d4a-4b5c-8d6e-7f8091a2b3c4";
    expect(startRentPaymentSchema.safeParse({ inspectionId: id }).success).toBe(true);
    expect(startRentPaymentSchema.safeParse({ inspectionId: id, moveIn: "2026-10-01" }).success).toBe(true);
  });

  it("refuses a date that does not exist and an id that is not a uuid", () => {
    const id = "6f1c2b0e-3d4a-4b5c-8d6e-7f8091a2b3c4";
    expect(startRentPaymentSchema.safeParse({ inspectionId: id, moveIn: "2026-02-31" }).success).toBe(false);
    expect(startRentPaymentSchema.safeParse({ inspectionId: "seed-1" }).success).toBe(false);
  });
});

describe("whyNotMoveIn", () => {
  it("refuses yesterday and a day too far ahead, accepts today", () => {
    expect(whyNotMoveIn("2026-09-17", "2026-09-18")).toMatch(/passed/);
    expect(whyNotMoveIn("2026-09-18", "2026-09-18")).toBeNull();
    expect(whyNotMoveIn("2027-09-18", "2026-09-18")).toMatch(new RegExp(String(MAX_MOVE_IN_DAYS_AHEAD)));
  });
});
