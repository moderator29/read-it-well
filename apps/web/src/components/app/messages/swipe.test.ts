import { describe, expect, it } from "vitest";
import { SWIPE_MAX, SWIPE_REPLY_AT, lockAxis, swipeCommits, swipeSign, swipeTravel } from "./swipe";

describe("swipe to reply", () => {
  it("swipes a received bubble right and a sent one left", () => {
    expect(swipeSign("theirs")).toBe(1);
    expect(swipeSign("mine")).toBe(-1);
  });

  it("decides nothing inside the slop, then lets the larger axis win", () => {
    expect(lockAxis(5, -6)).toBeNull();
    expect(lockAxis(12, 3)).toBe("x");
    expect(lockAxis(-12, 3)).toBe("x");
    expect(lockAxis(4, 14)).toBe("y");
  });

  it("follows the finger to the threshold, slows past it and stops at the cap", () => {
    expect(swipeTravel(30, "theirs")).toBe(30);
    expect(swipeTravel(SWIPE_REPLY_AT, "theirs")).toBe(SWIPE_REPLY_AT);
    expect(swipeTravel(SWIPE_REPLY_AT + 30, "theirs")).toBe(SWIPE_REPLY_AT + 10);
    expect(swipeTravel(400, "theirs")).toBe(SWIPE_MAX);
    expect(swipeTravel(-400, "mine")).toBe(-SWIPE_MAX);
  });

  it("draws nothing for travel the wrong way", () => {
    expect(swipeTravel(-40, "theirs")).toBe(0);
    expect(swipeTravel(40, "mine")).toBe(0);
  });

  it("sets the reply only at about 56px in the bubble's own direction", () => {
    expect(swipeCommits(55, "theirs")).toBe(false);
    expect(swipeCommits(56, "theirs")).toBe(true);
    expect(swipeCommits(-56, "theirs")).toBe(false);
    expect(swipeCommits(-56, "mine")).toBe(true);
    expect(swipeCommits(56, "mine")).toBe(false);
  });
});
