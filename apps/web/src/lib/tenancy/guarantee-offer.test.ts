import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canAskGuarantee, guaranteeBpsOf } from "./model";

/**
 * THE TENANCY FILE OFFERS THE GUARANTEE ONLY WHERE A CONTRIBUTION WAS TAKEN
 * (A9, D51).
 *
 * `canEscalate` was true on every tenancy whose caution was overdue, so the
 * caution screen told a tenant whose payment carried no contribution that
 * "Vallo can review it as a Vallo Guarantee claim" and offered "Claim it from
 * the Vallo Guarantee". The Guarantee is retired; the offer now stands only
 * where the frozen terms carried a non-zero `guarantee_bps`, or a claim
 * already exists, which is the gate the agreement page puts on its claims.
 */
const overdue = {
  viewer: "tenant" as const,
  today: "2026-10-06",
  dueOn: "2026-09-30",
  claimableMinor: 50_000_00,
  claimFiled: false,
  claimOpen: false,
};

describe("canAskGuarantee", () => {
  it("offers it on an overdue caution whose payment carried a contribution", () => {
    expect(canAskGuarantee({ ...overdue, guaranteeBps: 150 })).toBe(true);
  });

  it("never offers it on a payment made after the Guarantee was retired", () => {
    expect(canAskGuarantee({ ...overdue, guaranteeBps: 0 })).toBe(false);
    /* Terms with no rate, or terms that could not be read, are not a contribution. */
    expect(canAskGuarantee({ ...overdue, guaranteeBps: null })).toBe(false);
  });

  it("still shows a claim already filed, whatever the rate", () => {
    expect(canAskGuarantee({ ...overdue, guaranteeBps: 0, claimFiled: true })).toBe(true);
    /* A claim waiting for staff shows its own line, never the button. */
    expect(canAskGuarantee({ ...overdue, guaranteeBps: 150, claimFiled: true, claimOpen: true })).toBe(false);
  });

  it("keeps the old conditions: the tenant, after the due date, with something claimable", () => {
    expect(canAskGuarantee({ ...overdue, guaranteeBps: 150, viewer: "lister" })).toBe(false);
    expect(canAskGuarantee({ ...overdue, guaranteeBps: 150, today: "2026-09-30" })).toBe(false);
    expect(canAskGuarantee({ ...overdue, guaranteeBps: 150, claimableMinor: 0 })).toBe(false);
  });
});

describe("guaranteeBpsOf", () => {
  it("reads the frozen rate from an agreement row's terms", () => {
    expect(guaranteeBpsOf({ terms: { guarantee_bps: 150 } })).toBe(150);
    expect(guaranteeBpsOf({ terms: { guarantee_bps: "150" } })).toBe(150);
    expect(guaranteeBpsOf({ terms: { guarantee_bps: 0 } })).toBe(0);
  });
  it("is null when there is no row, no terms or no rate", () => {
    expect(guaranteeBpsOf(null)).toBeNull();
    expect(guaranteeBpsOf({ terms: {} })).toBeNull();
    expect(guaranteeBpsOf({ terms: { guarantee_bps: "" } })).toBeNull();
    expect(guaranteeBpsOf({ terms: null })).toBeNull();
  });
});

describe("the tenancy file asks through that gate", () => {
  it("sets canEscalate from canAskGuarantee and the agreement's frozen terms", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/tenancy/queries.ts"), "utf8");
    const at = source.indexOf("canEscalate:");
    expect(at).toBeGreaterThan(-1);
    const expression = source.slice(at, source.indexOf("deductions,", at));
    expect(expression).toContain("canAskGuarantee(");
    expect(expression).toContain("guaranteeBps: guaranteeBpsOf(");
    expect(source).toMatch(/from\("deal_agreements"\)\.select\("terms"\)/);
  });
});
