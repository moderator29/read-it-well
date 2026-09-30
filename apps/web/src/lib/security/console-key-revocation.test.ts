import { describe, expect, it } from "vitest";
import { revocationsNotInstalled, usableForConsole } from "./console-key-revocation";

describe("which keys may open the console (C14)", () => {
  it("drops the keys revoked for the console and keeps the rest in order", () => {
    expect(usableForConsole(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });

  it("treats a person whose every key was revoked as holding none, so they are offered enrolment", () => {
    expect(usableForConsole(["lost-phone"], ["lost-phone"])).toEqual([]);
  });

  it("reads a missing revocations table as nothing revoked", () => {
    expect(revocationsNotInstalled({ code: "PGRST205" })).toBe(true);
    expect(revocationsNotInstalled({ code: "42P01" })).toBe(true);
    expect(revocationsNotInstalled({ code: "42501" })).toBe(false);
    expect(revocationsNotInstalled(null)).toBe(false);
  });
});
