import { describe, expect, it } from "vitest";
import { rostersFromRows } from "./supply";

const m = (id: string, firm: string, agent: string, status: string, role = "staff", at = "2026-09-20T10:00:00Z") => ({
  id,
  firm_id: firm,
  agent_id: agent,
  member_role: role,
  status,
  admitted_at: at,
  revoked_at: status === "revoked" ? "2026-09-22T10:00:00Z" : null,
  revoke_note: null,
});

describe("firm rosters", () => {
  const firms = new Map([
    ["f1", { name: "Sunshine Realty", isDemo: false }],
    ["f2", { name: "Example Homes", isDemo: true }],
  ]);
  const agents = new Map([["a1", "Tunde"], ["a2", "Bola"]]);

  it("counts every member by state and groups them under their firm, pending first", () => {
    const r = rostersFromRows(
      [m("1", "f1", "a1", "active", "principal"), m("2", "f1", "a2", "pending"), m("3", "f1", "a3", "revoked"), m("4", "f2", "a1", "active")],
      firms,
      agents,
      false,
      true,
    );
    expect(r.byStatus).toEqual({ pending: 1, active: 1, revoked: 1 });
    expect(r.total).toBe(3);
    expect(r.examplesExcluded).toBe(1);
    expect(r.firms).toHaveLength(1);
    expect(r.firms[0]!.firmName).toBe("Sunshine Realty");
    expect(r.firms[0]!.members.map((x) => x.status)).toEqual(["pending", "active", "revoked"]);
    expect(r.firms[0]!.members[2]!.agentName).toBeNull();
  });

  it("counts example firms only when asked", () => {
    const r = rostersFromRows([m("4", "f2", "a1", "active")], firms, agents, true, true);
    expect(r.total).toBe(1);
    expect(r.examplesExcluded).toBe(0);
  });

  it("draws zero, not a failure, with no members", () => {
    const r = rostersFromRows([], firms, agents, false, true);
    expect(r).toMatchObject({ total: 0, byStatus: { pending: 0, active: 0, revoked: 0 }, firms: [] });
  });
});
