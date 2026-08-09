import "server-only";

import type { AdminRead } from "./money-queries";
import { requireAdmin } from "./guard";

/**
 * Payment and wallet health: the three questions an operator cannot answer.
 *
 * THE GAP THIS FILLS. `private.wallets_overdrawn()` and
 * `private.stale_withdrawal_holds()` have been in the database since the wallet
 * layer landed, and both public pass-throughs carry EXECUTE for `service_role`
 * only. That is right for the nightly reconcile job and useless for a person:
 * an operator holding the admin role could not call either one, so "is anybody's
 * money stuck" was a question with no screen and only a SQL console for an
 * answer. `/admin/money` lists wallets and a ledger; it cannot compute either
 * aggregate, because both are set-returning functions this client cannot reach.
 *
 * WHY AN RPC AND NOT A TABLE READ. Two of the three findings are aggregates
 * over the whole ledger. Pulling `wallet_entries` into this process to sum it in
 * TypeScript would move every entry the admin policy publishes across the wire
 * to answer a question Postgres answers in one pass, and it would drift from
 * `private.wallets_overdrawn()` the first time either arithmetic was edited.
 * `public.admin_payment_health` is that function's own answer, not a second
 * opinion about it.
 *
 * AUTHORISATION. `public.admin_payment_health` is SECURITY DEFINER and repeats
 * the role check at its own boundary: `auth.uid()` must carry `admin` or
 * `super_admin` under `private.has_role`, or it returns `{"status":"forbidden"}`
 * and reads nothing. `anon` has no EXECUTE at all. The call below goes through
 * the operator's own RLS-bound client, never the service role, so a role revoked
 * five minutes ago is a refusal now. `requireAdmin()` in front of it is the
 * second lock, not the only one.
 *
 * Money is integer kobo throughout. Nothing here divides by a hundred.
 */

/** A wallet whose settled entries sum below zero. The books are wrong. */
export type OverdrawnWallet = {
  walletId: string;
  userId: string | null;
  ownerName: string | null;
  /** Negative, in kobo. */
  balanceMinor: number;
};

/** A withdrawal hold that has been PENDING long enough to be stuck. */
export type StaleHold = {
  reference: string;
  walletId: string | null;
  userId: string | null;
  ownerName: string | null;
  amountMinor: number;
  createdAt: string;
};

/** A payment the provider has not settled. */
export type UnsettledPayment = {
  id: string;
  provider: string | null;
  providerRef: string | null;
  amountMinor: number;
  currency: string | null;
  status: string;
  bookingId: string | null;
  createdAt: string;
};

export type PaymentHealth = {
  /** The window, in minutes, past which a PENDING hold counts as stuck. */
  staleMinutes: number;
  overdrawn: OverdrawnWallet[];
  staleHolds: StaleHold[];
  unsettled: UnsettledPayment[];
  totals: {
    /** Kobo frozen by holds nobody has swept. */
    frozenMinor: number;
    /** Kobo the ledger is short by, as a positive number. */
    shortfallMinor: number;
    unsettledMinor: number;
  };
};

/** Older than this and a PENDING withdrawal hold is not in flight, it is stuck. */
export const STALE_HOLD_MINUTES = 30;

const UNAVAILABLE = { state: "unavailable" } as const;

function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is Record<string, unknown> =>
      row !== null && typeof row === "object" && !Array.isArray(row),
  );
}

function text(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * A money field, and it refuses anything that is not a safe integer.
 *
 * jsonb hands bigint back as a JSON number. Anything that arrived as a float,
 * a string or a value past 2^53 is not a kobo amount we can add up honestly, so
 * it becomes 0 here rather than an approximation nobody can trace.
 */
function minor(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  return typeof value === "number" && Number.isSafeInteger(value) ? value : 0;
}

export async function getPaymentHealth(
  staleMinutes: number = STALE_HOLD_MINUTES,
): Promise<AdminRead<PaymentHealth>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  try {
    const { data, error } = await access.supabase.rpc("admin_payment_health", {
      p_stale_minutes: staleMinutes,
    });
    if (error) return UNAVAILABLE;
    if (data === null || typeof data !== "object" || Array.isArray(data)) return UNAVAILABLE;

    const envelope = data as Record<string, unknown>;
    /*
     * "forbidden" is unavailable, not empty.
     *
     * A refusal rendered as an empty panel would tell a tired operator that
     * nobody's money is stuck, which is the one lie this screen must never
     * tell. Every non-ok status takes the same honest branch.
     */
    if (envelope["status"] !== "ok") return UNAVAILABLE;

    const overdrawn: OverdrawnWallet[] = rows(envelope["overdrawn"]).map((row) => ({
      walletId: text(row, "wallet_id") ?? "",
      userId: text(row, "user_id"),
      ownerName: text(row, "display_name"),
      balanceMinor: minor(row, "balance_minor"),
    }));

    const staleHolds: StaleHold[] = rows(envelope["stale_holds"]).map((row) => ({
      reference: text(row, "reference") ?? "",
      walletId: text(row, "wallet_id"),
      userId: text(row, "user_id"),
      ownerName: text(row, "display_name"),
      amountMinor: minor(row, "amount_minor"),
      createdAt: text(row, "created_at") ?? "",
    }));

    const unsettled: UnsettledPayment[] = rows(envelope["unsettled"]).map((row) => ({
      id: text(row, "id") ?? "",
      provider: text(row, "provider"),
      providerRef: text(row, "provider_ref"),
      amountMinor: minor(row, "amount_minor"),
      currency: text(row, "currency"),
      status: text(row, "status") ?? "PENDING",
      bookingId: text(row, "booking_id"),
      createdAt: text(row, "created_at") ?? "",
    }));

    const windowMinutes = envelope["stale_minutes"];

    return {
      state: "ok",
      data: {
        staleMinutes:
          typeof windowMinutes === "number" && Number.isSafeInteger(windowMinutes)
            ? windowMinutes
            : staleMinutes,
        overdrawn,
        staleHolds,
        unsettled,
        totals: {
          frozenMinor: staleHolds.reduce((sum, hold) => sum + hold.amountMinor, 0),
          /* Overdrawn balances are negative. The shortfall is what the ledger
             is short BY, which reads better as a positive amount beside the
             word "short" than as a minus sign an operator has to interpret. */
          shortfallMinor: overdrawn.reduce((sum, wallet) => sum - wallet.balanceMinor, 0),
          unsettledMinor: unsettled.reduce((sum, payment) => sum + payment.amountMinor, 0),
        },
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
