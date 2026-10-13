import { describe, expect, it } from "vitest";
import { getDictionary, LOCALES } from "@vallo/i18n";
import {
  chatHintsFor,
  HINT_KEYS,
  hintsApply,
  hintsFromGaps,
  listingGaps,
  MAX_CHIPS,
  readDismissed,
  writeDismissed,
  type HintContext,
  type HintFacts,
} from "./hints";

/** A rental that states everything the rules read, so each test removes one thing. */
const COMPLETE: HintFacts = {
  kind: "rental",
  intent: "rent",
  pricePeriod: "year",
  priceMinor: 450_000_000,
  utilities: { powerGrid: "MOSTLY_ON", powerBackup: "GENERATOR", waterSupply: "BOREHOLE", hasEstateAccess: false } as HintFacts["utilities"],
  moveInCostStated: true,
  cautionDepositMinor: 50_000_000,
  compound: { parkingType: "inside" } as HintFacts["compound"],
  amenities: [],
  description: "No pets. Quiet street.",
};

const rental = (patch: Partial<HintFacts> = {}): HintFacts => ({ ...COMPLETE, ...patch });

const ctx = (listing: HintFacts | null | undefined, patch: Partial<HintContext> = {}): HintContext => ({
  contextKind: "listing",
  role: "guest",
  listing,
  visitOpen: false,
  ...patch,
});

describe("listingGaps: one rule per gap", () => {
  it("names nothing for a listing that states everything", () => {
    expect(listingGaps(COMPLETE)).toEqual([]);
  });

  it("power: fires when the grid or the backup is not stated, and not when both are", () => {
    const u = COMPLETE.utilities!;
    expect(listingGaps(rental({ utilities: undefined }))).toContain("power");
    expect(listingGaps(rental({ utilities: { ...u, powerGrid: undefined } }))).toContain("power");
    expect(listingGaps(rental({ utilities: { ...u, powerBackup: undefined } }))).toContain("power");
    expect(listingGaps(rental({ utilities: { ...u, powerBackup: "NONE" } }))).not.toContain("power");
  });

  it("water: fires when the water supply is not stated", () => {
    const u = COMPLETE.utilities!;
    expect(listingGaps(rental({ utilities: { ...u, waterSupply: undefined } }))).toEqual(["water"]);
    expect(listingGaps(rental({ utilities: { ...u, waterSupply: "TREATED_MAINS" } }))).toEqual([]);
  });

  it("moveIn: fires only when no total and no charge is stated, and any one charge clears it", () => {
    const none = { moveInCostStated: false, cautionDepositMinor: undefined };
    expect(listingGaps(rental(none))).toEqual(["moveIn"]);
    expect(listingGaps(rental({ ...none, moveInCostStated: undefined }))).toEqual(["moveIn"]);
    expect(listingGaps(rental({ ...none, moveInCostStated: true }))).toEqual([]);
    for (const field of ["cautionDepositMinor", "serviceChargeMinor", "agencyFeeMinor", "legalFeeMinor", "agreementFeeMinor"] as const) {
      expect(listingGaps(rental({ ...none, [field]: 0 })), field).toEqual([]);
    }
  });

  it("buyCosts: a sale asks for the cost to buy instead, from the sale's own fields", () => {
    const sale = rental({ intent: "sale", pricePeriod: undefined, kind: "home", description: undefined });
    expect(listingGaps(sale)).toEqual(["buyCosts"]);
    expect(listingGaps({ ...sale, purchaseCostStated: true })).toEqual([]);
    for (const field of ["saleAgencyFeeMinor", "saleLegalFeeMinor", "governorsConsentFeeMinor", "stampDutyMinor", "surveyRegistrationFeeMinor"] as const) {
      expect(listingGaps({ ...sale, [field]: 1 }), field).toEqual([]);
    }
    /* A rent's charge fields do not answer a sale. */
    expect(listingGaps({ ...sale, cautionDepositMinor: 1, moveInCostStated: true })).toEqual(["buyCosts"]);
  });

  it("a sale never gets the pets and rules question", () => {
    const sale = rental({ intent: "sale", pricePeriod: undefined, kind: "home", purchaseCostStated: true, description: "A flat." });
    expect(listingGaps(sale)).toEqual([]);
  });

  it("parking: fires on a kind that usually has it when nothing says so, and clears on any statement", () => {
    const bare = { compound: undefined, parkingSpaces: undefined, amenities: [] };
    expect(listingGaps(rental(bare))).toEqual(["parking"]);
    expect(listingGaps(rental({ ...bare, parkingSpaces: 0 }))).toEqual([]);
    expect(listingGaps(rental({ ...bare, compound: { parkingType: "none" } as HintFacts["compound"] }))).toEqual([]);
    expect(listingGaps(rental({ ...bare, amenities: ["parking"] }))).toEqual([]);
    /* Land does not usually have it, so its silence is not a gap. */
    expect(listingGaps(rental({ ...bare, kind: "land" }))).toEqual([]);
  });

  it("rules: fires when the description is known and says nothing about pets or rules", () => {
    expect(listingGaps(rental({ description: "A bright two bedroom flat." }))).toEqual(["rules"]);
    expect(listingGaps(rental({ description: null }))).toEqual(["rules"]);
    expect(listingGaps(rental({ description: "" }))).toEqual(["rules"]);
    expect(listingGaps(rental({ description: "Pets are welcome." }))).toEqual([]);
    expect(listingGaps(rental({ description: "House rules: no smoking." }))).toEqual([]);
  });

  it("rules: an unread description is unknown, never a gap", () => {
    expect(listingGaps(rental({ description: undefined }))).toEqual([]);
  });

  it("names nothing for a stay, a table or an experience", () => {
    const empty: Partial<HintFacts> = { utilities: undefined, moveInCostStated: false, cautionDepositMinor: undefined, compound: undefined, description: null };
    expect(listingGaps(rental({ ...empty, kind: "shortlet", pricePeriod: "night" }))).toEqual([]);
    expect(listingGaps(rental({ ...empty, kind: "restaurant", pricePeriod: "guest" }))).toEqual([]);
    expect(listingGaps(rental({ ...empty, kind: "experience", pricePeriod: "guest" }))).toEqual([]);
  });
});

