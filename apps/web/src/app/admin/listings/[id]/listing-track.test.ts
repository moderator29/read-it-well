import { describe, expect, it } from "vitest";
import { listingTrack } from "./listing-track";

const at = { submittedAt: "2026-10-01T09:00:00Z", reviewedAt: "2026-10-02T10:00:00Z" };
const states = (status: string) => listingTrack({ status, ...at })?.map((step) => step.state);

describe("listingTrack", () => {
  it("holds at review while the review is open, in any of its three statuses", () => {
    for (const status of ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED"]) {
      expect(states(status)).toEqual(["done", "current", "upcoming", "upcoming"]);
    }
  });

  it("stands at live, not yet reached, once approved", () => {
    expect(states("APPROVED")).toEqual(["done", "done", "done", "current"]);
  });

  it("is complete when published", () => {
    expect(states("PUBLISHED")).toEqual(["done", "done", "done", "done"]);
  });

  it("stops at the decision when rejected", () => {
    expect(states("REJECTED")).toEqual(["done", "done", "failed", "upcoming"]);
  });

  it("draws nothing for a draft or a suspension, whose history is not recorded", () => {
    expect(listingTrack({ status: "DRAFT", ...at })).toBeNull();
    expect(listingTrack({ status: "SUSPENDED", ...at })).toBeNull();
  });

  it("carries only the times the record keeps", () => {
    const approved = listingTrack({ status: "APPROVED", ...at })!;
    expect(approved.map((step) => step.at)).toEqual([at.submittedAt, null, at.reviewedAt, null]);
    const live = listingTrack({ status: "PUBLISHED", ...at })!;
    expect(live.map((step) => step.at)).toEqual([at.submittedAt, null, null, at.reviewedAt]);
    const waiting = listingTrack({ status: "SUBMITTED", submittedAt: at.submittedAt, reviewedAt: null })!;
    expect(waiting.map((step) => step.at)).toEqual([at.submittedAt, null, null, null]);
  });

  describe("Live is dated only when the record dates it", () => {
    it("keeps the date when the last decision is the first publish (the same instant)", () => {
      const live = listingTrack({ status: "PUBLISHED", ...at, publishedAt: at.reviewedAt })!;
      expect(live.map((step) => step.at)).toEqual([at.submittedAt, null, null, at.reviewedAt]);
    });

    it("draws Live undated when the listing came back after a stop, rather than the old decision date", () => {
      const back = listingTrack({ status: "PUBLISHED", ...at, publishedAt: "2026-09-20T08:00:00Z" })!;
      expect(back.map((step) => step.at)).toEqual([at.submittedAt, null, null, null]);
      expect(back.map((step) => step.state)).toEqual(["done", "done", "done", "done"]);
    });

    it("draws Live undated when it never recorded a first publish, and keeps the old behaviour when the caller does not read it", () => {
      expect(listingTrack({ status: "PUBLISHED", ...at, publishedAt: null })![3]!.at).toBeNull();
      expect(listingTrack({ status: "PUBLISHED", ...at })![3]!.at).toBe(at.reviewedAt);
    });
  });
});
