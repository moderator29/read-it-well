import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The referral desk's reads, against a stand-in for both doors: the operator's
 * own client (the admin functions, called by name) and the service client (the
 * queue tables). What matters and is held here:
 *
 *   - only an admin is let in, and a staff scope is not enough;
 *   - the admin functions are asked on the operator's client, never the service's;
 *   - the queue tables are read on the service client, with only the columns the
 *     desk shows (no email, phone, full account number, recipient code);
 *   - an unreadable read is "unavailable", never zero or empty;
 *   - the rows are shaped, ordered and joined as the desk expects.
 */

type Row = Record<string, unknown>;
const seam = vi.hoisted(() => ({
  access: { state: "admin", isStaff: false } as { state: string; isStaff?: boolean },
  rpc: vi.fn(),
  tables: {} as Record<string, Row[]>,
  failing: new Set<string>(),
  selects: [] as { table: string; columns: string }[],
  serviceRpc: vi.fn(),
}));

vi.mock("../guard", () => ({
  requireAdmin: async () => ({
    ...seam.access,
    userClient: { rpc: (fn: string, args?: Record<string, unknown>) => seam.rpc(fn, args) },
  }),
}));

function builder(table: string) {
  const filters: [string, unknown][] = [];
  let inFilter: [string, unknown[]] | null = null;
  let limit = Infinity;
  let columns = "";
  const q = {
    select(cols: string) {
      columns = cols;
      seam.selects.push({ table, columns: cols });
      return q;
    },
    eq(col: string, value: unknown) {
      filters.push([col, value]);
      return q;
    },
    in(col: string, values: unknown[]) {
      inFilter = [col, values];
      return q;
    },
    order() {
      return q;
    },
    limit(n: number) {
      limit = n;
      return q;
    },
    then(resolve: (v: unknown) => unknown) {
      if (seam.failing.has(table)) return resolve({ data: null, error: { message: "boom" }, count: null });
      let rows = (seam.tables[table] ?? []).filter((r) => filters.every(([c, v]) => r[c] === v));
      if (inFilter) rows = rows.filter((r) => inFilter![1].includes(r[inFilter![0]]));
      const total = rows.length;
      return resolve({ data: rows.slice(0, limit), error: null, count: total });
    },
  };
  void columns;
  return q;
}

vi.mock("../../supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => builder(table),
    rpc: seam.serviceRpc,
  }),
}));

const reads = await import("./referrals");

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

beforeEach(() => {
  seam.access = { state: "admin", isStaff: false };
  seam.rpc.mockReset();
  seam.serviceRpc.mockReset();
  seam.tables = {};
  seam.failing = new Set();
  seam.selects = [];
});

const LIABILITY = {
  owed_minor: 1_840_000,
  pending_minor: 2_400_000,
  paid_minor: "696000",
  reversed_after_paid_minor: 0,
  month: "2026-10-01",
  budget_cap_minor: 70_000_000,
  budget_committed_minor: 41_200_000,
  by_campaign: [{ slug: "signup-80-phone", status: "active", committed_minor: 4_800_000 }],
  blocked_on: { phone_not_verified: 14 },
  under_review: 3,
  payouts_under_review: 2,
  payouts_unknown: 1,
  payouts_stuck: 0,
  transfer_incidents: 0,
  payouts_enabled: true,
};

describe("the door", () => {
  for (const state of ["not-admin", "signed-out", "unconfigured", "step-up"]) {
    it(`reads nothing for ${state}`, async () => {
      seam.access = { state };
      expect(await reads.getReferralDesk()).toEqual({ state: "unavailable" });
      expect(await reads.getReviewQueue()).toEqual({ state: "unavailable" });
      expect(await reads.getFraudView()).toEqual({ state: "unavailable" });
      expect(await reads.getPayoutQueue()).toEqual({ state: "unavailable" });
      expect(await reads.getReferralGraph(U(1))).toEqual({ state: "unavailable" });
      expect(seam.rpc).not.toHaveBeenCalled();
      expect(seam.selects).toEqual([]);
    });
  }

  it("does not let a scoped staff member in: the functions need an admin role", async () => {
    seam.access = { state: "admin", isStaff: true };
    expect(await reads.getPayoutQueue()).toEqual({ state: "unavailable" });
    expect(seam.selects).toEqual([]);
  });
});

