/**
 * The chargebacks desk's server actions: every write goes to the audited
 * definer functions on the CALLER'S OWN client (never the service role, which
 * would pass `chargeback_actor_ok` with no person on the record), a reason is
 * required, a stale or refused move is said in words, and after a move the
 * lister and payer are told through the notify helper.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: { client: string; fn: string; args: Record<string, unknown> | undefined }[] = [];
let rows: Record<string, unknown>[] = [];
let answers: Record<string, unknown> = {};
let access: { state: string } = { state: "admin" };
const notices = vi.fn(async () => ({ written: 1, skipped: 0, error: null }));

function client(name: string) {
  return {
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      calls.push({ client: name, fn, args });
      if (fn === "staff_chargebacks") return { data: rows, error: null };
      return { data: answers[fn] ?? { status: "ok" }, error: null };
    },
    from: () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: { booking_id: "bk-1", agreement_id: null, share_payer_id: null, guest_id: "payer-1" }, error: null }),
      };
      return chain;
    },
  };
}

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../locale", () => ({ getLocale: async () => "en" }));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => client("service") }));
vi.mock("../notify/in-app", () => ({ writeInAppNotices: notices }));
vi.mock("./guard", () => ({
  requireAdmin: vi.fn(async (scope?: string) => {
    expect(scope).toBe("finance");
    return access.state === "admin" ? { state: "admin", supabase: client("service"), userClient: client("user"), user: { id: "staff-1" } } : access;
  }),
  adminRefusal: () => "This area is for the Vallo operations team.",
}));

const { moveChargeback, openChargeback, addChargebackNote, overrideChargebackHold } = await import("./chargeback-actions");

const ID = "11111111-1111-4111-8111-111111111111";
const base = {
  id: ID,
  reference: "REF-1",
  transaction_id: "tx-1",
  provider: "paystack",
  provider_dispute_id: "D1",
  amount_minor: 100_000,
  currency: "NGN",
  state: "evidence_submitted",
  lister_user_id: "lister-1",
  lister_unattributed: false,
  recovery_state: "none",
  recovered_minor: 0,
  opened_at: "2026-10-01T00:00:00Z",
};

beforeEach(() => {
  calls.length = 0;
  rows = [base];
  answers = {};
  access = { state: "admin" };
  notices.mockClear();
});

const REASON = "The issuer ruled for the card holder.";

describe("moveChargeback", () => {
  it("calls chargeback_move on the caller's own client with the note and tells both sides", async () => {
    answers.chargeback_move = { status: "ok", state: "lost", recovery: "owed" };
    const result = await moveChargeback({ chargebackId: ID, move: "lost", note: REASON, fromState: "evidence_submitted", fromRecovery: "none" });
    expect(result.ok).toBe(true);
    const move = calls.find((c) => c.fn === "chargeback_move")!;
    expect(move.client).toBe("user");
    expect(move.args).toMatchObject({ p_chargeback: ID, p_to_state: "lost", p_note: REASON });
    expect(calls.some((c) => c.client === "service" && c.fn.startsWith("chargeback"))).toBe(false);
    const written = (notices.mock.calls[0] as unknown as [unknown, { user_id: string; href: string }[]])[1];
    expect(written.map((n) => n.user_id)).toEqual(["lister-1", "payer-1"]);
    expect(written[0]!.href).toBe("/payouts#chargeback");
  });

  it("refuses a short reason before the database is asked", async () => {
    const result = await moveChargeback({ chargebackId: ID, move: "won", note: "short", fromState: "evidence_submitted", fromRecovery: "none" });
    expect(result.ok).toBe(false);
    expect(calls.some((c) => c.fn === "chargeback_move")).toBe(false);
  });

  it("refuses a stale screen and a move the state does not offer", async () => {
    const stale = await moveChargeback({ chargebackId: ID, move: "won", note: REASON, fromState: "opened", fromRecovery: "none" });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error).toMatch(/moved since you opened it/);
    const illegal = await moveChargeback({ chargebackId: ID, move: "write_off", note: REASON, fromState: "evidence_submitted", fromRecovery: "none" });
    expect(illegal.ok).toBe(false);
    expect(calls.some((c) => c.fn === "chargeback_move")).toBe(false);
  });

  it("sends the cumulative recovered total and says the database's refusal in words", async () => {
    rows = [{ ...base, state: "lost", recovery_state: "owed", recovered_minor: 20_000 }];
    answers.chargeback_move = { status: "bad_recovered" };
    const result = await moveChargeback({ chargebackId: ID, move: "record_recovery", note: REASON, fromState: "lost", fromRecovery: "owed", recoveredNow: "300" });
    expect(calls.find((c) => c.fn === "chargeback_move")!.args).toMatchObject({ p_recovered_total_minor: 50_000 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/only rise/);
    expect(notices).not.toHaveBeenCalled();
  });

  it("refuses somebody the finance door does not admit", async () => {
    access = { state: "not-admin" };
    const result = await moveChargeback({ chargebackId: ID, move: "won", note: REASON, fromState: "evidence_submitted", fromRecovery: "none" });
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe("openChargeback", () => {
  it("calls chargeback_open in kobo on the caller's client and tells the lister", async () => {
    answers.chargeback_open = { status: "ok", chargeback_id: ID };
    const result = await openChargeback({ reference: "REF-1", provider: "paystack", disputeId: "D1", amount: "1,000.50", note: REASON });
    expect(result).toEqual({ ok: true, data: { chargebackId: ID, duplicate: false } });
    expect(calls.find((c) => c.fn === "chargeback_open")).toMatchObject({ client: "user", args: { p_amount_minor: 100_050, p_reference: "REF-1", p_note: REASON } });
    expect(notices).toHaveBeenCalledTimes(1);
  });

  it("says a refusal in words and writes no notice", async () => {
    answers.chargeback_open = { status: "over_charge" };
    const result = await openChargeback({ reference: "REF-1", provider: "paystack", disputeId: "D1", amount: "1000", note: REASON });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/more than it was/);
    expect(notices).not.toHaveBeenCalled();
  });
});

describe("addChargebackNote", () => {
  it("goes to the draft note function on the caller's client", async () => {
    const result = await addChargebackNote({ chargebackId: ID, note: REASON });
    expect(result.ok).toBe(true);
    expect(calls.find((c) => c.fn === "chargeback_add_note")).toMatchObject({ client: "user", args: { p_chargeback: ID, p_note: REASON } });
  });
});

describe("overrideChargebackHold", () => {
  const SUBJECT = "22222222-2222-4222-8222-222222222222";
  it("records one override with its reason on the caller's own client, never the service role", async () => {
    answers.admin_chargeback_hold_override = { status: "ok", override_id: "o-1" };
    const result = await overrideChargebackHold({ kind: "arrangement", subjectId: SUBJECT, reason: "Recovery plan agreed with the lister" });
    expect(result).toEqual({ ok: true, data: null });
    expect(calls.find((c) => c.fn === "admin_chargeback_hold_override")).toMatchObject({
      client: "user",
      args: { p_kind: "arrangement", p_subject: SUBJECT, p_reason: "Recovery plan agreed with the lister" },
    });
    expect(calls.some((c) => c.client === "service")).toBe(false);
  });

  it("refuses a short reason before asking, and says the database's refusals in words", async () => {
    expect((await overrideChargebackHold({ kind: "rewards_payout", subjectId: SUBJECT, reason: "too short" })).ok).toBe(false);
    expect(calls).toHaveLength(0);
    for (const [status, words] of [
      ["own_hold", /your own account/],
      ["not_held", /nothing to override/],
      ["forbidden", /finance staff/],
      ["mystery", /could not be recorded/],
    ] as const) {
      answers.admin_chargeback_hold_override = { status };
      const result = await overrideChargebackHold({ kind: "rewards_payout", subjectId: SUBJECT, reason: "Repaid by bank transfer today" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(words);
    }
  });

  it("is finance's alone", async () => {
    access = { state: "forbidden" };
    const result = await overrideChargebackHold({ kind: "arrangement", subjectId: SUBJECT, reason: "Recovery plan agreed with the lister" });
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});
