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
  "Igbo tenants not allowed",
  "We prefer Yoruba tenants",
  "Muslim tenants preferred",
  "Strictly for married couples",
  "no ig\u200bbo",
  "Girls only hostel",
  "No Igbo allowed in this compound",
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
  "Spacious, no boys quarters, 24 hour power",
  "No boys' quarters",
  "No ladies bar or club noise",
  "only ladies hairdresser downstairs",
  "no men allowed in the rooms after 10pm",
  "no Igbo Efon traffic",
  "perfect for couples",
  "married couples welcome",
  "singles and couples welcome",
  "Christian neighbourhood",
  "bachelor pad",
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

  it("reads zero-width characters, look-alike letters, stretched letters and trailing symbols", () => {
    expect(contentForms("nig\u200bger")).toContain("nigger");
    expect(contentForms("n\u0456gger")).toContain("nigger");
    expect(contentForms("niiiigger")).toContain("nigger");
    expect(contentForms("nigggger")).toContain("nigger");
    expect(contentForms("n!gg@")).toContain("nigga");
  });
});
