import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMPTY_RECORD,
  clockText,
  parseRecord,
  remainingShare,
  resendState,
  secondsLeft,
  windowEnd,
  withRefusal,
  withSend,
} from "./resend-clock";
import { RESEND_RULES } from "./resend-rule";
import { RESEND_WAIT_SECONDS } from "@/lib/auth/mail-app";

const rule = RESEND_RULES.signUp;
/* An instant that is exactly on a 900s window boundary, so the arithmetic below reads plainly. */
const T0 = 1_700_000_100_000 - (1_700_000_100_000 % (900 * 1000));

describe("the resend rules are the server's", () => {
  /* The numbers live as literals inside server modules that may only export
     async functions, so they cannot be imported; this reads the three call
     sites and fails if either side moves without the other. */
  const src = (path: string) => readFileSync(join(process.cwd(), "src", path), "utf8");

  it("sign up resend: three in 900 seconds, per address", () => {
    expect(src("lib/auth/actions.ts")).toMatch(/throttle\("sign_up_resend", subjectForEmail\(email\), 3, 900\)/);
    expect(RESEND_RULES.signUp).toMatchObject({ limit: 3, windowSeconds: 900 });
  });

  it("email code: five in 3,600 seconds, per address", () => {
    expect(src("lib/auth/email-code.ts")).toMatch(
      /bucket: "email_code_send_address", subject: subjectForEmail\(email\), limit: 5, windowSeconds: 3_600/,
    );
    expect(RESEND_RULES.emailCode).toMatchObject({ limit: 5, windowSeconds: 3_600 });
  });

  it("phone code: four in 3,600 seconds, per number", () => {
    expect(src("lib/auth/phone-sign-in.ts")).toMatch(
      /bucket: "phone_code_send_number", subject: `phone:\$\{phone\}`, limit: 4, windowSeconds: 3_600/,
    );
    expect(RESEND_RULES.phoneCode).toMatchObject({ limit: 4, windowSeconds: 3_600 });
  });

  it("the pace is the screen's own constant, not a number typed here", () => {
    for (const r of Object.values(RESEND_RULES)) expect(r.gapSeconds).toBe(RESEND_WAIT_SECONDS);
  });

  it("the windows are aligned to the epoch, as the migration's floor(now / window) is", () => {
    expect(src("../../../supabase/migrations/20260730013645_rate_limits_and_idempotency.sql")).toContain(
      "floor(extract(epoch from now()) / consume_rate_limit.window_seconds)",
    );
  });
});

