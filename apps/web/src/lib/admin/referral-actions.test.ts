import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The referral desk's three decisions. The database decides; these tests hold
 * what the action does around it: only an admin is let through, a decision is
 * made on the operator's own client (the functions read auth.uid()), what the
 * database would refuse for want of a reason is refused first, and every
 * answer the functions give is turned into a sentence or a success, never
 * mistaken for the other.
 */
const seam = vi.hoisted(() => ({
  access: { state: "admin", isStaff: false } as { state: string; isStaff?: boolean },
  rpc: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: seam.revalidate }));
vi.mock("./guard", () => ({
  ADMIN_FORBIDDEN_MESSAGE: "forbidden",
  requireAdmin: async () => ({
    ...seam.access,
    supabase: { rpc: () => Promise.reject(new Error("the decision must not use access.supabase")) },
    userClient: { rpc: (fn: string, args: Record<string, unknown>) => seam.rpc(fn, args) },
  }),
}));

const { setReferralBudget, decideReferral, decidePayout } = await import("./referral-actions");

const REF = "00000000-0000-4000-8000-000000000101";
const PAY = "00000000-0000-4000-8000-000000000201";

beforeEach(() => {
  seam.access = { state: "admin", isStaff: false };
  seam.rpc.mockReset();
  seam.revalidate.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-13T11:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("who may decide", () => {
  for (const state of ["not-admin", "signed-out", "unconfigured", "step-up"]) {
    it(`refuses ${state} before asking the database`, async () => {
      seam.access = { state };
      expect((await setReferralBudget({ month: "2026-10-01", capMinor: 70_000_000, reason: "A sentence of reason." })).ok).toBe(false);
      expect((await decideReferral({ referralId: REF, decision: "approve", reason: "Looks genuine to me." })).ok).toBe(false);
      expect((await decidePayout({ payoutId: PAY, decision: "release", reason: "Checked the account." })).ok).toBe(false);
      expect(seam.rpc).not.toHaveBeenCalled();
    });
  }

  it("refuses a scoped staff member: the functions need an admin role", async () => {
    seam.access = { state: "admin", isStaff: true };
    const result = await decideReferral({ referralId: REF, decision: "approve", reason: "Looks genuine to me." });
    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(seam.rpc).not.toHaveBeenCalled();
  });
});

describe("setReferralBudget", () => {
  const INPUT = { month: "2026-10-01", capMinor: 70_000_000, reason: "Raised for the October push, approved by the founder." };

  it("sets the month's cap on the operator's client and refreshes the desk", async () => {
    seam.rpc.mockResolvedValue({ data: { period_month: "2026-10-01", cap_minor: 70_000_000, committed_minor: 41_200_000 }, error: null });
    const result = await setReferralBudget(INPUT);
    expect(result).toEqual({ ok: true, data: { month: "2026-10-01", capMinor: 70_000_000, committedMinor: 41_200_000 } });
    expect(seam.rpc).toHaveBeenCalledWith("admin_referral_budget_set", {
      p_month: "2026-10-01",
      p_cap_minor: 70_000_000,
      p_reason: INPUT.reason,
    });
    expect(seam.revalidate).toHaveBeenCalledWith("/admin/referrals");
  });

  it("can set next month's budget too", async () => {
    seam.rpc.mockResolvedValue({ data: { period_month: "2026-11-01", cap_minor: 100_000, committed_minor: 0 }, error: null });
    expect((await setReferralBudget({ ...INPUT, month: "2026-11-01", capMinor: 100_000 })).ok).toBe(true);
  });

  it("refuses a past month, a far month and a day that is not the first", async () => {
    for (const month of ["2026-09-01", "2026-12-01", "2026-10-15", "October"]) {
      const result = await setReferralBudget({ ...INPUT, month });
      expect(result.ok).toBe(false);
    }
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("refuses a negative cap, a fraction of a naira and a reason too short for the record, without asking", async () => {
    expect((await setReferralBudget({ ...INPUT, capMinor: -1 })).ok).toBe(false);
    expect((await setReferralBudget({ ...INPUT, capMinor: 70_000_050 })).ok).toBe(false);
    expect((await setReferralBudget({ ...INPUT, capMinor: 1.5 })).ok).toBe(false);
    const short = await setReferralBudget({ ...INPUT, reason: "too short" });
    expect(short).toMatchObject({ ok: false, fieldErrors: { reason: expect.stringMatching(/Say why/) } });
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("allows a budget of zero, which pauses new referrals on purpose", async () => {
    seam.rpc.mockResolvedValue({ data: { period_month: "2026-10-01", cap_minor: 0, committed_minor: 0 }, error: null });
    expect((await setReferralBudget({ ...INPUT, capMinor: 0 })).ok).toBe(true);
  });

  it("names the database's refusal of a missing reason, and a non-staff caller", async () => {
    seam.rpc.mockResolvedValueOnce({ data: null, error: { code: "22023", message: "Say why, in a sentence." } });
    expect(await setReferralBudget(INPUT)).toMatchObject({ ok: false, fieldErrors: { reason: "Say why, in a sentence." } });
    seam.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "Staff only." } });
    expect(await setReferralBudget(INPUT)).toEqual({ ok: false, error: "forbidden" });
  });

  it("does not claim success on an answer it cannot read", async () => {
    seam.rpc.mockResolvedValue({ data: null, error: null });
    const result = await setReferralBudget(INPUT);
    expect(result.ok).toBe(false);
    expect(seam.revalidate).not.toHaveBeenCalled();
  });

  it("says nothing was changed when the call throws", async () => {
    seam.rpc.mockRejectedValue(new Error("network"));
    const result = await setReferralBudget(INPUT);
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/Nothing was changed/) });
  });
});

