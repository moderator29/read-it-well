import { describe, expect, it } from "vitest";
import { sideOfPath } from "./side.constants";

describe("sideOfPath", () => {
  it("leaves Plans to the cookie, so a Stays member tapping Plans stays on Stays (V-76 review)", () => {
    expect(sideOfPath("/bookings")).toBeNull();
    expect(sideOfPath("/bookings/abc")).toBeNull();
  });
  it("still forces the side-owned roots", () => {
    expect(sideOfPath("/search")).toBe("property");
    expect(sideOfPath("/inspections/gate/1")).toBe("property");
    expect(sideOfPath("/stays/search")).toBe("stays");
  });
});
