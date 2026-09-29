import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ABANDON_AFTER_MINUTES,
  decideReuse,
  isAttemptInFlight,
  judgeAttempt,
  pickReusableAttempt,
  type ExpectedCharge,
  type ReusableRow,
} from "./attempt-rules";

const NOW = Date.parse("2026-09-29T12:00:00Z");
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

function attempt(over: Partial<ReusableRow> = {}): ReusableRow {
  return {
    id: "tx-1",
    provider_ref: "rm-book-1",
    status: "PENDING",
    created_at: ago(5),
    checkout_opened_at: ago(5),
    processor_status: null,
    processor_checked_at: null,
    access_code: "acc_1",
    authorization_url: "https://checkout.paystack.com/acc_1",
    amount_minor: 200_000,
    agreement_id: "ag-1",
    payee_subaccount_code: "ACCT_lister",
    reserve_subaccount_code: "ACCT_reserve",
    lister_share_minor: 197_000,
    guarantee_minor: 3_000,
    commission_minor: 0,
    paystack_mode: "live",
    ...over,
  };
}

const expected: ExpectedCharge = {
  agreementId: "ag-1",
  amountMinor: 200_000,
  payeeSubaccount: "ACCT_lister",
  reserveSubaccount: "ACCT_reserve",
  listerShareMinor: 197_000,
  guaranteeMinor: 3_000,
  commissionMinor: 0,
  mode: "live",
};

