import { beforeEach, describe, expect, it, vi } from "vitest";
import { SELF_REVIEW_REFUSAL, decisionRefusal, decisionsOffered, isOwnBusiness } from "./business-decision";

/**
 * The host desk's review decisions: nobody decides their own business, and a
 * decision is only taken from a state it makes sense in.
 */

describe("isOwnBusiness", () => {
  it("is the owner and nobody else, and never an ownerless row", () => {
    expect(isOwnBusiness("u1", "u1")).toBe(true);
    expect(isOwnBusiness("u2", "u1")).toBe(false);
    expect(isOwnBusiness(null, "u1")).toBe(false);
    expect(isOwnBusiness("", "")).toBe(false);
  });
});

describe("decisionRefusal", () => {
  it("lets a sent application be approved, sent back or refused", () => {
    for (const status of ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED"] as const) {
      for (const decision of ["approve", "more_info", "reject"] as const) {
        expect(decisionRefusal(status, decision)).toBeNull();
      }
    }
  });

  it("refuses a draft, and any decision on a suspended business", () => {
    expect(decisionRefusal("DRAFT", "approve")).toContain("draft");
    for (const decision of ["approve", "more_info", "reject"] as const) {
      expect(decisionRefusal("SUSPENDED", decision)).toContain("suspended");
    }
  });

  it("does not approve an approved business twice, but can still send it back or refuse it", () => {
    expect(decisionRefusal("APPROVED", "approve")).toContain("already approved");
    expect(decisionRefusal("APPROVED", "more_info")).toBeNull();
    expect(decisionRefusal("APPROVED", "reject")).toBeNull();
  });

  it("only ever refuses a live business from here", () => {
    expect(decisionRefusal("PUBLISHED", "approve")).toContain("already live");
    expect(decisionRefusal("PUBLISHED", "more_info")).toContain("already live");
    expect(decisionRefusal("PUBLISHED", "reject")).toBeNull();
  });
});

describe("decisionsOffered", () => {
  it("draws only buttons the server would accept", () => {
    expect(decisionsOffered("SUBMITTED")).toEqual(["approve", "more_info", "reject"]);
    expect(decisionsOffered("APPROVED")).toEqual(["more_info", "reject"]);
    expect(decisionsOffered("SUSPENDED")).toEqual([]);
    expect(decisionsOffered("DRAFT")).toEqual([]);
    expect(decisionsOffered("PUBLISHED")).toEqual([]);
    expect(decisionsOffered("REJECTED")).toEqual([]);
  });
});

/* ------------------------------------------------- the actions themselves */

const REVIEWER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BUSINESS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ACCOMMODATION = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

type Call = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };

const seam = vi.hoisted(() => ({
  calls: [] as Call[],
  results: {} as Record<string, { data?: unknown; error: unknown; count?: number | null }>,
  notices: [] as unknown[],
  audits: [] as unknown[],
}));

function client() {
  return {
    from(table: string) {
      const call: Call = { table, op: "select", filters: [] };
      const chain: Record<string, unknown> = {};
      const settle = () => {
        seam.calls.push(call);
        return Promise.resolve(seam.results[`${table}.${call.op}`] ?? { data: null, error: null });
      };
      for (const op of ["update", "upsert", "delete"] as const) {
        chain[op] = (payload?: unknown) => {
          call.op = op;
          call.payload = payload;
          return chain;
        };
      }
      chain.insert = async (payload: unknown) => (seam.notices.push(payload), { error: null });
      for (const step of ["select", "in", "neq", "order", "limit"]) chain[step] = () => chain;
      chain.eq = (column: string, value: unknown) => (call.filters.push([column, value]), chain);
      chain.maybeSingle = settle;
      chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        settle().then(resolve, reject);
      return chain;
    },
    rpc: async () => ({ data: [], error: null }),
  };
}

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./guard", () => ({
  adminRefusal: () => "forbidden",
  requireAdmin: async () => ({ state: "admin", user: { id: REVIEWER }, supabase: client() }),
}));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => client() }));
vi.mock("./audit", () => ({ writeAudit: async (_admin: unknown, entry: unknown) => (seam.audits.push(entry), true) }));
vi.mock("../supabase/private-fields", () => ({
  withBusinessPrivate: async (_client: unknown, rows: Record<string, unknown>[]) =>
    rows.map((row) => ({ ...row, phone: "+2348031234567", verification_tier: 0 })),
}));

const { approveBusiness, requestMoreInfo, publishAccommodation, publishRestaurant, recordBusinessRung } =
  await import("./business-actions");

