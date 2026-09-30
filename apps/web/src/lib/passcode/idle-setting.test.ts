import { describe, expect, it } from "vitest";
import { IDLE_LOCK_MS, UNLOCK_IDLE_SECONDS } from "./rules";
import { LONG_IDLE_LOCK_MS, idleLimitMs } from "./idle-setting";

describe("the longer idle lock (C14)", () => {
  it("is five minutes unless the device has a key AND the setting is on", () => {
    expect(idleLimitMs(false, false)).toBe(IDLE_LOCK_MS);
    expect(idleLimitMs(false, true)).toBe(IDLE_LOCK_MS);
    expect(idleLimitMs(true, false)).toBe(IDLE_LOCK_MS);
    expect(idleLimitMs(true, true)).toBe(15 * 60 * 1000);
  });
  it("never outlives the server's sliding unlock", () => {
    expect(LONG_IDLE_LOCK_MS).toBeLessThanOrEqual(UNLOCK_IDLE_SECONDS * 1000);
  });
});