describe("the resend clock", () => {
  it("is ready when nothing is known: no deadline is invented", () => {
    expect(resendState(EMPTY_RECORD, T0 + 5_000, rule)).toEqual({ kind: "ready" });
  });

  it("waits out the pace from the real send, and no longer", () => {
    const sent = withSend(EMPTY_RECORD, T0 + 1_000, rule, "first");
    const during = resendState(sent, T0 + 11_000, rule);
    expect(during).toEqual({ kind: "gap", from: T0 + 1_000, until: T0 + 31_000 });
    expect(secondsLeft(during, T0 + 11_000)).toBe(20);
    expect(resendState(sent, T0 + 31_000, rule)).toEqual({ kind: "ready" });
  });

  it("a reload does not restart the pace: the remainder comes from the send's own time", () => {
    const sent = withSend(EMPTY_RECORD, T0 + 1_000, rule, "first");
    const reloaded = parseRecord(JSON.stringify(sent));
    expect(secondsLeft(resendState(reloaded, T0 + 21_000, rule), T0 + 21_000)).toBe(10);
  });

  it("never shows 0s while a wait is on", () => {
    const sent = withSend(EMPTY_RECORD, T0, rule, "first");
    const almost = resendState(sent, T0 + 29_999, rule);
    expect(almost.kind).toBe("gap");
    expect(secondsLeft(almost, T0 + 29_999)).toBe(1);
  });

  it("three resends spend the window, and it ends on the window's real boundary", () => {
    let record = EMPTY_RECORD;
    record = withSend(record, T0 + 10_000, rule, "first");
    for (const at of [60_000, 120_000, 180_000]) record = withSend(record, T0 + at, rule, "resend");
    const state = resendState(record, T0 + 240_000, rule);
    expect(state).toEqual({ kind: "window", from: T0, until: T0 + 900_000 });
    expect(secondsLeft(state, T0 + 240_000)).toBe(660);
    /* The next window starts clean. */
    expect(resendState(record, T0 + 900_000, rule)).toEqual({ kind: "ready" });
  });

  it("the first send does not count against the ceiling, a resend does", () => {
    let record = withSend(EMPTY_RECORD, T0, rule, "first");
    record = withSend(record, T0 + 40_000, rule, "resend");
    record = withSend(record, T0 + 80_000, rule, "resend");
    /* Two resends: one left. */
    expect(resendState(record, T0 + 200_000, rule).kind).toBe("ready");
  });

  it("on the code sign-in doors the opening send spends the ceiling too, as the server's bucket does", () => {
    /* `email_code_send_address` and `phone_code_send_number` are consumed by
       the send action, and the opening send IS that action: five sends an
       hour by email is the opening one and four resends, so after the fourth
       resend the screen must not offer a fifth the server would refuse. */
    const email = RESEND_RULES.emailCode;
    const H = 1_700_002_800_000 - (1_700_002_800_000 % (3_600 * 1000));
    let record = withSend(EMPTY_RECORD, H, email, "first");
    for (let i = 1; i <= 3; i++) record = withSend(record, H + i * 60_000, email, "resend");
    /* The opening send and three resends: one left, ready once the pace is out. */
    expect(resendState(record, H + 300_000, email).kind).toBe("ready");
    record = withSend(record, H + 240_000, email, "resend");
    expect(resendState(record, H + 300_000, email)).toEqual({ kind: "window", from: H, until: H + 3_600_000 });

    const phone = RESEND_RULES.phoneCode;
    let sms = withSend(EMPTY_RECORD, H, phone, "first");
    for (let i = 1; i <= 3; i++) sms = withSend(sms, H + i * 60_000, phone, "resend");
    expect(resendState(sms, H + 300_000, phone).kind).toBe("window");
  });

  it("only the code sign-in doors count the opening send; sign up's first code goes out with the sign-up", () => {
    expect(RESEND_RULES.emailCode.countsFirst).toBe(true);
    expect(RESEND_RULES.phoneCode.countsFirst).toBe(true);
    expect(RESEND_RULES.signUp.countsFirst).toBe(false);
  });

  it("a refusal from the server is the window spent, whatever the screen counted", () => {
    const record = withRefusal(withSend(EMPTY_RECORD, T0 + 5_000, rule, "first"), T0 + 100_000);
    expect(resendState(record, T0 + 200_000, rule)).toEqual({ kind: "window", from: T0, until: T0 + 900_000 });
    /* ...and only that window's. */
    expect(resendState(record, T0 + 900_000 + 31_000, rule).kind).toBe("ready");
  });

  it("an accepted send after a refusal in an earlier window clears it", () => {
    const refused = withRefusal(EMPTY_RECORD, T0 + 100_000);
    const after = withSend(refused, T0 + 1_000_000, rule, "resend");
    expect(after.refusedAt).toBeNull();
  });

  it("windowEnd is the next epoch-aligned boundary", () => {
    expect(windowEnd(T0 + 1, 900)).toBe(T0 + 900_000);
    expect(windowEnd(T0 + 899_999, 900)).toBe(T0 + 900_000);
    expect(windowEnd(T0 + 900_000, 900)).toBe(T0 + 1_800_000);
  });

  it("the share drains from 1 to 0 across the wait", () => {
    const sent = withSend(EMPTY_RECORD, T0, rule, "first");
    const state = resendState(sent, T0 + 1, rule);
    expect(remainingShare(state, T0)).toBe(1);
    expect(remainingShare(state, T0 + 15_000)).toBeCloseTo(0.5, 5);
    expect(remainingShare(state, T0 + 30_000)).toBe(0);
    expect(remainingShare({ kind: "ready" }, T0)).toBe(0);
  });

  it("trims old resends so the record stays small", () => {
    let record = EMPTY_RECORD;
    for (let i = 0; i < 6; i += 1) record = withSend(record, T0 + i * 1_000_000, rule, "resend");
    expect(record.resends.length).toBeLessThanOrEqual(2);
  });

  it("reads a damaged record as empty rather than throwing", () => {
    expect(parseRecord("not json")).toEqual(EMPTY_RECORD);
    expect(parseRecord('{"lastSentAt":"yesterday"}')).toEqual(EMPTY_RECORD);
    expect(parseRecord(null)).toEqual(EMPTY_RECORD);
  });

  it("draws a clock: seconds under a minute, minutes and seconds above", () => {
    expect(clockText(7)).toBe("7s");
    expect(clockText(60)).toBe("1:00");
    expect(clockText(724)).toBe("12:04");
  });
});