describe("decideReferral", () => {
  const INPUT = { referralId: REF, decision: "approve" as const, reason: "Phone and bank are the member's own." };

  it("approves through admin_referral_decide and lands on approved", async () => {
    seam.rpc.mockResolvedValue({ data: "approved", error: null });
    expect(await decideReferral(INPUT)).toEqual({ ok: true, data: { status: "approved" } });
    expect(seam.rpc).toHaveBeenCalledWith("admin_referral_decide", { p_referral: REF, p_decision: "approve", p_reason: INPUT.reason });
    expect(seam.revalidate).toHaveBeenCalledWith("/admin/referrals");
  });

  it("rejects through the same function, and the reward is reversed", async () => {
    seam.rpc.mockResolvedValue({ data: "reversed", error: null });
    expect(await decideReferral({ ...INPUT, decision: "reject" })).toEqual({ ok: true, data: { status: "reversed" } });
    expect(seam.rpc).toHaveBeenCalledWith("admin_referral_decide", expect.objectContaining({ p_decision: "reject" }));
  });

  it("will not send any other decision the function understands (reverse, review) from this desk", async () => {
    const result = await decideReferral({ ...INPUT, decision: "reverse" as never });
    expect(result.ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("requires a reason and a real referral id before asking", async () => {
    expect(await decideReferral({ ...INPUT, reason: "ok" })).toMatchObject({ ok: false, fieldErrors: { reason: expect.stringMatching(/Say why/) } });
    expect(await decideReferral({ ...INPUT, reason: "        " })).toMatchObject({ ok: false });
    expect((await decideReferral({ ...INPUT, referralId: "1 or 1=1" })).ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("says a referral nobody can decide any more is not changed", async () => {
    seam.rpc.mockResolvedValue({ data: "refused", error: null });
    expect(await decideReferral(INPUT)).toMatchObject({ ok: false, error: expect.stringMatching(/no longer waiting.*Nothing was changed/) });
    expect(seam.revalidate).not.toHaveBeenCalled();
  });

  it("says a referral that is gone is gone", async () => {
    seam.rpc.mockResolvedValue({ data: "not_found", error: null });
    expect(await decideReferral(INPUT)).toMatchObject({ ok: false, error: expect.stringMatching(/could not be found/) });
  });

  it("never mistakes the wrong landing for success", async () => {
    /* An approve that came back as reversed, or a reject that came back as approved, is a fault, not a result. */
    seam.rpc.mockResolvedValue({ data: "reversed", error: null });
    expect((await decideReferral(INPUT)).ok).toBe(false);
    seam.rpc.mockResolvedValue({ data: "approved", error: null });
    expect((await decideReferral({ ...INPUT, decision: "reject" })).ok).toBe(false);
  });

  it("names the database's refusals", async () => {
    seam.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "Staff only." } });
    expect(await decideReferral(INPUT)).toEqual({ ok: false, error: "forbidden" });
    seam.rpc.mockResolvedValueOnce({ data: null, error: { code: "22023", message: "Say why, in a sentence." } });
    expect(await decideReferral(INPUT)).toMatchObject({ ok: false, fieldErrors: { reason: "Say why, in a sentence." } });
    seam.rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "internal" } });
    expect(await decideReferral(INPUT)).toMatchObject({ ok: false, error: expect.stringMatching(/Nothing was changed/) });
  });
});

