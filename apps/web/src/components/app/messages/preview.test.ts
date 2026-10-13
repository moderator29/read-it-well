import { describe, expect, it } from "vitest";
import { PREVIEW_MAX, previewLine } from "./preview";
import { shareBody } from "./share";

describe("the inbox preview line", () => {
  it("keeps a short message as it is", () => {
    expect(previewLine("Is the flat still available?")).toBe("Is the flat still available?");
  });

  it("folds line breaks and runs of spaces into one line", () => {
    expect(previewLine("Hello\n\nIs it   still\tavailable?")).toBe("Hello Is it still available?");
  });

  it("cuts a long message at a word, with an ellipsis, inside the limit", () => {
    const long = "Good afternoon. I saw the listing and I would like to know whether the duplex is still on the market and when I could see it.";
    const line = previewLine(long);
    expect(line.endsWith("…")).toBe(true);
    expect(line.length).toBeLessThanOrEqual(PREVIEW_MAX + 1);
    expect(long.startsWith(line.slice(0, -1))).toBe(true);
    expect(line.slice(0, -1).endsWith(" ")).toBe(false);
  });

  it("cuts one unbroken run where there is no word to stop at", () => {
    const line = previewLine("x".repeat(200));
    expect(line).toBe(`${"x".repeat(PREVIEW_MAX)}…`);
  });

  it("says what a shared card is, never its path", () => {
    expect(previewLine(shareBody({ kind: "listing", id: "00000000-0000-4000-8000-00000000a001" }))).not.toContain("/listing/");
  });
});
