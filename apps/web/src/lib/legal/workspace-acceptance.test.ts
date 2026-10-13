import { describe, expect, it } from "vitest";
import { PAY_ON_VALLO_VERSION, PRIVACY_VERSION, TERMS_VERSION } from "./versions";
import {
  acceptedVersion,
  bothTicked,
  payOnValloAccepted,
  withWorkspaceAcceptance,
  workspaceAcceptanceEntries,
} from "./workspace-acceptance";

/* Founder ruling 6 (13 October 2026): the acceptance every workspace
   application and setup records, in the host publish step's own shape. */
describe("the workspace acceptance record", () => {
  const at = "2026-10-13T10:00:00.000Z";

  it("records the Terms, the Privacy Policy and the pay-on-Vallo statement, each with its version and the moment", () => {
    expect(workspaceAcceptanceEntries(at)).toEqual([
      { document: "terms", version: TERMS_VERSION, at },
      { document: "privacy", version: PRIVACY_VERSION, at },
      { document: "pay_on_vallo", version: PAY_ON_VALLO_VERSION, at },
    ]);
  });

  it("appends to what is on record and keeps every other consent", () => {
    const before = { terms: "2026-09-18T08:00:00Z", agreements: [{ document: "host_agreement", version: "2026-10-13", at: "x" }] };
    const after = withWorkspaceAcceptance(before, at);
    expect(after.terms).toBe("2026-09-18T08:00:00Z");
    expect((after.agreements as unknown[]).length).toBe(4);
    expect(withWorkspaceAcceptance(null, at)).toEqual({ agreements: workspaceAcceptanceEntries(at) });
  });

  it("reads the newest version, skipping malformed entries", () => {
    const consents = {
      agreements: [
        { document: "pay_on_vallo", version: "2026-01-01", at: "2026-01-01T00:00:00Z" },
        { document: "pay_on_vallo", version: PAY_ON_VALLO_VERSION, at: "2026-10-13T00:00:00Z" },
        { document: "pay_on_vallo", version: 7, at: "2027-01-01T00:00:00Z" },
        null,
      ],
    };
    expect(acceptedVersion(consents, "pay_on_vallo")).toBe(PAY_ON_VALLO_VERSION);
    expect(payOnValloAccepted(consents)).toBe(true);
    expect(payOnValloAccepted({ agreements: [] })).toBe(false);
    expect(payOnValloAccepted(null)).toBe(false);
    expect(acceptedVersion("nonsense", "terms")).toBeNull();
  });

  it("needs both ticks, as true, not as truthy", () => {
    expect(bothTicked({ acceptTerms: true, acceptPayOnVallo: true })).toBe(true);
    expect(bothTicked({ acceptTerms: true })).toBe(false);
    expect(bothTicked({ acceptTerms: "on", acceptPayOnVallo: "on" })).toBe(false);
  });
});
