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
  it("lets a deep link say where it came from", () => {
    expect(sideOfPlansQuery("/bookings", q("side=stays&from=stays"))).toBe("stays");
    expect(sideOfPlansQuery("/bookings", q("kind=inspection&from=property"))).toBe("property");
  });
  it("never lets the page's own filter move the shell", () => {
    expect(sideOfPlansQuery("/bookings", q("side=stays"))).toBeNull();
    expect(sideOfPlansQuery("/bookings", q("side=property"))).toBeNull();
    expect(sideOfPlansQuery("/bookings", q("kind=inspection"))).toBeNull();
    expect(sideOfPlansQuery("/bookings", q(""))).toBeNull();
    expect(sideOfPlansQuery("/messages", q("from=stays"))).toBeNull();
  });
});
