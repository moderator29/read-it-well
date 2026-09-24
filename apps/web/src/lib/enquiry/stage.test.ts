import { describe, expect, it } from "vitest";
import { countByStage, deskStage, stageFilter, type StageFacts } from "./stage";

function facts(overrides: Partial<StageFacts> = {}): StageFacts {
  return {
    conversation_id: "c1",
    proven_stage: "new",
    proven_at: null,
    manual_stage: null,
    lost_reason: null,
    manual_at: null,
    ...overrides,
  };
}

describe("the stage an enquiry is at", () => {
  it("is New with nothing proven and nothing set", () => {
    expect(deskStage(facts())).toEqual({ stage: "new", lostReason: null, source: "proven" });
  });

  it("follows the proof when it runs ahead of the hand", () => {
    expect(deskStage(facts({ proven_stage: "viewing_booked", proven_at: "2026-09-20T10:00:00Z", manual_stage: "replied", manual_at: "2026-09-19T10:00:00Z" })).stage).toBe("viewing_booked");
  });

  it("follows the hand when it runs ahead of the proof", () => {
    expect(deskStage(facts({ proven_stage: "viewed", manual_stage: "offer" }))).toEqual({ stage: "offer", lostReason: null, source: "manual" });
  });

  it("lets a payment win over anything typed, lost included", () => {
    expect(deskStage(facts({ proven_stage: "let", proven_at: "2026-09-01T00:00:00Z", manual_stage: "lost", lost_reason: "price", manual_at: "2026-09-20T00:00:00Z" })).stage).toBe("let");
  });

  it("keeps Lost with its reason until a later event proves the enquiry moved on", () => {
    const lost = { manual_stage: "lost", lost_reason: "fees", manual_at: "2026-09-20T00:00:00Z" };
    expect(deskStage(facts({ ...lost, proven_stage: "viewing_booked", proven_at: "2026-09-10T00:00:00Z" }))).toEqual({ stage: "lost", lostReason: "fees", source: "manual" });
    expect(deskStage(facts({ ...lost, proven_stage: "viewing_booked", proven_at: "2026-09-22T00:00:00Z" }))).toEqual({ stage: "viewing_booked", lostReason: null, source: "proven" });
  });

  it("reads rubbish as New rather than inventing a stage", () => {
    expect(deskStage(facts({ proven_stage: "signed", manual_stage: "maybe" })).stage).toBe("new");
  });
});

describe("the filter bar", () => {
  it("counts every stage, zeros included", () => {
    const counts = countByStage([deskStage(facts()), deskStage(facts({ proven_stage: "replied" })), deskStage(facts({ proven_stage: "replied" }))]);
    expect(counts.new).toBe(1);
    expect(counts.replied).toBe(2);
    expect(counts.lost).toBe(0);
  });

  it("takes a stage from the address bar and ignores anything else", () => {
    expect(stageFilter("offer")).toBe("offer");
    expect(stageFilter(["lost"])).toBe("lost");
    expect(stageFilter("waiting")).toBeNull();
    expect(stageFilter(undefined)).toBeNull();
  });
});