describe("priority", () => {
  const EVERYTHING_MISSING = rental({
    utilities: undefined,
    moveInCostStated: false,
    cautionDepositMinor: undefined,
    compound: undefined,
    amenities: [],
    description: "A flat.",
  });

  it("is power, water, move-in, parking, rules, then the visit", () => {
    expect(listingGaps(EVERYTHING_MISSING)).toEqual(["power", "water", "moveIn", "parking", "rules"]);
    expect(HINT_KEYS).toEqual(["power", "water", "moveIn", "buyCosts", "parking", "rules", "visit"]);
  });

  it("makes the first gap the card, whatever else is missing", () => {
    expect(chatHintsFor(ctx(EVERYTHING_MISSING)).hint).toBe("power");
    const u = COMPLETE.utilities!;
    expect(chatHintsFor(ctx({ ...EVERYTHING_MISSING, utilities: { ...u, waterSupply: undefined } })).hint).toBe("water");
    expect(chatHintsFor(ctx({ ...EVERYTHING_MISSING, utilities: u })).hint).toBe("moveIn");
    expect(chatHintsFor(ctx({ ...EVERYTHING_MISSING, utilities: u, moveInCostStated: true })).hint).toBe("parking");
    expect(chatHintsFor(ctx({ ...EVERYTHING_MISSING, utilities: u, moveInCostStated: true, compound: COMPLETE.compound })).hint).toBe("rules");
  });

  it("falls to the visit only when nothing is missing and no visit is open", () => {
    expect(chatHintsFor(ctx(COMPLETE))).toEqual({ hint: "visit", chips: ["visit"] });
    expect(chatHintsFor(ctx(COMPLETE, { visitOpen: true }))).toEqual({ hint: null, chips: [] });
  });

  it("puts the visit first in the chips and never draws more than three", () => {
    expect(chatHintsFor(ctx(EVERYTHING_MISSING)).chips).toEqual(["visit", "power", "water"]);
    expect(chatHintsFor(ctx(EVERYTHING_MISSING, { visitOpen: true })).chips).toEqual(["power", "water", "moveIn"]);
    expect(MAX_CHIPS).toBe(3);
    for (const visitOpen of [true, false]) {
      expect(chatHintsFor(ctx(EVERYTHING_MISSING, { visitOpen })).chips.length).toBeLessThanOrEqual(3);
    }
  });

  it("draws at most one card: a single hint key, never a list", () => {
    const { hint } = chatHintsFor(ctx(EVERYTHING_MISSING));
    expect(typeof hint).toBe("string");
  });
});

