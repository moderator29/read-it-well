import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isRequestThread, type RequestFacts } from "./request-rule";

const stranger: RequestFacts = {
  spokenIn: false,
  openedByReader: false,
  readerFollows: false,
  direct: false,
  openToAnyone: false,
};

describe("who lands in Requests", () => {
  it("holds a message from somebody the reader does not follow", () => {
    expect(isRequestThread(stranger)).toBe(true);
    expect(isRequestThread({ ...stranger, direct: true })).toBe(true);
  });

  it("lets a message from somebody the reader follows straight through", () => {
    expect(isRequestThread({ ...stranger, readerFollows: true })).toBe(false);
    expect(isRequestThread({ ...stranger, readerFollows: true, direct: true })).toBe(false);
  });

  it("takes a thread out once the reader has written in it, or when the reader opened it", () => {
    expect(isRequestThread({ ...stranger, spokenIn: true })).toBe(false);
    expect(isRequestThread({ ...stranger, openedByReader: true })).toBe(false);
  });

  it("keeps the Anyone can message me promise for a chat between two members only", () => {
    expect(isRequestThread({ ...stranger, direct: true, openToAnyone: true })).toBe(false);
    expect(isRequestThread({ ...stranger, direct: false, openToAnyone: true })).toBe(true);
  });

  it("is the rule the inbox read uses, fed by the follows table for the reader", () => {
    const live = readFileSync(join(__dirname, "live.ts"), "utf8");
    expect(live).toContain("readViewerFollowing(");
    expect(live).toContain("isRequestThread({");
    expect(live).toContain("readerFollows: viewerFollows");
  });
});
