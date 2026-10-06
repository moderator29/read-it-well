import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const flags = vi.hoisted(() => ({ on: new Set<string>(), fail: false }));
vi.mock("../../flags/read", () => ({
  /* flagIsOn answers false on a failed read, which is what `fail` models. */
  flagIsOn: async (key: string) => (flags.fail ? false : flags.on.has(key)),
}));

const { providerEnabled, assertProviderEnabled, FiatProviderDisabled } = await import("./kill-switch");

describe("provider kill switch", () => {
  beforeEach(() => {
    flags.on.clear();
    flags.fail = false;
  });
  afterEach(() => {
    delete process.env.PAYMENTS_KILL_PAYSTACK;
    delete process.env.PAYMENTS_KILL_PAYLUK;
  });

  it("Paystack fails open: only an explicit off flag or the env kill stops it", async () => {
    expect(await providerEnabled("paystack")).toBe(true);
    flags.fail = true;
    expect(await providerEnabled("paystack")).toBe(true);
    flags.fail = false;
    flags.on.add("payments_paystack_off");
    expect(await providerEnabled("paystack")).toBe(false);
    flags.on.clear();
    process.env.PAYMENTS_KILL_PAYSTACK = "1";
    expect(await providerEnabled("paystack")).toBe(false);
  });

  it("Payluk fails closed: it runs only while its on flag is explicitly on", async () => {
    expect(await providerEnabled("payluk")).toBe(false);
    flags.on.add("payments_payluk_on");
    expect(await providerEnabled("payluk")).toBe(true);
    flags.fail = true;
    expect(await providerEnabled("payluk")).toBe(false);
    flags.fail = false;
    process.env.PAYMENTS_KILL_PAYLUK = "1";
    expect(await providerEnabled("payluk")).toBe(false);
    await expect(assertProviderEnabled("payluk")).rejects.toBeInstanceOf(FiatProviderDisabled);
  });
});