describe("who sees a hint", () => {
  const missing = rental({ utilities: undefined });

  it("shows the renter in a listing thread", () => {
    expect(hintsApply(ctx(missing))).toBe(true);
  });

  it("never shows the lister", () => {
    expect(hintsApply(ctx(missing, { role: "host" }))).toBe(false);
    expect(chatHintsFor(ctx(missing, { role: "host" }))).toEqual({ hint: null, chips: [] });
    expect(hintsApply(ctx(missing, { role: null }))).toBe(false);
  });

  it("shows only in a listing thread: not a direct chat, a table or a stay", () => {
    for (const contextKind of ["direct", "reservation", "booking", "business", null, undefined]) {
      expect(hintsApply(ctx(missing, { contextKind })), String(contextKind)).toBe(false);
      expect(chatHintsFor(ctx(missing, { contextKind })), String(contextKind)).toEqual({ hint: null, chips: [] });
    }
  });

  it("shows nothing with no listing to read", () => {
    expect(hintsApply(ctx(null))).toBe(false);
    expect(hintsApply(ctx(undefined))).toBe(false);
  });

  it("shows nothing on a listing thread about a stay", () => {
    expect(hintsApply(ctx(rental({ kind: "shortlet", pricePeriod: "night" })))).toBe(false);
  });
});

describe("dismissal", () => {
  const gaps = ["power", "water"] as const;

  it("hides the dismissed hint and offers the next, leaving the chips as they were", () => {
    expect(hintsFromGaps(gaps, false, new Set(["power"]))).toEqual({ hint: "water", chips: ["visit", "power", "water"] });
    expect(hintsFromGaps(gaps, false, new Set(["power", "water"]))).toEqual({ hint: "visit", chips: ["visit", "power", "water"] });
    expect(hintsFromGaps(gaps, false, new Set(["power", "water", "visit"]))).toEqual({ hint: null, chips: ["visit", "power", "water"] });
  });

  it("stores per conversation and survives a reload", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    expect([...readDismissed("c1", storage)]).toEqual([]);
    expect([...writeDismissed("c1", "power", storage)]).toEqual(["power"]);
    expect([...writeDismissed("c1", "water", storage)].sort()).toEqual(["power", "water"]);
    expect([...readDismissed("c1", storage)].sort()).toEqual(["power", "water"]);
    expect([...readDismissed("c2", storage)]).toEqual([]);
  });

  it("never throws when storage is missing, blocked or holds junk", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect([...readDismissed("c1", null)]).toEqual([]);
    expect([...readDismissed("c1", blocked)]).toEqual([]);
    expect([...writeDismissed("c1", "power", blocked)]).toEqual(["power"]);
    expect([...writeDismissed("c1", "power", null)]).toEqual(["power"]);
    const junk = { getItem: () => "{not json", setItem: () => undefined };
    expect([...readDismissed("c1", junk)]).toEqual([]);
    const odd = { getItem: () => JSON.stringify(["power", 7, "nonsense", null]), setItem: () => undefined };
    expect([...readDismissed("c1", odd)]).toEqual(["power"]);
  });
});

describe("the copy", () => {
  const en = getDictionary("en").chatHints;
  const gapKeys = ["power", "water", "moveIn", "buyCosts", "parking", "rules"] as const;

  it("has a line, a chip and a question for every gap, and words for the visit", () => {
    for (const key of gapKeys) {
      expect(en.gaps[key].line.length, key).toBeGreaterThan(0);
      expect(en.gaps[key].chip.length, key).toBeGreaterThan(0);
      expect(en.gaps[key].text.length, key).toBeGreaterThan(0);
    }
    expect(en.visit.label).toBe("You can book a visit");
  });

  it("is real translation in yo, ig and ha, with no em dash and no unbacked claim", () => {
    for (const locale of LOCALES) {
      const words = getDictionary(locale).chatHints;
      const all = [
        words.label,
        words.region,
        words.dismiss,
        words.visit.label,
        words.visit.line,
        words.visit.chip,
        ...gapKeys.flatMap((k) => Object.values(words.gaps[k])),
      ];
      for (const sentence of all) {
        expect(sentence, `${locale}: ${sentence}`).not.toMatch(/—/);
        expect(sentence, `${locale}: ${sentence}`).not.toMatch(/\b(safe|checked|verified)\b/i);
      }
      if (locale === "en") continue;
      for (const key of gapKeys) {
        expect(words.gaps[key].text, `${locale}.${key}`).not.toBe(en.gaps[key].text);
        expect(words.gaps[key].chip, `${locale}.${key}`).not.toBe(en.gaps[key].chip);
        expect(words.gaps[key].line, `${locale}.${key}`).not.toBe(en.gaps[key].line);
      }
      expect(words.label).not.toBe(en.label);
      expect(words.visit.line).not.toBe(en.visit.line);
    }
  });
});
