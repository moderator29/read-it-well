import { describe, expect, it } from "vitest";
import { firstTouchCookie, readFirstTouch } from "./first-touch";

const NOW = Date.parse("2026-09-24T12:00:00Z");

describe("first-touch attribution", () => {
  it("reads a door token and a time, and nothing else", () => {
    expect(readFirstTouch(`k7m2qp9xza.${NOW - 1000}`, NOW)).toEqual({ token: "k7m2qp9xza", at: NOW - 1000 });
    expect(readFirstTouch("not-a-token.123", NOW)).toBeNull();
    expect(readFirstTouch(undefined, NOW)).toBeNull();
  });

  it("forgets a touch older than fourteen days, and refuses one from the future", () => {
    expect(readFirstTouch(`k7m2qp9xza.${NOW - 15 * 86_400_000}`, NOW)).toBeNull();
    expect(readFirstTouch(`k7m2qp9xza.${NOW + 3_600_000}`, NOW)).toBeNull();
  });

  it("writes a fourteen day, same-site cookie", () => {
    const cookie = firstTouchCookie("k7m2qp9xza", NOW, true);
    expect(cookie).toContain("vallo_via=k7m2qp9xza.");
    expect(cookie).toContain("Max-Age=1209600");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
  });
});
