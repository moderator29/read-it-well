import { describe, expect, it } from "vitest";
import { LITE_COOKIE, liteCookieOn } from "./lite-cookie";

describe("the data saver cookie (V-79)", () => {
  it("is on only for exactly vallo_lite=1", () => {
    expect(LITE_COOKIE).toBe("vallo_lite");
    expect(liteCookieOn("a=b; vallo_lite=1; c=d")).toBe(true);
    expect(liteCookieOn("vallo_lite=1")).toBe(true);
  });
  it("is off when absent, cleared, or merely similar", () => {
    expect(liteCookieOn(null)).toBe(false);
    expect(liteCookieOn("vallo_lite=")).toBe(false);
    expect(liteCookieOn("vallo_lite=0")).toBe(false);
    expect(liteCookieOn("not_vallo_lite=1")).toBe(false);
  });
});
