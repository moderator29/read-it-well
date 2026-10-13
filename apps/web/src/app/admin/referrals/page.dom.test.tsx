import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The referral desk's door. `requireAdmin()` decides before a single row is
 * read: an admin gets the desk, anybody else the site's ordinary 404, and
 * only the section the address asks for is read.
 */
const door = vi.hoisted(() => ({ state: "admin" as string, calls: 0 }));
const reads = vi.hoisted(() => ({
  desk: vi.fn(),
  review: vi.fn(),
  fraud: vi.fn(),
  graph: vi.fn(),
  payouts: vi.fn(),
}));

vi.mock("@/lib/admin/guard", () => ({
  requireAdmin: async () => {
    door.calls += 1;
    return { state: door.state };
  },
}));
vi.mock("@/lib/admin/reads/referrals", () => ({
  getReferralDesk: reads.desk,
  getReviewQueue: reads.review,
  getFraudView: reads.fraud,
  getReferralGraph: reads.graph,
  getPayoutQueue: reads.payouts,
}));
vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ refresh() {}, push() {} }),
}));
vi.mock("@/lib/admin/referral-actions", () => ({
  setReferralBudget: vi.fn(),
  decideReferral: vi.fn(),
  decidePayout: vi.fn(),
}));

const { default: Page } = await import("./page");
const ID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  door.calls = 0;
  for (const fn of Object.values(reads)) fn.mockReset();
  reads.desk.mockResolvedValue({ state: "unavailable" });
});

describe("the referral desk's door", () => {
  for (const state of ["not-admin", "signed-out", "unconfigured", "step-up"]) {
    it(`answers ${state} with a 404 and reads nothing`, async () => {
      door.state = state;
      await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
      expect(reads.desk).not.toHaveBeenCalled();
      expect(reads.review).not.toHaveBeenCalled();
    });
  }

  it("reads the review queue by default, and nothing from the other sections", async () => {
    door.state = "admin";
    reads.review.mockResolvedValue({ state: "ok", data: { items: [], total: 0 } });
    await Page({ searchParams: Promise.resolve({}) });
    expect(reads.desk).toHaveBeenCalledTimes(1);
    expect(reads.review).toHaveBeenCalledTimes(1);
    expect(reads.fraud).not.toHaveBeenCalled();
    expect(reads.payouts).not.toHaveBeenCalled();
  });

  it("reads payouts for ?tab=payouts only", async () => {
    door.state = "admin";
    reads.payouts.mockResolvedValue({ state: "unavailable" });
    await Page({ searchParams: Promise.resolve({ tab: "payouts" }) });
    expect(reads.payouts).toHaveBeenCalledTimes(1);
    expect(reads.review).not.toHaveBeenCalled();
  });

  it("draws the member in the address, or the group with the most at stake when there is none", async () => {
    door.state = "admin";
    reads.fraud.mockResolvedValue({ state: "ok", data: { groups: [{ referrerId: ID }] } });
    reads.graph.mockResolvedValue({ state: "ok", data: { edges: [], names: {} } });
    await Page({ searchParams: Promise.resolve({ tab: "fraud" }) });
    expect(reads.graph).toHaveBeenCalledWith(ID);
    reads.graph.mockClear();
    const other = "00000000-0000-4000-8000-000000000009";
    await Page({ searchParams: Promise.resolve({ tab: "fraud", member: other }) });
    expect(reads.graph).toHaveBeenCalledWith(other);
  });

  it("ignores a member that is not an id", async () => {
    door.state = "admin";
    reads.fraud.mockResolvedValue({ state: "ok", data: { groups: [] } });
    await Page({ searchParams: Promise.resolve({ tab: "fraud", member: "1 or 1=1" }) });
    expect(reads.graph).not.toHaveBeenCalled();
  });
});
