import { describe, expect, it } from "vitest";
import { arrivalPhotoPath, readArrivalCheckState, reportReady } from "./arrival-check";

describe("the arrival check", () => {
  it("reads each state the database returns, and nothing else", () => {
    expect(readArrivalCheckState({ state: "open", closes_at: "2026-09-24T17:00:00Z" })).toEqual({
      state: "open",
      closesAt: "2026-09-24T17:00:00Z",
    });
    expect(readArrivalCheckState({ state: "before", opens_at: "2026-09-25T14:00:00Z" }).state).toBe("before");
    expect(readArrivalCheckState({ state: "closed" })).toEqual({ state: "closed" });
    expect(readArrivalCheckState({ state: "none" })).toEqual({ state: "none" });
    expect(
      readArrivalCheckState({ state: "answered", answer: "no_access", answered_at: "2026-09-24T15:10:00Z", reference: "VAL-SUP-01234" }),
    ).toEqual({ state: "answered", answer: "no_access", answeredAt: "2026-09-24T15:10:00Z", reference: "VAL-SUP-01234" });
  });

  it("treats an unknown answer or shape as a failure, never as a yes", () => {
    expect(readArrivalCheckState({ state: "answered", answer: "maybe" }).state).toBe("failed");
    expect(readArrivalCheckState(null).state).toBe("failed");
    expect(readArrivalCheckState({ state: "live" }).state).toBe("failed");
  });

  it("names the photo under the booking, with a safe extension", () => {
    const id = "0b5f3a52-5d3e-4a57-9a0f-3f1a7d0c9e11";
    expect(arrivalPhotoPath(id, "IMG_2231.HEIC", "abc-123")).toBe(`${id}/abc-123.heic`);
    expect(arrivalPhotoPath(id, "evil.svg", "abc/../x")).toBe(`${id}/abcx.jpg`);
    expect(arrivalPhotoPath(id, "noextension", "r1")).toBe(`${id}/r1.jpg`);
  });

  it("needs a reason and one to six photos to send a report", () => {
    expect(reportReady(null, 2)).toBe(false);
    expect(reportReady("not_as_listed", 0)).toBe(false);
    expect(reportReady("no_access", 1)).toBe(true);
    expect(reportReady("no_access", 7)).toBe(false);
  });
});
