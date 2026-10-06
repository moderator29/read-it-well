/**
 * THE PAYLUK COMMISSION SWEEP (D51).
 *
 * Vallo's 2 percent on the escrow rail is a merchant-dashboard setting and
 * lands in Vallo's own Payluk merchant wallet as `commission` transactions.
 * Paystack revenue arrives by itself; this does not. Each run:
 *
 *   1. Payluk off (no key): returns at once, writes nothing, calls nothing.
 *   2. Paced: one Payluk request per run, and no run within a minute of the
 *      last recorded one, so the sweep can never take a meaningful share of
 *      the 10-per-minute-per-key budget the live rail shares with it.
 *   3. Reads GET /v1/merchant/balance and records the balance in kobo.
 *   4. A positive main balance goes to `withdrawMerchantWallet`, which today
 *      is the named, unimplemented boundary (no documented route); the run
 *      is recorded `withdrawal_unavailable` and raises an alert so a person
 *      withdraws it from the dashboard. The Money desk shows it waiting.
 *   5. Nothing here is recorded as revenue. Revenue is recorded only when a
 *      withdrawal is CONFIRMED, as one ledger line in agent B2's ledger.
 *
 * Dependencies are injected so every branch is a unit test; `runCommissionSweep`
 * is what the cron route (not owned here) calls with the real ones.
 */

import {
  paylukMerchantConfig,
  readMerchantBalance,
  withdrawMerchantWallet,
  type MerchantWithdrawal,
  type PaylukEnvironment,
} from "./payluk-merchant";

export type SweepRow = {
  environment: PaylukEnvironment;
  outcome: "balance_read" | "nothing_to_sweep" | "withdrawal_unavailable" | "withdrawal_submitted" | "paced" | "failed";
  main_balance_minor?: number | null;
  escrow_balance_minor?: number | null;
  currency?: string | null;
  withdrawal_minor?: number | null;
  withdrawal_reference?: string | null;
  rate_limit_remaining?: number | null;
  error_code?: string | null;
  error_detail?: string | null;
  finished_at?: string;
};

export type SweepDeps = {
  env: Readonly<Record<string, string | undefined>>;
  fetchImpl: Parameters<typeof readMerchantBalance>[1];
  /** When the last run started, or null when there is none or it could not be read. */
  lastRunAt: () => Promise<Date | null>;
  record: (row: SweepRow) => Promise<boolean>;
  withdraw?: (amountMinor: number) => Promise<MerchantWithdrawal>;
  now?: () => Date;
};

export type SweepVerdict = {
  outcome: "ok" | "attention";
  counts: Record<string, number>;
  detail: Record<string, unknown>;
  alert: { kind: string; severity: "info" | "warning" | "critical"; detail: Record<string, string | number | boolean | null> } | null;
};

/** The minimum gap between two runs. */
export const SWEEP_MIN_GAP_MS = 60_000;

export async function sweepPaylukCommission(deps: SweepDeps): Promise<SweepVerdict> {
  const config = paylukMerchantConfig(deps.env);
  if (!config) {
    return { outcome: "ok", counts: { requests: 0 }, detail: { skipped: "payluk_not_configured" }, alert: null };
  }
  const now = (deps.now ?? (() => new Date()))();
  const last = await deps.lastRunAt();
  if (last && now.getTime() - last.getTime() < SWEEP_MIN_GAP_MS) {
    return { outcome: "ok", counts: { requests: 0 }, detail: { skipped: "paced" }, alert: null };
  }

  const balance = await readMerchantBalance(config, deps.fetchImpl);
  if ("failed" in balance) {
    const saved = await deps.record({
      environment: config.environment,
      outcome: "failed",
      error_code: balance.code,
      error_detail: balance.detail || null,
      rate_limit_remaining: balance.rateLimitRemaining,
      finished_at: now.toISOString(),
    });
    return {
      outcome: "attention",
      counts: { requests: 1 },
      detail: { failed: balance.code, recorded: saved },
      alert: { kind: "payluk.commission_sweep_failed", severity: "warning", detail: { code: balance.code, environment: config.environment } },
    };
  }

  const base = {
    environment: config.environment,
    main_balance_minor: balance.mainMinor,
    escrow_balance_minor: balance.escrowMinor,
    currency: balance.currency || null,
    rate_limit_remaining: balance.rateLimitRemaining,
  };

  if (balance.mainMinor <= 0) {
    const saved = await deps.record({ ...base, outcome: "nothing_to_sweep", finished_at: now.toISOString() });
    return { outcome: "ok", counts: { requests: 1, main_minor: 0 }, detail: { recorded: saved }, alert: null };
  }

  /* The budget: a withdrawal is a second request. Never spend the last one. */
  if (balance.rateLimitRemaining !== null && balance.rateLimitRemaining <= 1) {
    const saved = await deps.record({ ...base, outcome: "paced", finished_at: now.toISOString() });
    return { outcome: "ok", counts: { requests: 1, main_minor: balance.mainMinor }, detail: { paced: true, recorded: saved }, alert: null };
  }

  const withdrawal = await (deps.withdraw ?? (() => withdrawMerchantWallet()))(balance.mainMinor);
  if (withdrawal.kind === "not_available") {
    const saved = await deps.record({
      ...base,
      outcome: "withdrawal_unavailable",
      error_code: "no_documented_route",
      error_detail: withdrawal.reason,
      finished_at: now.toISOString(),
    });
    return {
      outcome: "attention",
      counts: { requests: 1, main_minor: balance.mainMinor },
      detail: { withdrawal: "not_available", recorded: saved },
      alert: {
        kind: "payluk.commission_waiting",
        severity: "info",
        detail: { main_minor: balance.mainMinor, environment: config.environment },
      },
    };
  }

  const saved = await deps.record({
    ...base,
    outcome: "withdrawal_submitted",
    withdrawal_minor: withdrawal.amountMinor,
    withdrawal_reference: withdrawal.reference,
    finished_at: now.toISOString(),
  });
  return {
    outcome: "ok",
    counts: { requests: 2, main_minor: balance.mainMinor, withdrawn_minor: withdrawal.amountMinor },
    detail: { reference: withdrawal.reference, recorded: saved },
    alert: null,
  };
}
