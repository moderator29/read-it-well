import { describe, expect, it } from "vitest";
import {
  KillSwitchInput,
  RULING_THRESHOLD_MINOR,
  RiskSettingsInput,
  SETTINGS_REFUSAL,
  SIGNALS,
  parseRiskSettings,
  settingsAnswer,
  settingsRpcArgs,
  thresholdFieldText,
} from "./risk-settings";

const ROW = {
  amount_threshold_minor: 50_000_000,
  recent_change_days: 3,
  check_first_deal: true,
  check_amount: true,
  check_recent_change: false,
  check_payout_name: true,
  check_fraud_radar: true,
  updated_at: "2026-10-07T10:00:00Z",
  updated_by: null,
};
const ALL_ON = { first_deal: true, amount_over: true, recent_change: true, payout_name: true, fraud_radar: true };

describe("the risk settings screen's model (D77)", () => {
  it("reads the seeded row: 500,000 naira, each signal by its column, the switch off without a row", () => {
    const s = parseRiskSettings(ROW, null)!;
    expect(s.amountThresholdMinor).toBe(RULING_THRESHOLD_MINOR);
    expect(s.checks).toEqual({ ...ALL_ON, recent_change: false });
    expect(s.setByStaff).toBe(false);
    expect(s.killSwitchOn).toBe(false);
    expect(parseRiskSettings({ ...ROW, updated_by: "u1" }, { enabled: true, note: "Fraud wave" })).toMatchObject({
      setByStaff: true,
      killSwitchOn: true,
      killSwitchNote: "Fraud wave",
    });
  });

  it("refuses a row it cannot read rather than guess a setting", () => {
    expect(parseRiskSettings(null, null)).toBeNull();
    expect(parseRiskSettings({ ...ROW, check_amount: null }, null)).toBeNull();
    expect(parseRiskSettings({ ...ROW, recent_change_days: 61 }, null)).toBeNull();
    expect(parseRiskSettings({ ...ROW, amount_threshold_minor: "50000000" }, null)?.amountThresholdMinor).toBe(50_000_000);
  });

  it("sends every signal to its own argument, and the threshold in kobo", () => {
    const input = RiskSettingsInput.parse({ thresholdNaira: "750,000", recentChangeDays: 5, checks: { ...ALL_ON, payout_name: false } });
    expect(settingsRpcArgs(input)).toEqual({
      ok: true,
      args: {
        p_amount_threshold_minor: 75_000_000,
        p_recent_change_days: 5,
        p_check_first_deal: true,
        p_check_amount: true,
        p_check_recent_change: true,
        p_check_payout_name: false,
        p_check_fraud_radar: true,
      },
    });
    expect(SIGNALS.map((s) => s.column)).toEqual([
      "check_first_deal",
      "check_amount",
      "check_recent_change",
      "check_payout_name",
      "check_fraud_radar",
    ]);
  });

  it("refuses a threshold or a window out of range before asking the database", () => {
    expect(settingsRpcArgs({ thresholdNaira: "0.50", recentChangeDays: 3, checks: ALL_ON })).toEqual({ ok: false, error: SETTINGS_REFUSAL.bad_threshold });
    expect(settingsRpcArgs({ thresholdNaira: "abc", recentChangeDays: 3, checks: ALL_ON })).toMatchObject({ ok: false });
    expect(RiskSettingsInput.safeParse({ thresholdNaira: "500000", recentChangeDays: 61, checks: ALL_ON }).success).toBe(false);
    expect(RiskSettingsInput.safeParse({ thresholdNaira: "500000", recentChangeDays: 3, checks: { ...ALL_ON, fraud_radar: undefined } }).success).toBe(false);
  });

  it("the incident switch needs a reason of ten characters", () => {
    expect(KillSwitchInput.safeParse({ on: true, reason: "short" }).success).toBe(false);
    expect(KillSwitchInput.safeParse({ on: true, reason: "A fraud wave on direct deals" }).success).toBe(true);
  });

  it("maps the database's answers to words", () => {
    expect(settingsAnswer({ status: "ok" })).toBeNull();
    expect(settingsAnswer({ status: "forbidden" })).toBe(SETTINGS_REFUSAL.forbidden);
    expect(settingsAnswer({ status: "bad_days" })).toBe(SETTINGS_REFUSAL.bad_days);
    expect(settingsAnswer(null)).toMatch(/could not be saved/);
  });

  it("prints the threshold for the field without kobo when there are none", () => {
    expect(thresholdFieldText(50_000_000)).toBe("500000");
    expect(thresholdFieldText(50_000_050)).toBe("500000.50");
  });
});
