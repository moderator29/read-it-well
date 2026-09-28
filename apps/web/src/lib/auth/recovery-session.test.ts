import { describe, expect, it } from "vitest";
import { isFreshEmailProof, RECOVERY_WINDOW_SECONDS } from "./recovery-session";

const NOW = 1_800_000_000;

describe("isFreshEmailProof", () => {
  it("accepts a recovery link or an emailed code made within the window", () => {
    expect(isFreshEmailProof([{ method: "recovery", timestamp: NOW - 60 }], NOW)).toBe(true);
    expect(isFreshEmailProof([{ method: "otp", timestamp: NOW - 10 }], NOW)).toBe(true);
  });

  it("refuses a password or social session, however new", () => {
    expect(isFreshEmailProof([{ method: "password", timestamp: NOW }], NOW)).toBe(false);
    expect(isFreshEmailProof([{ method: "oauth", timestamp: NOW }], NOW)).toBe(false);
  });

  it("refuses a recovery older than the window", () => {
    expect(isFreshEmailProof([{ method: "recovery", timestamp: NOW - RECOVERY_WINDOW_SECONDS - 1 }], NOW)).toBe(false);
  });

  it("refuses anything malformed", () => {
    expect(isFreshEmailProof(undefined, NOW)).toBe(false);
    expect(isFreshEmailProof([{ method: "recovery" }], NOW)).toBe(false);
    expect(isFreshEmailProof("recovery", NOW)).toBe(false);
  });
});
