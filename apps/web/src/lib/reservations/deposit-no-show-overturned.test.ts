/**
 * Founder ruling, 13 October 2026: a no-show that is overturned means the
 * table deposit goes back (migration fm01). The database moves a deposit
 * kept for a no-show to `refund_due` when the reservation goes NO_SHOW ->
 * COMPLETED (Vallo resolving a seating dispute as seated, or the restaurant
 * correcting its own tap), and the existing hourly refund job sends every
 * `refund_due` deposit back through the one refund path. The guest-facing
 * words say so in all four languages.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";

const FM01 = readFileSync(
  join(__dirname, "../../../../../supabase/migrations/20261013204808_fm01_no_show_overturned_refunds_deposit.sql"),
  "utf8",
);
const REFUND_JOB = readFileSync(join(__dirname, "deposit-settlement.ts"), "utf8");

describe("an overturned no-show refunds the table deposit (migration fm01)", () => {
  it("moves only a deposit kept for a no-show, on NO_SHOW -> COMPLETED, with an audit row", () => {
    const outcome = FM01.slice(
      FM01.indexOf("function private.reservation_deposit_outcome"),
      FM01.indexOf("function private.notify_reservation_deposit"),
    );
    expect(outcome).toMatch(/old\.status = 'NO_SHOW' and new\.status = 'COMPLETED'/);
    expect(outcome).toMatch(/status = 'forfeited' and outcome_reason = 'no_show'/);
    expect(outcome).toMatch(/set status = 'refund_due', decided_at = now\(\), outcome_reason = 'no_show_overturned'/);
    expect(outcome).toMatch(/'reservation\.deposit_refund_due'/);
    // A late cancellation's kept deposit is never matched.
    expect(outcome).not.toMatch(/outcome_reason = 'guest_cancelled_late'[^;]*refund_due/);
  });

  it("tells both sides with the existing rd01 notices, saying why", () => {
    const notice = FM01.slice(FM01.indexOf("function private.notify_reservation_deposit"));
    expect(notice).toMatch(/guest_title := 'Deposit coming back'/);
    expect(notice).toMatch(/venue_title := 'Deposit going back'/);
    expect(notice).toMatch(/new\.outcome_reason = 'no_show_overturned'/);
    expect(notice).toMatch(/private\.notify_once\(key_base \|\| ':guest'/);
    expect(notice).not.toMatch(/—/);
  });

  it("adds no new money flow: the hourly job sends every refund_due deposit through the one refund path", () => {
    expect(REFUND_JOB).toMatch(/\.eq\("status", "refund_due"\)/);
    expect(REFUND_JOB).toMatch(/refundChargeToCard\(admin, \{ reference, reason: `table_deposit:\$\{reason\}`/);
    expect(FM01).not.toMatch(/\bdrop\s+(table|function|constraint|trigger|index)\b/i);
    expect(FM01).not.toMatch(/\bdelete\s+from\b/i);
    expect(FM01).not.toMatch(/feature_flags/);
  });

  it("says an overturned no-show is refunded, to the guest and the venue, in four languages", () => {
    const words = {
      en: /overturned/,
      yo: /yí àìwá/,
      ig: /gbanwee mkpebi/,
      ha: /soke hukuncin rashin zuwa/,
    } as const;
    for (const [locale, re] of Object.entries(words) as [keyof typeof words, RegExp][]) {
      const d = getDictionary(locale).tableDeposits;
      expect(d.page.afterKept).toMatch(re);
      expect(d.desk.refundHint).toMatch(re);
    }
  });
});
