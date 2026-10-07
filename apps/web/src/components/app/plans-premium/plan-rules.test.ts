import { describe, expect, it } from "vitest";
import { benefitsInRange, initialPlan, termsComplete, trialDates } from "./plan-rules";

/**
 * D21 AND 15.6 AS CHECKS. Preselection only when all four terms lines exist;
 * the reminder always the day before the end; no invented date.
 */
const terms = { chargeToday: "a", chargeOn: "b", renewal: "c", cancel: "d" };

describe("preselection, corrected (D21)", () => {
  it("honours the recommended plan only when charge, date, renewal and cancel are all present", () => {
    expect(initialPlan("annual", ["monthly", "annual"], terms)).toBe("annual");
    expect(initialPlan("annual", ["monthly", "annual"], { ...terms, cancel: " " })).toBeNull();
    expect(initialPlan("annual", ["monthly", "annual"], { chargeToday: "a" })).toBeNull();
    expect(initialPlan("annual", ["monthly", "annual"], null)).toBeNull();
  });

  it("never preselects a plan that is not on the screen", () => {
    expect(initialPlan("ghost", ["monthly", "annual"], terms)).toBeNull();
  });

  it("knows a complete set of terms", () => {
    expect(termsComplete(terms)).toBe(true);
    expect(termsComplete({})).toBe(false);
  });
});

describe("the trial timeline (15.6)", () => {
  it("reminds the day before the trial ends", () => {
    expect(trialDates("2026-10-20")).toEqual({ remindOn: "2026-10-19", endsOn: "2026-10-20" });
    expect(trialDates("2026-11-01")).toEqual({ remindOn: "2026-10-31", endsOn: "2026-11-01" });
  });

  it("invents no date when the server gave none", () => {
    expect(trialDates(null)).toEqual({ remindOn: null, endsOn: null });
    expect(trialDates("next week")).toEqual({ remindOn: null, endsOn: null });
  });
});

describe("benefit rows (14.3)", () => {
  it("are three to five", () => {
    expect([2, 3, 5, 6].map(benefitsInRange)).toEqual([false, true, true, false]);
  });
});
