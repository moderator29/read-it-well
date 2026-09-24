import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { landlordOnRecord, payeeCaption, type PayeeContext } from "./money-map";

const copy = getDictionary("en").afterTheGate.moneyMap;
const KEYS = ["rent", "caution", "agency", "legal", "agreement", "service"];

function captions(ctx: PayeeContext): string[] {
  return KEYS.map((key) => payeeCaption(key, ctx, copy) ?? "");
}

describe("the money map", () => {
  it("never says landlord without a dated record, whoever listed it", () => {
    for (const listerRole of ["owner", "agent", "firm", undefined] as const) {
      for (const listerName of ["Musa Okafor", undefined]) {
        const lines = captions({ listerRole, listerName, mandateVerified: false, ownershipVerified: false });
        for (const line of lines) {
          if (/landlord/i.test(line)) expect(line).toMatch(/No landlord is on record/);
        }
      }
    }
  });

  it("does not let an owner's mandate or an agent's ownership stand in for the right record", () => {
    expect(landlordOnRecord({ listerRole: "owner", mandateVerified: true, ownershipVerified: false })).toBeNull();
    expect(landlordOnRecord({ listerRole: "agent", mandateVerified: false, ownershipVerified: true })).toBeNull();
  });

  it("routes rent through a mandated agent to the landlord", () => {
    const ctx = { listerRole: "agent" as const, listerName: "Musa Okafor", mandateVerified: true, ownershipVerified: false };
    expect(payeeCaption("rent", ctx, copy)).toBe("Paid through Musa Okafor to the landlord");
    expect(payeeCaption("agency", ctx, copy)).toBe("Kept by Musa Okafor");
    expect(payeeCaption("caution", ctx, copy)).toContain("Owed back at the end of the tenancy");
  });

  it("names a verified owner as the landlord", () => {
    expect(payeeCaption("rent", { listerRole: "owner", mandateVerified: false, ownershipVerified: true }, copy)).toBe(
      "Paid to the landlord",
    );
  });

  it("falls back to words when no name is public", () => {
    expect(payeeCaption("rent", { listerRole: "agent", mandateVerified: false, ownershipVerified: false }, copy)).toBe(
      "Paid to the agent. No landlord is on record for this listing.",
    );
  });
});