describe("parseLiability", () => {
  it("reads the function's envelope into figures, whole kobo", () => {
    const l = reads.parseLiability(LIABILITY)!;
    expect(l).toMatchObject({
      owedMinor: 1_840_000,
      pendingMinor: 2_400_000,
      paidMinor: 696_000,
      budgetCapMinor: 70_000_000,
      budgetCommittedMinor: 41_200_000,
      month: "2026-10-01",
      referralsUnderReview: 3,
      payoutsUnderReview: 2,
      payoutsEnabled: true,
      blockedOn: { phone_not_verified: 14 },
    });
    expect(l.byCampaign).toEqual([{ slug: "signup-80-phone", status: "active", committedMinor: 4_800_000 }]);
  });

  it("reads a missing budget row as null, not zero", () => {
    const l = reads.parseLiability({ ...LIABILITY, budget_cap_minor: null, budget_committed_minor: null })!;
    expect(l.budgetCapMinor).toBeNull();
    expect(l.budgetCommittedMinor).toBeNull();
  });

  it("refuses a refusal: a non-staff caller gets null from the function, which is not a zero liability", () => {
    expect(reads.parseLiability(null)).toBeNull();
    expect(reads.parseLiability("nope")).toBeNull();
    expect(reads.parseLiability([])).toBeNull();
  });

  it("treats a float or a huge number as 0 rather than approximating money", () => {
    const l = reads.parseLiability({ ...LIABILITY, owed_minor: 12.5, paid_minor: 2 ** 60 })!;
    expect(l.owedMinor).toBe(0);
    expect(l.paidMinor).toBe(0);
  });
});

function deskFixture() {
  seam.rpc.mockImplementation(async (fn: string) => {
    if (fn === "admin_referral_liability") return { data: LIABILITY, error: null };
    if (fn === "referral_programme_status") return { data: { status: "open" }, error: null };
    return { data: null, error: { message: "unexpected" } };
  });
  seam.tables.referral_campaigns = [
    { slug: "signup-80", kind: "consumer", title: "Invite and Earn", status: "ended", reward_minor: 8000, member_cap_minor: 12_000_000, review_window: "7 days", requirement_keys: ["email_verified"], starts_at: "2026-10-08T19:53:10Z", ends_at: "2026-10-13T17:21:38Z", reason: "ended" },
    { slug: "signup-80-phone", kind: "consumer", title: "Invite and Earn", status: "active", reward_minor: 8000, member_cap_minor: 12_000_000, review_window: "7 days", requirement_keys: ["phone_verified", "onboarding_completed"], starts_at: "2026-10-13T17:21:38Z", ends_at: null, reason: "live" },
    { slug: "bogus", kind: "consumer", title: "Bad", status: "weird", reward_minor: 1, member_cap_minor: 1, review_window: "7 days", requirement_keys: [], starts_at: "2026-10-01T00:00:00Z", ends_at: null, reason: "" },
  ];
  seam.tables.referral_budget_periods = [{ period_month: "2026-10-01", cap_minor: 70_000_000, committed_minor: 41_200_000, reason: "D64" }];
  seam.tables.referrals = [
    { id: "a", status: "paid" },
    { id: "b", status: "paid" },
    { id: "c", status: "under_review" },
    { id: "d", status: "reversed" },
    { id: "e", status: "attributed" },
  ];
}

