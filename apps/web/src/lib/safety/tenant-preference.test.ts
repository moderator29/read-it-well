import { describe, expect, it } from "vitest";
import { contentForms, tenantPreference } from "./tenant-preference";

/* The same table the probe supabase/tests/probes/sec-06.sql runs against the
   live private.discriminatory_phrase(). */
const HELD = [
  "No Igbo tenants",
  "Muslims only",
  "Christians only please",
  "Married couples only",
  "No Hausa, no Fulani",
  "Yoruba only",
  "no bachelors",
  "Ladies only, shared flat",
  "Strictly no singles",
  "only married couples",
  "NO IGBOS",
  "N0 1gbo",
];

const LEFT_ALONE = [
  "Near the mosque",
  "Close to the church and market",
  "Igbo Efon, Lekki",
  "No smoking, no pets",
  "No agency fee",
  "Only 2 units left",
  "Benin, Edo State, no caution fee",
  "No family land dispute",
  "Family house, 4 bedrooms",
  "Men's salon downstairs",
  "Yoruba-speaking caretaker on site",
  "Muslim prayer room in the estate",
  "no single room available",
];

describe("tenantPreference (SEC-06)", () => {
  it.each(HELD)("names the preference in %j", (text) => {
    expect(tenantPreference(text)).not.toBeNull();
  });

  it.each(LEFT_ALONE)("leaves %j alone", (text) => {
    expect(tenantPreference(text)).toBeNull();
  });

  it("quotes the phrase the lister wrote, normalised", () => {
    expect(tenantPreference("Self contain. No Igbo tenants.")).toBe("no igbo");
  });
});

describe("contentForms", () => {
  it("joins spelled-out letters and reads digits inside words", () => {
    expect(contentForms("n i g g e r")).toContain("nigger");
    expect(contentForms("chi1d porn")).toContain("child porn");
    expect(contentForms("Ñyamiri")).toContain("nyamiri");
  });

  it("keeps numbers that are numbers and drops edge punctuation", () => {
    expect(contentForms("3 bedrooms, 450,000 naira")[0]).toBe("3 bedrooms 450 000 naira");
    expect(contentForms("whatsapp me directly!!")[0]).toBe("whatsapp me directly");
  });
});