const writes = () => seam.calls.filter((call) => call.op !== "select");

function business(over: Record<string, unknown> = {}) {
  return { id: BUSINESS, name: "Eko Suites", kind: "hotel", status: "SUBMITTED", owner_id: "owner-1", source: "first_party", ...over };
}

beforeEach(() => {
  seam.calls = [];
  seam.notices = [];
  seam.audits = [];
  seam.results = {
    "businesses.select": { data: business(), error: null },
    "businesses.update": { data: null, error: null, count: 1 },
  };
});

describe("the host desk's actions on a reviewer's own business", () => {
  it("refuses to approve it and writes nothing, tells nobody, logs nothing", async () => {
    seam.results["businesses.select"] = { data: business({ owner_id: REVIEWER }), error: null };
    expect(await approveBusiness({ businessId: BUSINESS })).toEqual({ ok: false, error: SELF_REVIEW_REFUSAL });
    expect(writes()).toEqual([]);
    expect(seam.notices).toEqual([]);
    expect(seam.audits).toEqual([]);
  });

  it("refuses to publish its property or its restaurant, and to record its rungs", async () => {
    seam.results["accommodations.select"] = {
      data: {
        id: ACCOMMODATION,
        name: "Eko Suites",
        status: "DRAFT",
        latitude: 6.4,
        longitude: 3.4,
        business_id: BUSINESS,
        accommodation_photos: [{ id: "p1" }],
        room_types: [{ id: "rt1", status: "DRAFT", units_total: 4, rate_plans: [{ id: "rp1", active: true }] }],
        businesses: business({ owner_id: REVIEWER, status: "APPROVED" }),
      },
      error: null,
    };
    expect(await publishAccommodation({ accommodationId: ACCOMMODATION })).toEqual({ ok: false, error: SELF_REVIEW_REFUSAL });

    seam.results["businesses.select"] = {
      data: business({ owner_id: REVIEWER, kind: "restaurant", status: "APPROVED", is_demo: false, city: "Lagos", state_code: "LA", service_windows: [{ covers: 40 }] }),
      error: null,
    };
    expect(await publishRestaurant({ businessId: BUSINESS })).toEqual({ ok: false, error: SELF_REVIEW_REFUSAL });
    expect(
      await recordBusinessRung({ businessId: BUSINESS, rung: "identity", status: "passed" }),
    ).toEqual({ ok: false, error: SELF_REVIEW_REFUSAL });
    expect(writes()).toEqual([]);
  });
});

describe("a review decision on somebody else's business", () => {
  it("is written on the status it was read in, then announced and logged", async () => {
    expect(await approveBusiness({ businessId: BUSINESS })).toEqual({ ok: true, data: null });
    const update = writes().find((call) => call.table === "businesses" && call.op === "update");
    expect(update?.filters).toEqual([
      ["id", BUSINESS],
      ["status", "SUBMITTED"],
    ]);
    expect(seam.audits).toHaveLength(1);
    expect(seam.notices).toHaveLength(1);
  });

  it("tells a stay's owner about the charges at the door, and a restaurant's that it goes on the shelf next", async () => {
    await approveBusiness({ businessId: BUSINESS });
    expect(JSON.stringify(seam.notices[0])).toContain("charges at the door");
    expect(JSON.stringify(seam.notices[0])).not.toContain("property");

    seam.notices = [];
    seam.results["businesses.select"] = { data: business({ kind: "restaurant" }), error: null };
    await approveBusiness({ businessId: BUSINESS });
    expect(JSON.stringify(seam.notices[0])).toContain("in front of guests next");
  });

  it("sends a change request's owner to the application, where the note is printed", async () => {
    await requestMoreInfo({ businessId: BUSINESS, note: "The CAC certificate is blurry, please upload it again." });
    expect(seam.notices[0]).toMatchObject({ href: "/host/apply", title: "We need something more" });
  });

  it("changes nothing and announces nothing when the row moved since it was read", async () => {
    seam.results["businesses.update"] = { data: null, error: null, count: 0 };
    const result = await approveBusiness({ businessId: BUSINESS });
    expect(result.ok).toBe(false);
    expect(seam.notices).toEqual([]);
    expect(seam.audits).toEqual([]);
  });

  it("does not approve an approved business a second time", async () => {
    seam.results["businesses.select"] = { data: business({ status: "APPROVED" }), error: null };
    const result = await approveBusiness({ businessId: BUSINESS });
    expect(result.ok).toBe(false);
    expect(writes()).toEqual([]);
  });
});
