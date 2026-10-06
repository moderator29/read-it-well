import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { formatMoney } from "@vallo/i18n/core";
import * as moneyCopy from "@/lib/money/copy";
import { PROMOTION_FULL_DAYS, PROMOTION_NOT_ON_SALE, PROMOTION_TIERS_CAPTION } from "@/lib/money/copy";
import { LISTER_GAPS, type ListingMeasurement, type ListingMeasurementRead } from "@/lib/promotion/measurement";
import { PROMOTION_METRICS, PROMOTION_TIER_TABLE, perDayKobo } from "@/lib/promotion/tiers";
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
const c = t.experienceFeatures.firstRun.promotion;

/** The read as `readListingMeasurement` returns it for a lister's own listing. */
const BASELINE: ListingMeasurement = {
  windowDays: 30,
  values: { ...Object.fromEntries(PROMOTION_METRICS.map((m) => [m, null])), inquiries: 12, contacts: 5, viewings: 2, bookings: 0 } as ListingMeasurement["values"],
  gaps: { ...LISTER_GAPS },
};
const screenThree = (read: ListingMeasurementRead) => firstRunContent("promotion", t, "en", undefined, read).panels[2];
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

  it("has one row per tier, by reach: the name, the naira price, the days, the naira a day and who it suits", () => {
    expect(rows.map((row) => row.term)).toEqual(["Boost", "Spotlight", "Featured", "Everywhere"]);
    const slugs = ["boost", "spotlight", "featured", "prime"] as const;
    rows.forEach((row, index) => {
      const tier = PROMOTION_TIER_TABLE[slugs[index]!];
      expect(row.meta).toContain(formatMoney(tier.priceKobo, "en"));
      expect(row.meta).toContain(`${tier.durationDays} days`);
      expect(row.meta).toContain(`${formatMoney(perDayKobo(tier), "en")} a day`);
      expect(row.text).toBe(t.experienceFeatures.promotion.tiers[tier.displayKey].forWhom);
    });
    expect(rows.map((row) => row.meta)).toEqual([
      "₦2,500 for 7 days, ₦357 a day",
      "₦7,500 for 14 days, ₦536 a day",
      "₦20,000 for 30 days, ₦667 a day",
      "₦50,000 for 30 days, ₦1,667 a day",
    ]);
  });

  it("prints the spec's naira figures", () => {
    const text = all(two);
    for (const figure of ["2,500", "7,500", "20,000", "50,000"]) expect(text).toContain(figure);
  });

  it("carries no proposed marking: the prices are confirmed; and it is not a tick matrix", () => {
    expect(two?.detail?.caption).toBe(PROMOTION_TIERS_CAPTION);
    expect(all(two)).not.toMatch(/proposed|to be confirmed/i);
    expect(all(two)).not.toMatch(/[✓✔✗✘×]/);
    expect("PROMOTION_PRICES_PROPOSED" in moneyCopy).toBe(false);
  });
});

describe("screen 3: what you will be able to measure, with nothing invented", () => {
  it("says Vallo never estimates a number it does not have", () => {
    expect(three?.body).toMatch(/never estimates a number it does not have/);
  });

  it("opened from a listing, shows that listing's own last thirty days and says it is without promotion", () => {
    const panel = screenThree({ state: "ok", measurement: BASELINE });
    expect(panel?.detail?.caption).toBe(c.p3Baseline);
    expect(panel?.detail?.caption).toMatch(/last thirty days, without promotion/);
    expect(panel?.detail?.caption).toMatch(/baseline/);
    const by = Object.fromEntries((panel?.detail?.rows ?? []).map((row) => [row.term, row]));
    expect(by["Inquiries"]?.text).toBe("12");
    expect(by["Contacts"]?.text).toBe("5");
    expect(by["Viewings"]?.text).toBe("2");
    /* A recorded zero is zero; a figure the lister cannot read is No data with its reason, never 0. */
    expect(by["Bookings"]?.text).toBe("0");
    expect(by["Impressions"]?.text).toBe(t.experienceFeatures.promotion.noData);
    expect(by["Impressions"]?.meta).toBe(t.experienceFeatures.promotion.gaps.notReadable);
    expect(by["Unique viewers"]?.meta).toBe(t.experienceFeatures.promotion.gaps.notKept);
    expect(by["Saves"]?.text).toBe(t.experienceFeatures.promotion.noData);
  });

  it("opened with no listing, lays out the ten figures with no number and says what it will show instead", () => {
    const rows = three?.detail?.rows ?? [];
    expect(rows).toHaveLength(PROMOTION_METRICS.length);
    for (const row of rows) {
      expect(row.text).toBe(t.experienceFeatures.promotion.noData);
      expect(`${row.term} ${row.meta ?? ""} ${row.text}`).not.toMatch(/\d/);
    }
    expect(three?.detail?.caption).toBe(c.p3NoListing);
    expect(three?.detail?.caption).toMatch(/Opened without a listing/);
  });

  it("an example, somebody else's or an unreadable listing shows no figures and says why", () => {
    for (const state of ["example", "missing", "unavailable"] as const) {
      const panel = screenThree({ state });
      for (const row of panel?.detail?.rows ?? []) expect(row.text).toBe(t.experienceFeatures.promotion.noData);
      expect(panel?.detail?.caption).not.toBe(c.p3Baseline);
    }
  });
});

describe("screen 4: pick, pay and what happens next, with no way to pay", () => {
  it("says buying is not open, in the body", () => {
    expect(four?.body).toBe(PROMOTION_NOT_ON_SALE);
  });

  it("names start, end, the front door, full days and refund", () => {
    expect((four?.detail?.rows ?? []).map((row) => row.term)).toEqual(["Starts", "Ends", "The front door", "Full days", "If refunded"]);
  });

  it("states the published front door count before any payment: six a day per city, Everywhere at most two, Featured at most four", () => {
    const door = (four?.detail?.rows ?? []).find((row) => row.term === "The front door")?.text ?? "";
    expect(door).toContain("one Promoted rail per city, with 6 places a day");
    expect(door).toContain("Everywhere can hold at most 2");
    expect(door).toContain("Featured at most 4");
    const full = (four?.detail?.rows ?? []).find((row) => row.term === "Full days")?.text;
    expect(full).toBe(PROMOTION_FULL_DAYS);
    expect(full).toMatch(/the reason and the next date that is free/);
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
    /* The run opened from a listing says the same. */
    const withListing = firstRunContent("promotion", t, "en", undefined, { state: "ok", measurement: BASELINE })
      .panels.map(all)
      .join(" ")
      .toLowerCase();
    for (const phrase of ["will get you", "guarantee", "typically", "on average", "more leads", "x leads"]) {
      expect(withListing, phrase).not.toContain(phrase);
    }
  });
});
