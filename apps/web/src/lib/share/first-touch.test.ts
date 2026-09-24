import { describe, expect, it } from "vitest";
import { FIRST_TOUCH_MAX, firstTouchCookie, firstTouchFor, readFirstTouches, withFirstTouch } from "./first-touch";

const NOW = Date.parse("2026-09-24T12:00:00Z");
const A = "3f0e1c1a-0000-4000-8000-000000000001";
const B = "3f0e1c1a-0000-4000-8000-000000000002";

function id(n: number): string {
  return `3f0e1c1a-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

describe("first-touch attribution, per listing", () => {
  it("keeps a first touch for each listing, and never replaces one", () => {
    const one = withFirstTouch(null, A, "k7m2qp9xza", NOW - 1000);
    const two = withFirstTouch(one, B, "m3n4p5q6r7", NOW);
    expect(firstTouchFor(two, A, NOW)).toEqual({ token: "k7m2qp9xza", at: NOW - 1000 });
    expect(firstTouchFor(two, B, NOW)).toEqual({ token: "m3n4p5q6r7", at: NOW });
    /* A second door for listing A changes nothing: first touch wins. */
    expect(withFirstTouch(two, A, "z9y8x7w6v5", NOW)).toBeNull();
  });

  it("forgets a touch older than fourteen days, refuses one from the future, and drops rubbish", () => {
    const old = `${A}~k7m2qp9xza~${NOW - 15 * 86_400_000}|${B}~m3n4p5q6r7~${NOW + 3_600_000}|junk`;
    expect(readFirstTouches(old, NOW).size).toBe(0);
  });

  it("caps the map, dropping the oldest", () => {
    let value: string | null = null;
    for (let i = 1; i <= FIRST_TOUCH_MAX + 5; i++) value = withFirstTouch(value, id(i), "k7m2qp9xza", NOW - (100 - i) * 1000) ?? value;
    const touches = readFirstTouches(value, NOW);
    expect(touches.size).toBe(FIRST_TOUCH_MAX);
    expect(touches.has(id(1))).toBe(false);
    expect(touches.has(id(FIRST_TOUCH_MAX + 5))).toBe(true);
  });

  it("writes a fourteen day, same-site cookie", () => {
    const cookie = firstTouchCookie(withFirstTouch(null, A, "k7m2qp9xza", NOW)!, true);
    expect(cookie).toContain("vallo_via=");
    expect(cookie).toContain("Max-Age=1209600");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
  });
});
