import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { CONSENT_SENTENCE, consentLine } from "./consent";

const copy = getDictionary("en").landlord.admin;
const day = (iso: string) => iso.slice(0, 10);

describe("the consent sentence", () => {
  it("names the purpose, the frequency, the rent message and the way out", () => {
    expect(CONSENT_SENTENCE).toMatch(/never more than once a week/);
    expect(CONSENT_SENTENCE).toMatch(/still available/);
    expect(CONSENT_SENTENCE).toMatch(/tenant pays rent/);
    expect(CONSENT_SENTENCE).toMatch(/reply STOP at any time/);
    expect(CONSENT_SENTENCE.endsWith("Do you agree?")).toBe(true);
  });

  it("fits the database's bounds and uses no em dash", () => {
    // `listing_mandates_consent_names_its_sentence`: between 40 and 800 characters.
    expect(CONSENT_SENTENCE.length).toBeGreaterThanOrEqual(40);
    expect(CONSENT_SENTENCE.length).toBeLessThanOrEqual(800);
    expect(CONSENT_SENTENCE).not.toContain("—");
  });
});

describe("what the console says about a mandate's consent", () => {
  it("says none when nothing was recorded, or the read had no row", () => {
    expect(consentLine(null, copy, day)).toEqual({ state: "none", line: copy.consentNone });
    expect(consentLine({ consentedAt: null, withdrawnAt: null, readByName: null }, copy, day).state).toBe("none");
  });

  it("says when and by whom it was recorded", () => {
    const view = consentLine({ consentedAt: "2026-09-24T10:00:00Z", withdrawnAt: null, readByName: "Ada" }, copy, day);
    expect(view).toEqual({ state: "given", line: "Consent recorded 2026-09-24 by Ada." });
  });

  it("says withdrawn when the withdrawal is the later of the two", () => {
    expect(
      consentLine({ consentedAt: "2026-09-20T10:00:00Z", withdrawnAt: "2026-09-24T10:00:00Z", readByName: "Ada" }, copy, day).state,
    ).toBe("withdrawn");
    expect(
      consentLine({ consentedAt: "2026-09-24T10:00:00Z", withdrawnAt: "2026-09-20T10:00:00Z", readByName: "Ada" }, copy, day).state,
    ).toBe("given");
  });
});