describe("decidePayout", () => {
  const INPUT = { payoutId: PAY, decision: "release" as const, reason: "The account name matches the member." };

  it("releases a payout: it goes back to the partner's queue as processing", async () => {
    seam.rpc.mockResolvedValue({ data: "processing", error: null });
    expect(await decidePayout(INPUT)).toEqual({ ok: true, data: { status: "processing" } });
    expect(seam.rpc).toHaveBeenCalledWith("admin_rewards_payout_decide", { p_payout: PAY, p_decision: "release", p_reason: INPUT.reason });
  });

  it("refuses a payout: it fails and the amount returns to the member's balance", async () => {
    seam.rpc.mockResolvedValue({ data: "failed", error: null });
    expect(await decidePayout({ ...INPUT, decision: "refuse" })).toEqual({ ok: true, data: { status: "failed" } });
  });

  it("marks a stuck payout never sent only with what the dashboard showed", async () => {
    expect(await decidePayout({ ...INPUT, decision: "fail_unsent", reason: "Checked, nothing." })).toMatchObject({
      ok: false,
      fieldErrors: { reason: expect.stringMatching(/dashboard showed/) },
    });
    expect(seam.rpc).not.toHaveBeenCalled();
    seam.rpc.mockResolvedValue({ data: "failed", error: null });
    const result = await decidePayout({
      ...INPUT,
      decision: "fail_unsent",
      reason: "Reference vallo-rw-5d92e0f4 shows no transfer in the dashboard on 13 October.",
    });
    expect(result).toEqual({ ok: true, data: { status: "failed" } });
  });

  it("will not release a payout that has no recipient, and says so", async () => {
    seam.rpc.mockResolvedValue({ data: "no_recipient", error: null });
    expect(await decidePayout(INPUT)).toMatchObject({ ok: false, error: expect.stringMatching(/no recipient/) });
    expect(seam.revalidate).not.toHaveBeenCalled();
  });

  it("the payout rule: a held member's payout is not released, and finance's override is named", async () => {
    seam.rpc.mockResolvedValue({ data: "chargeback_hold", error: null });
    expect(await decidePayout(INPUT)).toMatchObject({ ok: false, error: expect.stringMatching(/lost chargeback still owed.*Finance can override/) });
    expect(seam.revalidate).not.toHaveBeenCalled();
  });

  it("says a payout that is not waiting, or not old enough, is unchanged", async () => {
    seam.rpc.mockResolvedValue({ data: "refused", error: null });
    expect(await decidePayout(INPUT)).toMatchObject({ ok: false, error: expect.stringMatching(/no longer waiting/) });
    expect(
      await decidePayout({ ...INPUT, decision: "fail_unsent", reason: "Reference vallo-rw-1 shows no transfer in the dashboard." }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/not old enough/) });
  });

  it("does not offer a hold: leaving a payout in the queue is the hold", async () => {
    const result = await decidePayout({ ...INPUT, decision: "hold" as never });
    expect(result.ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });

  it("never mistakes the wrong landing for success", async () => {
    seam.rpc.mockResolvedValue({ data: "failed", error: null });
    expect((await decidePayout(INPUT)).ok).toBe(false);
    seam.rpc.mockResolvedValue({ data: "processing", error: null });
    expect((await decidePayout({ ...INPUT, decision: "refuse" })).ok).toBe(false);
  });

  it("requires a reason and a real payout id before asking", async () => {
    expect((await decidePayout({ ...INPUT, reason: "no" })).ok).toBe(false);
    expect((await decidePayout({ ...INPUT, payoutId: "x" })).ok).toBe(false);
    expect(seam.rpc).not.toHaveBeenCalled();
  });
});
