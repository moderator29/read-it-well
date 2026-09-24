import { describe, expect, it } from "vitest";
import { routeTemplate, sanitiseVitals } from "./vitals";

describe("routeTemplate (V-80)", () => {
  it("keeps a route and drops ids, queries and fragments", () => {
    expect(routeTemplate("/listing/3653d202-e498-4db0-ab71-882649f7f446?x=1#top")).toBe("/listing/[id]");
    expect(routeTemplate("/bookings/1234")).toBe("/bookings/[id]");
    expect(routeTemplate("/search")).toBe("/search");
    expect(routeTemplate("/")).toBe("/");
  });
  it("turns a slug carrying digits into an id, never a person's words", () => {
    expect(routeTemplate("/u/ada-okafor-2291")).toBe("/u/[id]");
  });
});

describe("sanitiseVitals", () => {
  it("reads good metrics into rows", () => {
    const rows = sanitiseVitals({
      path: "/search",
      effectiveType: "3g",
      saveData: true,
      transferKb: 812.4,
      metrics: { LCP: 4200, CLS: 0.03, INP: 180 },
    });
    expect(rows?.map((r) => r.metric).sort()).toEqual(["CLS", "INP", "LCP"]);
    expect(rows?.[0]).toMatchObject({ route: "/search", effective_type: "3g", save_data: true, transfer_kb: 812 });
  });
  it("drops what it cannot trust", () => {
    expect(sanitiseVitals({ path: "https://evil.example", metrics: { LCP: 1 } })).toBeNull();
    expect(sanitiseVitals({ path: "/x", metrics: { LCP: -1, CLS: Number.NaN, TTFB: 9e9 } })).toBeNull();
    expect(sanitiseVitals({ path: "/x", effectiveType: "5g", metrics: { LCP: 10 } })?.[0]?.effective_type).toBeNull();
    expect(sanitiseVitals(null)).toBeNull();
  });
});
