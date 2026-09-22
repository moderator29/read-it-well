import { describe, expect, it } from "vitest";
import { statusFor } from "./status";
import { isInspectionHref } from "./live";

describe("statusFor", () => {
  it("says Pending in cyan on a scheduled viewing, as the render does beside Scheduled", () => {
    expect(statusFor({ state: "CONFIRMED", outcome: null }, "requester")).toEqual({ label: "Pending", tone: "pending" });
    expect(statusFor({ state: "CONFIRMED", outcome: null }, "lister")).toEqual({ label: "Pending", tone: "pending" });
  });

  it("says whose move it is from the reader's side, and both sides agree", () => {
    expect(statusFor({ state: "REQUESTED", outcome: null }, "lister").label).toBe("Your move");
    expect(statusFor({ state: "REQUESTED", outcome: null }, "requester").label).toBe("Awaiting reply");
    expect(statusFor({ state: "PROPOSED", outcome: null }, "requester").label).toBe("Your move");
    expect(statusFor({ state: "PROPOSED", outcome: null }, "lister").label).toBe("Awaiting reply");
  });

  it("names the outcome on a completed one, in emerald", () => {
    expect(statusFor({ state: "COMPLETED", outcome: "deal_done" }, "lister")).toEqual({ label: "Deal done", tone: "good" });
    expect(statusFor({ state: "COMPLETED", outcome: null }, "lister")).toEqual({ label: "Completed", tone: "good" });
  });

  it("draws a refusal in rose and a withdrawal quietly", () => {
    expect(statusFor({ state: "DECLINED", outcome: null }, "requester").tone).toBe("bad");
    expect(statusFor({ state: "WITHDRAWN", outcome: null }, "requester").tone).toBe("quiet");
  });
});

describe("isInspectionHref", () => {
  it("matches the two links the notify trigger writes", () => {
    expect(isInspectionHref("/inspections")).toBe(true);
    expect(isInspectionHref("/agent/inspections")).toBe(true);
    expect(isInspectionHref("/inspections?changed=1")).toBe(true);
  });
  it("ignores everything else", () => {
    expect(isInspectionHref(null)).toBe(false);
    expect(isInspectionHref("/inspectionsx")).toBe(false);
    expect(isInspectionHref("/messages/1")).toBe(false);
  });
});
