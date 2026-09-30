import { describe, expect, it } from "vitest";
import { autoAdvanceAllowed, positionLabel, storySequence, tapZone } from "./story-sequence";

const s = (id: string) => ({ id, imageUrl: `/i/${id}.jpg`, authorLabel: `A${id}` });

describe("stories as a sequence (B16)", () => {
  it("finds the story in the recent run, with its neighbours", () => {
    const seq = storySequence(s("b"), [s("a"), s("b"), s("c")]);
    expect(seq).toMatchObject({ index: 1, total: 3, ids: ["a", "b", "c"] });
    expect(seq.prev?.id).toBe("a");
    expect(seq.next?.id).toBe("c");
  });

  it("leads the run with a story the recent list does not hold", () => {
    const seq = storySequence(s("x"), [s("a"), s("b")]);
    expect(seq.ids).toEqual(["x", "a", "b"]);
    expect(seq.prev).toBeNull();
    expect(seq.next?.id).toBe("a");
  });

  it("has no neighbour past either end, and drops duplicates", () => {
    const seq = storySequence(s("a"), [s("a"), s("a")]);
    expect(seq.total).toBe(1);
    expect(seq.prev).toBeNull();
    expect(seq.next).toBeNull();
  });

  it("auto-advances only under Standard and Cinematic, never with reduced motion", () => {
    expect(autoAdvanceAllowed("standard", false)).toBe(true);
    expect(autoAdvanceAllowed("cinematic", false)).toBe(true);
    expect(autoAdvanceAllowed("calm", false)).toBe(false);
    expect(autoAdvanceAllowed("off", false)).toBe(false);
    expect(autoAdvanceAllowed("standard", true)).toBe(false);
  });

  it("says where you are", () => {
    expect(positionLabel(storySequence(s("b"), [s("a"), s("b"), s("c")]), "Tunde")).toBe("Story 2 of 3, from Tunde");
  });

  it("splits the stage into thirds", () => {
    expect(tapZone(10, 390)).toBe("prev");
    expect(tapZone(200, 390)).toBe("middle");
    expect(tapZone(380, 390)).toBe("next");
    expect(tapZone(10, 0)).toBe("middle");
  });
});
