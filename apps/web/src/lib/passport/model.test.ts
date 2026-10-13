import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  PASSPORT_LINES,
  factsFrom,
  isPassportLine,
  recordedLines,
  settingsFrom,
  withHidden,
} from "./model";

const ID = "11111111-2222-4333-8444-555555555555";

const FULL_ROW = {
  subject_id: ID,
  handle: "ada",
  display_name: "Ada Okafor",
  photo: "https://example.test/ada.jpg",
  roles: ["landlord", "hotel"],
  joined_at: "2026-08-07T08:00:00Z",
  verification: "gold",
  rentals: 3,
  stays: "12",
  review_count: 23,
  review_average: "4.8",
  reply_band: "hour",
  pidgin_ok: true,
};

describe("the passport's facts, from a row of the read model", () => {
  it("reads every line Vallo recorded", () => {
    expect(factsFrom([FULL_ROW])).toEqual({
      userId: ID,
      handle: "ada",
      name: "Ada Okafor",
      photo: "https://example.test/ada.jpg",
      roles: ["landlord", "hotel"],
      joinedAt: "2026-08-07T08:00:00Z",
      tier: "gold",
      rentals: 3,
      stays: 12,
      reviewCount: 23,
      reviewAverage: 4.8,
      replyBand: "hour",
      pidginOk: true,
    });
  });

  it("answers null for no row: a refused read is never an empty passport", () => {
    expect(factsFrom([])).toBeNull();
    expect(factsFrom(null)).toBeNull();
    expect(factsFrom({})).toBeNull();
  });

  it("keeps the role order the database sent, and drops a word it does not know", () => {
    expect(factsFrom({ ...FULL_ROW, roles: ["agency", "landlord", "spaceship"] })?.roles).toEqual(["agency", "landlord"]);
    expect(factsFrom({ ...FULL_ROW, roles: ["spaceship"] })?.roles).toBeNull();
  });

  it("counts only real rows: a zero, a missing figure or a nonsense one is absent, never 0", () => {
    const facts = factsFrom({ ...FULL_ROW, rentals: 0, stays: -2, review_count: 0, review_average: 4.5, reply_band: "slow" });
    expect(facts?.rentals).toBeNull();
    expect(facts?.stays).toBeNull();
    expect(facts?.reviewCount).toBeNull();
    /* An average with no reviews behind it is not a fact. */
    expect(facts?.reviewAverage).toBeNull();
    /* A slow band is never shown. */
    expect(facts?.replyBand).toBeNull();
  });

  it("treats a hidden line (null) as hidden, and a false language as nothing", () => {
    const hidden = factsFrom({
      ...FULL_ROW,
      photo: null,
      roles: null,
      joined_at: null,
      verification: null,
      rentals: null,
      stays: null,
      review_count: null,
      review_average: null,
      reply_band: null,
      pidgin_ok: null,
    });
    expect(hidden).toMatchObject({
      photo: null,
      roles: null,
      joinedAt: null,
      tier: null,
      rentals: null,
      stays: null,
      reviewCount: null,
      reviewAverage: null,
      replyBand: null,
      pidginOk: null,
    });
    expect(factsFrom({ ...FULL_ROW, pidgin_ok: false })?.pidginOk).toBeNull();
  });

  it("reads an unknown level as the member level, never as a mark", () => {
    expect(factsFrom({ ...FULL_ROW, verification: "diamond" })?.tier).toBe("none");
  });

  it("has no field for a phone, an email, an ID number, a birth date or an address", () => {
    const keys = Object.keys(factsFrom({ ...FULL_ROW, phone: "0803", email: "a@b.c", nin: "123", dob: "1990", address: "x" })!);
    expect(keys.join(" ")).not.toMatch(/phone|email|nin|dob|birth|address|document/i);
  });
});

describe("the owner's switches", () => {
  it("defaults to on with every line shown when there is no row", () => {
    expect(settingsFrom(null)).toEqual(DEFAULT_SETTINGS);
    expect(settingsFrom([])).toEqual({ enabled: true, hidden: [] });
  });

  it("reads the whole-passport switch and the hidden lines, in drawing order", () => {
    expect(settingsFrom({ enabled: false, hidden_lines: ["reviews", "photo", "phone"] })).toEqual({
      enabled: false,
      hidden: ["photo", "reviews"],
    });
  });

  it("knows the nine lines and no tenth", () => {
    expect(PASSPORT_LINES).toHaveLength(9);
    expect(isPassportLine("phone")).toBe(false);
    expect(isPassportLine("photo")).toBe(true);
  });
});

describe("the owner's preview applies the same switches the database does", () => {
  const facts = factsFrom(FULL_ROW)!;

  it("hides exactly the lines switched off", () => {
    const view = withHidden(facts, ["photo", "reviews", "response"]);
    expect(view.photo).toBeNull();
    expect(view.reviewCount).toBeNull();
    expect(view.reviewAverage).toBeNull();
    expect(view.replyBand).toBeNull();
    expect(view.rentals).toBe(3);
    expect(view.name).toBe("Ada Okafor");
  });

  it("hides every line with all nine off, leaving the name and handle", () => {
    const view = withHidden(facts, [...PASSPORT_LINES]);
    expect(recordedLines(view)).toEqual([]);
    expect(view.name).toBe("Ada Okafor");
    expect(view.handle).toBe("ada");
  });

  it("lists which lines have something recorded", () => {
    expect(recordedLines(facts)).toEqual([...PASSPORT_LINES]);
    expect(recordedLines({ ...facts, rentals: null, pidginOk: null })).not.toContain("rentals");
  });
});