describe("getReferralDesk", () => {
  const AFTER_SWITCH = Date.parse("2026-10-14T09:00:00Z");

  it("brings the liability, the live campaign, the budget and the counts together", async () => {
    deskFixture();
    const read = await reads.getReferralDesk(AFTER_SWITCH);
    expect(read.state).toBe("ok");
    if (read.state !== "ok") return;
    expect(read.data.liability.owedMinor).toBe(1_840_000);
    expect(read.data.live).toMatchObject({ slug: "signup-80-phone", status: "active", rewardMinor: 8000, reviewDays: 7, reviewHours: 0 });
    expect(read.data.live?.requirementKeys).toEqual(["phone_verified", "onboarding_completed"]);
    /* The ended campaign is history; a row with a status the database does not allow is dropped. */
    expect(read.data.others.map((c) => c.slug)).toEqual(["signup-80"]);
    expect(read.data.budgets).toEqual([{ month: "2026-10-01", capMinor: 70_000_000, committedMinor: 41_200_000, reason: "D64" }]);
    expect(read.data.counts).toMatchObject({ paid: 2, under_review: 1, reversed: 1, attributed: 1, approved: 0 });
    expect(read.data.programme).toEqual({ open: true, reason: null });
  });

  it("asks the admin functions on the operator's client, never the service role", async () => {
    deskFixture();
    await reads.getReferralDesk(AFTER_SWITCH);
    expect(seam.rpc.mock.calls.map((c) => c[0]).sort()).toEqual(["admin_referral_liability", "referral_programme_status"]);
    expect(seam.serviceRpc).not.toHaveBeenCalled();
  });

  it("says no campaign is live when the live one has ended, and reads a paused programme with its reason", async () => {
    deskFixture();
    seam.rpc.mockImplementation(async (fn: string) =>
      fn === "admin_referral_liability"
        ? { data: LIABILITY, error: null }
        : { data: { status: "paused", reason: "budget_reached" }, error: null },
    );
    seam.tables.referral_campaigns![1]!.ends_at = "2026-10-14T00:00:00Z";
    const read = await reads.getReferralDesk(AFTER_SWITCH);
    if (read.state !== "ok") throw new Error("expected ok");
    expect(read.data.live).toBeNull();
    expect(read.data.programme).toEqual({ open: false, reason: "budget_reached" });
  });

  it("is unavailable, not zero, when the liability cannot be read", async () => {
    deskFixture();
    seam.rpc.mockImplementation(async (fn: string) =>
      fn === "admin_referral_liability" ? { data: null, error: { message: "nope" } } : { data: { status: "open" }, error: null },
    );
    expect(await reads.getReferralDesk(AFTER_SWITCH)).toEqual({ state: "unavailable" });
  });

  it("is unavailable when a table read fails or the function answers null (not staff)", async () => {
    deskFixture();
    seam.failing.add("referrals");
    expect(await reads.getReferralDesk(AFTER_SWITCH)).toEqual({ state: "unavailable" });
    seam.failing.clear();
    seam.rpc.mockImplementation(async () => ({ data: null, error: null }));
    expect(await reads.getReferralDesk(AFTER_SWITCH)).toEqual({ state: "unavailable" });
  });
});

describe("getReviewQueue", () => {
  function queueFixture() {
    seam.rpc.mockImplementation(async (fn: string) =>
      fn === "admin_referral_cluster_exposure"
        ? {
            data: [
              { referrer_id: U(1), score: 65, non_network: true, reasons: ["shared_payout_destination"], exposure_minor: "64000", members: 8 },
            ],
            error: null,
          }
        : { data: null, error: { message: "unexpected" } },
    );
    seam.tables.referrals = [
      { id: U(101), referrer_id: U(1), referred_id: U(5), campaign_id: U(900), reward_minor: 8000, risk_score: 65, risk_reasons: ["shared_payout_destination"], review_reason: "cluster flagged for review", qualified_at: "2026-10-12T09:14:00Z", attributed_at: "2026-10-12T08:50:00Z", status: "under_review" },
      { id: U(102), referrer_id: U(2), referred_id: U(6), campaign_id: null, reward_minor: null, risk_score: 0, risk_reasons: [], review_reason: null, qualified_at: null, attributed_at: "2026-10-13T07:30:00Z", status: "under_review" },
      { id: U(103), referrer_id: U(3), referred_id: U(7), campaign_id: null, reward_minor: 8000, risk_score: 0, risk_reasons: [], review_reason: null, qualified_at: null, attributed_at: "x", status: "paid" },
    ];
    seam.tables.referral_campaigns = [{ id: U(900), slug: "signup-80-phone" }];
    seam.tables.profiles = [
      { id: U(1), display_name: "Ngozi Eze" },
      { id: U(5), display_name: "Amina Bello" },
      { id: U(2), display_name: "  " },
    ];
  }

  it("lists only the referrals waiting on a decision, with names, the campaign and the group they belong to", async () => {
    queueFixture();
    const read = await reads.getReviewQueue();
    if (read.state !== "ok") throw new Error("expected ok");
    expect(read.data.total).toBe(2);
    const [first, second] = read.data.items;
    expect(first).toMatchObject({
      id: U(101),
      referrerName: "Ngozi Eze",
      referredName: "Amina Bello",
      campaign: "signup-80-phone",
      rewardMinor: 8000,
      riskScore: 65,
      riskReasons: ["shared_payout_destination"],
      reviewReason: "cluster flagged for review",
      cluster: { score: 65, nonNetwork: true, exposureMinor: 64_000, members: 8 },
    });
    expect(second).toMatchObject({ referrerName: null, rewardMinor: null, campaign: null, cluster: null });
  });

  it("selects only what the desk shows: no email, phone, or key material", async () => {
    queueFixture();
    await reads.getReviewQueue();
    const asked = seam.selects.map((s) => `${s.table}: ${s.columns}`).join("\n");
    expect(asked).not.toMatch(/email|phone|account_key|recipient|fingerprint|ip\b/i);
    expect(seam.selects.find((s) => s.table === "profiles")?.columns).toBe("id, display_name");
  });

  it("is unavailable if either read fails", async () => {
    queueFixture();
    seam.failing.add("referrals");
    expect(await reads.getReviewQueue()).toEqual({ state: "unavailable" });
    seam.failing.clear();
    seam.rpc.mockImplementation(async () => ({ data: null, error: { message: "x" } }));
    expect(await reads.getReviewQueue()).toEqual({ state: "unavailable" });
  });
});

