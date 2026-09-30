import { describe, expect, it } from "vitest";
import { REVIEW_REASONS, composeReviewNote, isReviewReasonCode } from "./review-reasons";

describe("listing review reason codes (C8)", () => {
  it("sends the same text for the same reasons, whatever order they were picked in", () => {
    const a = composeReviewNote(["wrong_category", "photos_unclear"], "");
    const b = composeReviewNote(["photos_unclear", "wrong_category"], "");
    expect(a).toBe(b);
    expect(a.split("\n")).toHaveLength(2);
    expect(a.startsWith("- Add at least five")).toBe(true);
  });
  it("puts the reviewer's own note under the checklist", () => {
    expect(composeReviewNote(["photos_unclear"], "  The kitchen photo is sideways. ")).toBe(
      `- ${REVIEW_REASONS[0].sentence}\n\nThe kitchen photo is sideways.`,
    );
    expect(composeReviewNote([], "Only a note")).toBe("Only a note");
  });
  it("drops unknown codes", () => {
    expect(composeReviewNote(["made_up"], "")).toBe("");
    expect(isReviewReasonCode("photos_elsewhere")).toBe(true);
    expect(isReviewReasonCode("made_up")).toBe(false);
  });
  it("carries no unbacked claim words and no em dash in lister copy", () => {
    const all = REVIEW_REASONS.map((r) => `${r.label} ${r.sentence}`).join(" ");
    expect(all).not.toMatch(/verified|guaranteed|checked|—/i);
  });
});
