import { describe, expect, it } from "vitest";
import { clipPath, elapsedText, isShowMeItem, readShowMeResult, showMeState } from "./show-me";

const copy = { minutes: "{n} minutes", hours: "{n} hours", days: "{n} days" };

describe("Show me (V-69)", () => {
  it("knows the items and the database's words", () => {
    expect(isShowMeItem("meter")).toBe(true);
    expect(isShowMeItem("pool")).toBe(false);
    expect(readShowMeResult("too-long")).toBe("too-long");
    expect(readShowMeResult("nope")).toBe("failed");
  });

  it("says whether a request waits, is answered or ran out", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    expect(showMeState({ status: "open", expiresAt: "2026-09-25T12:00:00Z" }, now)).toBe("open");
    expect(showMeState({ status: "open", expiresAt: "2026-09-24T11:00:00Z" }, now)).toBe("expired");
    expect(showMeState({ status: "answered", expiresAt: "2026-09-24T11:00:00Z" }, now)).toBe("answered");
  });

  it("says how long after the ask a clip came, never a claim about where it was filmed", () => {
    expect(elapsedText("2026-09-24T10:00:00Z", "2026-09-24T10:25:00Z", copy)).toBe("25 minutes");
    expect(elapsedText("2026-09-24T10:00:00Z", "2026-09-24T13:10:00Z", copy)).toBe("3 hours");
    expect(elapsedText("2026-09-22T10:00:00Z", "2026-09-24T10:00:00Z", copy)).toBe("2 days");
  });

  it("keeps a clip inside its request's folder", () => {
    expect(clipPath("r1", "f1", "IMG_1.MOV")).toBe("r1/f1.mov");
    expect(clipPath("r1", "f1", "clip")).toBe("r1/f1.mp4");
  });
});
