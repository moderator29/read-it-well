import { describe, expect, it } from "vitest";
import {
  GRAPH,
  PAYOUT_STATUSES,
  REFERRAL_STATUSES,
  QUALIFIED_STATUSES,
  PENDING_STATUSES,
  REVERSED_STATUSES,
  asPayoutStatus,
  asReferralStatus,
  bucketCounts,
  budgetMonths,
  emptyStatusCounts,
  intervalParts,
  isStuck,
  layoutReferralGraph,
  memberLabel,
  readReferralQuery,
  readSignal,
  reasonList,
  referralsHref,
  requirementWords,
  riskReasonWords,
  type GraphEdge,
} from "./referrals-model";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const edge = (from: number, to: number, over: Partial<GraphEdge> = {}): GraphEdge => ({
  referrerId: id(from),
  referredId: id(to),
  status: "pending",
  riskScore: 0,
  riskReasons: [],
  depth: 1,
  ...over,
});

describe("the desk's address", () => {
  it("defaults to the review queue and drops anything malformed", () => {
    expect(readReferralQuery({})).toEqual({ tab: "review", member: null });
    expect(readReferralQuery({ tab: "fraud", member: id(1) })).toEqual({ tab: "fraud", member: id(1) });
    expect(readReferralQuery({ tab: "payouts" })).toEqual({ tab: "payouts", member: null });
    expect(readReferralQuery({ tab: "drop table", member: "1 or 1=1" })).toEqual({ tab: "review", member: null });
    expect(readReferralQuery({ tab: ["fraud", "payouts"], member: [id(2)] })).toEqual({ tab: "fraud", member: id(2) });
  });

  it("writes the address back, leaving out the defaults", () => {
    const query = readReferralQuery({ tab: "fraud", member: id(3) });
    expect(referralsHref(query)).toBe(`/admin/referrals?tab=fraud&member=${id(3)}`);
    expect(referralsHref(query, { member: null })).toBe("/admin/referrals?tab=fraud");
    expect(referralsHref(query, { tab: "review", member: null })).toBe("/admin/referrals");
  });
});

describe("the three buckets on the top row", () => {
  it("covers every status once, so nothing is counted twice or dropped", () => {
    const all = [...QUALIFIED_STATUSES, ...PENDING_STATUSES, ...REVERSED_STATUSES];
    expect([...all].sort()).toEqual([...REFERRAL_STATUSES].sort());
    expect(new Set(all).size).toBe(all.length);
  });

  it("counts earned, not yet earned, and taken back", () => {
    const counts = { ...emptyStatusCounts(), attributed: 14, qualified: 3, pending: 22, under_review: 3, approved: 6, available: 41, paid: 87, sent: 2, withdrawal_requested: 1, rejected: 4, reversed: 9 };
    expect(bucketCounts(counts)).toEqual({ qualified: 137, pending: 42, reversed: 13, total: 192 });
  });

  it("is zero for an empty programme", () => {
    expect(bucketCounts(emptyStatusCounts())).toEqual({ qualified: 0, pending: 0, reversed: 0, total: 0 });
  });

  it("reads an unknown status as unknown, not as a guess", () => {
    expect(asReferralStatus("under_review")).toBe("under_review");
    expect(asReferralStatus("processing")).toBeNull();
    expect(asPayoutStatus("sent")).toBe("sent");
    expect(asPayoutStatus("whatever")).toBeNull();
    expect(PAYOUT_STATUSES).toContain("under_review");
  });
});

describe("a payout that is stuck", () => {
  const now = Date.parse("2026-10-13T12:00:00Z");
  it("is one in flight for more than a day", () => {
    expect(isStuck("sent", "2026-10-12T11:00:00Z", now)).toBe(true);
    expect(isStuck("unknown", "2026-10-12T13:00:00Z", now)).toBe(false);
    expect(isStuck("processing", "2026-10-10T00:00:00Z", now)).toBe(true);
  });
  it("is never one that has settled or is waiting on a person", () => {
    expect(isStuck("paid", "2026-09-01T00:00:00Z", now)).toBe(false);
    expect(isStuck("failed", "2026-09-01T00:00:00Z", now)).toBe(false);
    expect(isStuck("under_review", "2026-09-01T00:00:00Z", now)).toBe(false);
    expect(isStuck(null, "2026-09-01T00:00:00Z", now)).toBe(false);
  });
});

