import { describe, expect, it } from "vitest";
import { describePaystackMode, reserveSubaccountFor, selectPaystack } from "./paystack-mode";

/* Placeholder keys only. No real key appears in this repository. */
const LIVE = "sk_live_placeholder";
const TEST = "sk_test_placeholder";

describe("Paystack mode selection", () => {
  it("Production with no PAYSTACK_MODE is live on the live key, even with a test key present", () => {
    const s = selectPaystack({ VERCEL_ENV: "production", PAYSTACK_SECRET_KEY: LIVE, PAYSTACK_TEST_SECRET_KEY: TEST });
    expect(s).toMatchObject({ mode: "live", secretKey: LIVE, source: "production-default", problem: null });
  });

  it("Preview uses the test key when it is present", () => {
    const s = selectPaystack({ VERCEL_ENV: "preview", PAYSTACK_SECRET_KEY: LIVE, PAYSTACK_TEST_SECRET_KEY: TEST });
    expect(s).toMatchObject({ mode: "test", secretKey: TEST, keyVariable: "PAYSTACK_TEST_SECRET_KEY" });
  });

  it("Development (no VERCEL_ENV) uses the test key when it is present", () => {
    expect(selectPaystack({ PAYSTACK_SECRET_KEY: LIVE, PAYSTACK_TEST_SECRET_KEY: TEST }).mode).toBe("test");
  });

  it("outside Production, a live key alone is refused unless PAYSTACK_MODE=live says so", () => {
    const refused = selectPaystack({ VERCEL_ENV: "preview", PAYSTACK_SECRET_KEY: LIVE });
    expect(refused).toMatchObject({ mode: "live", secretKey: "", source: "non-production-fallback" });
    expect(refused.problem).toMatch(/PAYSTACK_MODE=live/);
    expect(selectPaystack({ PAYSTACK_SECRET_KEY: LIVE }).secretKey).toBe("");
    expect(selectPaystack({ PAYSTACK_SECRET_KEY: "unprefixed" }).secretKey).toBe("");
    expect(selectPaystack({ VERCEL_ENV: "preview", PAYSTACK_MODE: "live", PAYSTACK_SECRET_KEY: LIVE }).secretKey).toBe(LIVE);
  });

  it("outside Production, a test key in the one slot is used as test", () => {
    expect(selectPaystack({ VERCEL_ENV: "preview", PAYSTACK_SECRET_KEY: TEST })).toMatchObject({
      mode: "test",
      secretKey: TEST,
      source: "non-production-fallback",
    });
  });

  it("PAYSTACK_MODE=test on Production is refused without the explicit opt-in", () => {
    const env = { VERCEL_ENV: "production", PAYSTACK_MODE: "test", PAYSTACK_SECRET_KEY: LIVE, PAYSTACK_TEST_SECRET_KEY: TEST };
    const refused = selectPaystack(env);
    expect(refused.secretKey).toBe("");
    expect(refused.problem).toMatch(/PAYSTACK_ALLOW_TEST_MODE_IN_PRODUCTION/);
    expect(selectPaystack({ ...env, PAYSTACK_ALLOW_TEST_MODE_IN_PRODUCTION: "1" }).secretKey).toBe("");
    expect(selectPaystack({ ...env, PAYSTACK_ALLOW_TEST_MODE_IN_PRODUCTION: "yes" })).toMatchObject({
      mode: "test",
      secretKey: TEST,
      source: "explicit",
    });
  });

  it("PAYSTACK_MODE=test with no test key is not configured, and never falls back to live", () => {
    const s = selectPaystack({
      VERCEL_ENV: "production",
      PAYSTACK_MODE: "test",
      PAYSTACK_ALLOW_TEST_MODE_IN_PRODUCTION: "yes",
      PAYSTACK_SECRET_KEY: LIVE,
    });
    expect(s.secretKey).toBe("");
    expect(s.mode).toBe("test");
    expect(s.problem).toMatch(/PAYSTACK_TEST_SECRET_KEY/);
  });

  it("PAYSTACK_MODE=live on Preview uses the live key", () => {
    const s = selectPaystack({
      VERCEL_ENV: "preview",
      PAYSTACK_MODE: " LIVE ",
      PAYSTACK_SECRET_KEY: LIVE,
      PAYSTACK_TEST_SECRET_KEY: TEST,
    });
    expect(s).toMatchObject({ mode: "live", secretKey: LIVE });
  });

  it("refuses a key whose prefix contradicts the mode", () => {
    expect(selectPaystack({ PAYSTACK_MODE: "test", PAYSTACK_TEST_SECRET_KEY: LIVE }).secretKey).toBe("");
    expect(selectPaystack({ PAYSTACK_TEST_SECRET_KEY: LIVE, PAYSTACK_SECRET_KEY: TEST }).secretKey).toBe("");
    expect(selectPaystack({ PAYSTACK_MODE: "live", PAYSTACK_SECRET_KEY: TEST }).secretKey).toBe("");
    expect(selectPaystack({ VERCEL_ENV: "production", PAYSTACK_SECRET_KEY: TEST }).problem).toMatch(/test key/);
  });

  it("refuses an unknown PAYSTACK_MODE", () => {
    const s = selectPaystack({ PAYSTACK_MODE: "sandbox", PAYSTACK_SECRET_KEY: LIVE, PAYSTACK_TEST_SECRET_KEY: TEST });
    expect(s.secretKey).toBe("");
    expect(s.problem).toMatch(/live or test/);
  });

  it("no key at all is not configured", () => {
    expect(selectPaystack({}).secretKey).toBe("");
  });

  it("reads the reserve subaccount for the mode, with no cross-mode fallback", () => {
    const env = { PAYSTACK_GUARANTEE_SUBACCOUNT: "ACCT_live", PAYSTACK_TEST_GUARANTEE_SUBACCOUNT: " ACCT_test " };
    expect(reserveSubaccountFor(env, "live")).toBe("ACCT_live");
    expect(reserveSubaccountFor(env, "test")).toBe("ACCT_test");
    expect(reserveSubaccountFor({ PAYSTACK_GUARANTEE_SUBACCOUNT: "ACCT_live" }, "test")).toBeNull();
  });

  it("the admin line names the mode and the variable, never the key", () => {
    const line = describePaystackMode(
      selectPaystack({ VERCEL_ENV: "preview", PAYSTACK_TEST_SECRET_KEY: TEST, PAYSTACK_SECRET_KEY: LIVE }),
    );
    expect(line).toMatch(/TEST/);
    expect(line).toMatch(/PAYSTACK_TEST_SECRET_KEY/);
    expect(line).not.toContain(TEST);
    expect(line).not.toContain(LIVE);
    expect(describePaystackMode(selectPaystack({ VERCEL_ENV: "production", PAYSTACK_SECRET_KEY: LIVE }))).toMatch(/LIVE/);
  });
});
