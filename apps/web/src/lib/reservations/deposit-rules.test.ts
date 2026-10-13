import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEPOSIT_SETTINGS,
  depositSettingsProblem,
  lagosIso,
  lagosParts,
  matchDepositRule,
  percentFromBps,
  planDepositRows,
  settingsFromRules,
  type DepositRule,
  type DepositWindow,
} from "./deposit-rules";

/**
 * The deposit rule a guest is shown before they ask must be the rule
 * `private.reservation_deposit_quote` picks: active, the party at or above the
 * minimum, the window on the Lagos weekday between opening and last seating
 * (none means every time), the largest amount for this party, then the oldest.
 */

const FRI: DepositWindow = { id: "w-fri", weekday: 5, opens: "18:00:00", lastSeating: "22:30:00" };
const SAT: DepositWindow = { id: "w-sat", weekday: 6, opens: "18:00:00", lastSeating: "22:30:00" };

function rule(over: Partial<DepositRule>): DepositRule {
  return {
    id: over.id ?? "r1",
    serviceWindowId: null,
    minPartySize: null,
    amountMinor: 500_000,
    perGuest: true,
    refundUntilHours: 24,
    active: true,
    createdAt: "2026-10-13T09:00:00.000Z",
    ...over,
  };
}

/* Friday 16 October 2026 is a Friday. */
const FRIDAY_8PM = lagosIso("2026-10-16", "20:00");
const FRIDAY_LUNCH = lagosIso("2026-10-16", "13:00");
const TUESDAY_8PM = lagosIso("2026-10-13", "20:00");

describe("matchDepositRule mirrors the database's quote", () => {
  it("reads the Lagos clock, whatever the device", () => {
    expect(lagosParts(FRIDAY_8PM)).toEqual({ weekday: 5, minute: 20 * 60 });
    expect(lagosParts("2026-10-16T23:30:00.000Z")).toEqual({ weekday: 6, minute: 30 });
  });

  it("a party below the minimum owes nothing; at it, per guest", () => {
    const rules = [rule({ minPartySize: 6 })];
    expect(matchDepositRule(rules, [], 5, FRIDAY_8PM)).toBeNull();
    expect(matchDepositRule(rules, [], 6, FRIDAY_8PM)?.amountMinor).toBe(3_000_000);
  });

  it("a window rule applies only on its weekday, from opening to last seating", () => {
    const rules = [rule({ serviceWindowId: "w-fri" })];
    expect(matchDepositRule(rules, [FRI, SAT], 2, FRIDAY_8PM)?.amountMinor).toBe(1_000_000);
    expect(matchDepositRule(rules, [FRI, SAT], 2, FRIDAY_LUNCH)).toBeNull();
    expect(matchDepositRule(rules, [FRI, SAT], 2, TUESDAY_8PM)).toBeNull();
    expect(matchDepositRule(rules, [FRI, SAT], 2, lagosIso("2026-10-16", "22:45"))).toBeNull();
  });

  it("an inactive rule never applies, and a rule on a missing window never does", () => {
    expect(matchDepositRule([rule({ active: false })], [], 4, FRIDAY_8PM)).toBeNull();
    expect(matchDepositRule([rule({ serviceWindowId: "gone" })], [FRI], 4, FRIDAY_8PM)).toBeNull();
  });

  it("the largest amount for this party wins, then the oldest rule", () => {
    const flat = rule({ id: "flat", perGuest: false, amountMinor: 1_500_000 });
    const head = rule({ id: "head", perGuest: true, amountMinor: 500_000 });
    expect(matchDepositRule([flat, head], [], 2, FRIDAY_8PM)?.rule.id).toBe("flat");
    expect(matchDepositRule([flat, head], [], 4, FRIDAY_8PM)?.rule.id).toBe("head");
    const older = rule({ id: "older", createdAt: "2026-10-01T00:00:00.000Z" });
    const newer = rule({ id: "newer", createdAt: "2026-10-12T00:00:00.000Z" });
    expect(matchDepositRule([newer, older], [], 2, FRIDAY_8PM)?.rule.id).toBe("older");
  });

  it("no rules is a free table", () => {
    expect(matchDepositRule([], [FRI], 8, FRIDAY_8PM)).toBeNull();
  });
});

describe("the settings card and the rows it writes", () => {
  it("reads one set back from the rows this card wrote", () => {
    const rows = [rule({ id: "a", serviceWindowId: "w-fri", minPartySize: 4 }), rule({ id: "b", serviceWindowId: "w-sat", minPartySize: 4 })];
    expect(settingsFromRules(rows)).toMatchObject({ on: true, minPartySize: 4, windowIds: ["w-fri", "w-sat"] });
    expect(settingsFromRules(rows.map((r) => ({ ...r, active: false })))).toMatchObject({ on: false, windowIds: null, minPartySize: 4 });
    expect(settingsFromRules([])).toEqual(DEFAULT_DEPOSIT_SETTINGS);
  });

  it("refuses what the table would refuse, before it is sent", () => {
    const on = { ...DEFAULT_DEPOSIT_SETTINGS, on: true };
    expect(depositSettingsProblem(on, [])).toBeNull();
    expect(depositSettingsProblem({ ...on, amountMinor: 9_999 }, [])).toBe("amount");
    expect(depositSettingsProblem({ ...on, minPartySize: 51 }, [])).toBe("party");
    expect(depositSettingsProblem({ ...on, refundUntilHours: 169 }, [])).toBe("refund");
    expect(depositSettingsProblem({ ...on, windowIds: [] }, ["w-fri"])).toBe("times");
    expect(depositSettingsProblem({ ...on, windowIds: ["not-mine"] }, ["w-fri"])).toBe("times");
    /* Off needs nothing else to be valid: turning deposits off always saves. */
    expect(depositSettingsProblem({ ...DEFAULT_DEPOSIT_SETTINGS, on: false, amountMinor: 0 }, [])).toBeNull();
  });

  it("off switches every active row off and writes nothing else; nothing is ever deleted", () => {
    const plan = planDepositRows([rule({ id: "a" }), rule({ id: "b", active: false })], { ...DEFAULT_DEPOSIT_SETTINGS, on: false });
    expect(plan).toEqual({ update: [], insert: [], deactivate: ["a"] });
  });

  it("reuses a window's own row, adds only the missing ones, switches off the rest", () => {
    const existing = [
      rule({ id: "all", serviceWindowId: null }),
      rule({ id: "fri-old", serviceWindowId: "w-fri", active: false }),
    ];
    const plan = planDepositRows(existing, { ...DEFAULT_DEPOSIT_SETTINGS, on: true, windowIds: ["w-fri", "w-sat"], minPartySize: 4 });
    expect(plan.update.map((u) => u.id)).toEqual(["fri-old"]);
    expect(plan.update[0]!.row).toMatchObject({ service_window_id: "w-fri", active: true, min_party_size: 4 });
    expect(plan.insert).toHaveLength(1);
    expect(plan.insert[0]).toMatchObject({ service_window_id: "w-sat", active: true });
    expect(plan.deactivate).toEqual(["all"]);
  });

  it("says Vallo's commission from money_policy as a percentage", () => {
    expect(percentFromBps(200)).toBe("2%");
    expect(percentFromBps(250)).toBe("2.5%");
  });
});