describe("getFraudView", () => {
  it("ranks groups by what is at stake and attaches the signals their people share", async () => {
    seam.rpc.mockImplementation(async (fn: string) => {
      if (fn === "admin_referral_cluster_exposure") {
        return {
          data: [
            { referrer_id: U(1), score: 65, non_network: true, reasons: ["same_browser"], exposure_minor: 64000, members: 8 },
            { referrer_id: U(2), score: 10, non_network: false, reasons: ["shared_network"], exposure_minor: 16000, members: 4 },
          ],
          error: null,
        };
      }
      if (fn === "admin_referral_clusters") {
        return {
          data: [
            { referrer_id: U(1), signal: "device:ab12cd34ef56", shared_by: 5, referred_ids: [U(5), U(6), "not-an-id"] },
            { referrer_id: U(1), signal: "network:102.89.23.14", shared_by: 9, referred_ids: [U(5)] },
            { referrer_id: U(3), signal: "network:105.112.7.3", shared_by: 3, referred_ids: [U(7)] },
          ],
          error: null,
        };
      }
      return { data: null, error: { message: "unexpected" } };
    });
    seam.tables.profiles = [{ id: U(1), display_name: "Ngozi Eze" }];
    const read = await reads.getFraudView();
    if (read.state !== "ok") throw new Error("expected ok");
    const [a, b, c] = read.data.groups;
    expect(a).toMatchObject({ referrerId: U(1), referrerName: "Ngozi Eze", exposureMinor: 64_000, nonNetwork: true });
    /* The signals are ordered by how many share them, and a malformed id is dropped. */
    expect(a!.signals.map((s) => s.sharedBy)).toEqual([9, 5]);
    expect(a!.signals[1]!.referredIds).toEqual([U(5), U(6)]);
    expect(b).toMatchObject({ referrerId: U(2), exposureMinor: 16_000, signals: [] });
    /* A referrer with a shared signal and no score is still shown: the signal is the finding. */
    expect(c).toMatchObject({ referrerId: U(3), score: 0, exposureMinor: 0, members: 3 });
  });

  it("asks both functions on the operator's client", async () => {
    seam.rpc.mockResolvedValue({ data: [], error: null });
    await reads.getFraudView();
    expect(seam.rpc.mock.calls.map((c) => c[0]).sort()).toEqual(["admin_referral_cluster_exposure", "admin_referral_clusters"]);
    expect(seam.serviceRpc).not.toHaveBeenCalled();
  });

  it("is unavailable when a function errors, not an empty list of groups", async () => {
    seam.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await reads.getFraudView()).toEqual({ state: "unavailable" });
  });
});