describe("payment_in_flight: only attempts genuinely in flight", () => {
  it("a PENDING attempt opened a few minutes ago is in flight", () => {
    expect(isAttemptInFlight(attempt(), NOW)).toBe(true);
  });

  it("an abandoned-by-the-clock attempt (past the window, no processor word) is not", () => {
    expect(isAttemptInFlight(attempt({ created_at: ago(50), checkout_opened_at: null }), NOW)).toBe(false);
    expect(isAttemptInFlight(attempt({ created_at: ago(ABANDON_AFTER_MINUTES + 1), checkout_opened_at: null }), NOW)).toBe(false);
  });

  it("the window runs from the last time the payer was handed the checkout", () => {
    expect(isAttemptInFlight(attempt({ created_at: ago(90), checkout_opened_at: ago(10) }), NOW)).toBe(true);
  });

  it("an old attempt Paystack recently said is still moving is in flight", () => {
    expect(
      isAttemptInFlight(attempt({ created_at: ago(180), checkout_opened_at: null, processor_status: "ongoing", processor_checked_at: ago(5) }), NOW),
    ).toBe(true);
  });

  it("a stale 'still moving' answer, or one past the 24-hour ceiling, does not count", () => {
    expect(
      isAttemptInFlight(attempt({ created_at: ago(300), checkout_opened_at: null, processor_status: "ongoing", processor_checked_at: ago(180) }), NOW),
    ).toBe(false);
    expect(
      isAttemptInFlight(attempt({ created_at: ago(25 * 60), checkout_opened_at: null, processor_status: "pending", processor_checked_at: ago(1) }), NOW),
    ).toBe(false);
  });

  it("a verified-abandoned attempt is never in flight, however fresh", () => {
    expect(isAttemptInFlight(attempt({ status: "ABANDONED" }), NOW)).toBe(false);
    expect(isAttemptInFlight(attempt({ status: "FAILED" }), NOW)).toBe(false);
    expect(isAttemptInFlight(attempt({ status: "SUCCESSFUL" }), NOW)).toBe(false);
  });

  it("an 'abandoned' processor word on a fresh PENDING attempt does not end it early (the payer may be on the page)", () => {
    expect(isAttemptInFlight(attempt({ processor_status: "abandoned", processor_checked_at: ago(1) }), NOW)).toBe(true);
  });

  it("uses the same windows as the SQL predicate", () => {
    const sql = readFileSync(
      new URL(
        "../../../../../supabase/migrations/20260928235824_pay_attempts_2_reuse_abandon_and_one_in_flight_predicate.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(sql).toContain(`interval '${ABANDON_AFTER_MINUTES} minutes'`);
    expect(sql).toContain("('ongoing', 'pending', 'processing', 'queued')");
    expect(sql).toContain("interval '2 hours'");
    expect(sql).toContain("interval '24 hours'");
  });
});

describe("a retry reuses the live attempt for the same charge", () => {
  it("reuses a live attempt with a checkout handle", () => {
    expect(pickReusableAttempt([attempt()], expected, NOW)?.id).toBe("tx-1");
  });

  it("picks the most recently opened when there are several", () => {
    const rows = [attempt({ id: "old", checkout_opened_at: ago(20) }), attempt({ id: "new", checkout_opened_at: ago(2) })];
    expect(pickReusableAttempt(rows, expected, NOW)?.id).toBe("new");
  });

  it("does not reuse a different charge", () => {
    expect(pickReusableAttempt([attempt({ amount_minor: 199_999 })], expected, NOW)).toBeNull();
    expect(pickReusableAttempt([attempt({ agreement_id: "ag-2" })], expected, NOW)).toBeNull();
    expect(pickReusableAttempt([attempt({ payee_subaccount_code: "ACCT_other" })], expected, NOW)).toBeNull();
    expect(pickReusableAttempt([attempt({ guarantee_minor: 2_000, lister_share_minor: 198_000 })], expected, NOW)).toBeNull();
  });

  it("never reuses across payers: a flatmate share only resumes its own payer's attempt", () => {
    const share = attempt({ share_payer_id: "flatmate-a" });
    expect(pickReusableAttempt([share], expected, NOW)).toBeNull();
    expect(pickReusableAttempt([share], { ...expected, sharePayerId: "flatmate-b" }, NOW)).toBeNull();
    expect(pickReusableAttempt([share], { ...expected, sharePayerId: "flatmate-a" }, NOW)?.id).toBe("tx-1");
    expect(pickReusableAttempt([attempt()], { ...expected, sharePayerId: "flatmate-a" }, NOW)).toBeNull();
  });

  it("does not reuse across Paystack modes (a row with no mode counts as live)", () => {
    expect(pickReusableAttempt([attempt({ paystack_mode: "test" })], expected, NOW)).toBeNull();
    expect(pickReusableAttempt([attempt({ paystack_mode: null })], expected, NOW)?.id).toBe("tx-1");
    expect(pickReusableAttempt([attempt({ paystack_mode: null })], { ...expected, mode: "test" }, NOW)).toBeNull();
  });

  it("does not reuse a closed attempt, one with no handle, or one past the reuse windows", () => {
    expect(pickReusableAttempt([attempt({ status: "ABANDONED" })], expected, NOW)).toBeNull();
    expect(pickReusableAttempt([attempt({ access_code: null })], expected, NOW)).toBeNull();
    expect(pickReusableAttempt([attempt({ checkout_opened_at: ago(31) })], expected, NOW)).toBeNull();
    expect(pickReusableAttempt([attempt({ created_at: ago(121), checkout_opened_at: ago(1) })], expected, NOW)).toBeNull();
  });
});

describe("closing an attempt on Paystack's word", () => {
  const fresh = { openedAt: NOW - 5 * 60_000, now: NOW };
  const stale = { openedAt: NOW - 50 * 60_000, now: NOW };

  it("payer closed + abandoned: ABANDONED at once", () => {
    expect(judgeAttempt({ kind: "status", status: "abandoned" }, { ...fresh, payerClosed: true })).toEqual({
      action: "abandon",
      reason: "payer_closed",
      processorStatus: "abandoned",
    });
  });

  it("payer closed + failed: FAILED", () => {
    expect(judgeAttempt({ kind: "status", status: "failed" }, { ...fresh, payerClosed: true }).action).toBe("fail");
  });

  it("payer closed + not found: ABANDONED", () => {
    expect(judgeAttempt({ kind: "not-found" }, { ...fresh, payerClosed: true }).action).toBe("abandon");
  });

  it("success settles, whoever asks", () => {
    expect(judgeAttempt({ kind: "status", status: "success" }, { ...fresh, payerClosed: true }).action).toBe("settle");
    expect(judgeAttempt({ kind: "status", status: "success" }, { ...stale, payerClosed: false }).action).toBe("settle");
  });

  it("no usable answer (network error) keeps it PENDING, even when the payer closed", () => {
    expect(judgeAttempt({ kind: "unknown" }, { ...fresh, payerClosed: true })).toEqual({ action: "keep", processorStatus: null });
    expect(judgeAttempt({ kind: "unknown" }, { ...stale, payerClosed: false }).action).toBe("keep");
  });

  it("a charge still moving is never closed", () => {
    for (const status of ["ongoing", "pending", "processing", "queued", "something_new"]) {
      expect(judgeAttempt({ kind: "status", status }, { ...stale, payerClosed: true }).action).toBe("keep");
    }
  });

  it("the sweep closes 'abandoned' or 'not found' only past the window", () => {
    expect(judgeAttempt({ kind: "status", status: "abandoned" }, { ...fresh, payerClosed: false }).action).toBe("keep");
    expect(judgeAttempt({ kind: "status", status: "abandoned" }, { ...stale, payerClosed: false })).toMatchObject({
      action: "abandon",
      reason: "sweep_abandoned",
    });
    expect(judgeAttempt({ kind: "not-found" }, { ...fresh, payerClosed: false }).action).toBe("keep");
    expect(judgeAttempt({ kind: "not-found" }, { ...stale, payerClosed: false })).toMatchObject({ reason: "sweep_not_found" });
  });
});

describe("what a retry does with the live attempt", () => {
  it("reuses an open checkout ('abandoned' is Paystack's word for opened and unpaid)", () => {
    expect(decideReuse({ kind: "status", status: "abandoned" }).action).toBe("reuse");
    expect(decideReuse({ kind: "status", status: "ongoing" }).action).toBe("reuse");
  });
  it("reuses on no usable answer rather than opening a second checkout", () => {
    expect(decideReuse({ kind: "unknown" }).action).toBe("reuse");
  });
  it("settles a paid one and opens nothing", () => {
    expect(decideReuse({ kind: "status", status: "success" }).action).toBe("settle");
  });
  it("replaces a failed or unknown-to-Paystack one", () => {
    expect(decideReuse({ kind: "status", status: "failed" })).toMatchObject({ action: "replace", verdict: { action: "fail" } });
    expect(decideReuse({ kind: "not-found" })).toMatchObject({ action: "replace", verdict: { action: "abandon" } });
  });
});