describe("words", () => {
  it("says a reason code in a sentence, and an unknown one in its own words", () => {
    const words = { circular_referral: "The invitations loop back" };
    expect(riskReasonWords("circular_referral", words)).toBe("The invitations loop back");
    expect(riskReasonWords("brand_new_signal", words)).toBe("Brand new signal");
    expect(requirementWords("phone_verified", { phone_verified: "They confirm their phone number" })).toBe("They confirm their phone number");
    expect(requirementWords("space_published", {})).toBe("Space published");
  });

  it("keeps only short strings from a reasons array", () => {
    expect(reasonList(["velocity", "", 4, null, "x".repeat(80), "shared_network"])).toEqual(["velocity", "shared_network"]);
    expect(reasonList("velocity")).toEqual([]);
    expect(reasonList(null)).toEqual([]);
  });

  it("names a person by display name, or by the start of their id", () => {
    expect(memberLabel(id(1), " Ngozi Eze ", "Member {id}")).toBe("Ngozi Eze");
    expect(memberLabel(id(1), null, "Member {id}")).toBe("Member 0000");
    expect(memberLabel("abcd1234-0000", "", "Member {id}")).toBe("Member abcd");
  });
});

describe("the review period", () => {
  it("reads a Postgres interval in days and hours", () => {
    expect(intervalParts("7 days")).toEqual({ days: 7, hours: 0 });
    expect(intervalParts("1 day")).toEqual({ days: 1, hours: 0 });
    expect(intervalParts("168:00:00")).toEqual({ days: 7, hours: 0 });
    expect(intervalParts("2 days 06:00:00")).toEqual({ days: 2, hours: 6 });
    expect(intervalParts("12:00:00")).toEqual({ days: 0, hours: 12 });
  });
  it("prints nothing for what it cannot read", () => {
    expect(intervalParts("")).toBeNull();
    expect(intervalParts("a week")).toBeNull();
    expect(intervalParts(null)).toBeNull();
    expect(intervalParts(7)).toBeNull();
  });
});

describe("a shared signal", () => {
  it("masks a network address and a device fingerprint", () => {
    expect(readSignal("network:102.89.23.14")).toEqual({ kind: "network", token: "102.89.x.x" });
    expect(readSignal("network:2a02:c7c:1234:5678::1")).toEqual({ kind: "network", token: "2a02:c7c::x" });
    expect(readSignal("device:ab12cd34ef56")).toEqual({ kind: "device", token: "ab12" });
    expect(readSignal("something else")).toEqual({ kind: "other", token: "" });
  });
  it("never lets the whole address through", () => {
    expect(JSON.stringify(readSignal("network:102.89.23.14"))).not.toContain("23.14");
    expect(JSON.stringify(readSignal("device:ab12cd34ef56"))).not.toContain("cd34");
  });
});

describe("the months a budget can be set for", () => {
  it("is this Lagos month and the next", () => {
    expect(budgetMonths(Date.parse("2026-10-13T11:00:00Z"))).toEqual({ current: "2026-10-01", next: "2026-11-01" });
  });
  it("rolls over at midnight in Lagos, not in UTC", () => {
    /* 23:30 UTC on 31 October is 00:30 on 1 November in Lagos. */
    expect(budgetMonths(Date.parse("2026-10-31T23:30:00Z"))).toEqual({ current: "2026-11-01", next: "2026-12-01" });
  });
  it("turns the year", () => {
    expect(budgetMonths(Date.parse("2026-12-15T10:00:00Z"))).toEqual({ current: "2026-12-01", next: "2027-01-01" });
  });
});

