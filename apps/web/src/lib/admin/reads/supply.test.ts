import { describe, expect, it } from "vitest";
import { buildSupply, type SupplyInputs } from "./supply";

const NOW = Date.parse("2026-09-22T12:00:00Z");
const agent = (id: string, over: Partial<SupplyInputs["agents"][number]> = {}) => ({
  id,
  user_id: `u-${id}`,
  display_name: `Agent ${id}`,
  type: "individual" as const,
  agent_badges: { verified: true },
  is_demo: false,
  created_at: "2026-09-01T10:00:00Z",
  application_id: null,
  ...over,
});
const business = (id: string, kind: string, over: Partial<SupplyInputs["businesses"][number]> = {}) => ({
  id,
  owner_id: `o-${id}`,
  agent_id: null,
  kind,
  name: `Business ${id}`,
  verified: false,
  is_demo: false,
  created_at: "2026-08-01T10:00:00Z",
  ...over,
});
const listing = (id: string, agentId: string, over: Partial<SupplyInputs["listings"][number]> = {}) => ({
  id,
  agent_id: agentId,
  property_type: "apartment",
  status: "PUBLISHED",
  area: "Lekki",
  city: "Lagos",
  is_demo: false,
  ...over,
});

function inputs(over: Partial<SupplyInputs> = {}): SupplyInputs {
  return {
    agents: [
      agent("a1", { application_id: "app1" }),
      agent("a2", { type: "business", created_at: "2026-09-20T10:00:00Z" }),
      agent("demo", { is_demo: true }),
    ],
    supplyRoleByApplication: new Map([["app1", "agent"]]),
    businesses: [business("b1", "agency", { agent_id: "a2" }), business("b2", "hotel")],
    listings: [listing("l1", "a1"), listing("l2", "a2", { property_type: "home", area: "Ikoyi" }), listing("l3", "a1", { status: "DRAFT" }), listing("l4", "demo", { is_demo: true })],
    stays: [{ business_id: "b2", status: "PUBLISHED", area: null, city: "Abuja", is_demo: false }],
    releasedTo: new Map([["u-a1", 500_000]]),
    bookedOn: new Map([["l1", 200_000]]),
    ...over,
  };
}

describe("buildSupply", () => {
  const desk = buildSupply(inputs(), { examples: false, page: 1, pageSize: 10 }, NOW);

  it("classifies by the application's declared role, then by agent type, then by business kind", () => {
    const role = Object.fromEntries(desk.rows.map((r) => [r.id, r.role]));
    expect(role).toEqual({ a1: "agent", a2: "agent", b1: "firm", b2: "host" });
  });
  it("leaves examples out and says how many", () => {
    expect(desk.rows.find((r) => r.id === "demo")).toBeUndefined();
    expect(desk.examplesExcluded).toBe(1);
    const withExamples = buildSupply(inputs(), { examples: true, page: 1, pageSize: 10 }, NOW);
    expect(withExamples.rows.find((r) => r.id === "demo")?.role).toBe("owner");
    expect(withExamples.examplesExcluded).toBe(0);
  });
  it("counts live listings only, a firm's through its agent and a host's stays", () => {
    const listings = Object.fromEntries(desk.rows.map((r) => [r.id, r.listings]));
    expect(listings).toEqual({ a1: 1, a2: 1, b1: 1, b2: 1 });
  });
  it("sums released escrow and booked value into total transacted", () => {
    expect(desk.rows.find((r) => r.id === "a1")?.transactedMinor).toBe(700_000);
  });
  it("counts a week ago from join dates", () => {
    expect(desk.counts.agent).toEqual({ now: 2, weekAgo: 1 });
    expect(desk.counts.owner).toEqual({ now: 0, weekAgo: 0 });
  });
  it("ranks areas across listings and stays and splits live listings by type", () => {
    expect(desk.topAreas).toEqual([
      { area: "Abuja", count: 1 },
      { area: "Ikoyi", count: 1 },
      { area: "Lekki", count: 1 },
    ]);
    expect(desk.byPropertyType).toEqual([
      { type: "apartment", count: 1 },
      { type: "home", count: 1 },
    ]);
  });
  it("draws six cumulative months and no months when there is nobody", () => {
    expect(desk.growth.map((g) => g.month)).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]);
    expect(desk.growth.at(-1)?.counts).toEqual({ owner: 0, agent: 2, firm: 1, host: 1 });
    expect(desk.growth[4]?.counts).toEqual({ owner: 0, agent: 0, firm: 1, host: 1 });
    const none = buildSupply(inputs({ agents: [], businesses: [] }), { examples: false, page: 1, pageSize: 10 }, NOW);
    expect(none.growth).toEqual([]);
  });
  it("filters by role and pages", () => {
    const firms = buildSupply(inputs(), { role: "firm", examples: false, page: 5, pageSize: 1 }, NOW);
    expect(firms.total).toBe(1);
    expect(firms.page).toBe(1);
    expect(firms.rows.map((r) => r.id)).toEqual(["b1"]);
  });
});
