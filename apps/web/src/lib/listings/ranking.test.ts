import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@vallo/i18n";

import { RANK_INPUTS, RANK_MAX, RANK_MIN_PHOTOS, rankRecommended, rankScore, rankingProse } from "./ranking";
import { LISTING_SELECTS } from "./supabase-repository";
import type { Listing } from "./types";

function listing(id: string, over: Partial<Listing> = {}): Listing {
  return {
    id,
    slug: id,
    title: id,
    kind: "rental",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 250_000_000,
    pricePeriod: "year",
    currency: "NGN",
    rating: 0,
    reviewCount: 0,
    verified: false,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    bedrooms: 2,
    bathrooms: 2,
    ...over,
  };
}

const COMPLETE: Partial<Listing> = {
  cautionDepositMinor: 0,
  agencyFeeMinor: 25_000_000,
  legalFeeMinor: 25_000_000,
  agreementFeeMinor: 5_000_000,
  utilities: { powerGrid: "MOSTLY_ON", waterSupply: "BOREHOLE", hasEstateAccess: false },
  photos: Array.from({ length: RANK_MIN_PHOTOS }, (_, i) => `p${i}`),
  verified: true,
};

describe("the Recommended formula", () => {
  it("scores one point per input, capped at the number of inputs", () => {
    expect(rankScore(listing("a")).score).toBe(0);
    expect(rankScore(listing("b", COMPLETE))).toEqual({ score: RANK_MAX, held: ["costs", "utilities", "photos", "checked"] });
    expect(RANK_MAX).toBe(RANK_INPUTS.length);
  });

  it("counts a declared zero as declared, and a missing fee as missing", () => {
    expect(rankScore(listing("a", { ...COMPLETE, cautionDepositMinor: 0 })).held).toContain("costs");
    expect(rankScore(listing("a", { ...COMPLETE, agencyFeeMinor: undefined })).held).not.toContain("costs");
  });

  it("puts real before example, then points, then keeps the arrival (newest) order", () => {
    const ordered = rankRecommended([
      listing("new-empty"),
      listing("example-complete", { ...COMPLETE, isDemo: true, verified: false }),
      listing("old-complete", COMPLETE),
      listing("older-empty"),
    ]);
    expect(ordered.map((l) => l.id)).toEqual(["old-complete", "new-empty", "older-empty", "example-complete"]);
  });

  it("has no input that reads money paid to Vallo, a subscription or a boost", () => {
    const source = readFileSync(join(__dirname, "ranking.ts"), "utf8");
    const inputs = source.slice(source.indexOf("export const RANK_INPUTS"), source.indexOf("export const RANK_MAX"));
    expect(inputs).not.toMatch(/featured|boost|sponsor|paid|premium|subscription|fee_paid|listingFee/i);
  });
});

describe("the published words come from the same constants", () => {
  const copy = getDictionary("en").trustVisible.ranking;
  const prose = rankingProse(copy);

  it("names exactly as many inputs as the sort uses, in the same order", () => {
    expect(prose.inputs).toHaveLength(RANK_INPUTS.length);
    expect(prose.intro).toContain(String(RANK_INPUTS.length));
    RANK_INPUTS.forEach((input, i) => {
      expect(prose.inputs[i]).toBe(copy.inputs[input.key].replace("{min}", String(RANK_MIN_PHOTOS)));
    });
    expect(prose.inputs.join(" ")).toContain(`At least ${RANK_MIN_PHOTOS} photographs`);
  });

  it("says in public that nobody can pay to be higher", () => {
    expect(prose.promise).toBe("Nobody can pay to be higher. Vallo does not sell placement.");
  });

  it("is mounted on /standards and linked from the Recommended sort", () => {
    const root = join(__dirname, "..", "..");
    const standards = readFileSync(join(root, "app/(site)/standards/page.tsx"), "utf8");
    expect(standards).toContain("<RankingExplained />");
    const section = readFileSync(join(root, "components/site/RankingExplained.tsx"), "utf8");
    expect(section).toContain('id="ranking"');
    expect(section).toContain("rankingProse(copy)");
    const shelf = readFileSync(join(root, "components/app/search/ShelfCount.tsx"), "utf8");
    expect(shelf).toContain('href="/standards#ranking"');
    const search = readFileSync(join(root, "app/(app)/search/page.tsx"), "utf8");
    expect(search).toContain("return rankRecommended(out);");
  });
});

describe("featured is gone from the read", () => {
  it("is in neither select and nothing orders on it", () => {
    expect(LISTING_SELECTS.card).not.toMatch(/featured/);
    expect(LISTING_SELECTS.detail).not.toMatch(/featured/);
    const source = readFileSync(join(__dirname, "supabase-repository.ts"), "utf8");
    expect(source).not.toMatch(/\.order\("featured"/);
  });
});
