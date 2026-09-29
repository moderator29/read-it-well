import { describe, expect, it } from "vitest";
import { EDITABLE_STATUSES, lockedSentence, reviewerAsked, wizardOpening } from "./listings-edit-state";

describe("wizardOpening", () => {
  it("opens a blank wizard only when no id was asked for", () => {
    expect(wizardOpening(undefined, null)).toEqual({ kind: "edit" });
    expect(wizardOpening("a-listing", null)).toEqual({ kind: "missing" });
  });

  it("says a failed read failed, with or without an id", () => {
    expect(wizardOpening("a-listing", "read-failed")).toEqual({ kind: "failed" });
    expect(wizardOpening(undefined, "read-failed")).toEqual({ kind: "failed" });
  });

  it("opens the three editable statuses as a form", () => {
    for (const status of EDITABLE_STATUSES) {
      expect(wizardOpening("id", { status })).toEqual({ kind: "edit" });
    }
  });

  it("refuses to open a live, reviewing or suspended listing as a form", () => {
    for (const status of ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "SUSPENDED"] as const) {
      expect(wizardOpening("id", { status })).toEqual({ kind: "locked", status });
      expect(lockedSentence(status).length).toBeGreaterThan(20);
    }
  });

  it("tells a live lister how to change it", () => {
    expect(lockedSentence("PUBLISHED")).toMatch(/take it down/);
  });
});

describe("reviewerAsked", () => {
  it("shows the note only when the reviewer is waiting on the lister", () => {
    expect(reviewerAsked({ status: "MORE_INFO_REQUIRED", reviewNotes: "Add a kitchen photo" })).toBe(true);
    expect(reviewerAsked({ status: "REJECTED", reviewNotes: "Blurry photos" })).toBe(true);
    expect(reviewerAsked({ status: "DRAFT", reviewNotes: "old note" })).toBe(false);
    expect(reviewerAsked({ status: "REJECTED", reviewNotes: "  " })).toBe(false);
    expect(reviewerAsked(null)).toBe(false);
  });
});
