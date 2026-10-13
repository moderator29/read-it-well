import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { buildPassportView } from "./view";
import { factsFrom, withHidden } from "./model";

const ID = "11111111-2222-4333-8444-555555555555";
const t = getDictionary("en");
const ROW = {
  subject_id: ID,
  handle: "ada",
  display_name: "Ada Okafor",
  photo: "https://example.test/ada.jpg",
  roles: ["landlord", "hotel"],
  joined_at: "2026-10-13T08:00:00Z",
  verification: "gold",
  rentals: 3,
  stays: 12,
  review_count: 23,
  review_average: 4.8,
  reply_band: "hour",
  pidgin_ok: true,
};
const facts = factsFrom(ROW)!;
const build = (f = facts, locale: "en" | "yo" | "ig" | "ha" = "en") =>
  buildPassportView(f, getDictionary(locale).passportV2, getDictionary(locale).socialProfile.roleLine, locale);

describe("the passport, worded", () => {
  it("gives the exact join date, day month and year", () => {
    expect(build().joined).toBe("13 October 2026");
    /* Lagos time: late evening UTC is already the next day in Lagos. */
    expect(build(factsFrom({ ...ROW, joined_at: "2026-10-12T23:30:00Z" })!).joined).toBe("13 October 2026");
  });

  it("names the role from the rows, joined by a middle dot", () => {
    expect(build().role).toBe("Landlord · Hotel");
    expect(build(factsFrom({ ...ROW, roles: ["renter"] })!).role).toBe("Renter");
  });

  it("says what the verification level means, in words the mechanism backs", () => {
    expect(build().level).toEqual({ tier: "gold", label: "Verified", meaning: "Identity checked by a person at Vallo." });
    expect(build(factsFrom({ ...ROW, verification: "none" })!).level?.label).toBe("Member");
    expect(build(factsFrom({ ...ROW, verification: "platinum" })!).level?.label).toBe("Vallo team");
  });

  it("lists the counts, the rating and the reply time that are recorded", () => {
    const stats = build().stats;
    expect(stats.map((s) => s.key)).toEqual(["rentals", "stays", "reviews", "response", "languages"]);
    expect(stats.find((s) => s.key === "reviews")).toMatchObject({ value: "23", sub: "Average 4.8 out of 5" });
    expect(stats.find((s) => s.key === "response")?.value).toBe("Usually within an hour");
    expect(stats.find((s) => s.key === "languages")?.value).toBe("Pidgin is welcome");
  });

  it("draws nothing for a line with nothing behind it: no zero, no placeholder", () => {
    const view = build(factsFrom({ ...ROW, rentals: 0, stays: null, review_count: 0, reply_band: null, pidgin_ok: false, roles: null, verification: null, joined_at: null })!);
    expect(view.stats).toEqual([]);
    expect(view.role).toBeNull();
    expect(view.level).toBeNull();
    expect(view.joined).toBeNull();
    expect(JSON.stringify(view)).not.toMatch(/\b0 |No reviews|None|N\/A|unknown/i);
  });

  it("carries only what a reader may see: a hidden line is in no field of the view", () => {
    const view = build(withHidden(facts, ["photo", "joined", "reviews", "rentals"]));
    expect(view.photo).toBeNull();
    expect(view.joined).toBeNull();
    expect(view.stats.map((s) => s.key)).toEqual(["stays", "response", "languages"]);
    const text = JSON.stringify(view);
    expect(text).not.toContain("example.test");
    expect(text).not.toContain("October");
    /* ...and the machine lines no longer carry the date. */
    expect(view.mrz.join("")).not.toContain("261013");
  });

  it("falls back to a neutral name and an initial, never to the handle's local part or an id", () => {
    const view = build(factsFrom({ ...ROW, display_name: null, handle: null })!);
    expect(view.name).toBe("Vallo member");
    expect(view.initial).toBe("V");
    expect(JSON.stringify([view.name, view.initial, view.photoAlt])).not.toContain(ID.slice(0, 8));
  });

  it("has a real translation for every word it prints, in all four languages", () => {
    const en = t.passportV2;
    for (const locale of ["yo", "ig", "ha"] as const) {
      const words = getDictionary(locale).passportV2;
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(typeof words[key], `${locale}.${key}`).toBe(typeof en[key]);
      }
      expect(words.title, locale).not.toBe(en.title);
      expect(words.levelMemberMeaning, locale).not.toBe(en.levelMemberMeaning);
      expect(words.line.rentals, locale).not.toBe(en.line.rentals);
      expect(build(facts, locale).stats.find((s) => s.key === "response")?.value, locale).not.toBe("Usually within an hour");
    }
  });
});
