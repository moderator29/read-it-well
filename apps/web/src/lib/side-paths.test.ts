import { describe, expect, it } from "vitest";
import { sideOfPath, sideOfPlansQuery } from "./side.constants";

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

describe("sideOfPlansQuery (V-76 review)", () => {
  const q = (s: string) => new URLSearchParams(s);
  it("lets the address say which half of Plans it shows", () => {
    expect(sideOfPlansQuery("/bookings", q("side=stays"))).toBe("stays");
    expect(sideOfPlansQuery("/bookings", q("kind=inspection"))).toBe("property");
    expect(sideOfPlansQuery("/bookings", q("side=property"))).toBe("property");
  });
  it("leaves the cookie in charge otherwise, and elsewhere", () => {
    expect(sideOfPlansQuery("/bookings", q(""))).toBeNull();
    expect(sideOfPlansQuery("/bookings", q("side=all"))).toBeNull();
    expect(sideOfPlansQuery("/messages", q("side=stays"))).toBeNull();
  });
});
