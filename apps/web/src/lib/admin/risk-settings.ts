import { z } from "zod";
import { parseNairaToKobo } from "../money/amount";

/**
 * D77: THE RISK SETTINGS SCREEN'S MODEL. What decides whether a direct-rail deal
 * waits for a person (D68d, scoped by the founder's rulings of 7 October 2026):
 * the review threshold, the recent-change window, each signal on or off, and
 * the incident switch that sends every deal to review. Written only through
 * public.admin_update_risk_settings and public.admin_set_review_kill_switch,
 * which check the staff scope and write the audit log themselves.
 */

export const SIGNALS = [
  {
    key: "first_deal",
    column: "check_first_deal",
    title: "First deal",
    detail: "The lister has never been paid on Vallo, and the business is not verified or the amount is above the threshold.",
  },
  { key: "amount_over", column: "check_amount", title: "Above the threshold", detail: "The amount is above the review threshold." },
  {
    key: "recent_change",
    column: "check_recent_change",
    title: "Recent change",
    detail: "The price or the listing's facts changed inside the change window.",
  },
  {
    key: "payout_name",
    column: "check_payout_name",
    title: "Payout name",
    detail: "The payout account's name does not match the verified or registered name.",
  },
  { key: "fraud_radar", column: "check_fraud_radar", title: "Fraud radar", detail: "The lister or the deal has an open high alert." },
] as const;

export type SignalKey = (typeof SIGNALS)[number]["key"];
export type SignalChecks = Record<SignalKey, boolean>;

export type RiskSettings = {
  amountThresholdMinor: number;
  recentChangeDays: number;
  checks: SignalChecks;
  updatedAt: string | null;
  /** True once a person has saved the settings (null updated_by is the seeded row). */
  setByStaff: boolean;
  killSwitchOn: boolean;
  killSwitchNote: string | null;
};

/** The founder's ruling: 500,000 naira, in kobo. Shown as the seeded value. */
export const RULING_THRESHOLD_MINOR = 50_000_000;
export const MAX_CHANGE_DAYS = 60;
const MIN_THRESHOLD_MINOR = 100;
const MAX_THRESHOLD_MINOR = 100_000_000_000;

function whole(v: unknown): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isSafeInteger(n) ? n : null;
}

/** The settings row and the incident switch's flag row, read together. Null when either is unreadable. */
export function parseRiskSettings(row: unknown, flag: unknown): RiskSettings | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const threshold = whole(r.amount_threshold_minor);
  const days = whole(r.recent_change_days);
  if (threshold === null || threshold <= 0 || days === null || days < 0 || days > MAX_CHANGE_DAYS) return null;
  const checks = {} as SignalChecks;
  for (const s of SIGNALS) {
    if (typeof r[s.column] !== "boolean") return null;
    checks[s.key] = r[s.column] as boolean;
  }
  const f = flag && typeof flag === "object" ? (flag as Record<string, unknown>) : null;
  return {
    amountThresholdMinor: threshold,
    recentChangeDays: days,
    checks,
    updatedAt: typeof r.updated_at === "string" ? r.updated_at : null,
    setByStaff: typeof r.updated_by === "string",
    /* No row is off: the switch fails safe to the signals, as the gate reads it. */
    killSwitchOn: f?.enabled === true,
    killSwitchNote: typeof f?.note === "string" && f.note.trim() !== "" ? f.note : null,
  };
}

export const SETTINGS_REFUSAL = {
  bad_threshold: "Enter a threshold between 1 naira and 1,000,000,000 naira.",
  bad_days: `Enter a change window from 0 to ${MAX_CHANGE_DAYS} days.`,
  forbidden: "Your account cannot change the risk settings.",
  reason_required: "Say why in at least ten characters. It is kept in the audit log.",
  bad_request: "That change could not be read. Nothing changed.",
} as const;

const checksSchema = z.object(
  Object.fromEntries(SIGNALS.map((s) => [s.key, z.boolean()])) as Record<SignalKey, z.ZodBoolean>,
);

export const RiskSettingsInput = z.object({
  thresholdNaira: z.string().trim().min(1, SETTINGS_REFUSAL.bad_threshold).max(24),
  recentChangeDays: z.number().int(SETTINGS_REFUSAL.bad_days).min(0, SETTINGS_REFUSAL.bad_days).max(MAX_CHANGE_DAYS, SETTINGS_REFUSAL.bad_days),
  checks: checksSchema,
});
export type RiskSettingsInput = z.infer<typeof RiskSettingsInput>;

export const KillSwitchInput = z.object({
  on: z.boolean(),
  reason: z.string().trim().min(10, SETTINGS_REFUSAL.reason_required).max(500),
});

/** The arguments public.admin_update_risk_settings takes, or the refusal to show. */
export function settingsRpcArgs(input: RiskSettingsInput): { ok: true; args: Record<string, unknown> } | { ok: false; error: string } {
  const minor = parseNairaToKobo(input.thresholdNaira);
  if (minor === null || minor < MIN_THRESHOLD_MINOR || minor > MAX_THRESHOLD_MINOR) return { ok: false, error: SETTINGS_REFUSAL.bad_threshold };
  return {
    ok: true,
    args: {
      p_amount_threshold_minor: minor,
      p_recent_change_days: input.recentChangeDays,
      p_check_first_deal: input.checks.first_deal,
      p_check_amount: input.checks.amount_over,
      p_check_recent_change: input.checks.recent_change,
      p_check_payout_name: input.checks.payout_name,
      p_check_fraud_radar: input.checks.fraud_radar,
    },
  };
}

/** The database's answer as words, or null when it saved. */
export function settingsAnswer(data: unknown): string | null {
  const status = String((data as Record<string, unknown> | null)?.status ?? "");
  if (status === "ok") return null;
  return (SETTINGS_REFUSAL as Record<string, string>)[status] ?? "The settings could not be saved. Nothing changed. Try again.";
}

/** Kobo to the plain naira text the field starts from ("500000"). */
export function thresholdFieldText(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}
