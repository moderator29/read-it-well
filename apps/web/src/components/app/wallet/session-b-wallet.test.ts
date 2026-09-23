import { afterEach, describe, expect, it } from "vitest";
import { counterpartyLine } from "./counterparty";
import { createSubmitGuard } from "./submit-guard";
import { BALANCE_MASK_KEY, readBalanceMask, writeBalanceMask } from "./balance-mask";

describe("counterpartyLine", () => {
  it("drops the word the row title already carries", () => {
    expect(counterpartyLine("Transfer to Tunde Adebayo")).toBe("To Tunde Adebayo");
    expect(counterpartyLine("Transfer from Chidinma Okafor")).toBe("From Chidinma Okafor");
  });
  it("leaves every other note exactly as written", () => {
    expect(counterpartyLine("Hotel booking")).toBe("Hotel booking");
    expect(counterpartyLine(undefined)).toBeUndefined();
  });
});

describe("balance mask", () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown };
  afterEach(() => {
    store.clear();
    delete g.window;
  });

  it("round-trips through this device's storage", () => {
    g.window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    };
    expect(readBalanceMask()).toBe(false);
    writeBalanceMask(true);
    expect(store.get(BALANCE_MASK_KEY)).toBe("1");
    expect(readBalanceMask()).toBe(true);
    writeBalanceMask(false);
    expect(readBalanceMask()).toBe(false);
  });

  it("answers shown, and does not throw, when storage is blocked", () => {
    g.window = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      },
    };
    expect(readBalanceMask()).toBe(false);
    expect(() => writeBalanceMask(true)).not.toThrow();
  });
});


describe("submit guard", () => {
  it("lets exactly one of two same-frame taps through", () => {
    const guard = createSubmitGuard();
    expect(guard.tryEnter()).toBe(true);
    expect(guard.tryEnter()).toBe(false);
    expect(guard.isBusy()).toBe(true);
  });
  it("opens again once the result has returned", () => {
    const guard = createSubmitGuard();
    guard.tryEnter();
    guard.release();
    expect(guard.tryEnter()).toBe(true);
  });
});

describe("the way back from the money pages (R14)", () => {
  it("resolves to each page's declared parent", async () => {
    const { parentOf } = await import("@/lib/nav/resolve");
    expect(parentOf("/wallet")).toMatchObject({ kind: "parent", href: "/home" });
    expect(parentOf("/wallet/send")).toMatchObject({ kind: "parent", href: "/wallet" });
  });
});
