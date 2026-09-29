import { describe, expect, it } from "vitest";
import { readCautionDeskPayload } from "./caution-desk";

const uuid = "00000000-0000-4000-8000-000000000001";

describe("readCautionDeskPayload (V-36)", () => {
  it("reads both lists and drops a malformed row", () => {
    const desk = readCautionDeskPayload({
      status: "ok",
      disputes: [
        { deduction_id: uuid, rent_payment_id: uuid, item: "kitchen", amount_minor: "5000000", caution_minor: 30000000, photo_path: "a/b.jpg" },
        { deduction_id: uuid, amount_minor: 1 },
      ],
      contested_returns: [
        { return_id: uuid, rent_payment_id: uuid, amount_minor: 1000, returned_on: "2026-09-01", method: "cash", contest_note: "Never came" },
      ],
    });
    expect(desk).toMatchObject({
      state: "ok",
      disputes: [{ deductionId: uuid, amountMinor: 5_000_000, cautionMinor: 30_000_000, photoUrl: "a/b.jpg" }],
      returns: [{ returnId: uuid, method: "cash", contestNote: "Never came" }],
    });
  });
  it("says forbidden or unavailable rather than an empty desk", () => {
    expect(readCautionDeskPayload({ status: "forbidden" })).toEqual({ state: "forbidden" });
    expect(readCautionDeskPayload(null)).toEqual({ state: "unavailable" });
  });
});