describe("the invitation graph layout", () => {
  it("is empty for no invitations", () => {
    const layout = layoutReferralGraph([], null);
    expect(layout).toMatchObject({ nodes: [], links: [], total: 0, drawn: 0, truncated: false, hasLoop: false });
  });

  it("puts an inviter left of the people they brought in, and centres them on their branch", () => {
    const layout = layoutReferralGraph([edge(1, 2), edge(1, 3), edge(2, 4)], id(1));
    const at = new Map(layout.nodes.map((n) => [n.id, n]));
    expect(at.get(id(1))!.col).toBe(0);
    expect(at.get(id(2))!.col).toBe(1);
    expect(at.get(id(3))!.col).toBe(1);
    expect(at.get(id(4))!.col).toBe(2);
    expect(at.get(id(1))!.x).toBeLessThan(at.get(id(2))!.x);
    /* Three leaves (4 under 2, and 3) take rows 0 and 1; person 1 sits between their children. */
    const rows = [id(2), id(3)].map((n) => at.get(n)!.y);
    expect(at.get(id(1))!.y).toBeCloseTo((Math.min(...rows) + Math.max(...rows)) / 2, 5);
    expect(layout.links).toHaveLength(3);
    expect(layout.links.every((l) => l.kind === "tree")).toBe(true);
    expect(layout.hasLoop).toBe(false);
    expect(layout.truncated).toBe(false);
  });

  it("marks the member in focus, and each invited person's risk and state", () => {
    const layout = layoutReferralGraph([edge(1, 2, { riskScore: 65, status: "under_review" })], id(2));
    const focus = layout.nodes.filter((n) => n.focus);
    expect(focus.map((n) => n.id)).toEqual([id(2)]);
    expect(layout.nodes.find((n) => n.id === id(2))).toMatchObject({ risk: 65, status: "under_review" });
    expect(layout.nodes.find((n) => n.id === id(1))).toMatchObject({ risk: null, status: null });
  });

  it("draws a loop as a back link and says so", () => {
    /* 1 invited 2, 2 invited 3, and 3 invited 1: nobody started the chain. */
    const layout = layoutReferralGraph([edge(1, 2), edge(2, 3), edge(3, 1)], id(1));
    expect(layout.hasLoop).toBe(true);
    expect(layout.links.filter((l) => l.kind === "back")).toHaveLength(1);
    expect(layout.nodes).toHaveLength(3);
    for (const n of layout.nodes) {
      expect(Number.isFinite(n.x) && Number.isFinite(n.y)).toBe(true);
    }
  });

  it("gives every person one place, with no two boxes on top of each other", () => {
    const edges = [edge(1, 2), edge(1, 3), edge(1, 4), edge(2, 5), edge(2, 6), edge(3, 7)];
    const layout = layoutReferralGraph(edges, id(1));
    const spots = layout.nodes.map((n) => `${n.col}:${n.y}`);
    expect(new Set(spots).size).toBe(spots.length);
    expect(layout.nodes).toHaveLength(7);
  });

  it("keeps the picture inside its own width and height", () => {
    const layout = layoutReferralGraph([edge(1, 2), edge(2, 3), edge(3, 4)], id(1));
    for (const n of layout.nodes) {
      expect(n.x + GRAPH.nodeW).toBeLessThanOrEqual(layout.width);
      expect(n.y + GRAPH.nodeH).toBeLessThanOrEqual(layout.height);
    }
  });

  it("draws at most the cap and says how many were left out, starting from the member in focus", () => {
    const chain = Array.from({ length: 120 }, (_, i) => edge(i + 1, i + 2));
    const layout = layoutReferralGraph(chain, id(60));
    expect(layout.total).toBe(121);
    expect(layout.drawn).toBe(GRAPH.maxNodes);
    expect(layout.truncated).toBe(true);
    expect(layout.nodes.some((n) => n.id === id(60))).toBe(true);
    /* Only links between drawn people are drawn. */
    const drawn = new Set(layout.nodes.map((n) => n.id));
    expect(layout.links.every((l) => drawn.has(l.from) && drawn.has(l.to))).toBe(true);
  });

  it("is the same picture every time it is asked", () => {
    const edges = [edge(1, 2), edge(1, 3), edge(3, 4)];
    expect(layoutReferralGraph(edges, id(1))).toEqual(layoutReferralGraph(edges, id(1)));
  });
});
