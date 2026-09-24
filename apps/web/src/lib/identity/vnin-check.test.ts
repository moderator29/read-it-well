import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@vallo/i18n";

import { isNin, isVnin, ninHmac, normaliseVnin } from "./nin";
import { identityProvider, stubProvider } from "./provider";
import { runVninCheck, type VninCheckDeps } from "./vnin-check";
import { payoutSuggestion } from "@/lib/admin/kyc-queries";

/**
 * V-49 proven with the STUB PROVIDER. The aggregator is founder question 4, so
 * every outcome is driven from fixtures; the database half (the rung moving,
 * one NIN one account, the hash never readable) is the rolled-back probe.
 */

const KEY = "k".repeat(40);
const TOKEN = "AB12CD34EF56GH78";

function deps(fixture: Parameters<typeof stubProvider>[0], recordAnswer = "passed") {
  const recorded: Parameters<VninCheckDeps["record"]>[0][] = [];
  const d: VninCheckDeps = {
    provider: stubProvider(fixture),
    hmac: (nin) => ninHmac(nin, KEY),
    record: vi.fn(async (r) => {
      recorded.push(r);
      return r.matched ? recordAnswer : "pending";
    }),
  };
  return { d, recorded };
}

const CLEAN = { ok: true as const, nin: "12345678901", legalName: "OKEKE CHIDI EMMANUEL", reference: "agg-1" };

describe("the NIN is handled, never kept", () => {
  it("accepts a sixteen-character virtual NIN, forgiving spaces and case", () => {
    expect(isVnin("ab12 cd34-ef56 gh78")).toBe(true);
    expect(normaliseVnin("ab12 cd34-ef56 gh78")).toBe(TOKEN);
    expect(isVnin("12345678901")).toBe(false);
    expect(isNin("12345678901")).toBe(true);
  });

  it("hashes with a key, the same NIN to the same hash, and refuses a short key", () => {
    expect(ninHmac("12345678901", KEY)).toMatch(/^[0-9a-f]{64}$/);
    expect(ninHmac("12345678901", KEY)).toBe(ninHmac("12345678901", KEY));
    expect(ninHmac("12345678901", KEY)).not.toBe(ninHmac("12345678901", "z".repeat(40)));
    expect(() => ninHmac("12345678901", "short")).toThrow();
  });
});

describe("runVninCheck", () => {
  it("passes a clean match and records only the hash of the NIN", async () => {
    const { d, recorded } = deps({ [TOKEN]: CLEAN });
    expect(await runVninCheck(d, { userId: "u", vnin: TOKEN, applicationName: "Chidi Okeke" })).toEqual({
      status: "passed",
    });
    expect(recorded[0]!.matched).toBe(true);
    expect(JSON.stringify(recorded)).not.toContain("12345678901");
    expect(recorded[0]!.ninHmac).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sends a name mismatch to a person, with both names in the note", async () => {
    const { d, recorded } = deps({ [TOKEN]: { ...CLEAN, legalName: "ADEBAYO TUNDE" } });
    expect(await runVninCheck(d, { userId: "u", vnin: TOKEN, applicationName: "Chidi Okeke" })).toEqual({
      status: "pending",
      reason: "name",
    });
    expect(recorded[0]!.matched).toBe(false);
    expect(recorded[0]!.note).toContain("ADEBAYO TUNDE");
    expect(recorded[0]!.note).toContain("Chidi Okeke");
  });

  it("claims no liveness: nothing about a face is recorded or decided", async () => {
    const { d, recorded } = deps({ [TOKEN]: CLEAN });
    await runVninCheck(d, { userId: "u", vnin: TOKEN, applicationName: "Chidi Okeke" });
    expect(JSON.stringify(recorded).toLowerCase()).not.toContain("liveness");
  });

  it("reports a NIN already matched elsewhere as pending, as the database answers", async () => {
    const { d } = deps({ [TOKEN]: CLEAN }, "nin_elsewhere");
    expect(await runVninCheck(d, { userId: "u", vnin: TOKEN, applicationName: "Chidi Okeke" })).toEqual({
      status: "pending",
      reason: "nin_elsewhere",
    });
  });

  it("refuses a malformed token and an unknown one without recording anything", async () => {
    const { d, recorded } = deps({});
    expect(await runVninCheck(d, { userId: "u", vnin: "123", applicationName: "X Y" })).toEqual({
      status: "refused",
      reason: "invalid_token",
    });
    expect(await runVninCheck(d, { userId: "u", vnin: TOKEN, applicationName: "X Y" })).toEqual({
      status: "refused",
      reason: "not_found",
    });
    expect(recorded).toEqual([]);
  });

  it("ships with no aggregator: the default provider verifies nothing", async () => {
    expect(await identityProvider().verifyVnin({ vnin: TOKEN })).toEqual({ ok: false, reason: "unconfigured" });
  });
});

describe("the payout desk suggestion", () => {
  it("suggests a match on a Nigerian name written differently", () => {
    expect(payoutSuggestion("OKEKE CHIDI EMMANUEL", "Chidi Okeke", null)).toMatchObject({ match: true });
  });

  it("suggests a match against a firm's registered name", () => {
    expect(payoutSuggestion("ACME PROPERTIES NIG LTD", "Chidi Okeke", "Acme Properties Limited")).toMatchObject({
      match: true,
      onRecord: "Acme Properties Limited",
    });
  });

  it("says no match, and says nothing at all with no resolved name", () => {
    expect(payoutSuggestion("ADEBAYO TUNDE", "Chidi Okeke", null)).toMatchObject({ match: false });
    expect(payoutSuggestion(undefined, "Chidi Okeke", null)).toBeNull();
  });

  it("is drawn on the desk as a suggestion", () => {
    const card = readFileSync(join(__dirname, "../../app/admin/kyc/SubjectCard.tsx"), "utf8");
    expect(card).toContain("DESK.payoutLabel");
    expect(getDictionary("en").trustVisible.desk.payoutLabel).toBe("Payout name check (suggestion):");
  });
});