describe("getReferralGraph", () => {
  it("shapes the edges and names the people", async () => {
    seam.rpc.mockResolvedValue({
      data: [
        { referrer_id: U(1), referred_id: U(2), status: "under_review", risk_score: 65, risk_reasons: ["velocity"], depth: 1 },
        { referrer_id: U(2), referred_id: U(3), status: "mystery", risk_score: 0, risk_reasons: null, depth: 2 },
        { referrer_id: null, referred_id: U(4), status: "paid", risk_score: 0, risk_reasons: [], depth: 1 },
      ],
      error: null,
    });
    seam.tables.profiles = [{ id: U(1), display_name: "Ngozi Eze" }];
    const read = await reads.getReferralGraph(U(1));
    if (read.state !== "ok") throw new Error("expected ok");
    expect(seam.rpc).toHaveBeenCalledWith("admin_referral_graph", { p_member: U(1), p_depth: 2 });
    expect(read.data.edges).toEqual([
      { referrerId: U(1), referredId: U(2), status: "under_review", riskScore: 65, riskReasons: ["velocity"], depth: 1 },
      { referrerId: U(2), referredId: U(3), status: "unknown", riskScore: 0, riskReasons: [], depth: 2 },
    ]);
    expect(read.data.names).toEqual({ [U(1)]: "Ngozi Eze" });
  });

  it("does not ask the database about something that is not an id", async () => {
    expect(await reads.getReferralGraph("1 or 1=1")).toEqual({ state: "unavailable" });
    expect(seam.rpc).not.toHaveBeenCalled();
  });
});

describe("getPayoutQueue", () => {
  function payoutRow(over: Row): Row {
    return {
      id: U(201),
      member_id: U(1),
      amount_minor: 640_000,
      reference: "vallo-rw-8f3a21c0",
      status: "under_review",
      account_name: "NGOZI A EZE",
      account_last4: "4417",
      risk_score: 60,
      risk_reasons: ["shared_payout_destination"],
      failure_reason: null,
      created_at: "2026-10-12T14:20:00Z",
      transfer_initiated_at: null,
      recipient_code: "RCP_abc",
      ...over,
    };
  }

  it("splits what waits on a person from what is with the payout partner", async () => {
    seam.tables.rewards_payouts = [
      payoutRow({}),
      payoutRow({ id: U(202), status: "sent", transfer_initiated_at: "2026-10-12T14:30:00Z" }),
      payoutRow({ id: U(203), status: "unknown", recipient_code: null }),
      payoutRow({ id: U(204), status: "paid" }),
      payoutRow({ id: U(205), status: "not-a-status" }),
    ];
    seam.tables.profiles = [{ id: U(1), display_name: "Ngozi Eze" }];
    /* The stand-in has no .in() on status columns for the paid row, so keep it simple: the read asks for the open statuses. */
    const read = await reads.getPayoutQueue();
    if (read.state !== "ok") throw new Error("expected ok");
    expect(read.data.waiting.map((p) => p.id)).toEqual([U(201)]);
    expect(read.data.inFlight.map((p) => p.id).sort()).toEqual([U(202), U(203)].sort());
    expect(read.data.waiting[0]).toMatchObject({
      memberName: "Ngozi Eze",
      amountMinor: 640_000,
      accountName: "NGOZI A EZE",
      accountLast4: "4417",
      hasRecipient: true,
      transferInitiated: false,
    });
    expect(read.data.inFlight.find((p) => p.id === U(203))?.hasRecipient).toBe(false);
  });

  it("never selects the full account number or the recipient's secrets, only whether a recipient exists", async () => {
    seam.tables.rewards_payouts = [payoutRow({})];
    const read = await reads.getPayoutQueue();
    if (read.state !== "ok") throw new Error("expected ok");
    const columns = seam.selects.find((s) => s.table === "rewards_payouts")!.columns;
    expect(columns).not.toMatch(/account_key|account_number|transfer_code|bank_code/);
    expect(JSON.stringify(read.data)).not.toContain("RCP_abc");
  });

  it("is unavailable when the read fails", async () => {
    seam.failing.add("rewards_payouts");
    expect(await reads.getPayoutQueue()).toEqual({ state: "unavailable" });
  });
});

describe("countReferralWork", () => {
  it("counts the two queues for the rail", async () => {
    seam.tables.referrals = [{ status: "under_review" }, { status: "under_review" }, { status: "paid" }];
    seam.tables.rewards_payouts = [{ status: "under_review" }, { status: "processing" }];
    const db = { from: (t: string) => builder(t) } as unknown as Parameters<typeof reads.countReferralWork>[0];
    expect(await reads.countReferralWork(db)).toEqual({ referrals: 2, payouts: 1 });
  });

  it("is null when a count cannot be read, so the badge draws nothing rather than a made up number", async () => {
    seam.failing.add("referrals");
    const db = { from: (t: string) => builder(t) } as unknown as Parameters<typeof reads.countReferralWork>[0];
    expect(await reads.countReferralWork(db)).toBeNull();
  });
});
