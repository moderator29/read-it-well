import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import {
  BUSINESS_KINDS,
  isBusinessKind,
  listerKindFromSupplyRole,
  roleLine,
  roleWords,
} from "./role-line";

const copy = getDictionary("en").socialProfile.roleLine;

describe("the one role line under a person's name", () => {
  it("is Renter when no row says anything else", () => {
    expect(roleWords({ listers: [], businesses: [] })).toEqual(["renter"]);
    expect(roleLine(["renter"], copy)).toBe("Renter");
  });

  it("names an approved supply account by its side, agents.role", () => {
    expect(listerKindFromSupplyRole("owner")).toBe("owner");
    expect(listerKindFromSupplyRole("agent")).toBe("agent");
    expect(roleLine(roleWords({ listers: ["owner"], businesses: [] }), copy)).toBe("Landlord");
    expect(roleLine(roleWords({ listers: ["agent"], businesses: [] }), copy)).toBe("Agent");
  });

  it("names every business kind the database has, once each, after the person", () => {
    expect(BUSINESS_KINDS).toEqual([
      "hotel",
      "serviced_apartments",
      "guest_house",
      "resort",
      "shortlet_operator",
      "restaurant",
      "agency",
    ]);
    const line = roleLine(
      roleWords({ listers: ["agent"], businesses: ["restaurant", "hotel", "shortlet_operator", "hotel"] }),
      copy,
    );
    expect(line).toBe("Agent · Hotel · Shortlet host · Restaurant");
  });

  it("ignores a value it does not know rather than guessing a word for it", () => {
    expect(isBusinessKind("hotel")).toBe(true);
    expect(isBusinessKind("castle")).toBe(false);
    expect(roleWords({ listers: [], businesses: ["castle"] })).toEqual(["renter"]);
  });

  it("has an English word for every role", () => {
    for (const word of Object.keys(copy) as (keyof typeof copy)[]) expect(copy[word].length).toBeGreaterThan(0);
    expect(Object.keys(copy).sort()).toEqual(
      ["agency", "agent", "guestHouse", "hotel", "landlord", "renter", "resort", "restaurant", "servicedApartments", "shortletHost"].sort(),
    );
  });
});
