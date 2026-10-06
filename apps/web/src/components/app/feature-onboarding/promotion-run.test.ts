import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { formatMoney } from "@vallo/i18n/core";
import { PROMOTION_NOT_ON_SALE, PROMOTION_PRICES_PROPOSED } from "@/lib/money/copy";
import { PROMOTION_METRICS, PROMOTION_TIER_TABLE } from "@/lib/promotion/tiers";
import { FIRST_RUN_HOME, canMount, firstRunContent, isMountedFirstRun } from "./first-runs";

/**
 * PAID PROMOTION'S FIRST RUN, HELD TO ITS SPEC (D60, `docs/promotion/
 * VALLO_PROMOTION.md`, "The onboarding Session 3 was blocked on").
 *
 * Four screens exactly, no fifth selling value; both limits on screen one;
 * the tiers as prose; no invented figures; and no way to pay, because
 * promotion cannot be paid for until the company payment account exists (D38).
 */
const t = getDictionary("en");
const content = firstRunContent("promotion", t, "en");
const [one, two, three, four] = content.panels;
const all = (panel: (typeof content.panels)[number] | undefined) =>
  [panel?.title, panel?.body, panel?.detail?.caption, ...(panel?.detail?.rows ?? []).flatMap((r) => [r.term, r.meta, r.text])]
    .filter(Boolean)
    .join(" \n ");

describe("the promotion first run", () => {
  it("is mounted, has exactly four panels and keeps the grammar", () => {
    expect(isMountedFirstRun("promotion")).toBe(true);
    expect(content.panels).toHaveLength(4);
    expect(canMount(content)).toBe(true);
    expect(FIRST_RUN_HOME.promotion).toBe("/agent/listings");
  });

  it("refuses a fifth panel and a missing one: four is the spec's count", () => {
    const extra = { ...content, panels: [...content.panels, { object: "trophy" as const, title: "Why it pays", body: "x" }] };
    expect(canMount(extra)).toBe(false);
    expect(canMount({ ...content, panels: content.panels.slice(0, 3) })).toBe(false);
  });
});

describe("screen 1: what promotion is, and what it is not, on the screen itself", () => {
  it("says it buys attention in a marked slot", () => {
    expect(one?.body).toMatch(/slot marked Promoted/);
  });

  it("says it does not change rank, in the body and not a footnote", () => {
    expect(one?.body).toMatch(/does not change where your listing ranks/);
    expect(one?.detail).toBeUndefined();
  });

  it("says it does not buy a verification badge", () => {
    expect(one?.body).toMatch(/does not buy a verification badge/);
  });
});

describe("screen 2: the four tiers side by side, as prose", () => {
  const rows = two?.detail?.rows ?? [];

  it("has one row per tier: the name, the naira price, the days and who it suits", () => {
    expect(rows.map((row) => row.term)).toEqual(["Boost", "Spotlight", "Featured", "Everywhere"]);
    const slugs = ["boost", "spotlight", "featured", "prime"] as const;
    rows.forEach((row, index) => {
      const tier = PROMOTION_TIER_TABLE[slugs[index]!];
      expect(row.meta).toContain(formatMoney(tier.proposedPriceKobo, "en"));
      expect(row.meta).toContain(`${tier.durationDays} days`);
      expect(row.text).toBe(t.experienceFeatures.promotion.tiers[tier.displayKey].forWhom);
    });
  });

  it("prints the spec's naira figures", () => {
    const text = all(two);
    for (const figure of ["2,500", "7,500", "20,000", "50,000"]) expect(text).toContain(figure);
  });

  it("marks the prices proposed (D38 pattern) and is not a tick matrix", () => {
    expect(two?.detail?.caption).toBe(PROMOTION_PRICES_PROPOSED);
    expect(all(two)).not.toMatch(/[✓✔✗✘×]/);
  });
});

describe("screen 3: what you will be able to measure, with nothing invented", () => {
  it("says Vallo never estimates a number it does not have", () => {
    expect(three?.body).toMatch(/never estimates a number it does not have/);
  });

  it("lays out the ten figures with no number in any of them", () => {
    const rows = three?.detail?.rows ?? [];
    expect(rows).toHaveLength(PROMOTION_METRICS.length);
    for (const row of rows) {
      expect(row.text).toBe(t.experienceFeatures.promotion.noData);
      expect(`${row.term} ${row.text}`).not.toMatch(/\d/);
    }
  });

  it("says plainly that this is the layout and that no real example exists yet", () => {
    expect(three?.detail?.caption).toMatch(/No promotion has run yet/);
  });
});

describe("screen 4: pick, pay and what happens next, with no way to pay", () => {
  it("says buying is not open, in the body", () => {
    expect(four?.body).toBe(PROMOTION_NOT_ON_SALE);
  });

  it("names start, end, full days and refund", () => {
    expect((four?.detail?.rows ?? []).map((row) => row.term)).toEqual(["Starts", "Ends", "Full days", "If refunded"]);
  });

  it("ends on the lister's listings, never a pay or buy action", () => {
    expect(content.action).not.toMatch(/pay|buy|checkout|promote now|purchase/i);
  });
});

describe("guardrail 3: nothing anywhere in the run promises an outcome", () => {
  it("never projects leads, views or results", () => {
    const text = content.panels.map(all).join(" ").toLowerCase();
    for (const phrase of ["will get you", "guarantee", "typically", "on average", "more leads", "x leads", "100 percent"]) {
      expect(text, phrase).not.toContain(phrase);
    }
  });
});
