import { describe, expect, it } from "vitest";

import { mergeSettings, parseSettings } from "@/lib/profile/schema";

import { AI_CONSENT_VERSION, AI_DISCLOSURE, consentCookieValue, consentCurrent, parseConsentCookie } from "./consent";

describe("STORE-07 consent record", () => {
  it("counts only today's wording", () => {
    expect(consentCurrent(null)).toBe(false);
    expect(consentCurrent({ version: "2020-01-01", at: "x" })).toBe(false);
    expect(consentCurrent({ version: AI_CONSENT_VERSION, at: "2026-09-24T00:00:00Z" })).toBe(true);
  });

  it("round-trips the cookie and rejects junk", () => {
    expect(consentCurrent(parseConsentCookie(consentCookieValue()))).toBe(true);
    expect(parseConsentCookie("yes")).toBeNull();
    expect(parseConsentCookie(`${AI_CONSENT_VERSION}|not-a-date`)).toBeNull();
  });

  it("survives every other settings save, and is cleared only when asked", () => {
    const withConsent = mergeSettings({}, { aiConsent: { version: AI_CONSENT_VERSION, at: "2026-09-24T00:00:00Z" } });
    const afterToggle = mergeSettings(withConsent, { dataSaver: true });
    expect(parseSettings(afterToggle).aiConsent).toEqual({ version: AI_CONSENT_VERSION, at: "2026-09-24T00:00:00Z" });
    expect(parseSettings(mergeSettings(afterToggle, { aiConsent: null })).aiConsent).toBeNull();
    expect(parseSettings({ aiConsent: "garbage" }).aiConsent).toBeNull();
  });

  it("the disclosure names the processor, the country, and a way to a person", () => {
    expect(AI_DISCLOSURE.body).toMatch(/Anthropic/);
    expect(AI_DISCLOSURE.body).toMatch(/United States/);
    expect(AI_DISCLOSURE.human).toMatch(/person/);
  });
});
