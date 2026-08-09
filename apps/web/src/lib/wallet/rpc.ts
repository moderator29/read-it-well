import "server-only";

import { failureReason, logMoney, type MoneySurface } from "../payments/observability";
import type { AdminClient } from "./ledger";

/**
 * The one door from the money path to its locking database functions.
 *
 * WHY THIS FILE EXISTS AT ALL. Every movement of money on this platform has to
 * be decided and written inside a single Postgres transaction that holds a row
 * lock on the payer's wallet. Reading a balance over PostgREST and then posting
 * an entry over PostgREST is two round trips with nothing between them, so two
 * concurrent withdrawals both read the same balance, both find it sufficient,
 * and both post. That is not a race that needs unusual timing; two taps on a
 * slow Nigerian connection produce it. `private.pay_booking_from_wallet` and
 * `private.transfer_between_wallets` already do it correctly, with SELECT FOR
 * UPDATE and a unique_violation handler, and the answer is to call them rather
 * than to reimplement their arithmetic in TypeScript.
 *
 * WHY THE CALLS ARE UNTYPED HERE. PostgREST exposes the `public` schema only,
 * so each `private.` function reaches this process through a thin `public.`
 * SECURITY DEFINER wrapper. Those wrappers land with Agent B's migrations and
 * are therefore absent from the generated database types until the types are
 * regenerated. Narrowing the client to the single method used, in one file,
 * with the expected signatures written down beside it, keeps the boundary
 * explicit and keeps `supabase/database.types.ts` untouched. This mirrors
 * lib/security/service-rpc.ts, which does the same thing for the abuse
 * controls.
 *
 * WHAT HAPPENS WHEN A FUNCTION IS NOT THERE YET. `missing` comes back, never a
 * throw. Callers treat that as "the atomic path is unavailable" and say so on
 * the money channel, which is a visible, greppable line rather than silence.
 * No caller may treat `missing` as success.
 *
 * ----------------------------------------------------------------------------
 * THE CONTRACT. Every function below is required by this module and each is
 * SECURITY DEFINER, `set search_path to public`, with EXECUTE revoked from
 * `anon` and `authenticated` so only the service role can reach it.
 *
 *  public.transfer_between_wallets(
 *      sender_user uuid, recipient_user uuid, amount bigint,
 *      out_reference text, in_reference text, note text default null)
 *    returns text
 *    A pass-through to the private function of the same name, which already
 *    exists and is already correct. Returns one of:
 *      'ok' | 'duplicate' | 'insufficient' | 'same_wallet' | 'bad_amount'
 *      | 'no_wallet'
 *
 *  public.hold_wallet_withdrawal(
 *      owner_user uuid, amount bigint,
 *      hold_reference text, hold_metadata jsonb default '{}'::jsonb)
 *    returns jsonb
 *    NEEDED. The withdrawal equivalent of pay_booking_from_wallet: lock the
 *    owner's wallet FOR UPDATE, compute settled minus pending debits inside
 *    that lock, and insert the PENDING withdrawal debit in the same statement,
 *    handling unique_violation as 'duplicate'. Returns
 *      { status: 'ok' | 'duplicate' | 'insufficient' | 'bad_amount'
 *                | 'no_wallet',
 *        available_minor: bigint, wallet_id: uuid }
 *
 *  public.expire_stale_withdrawal_holds(older_than_minutes integer default 30)
 *    returns jsonb
 *    NEEDED. A PENDING withdrawal hold whose transfer webhook never lands holds
 *    the owner's balance forever, because availableBalanceMinor subtracts every
 *    pending debit. This flips holds older than the cutoff to FAILED inside one
 *    transaction, which returns the money to the spendable balance. Returns
 *      { expired: integer, references: text[] }
 *
 *  public.stale_withdrawal_holds(older_than_minutes integer default 30)
 *    returns setof record  (reference text, wallet_id uuid,
 *                           amount_minor bigint, created_at timestamptz)
 *    A pass-through to private.stale_withdrawal_holds, which already exists and
 *    which nothing has ever called.
 *
 *  public.wallets_overdrawn()
 *    returns setof record  (wallet_id uuid, user_id uuid, balance_minor bigint)
 *    A pass-through to private.wallets_overdrawn, which already exists and
 *    which nothing has ever called. A wallet below zero is a ledger that has
 *    lost an argument with itself and it must page somebody.
 *
 *  public.escrow_hold(escrow_id uuid, payer_user uuid, amount bigint,
 *                     hold_reference text, note text default null)
 *  public.escrow_release(escrow_id uuid, beneficiary_user uuid,
 *                        release_reference text, note text default null)
 *  public.escrow_refund(escrow_id uuid, payer_user uuid,
 *                       refund_reference text, note text default null)
 *    all returns jsonb
 *    NEEDED, with the escrow state machine. Each locks the escrow row and the
 *    wallet it touches, checks the state transition is legal, and posts the
 *    single wallet_entries row for its leg (`escrow_hold` debit,
 *    `escrow_release` credit, `escrow_refund` credit) in the same transaction
 *    as the state change. Release and refund read their amount from the escrow
 *    row rather than from the caller, so a caller cannot release more than is
 *    held. Returns
 *      { status: 'ok' | 'duplicate' | 'insufficient' | 'not_found'
 *                | 'wrong_state' | 'bad_amount',
 *        amount_minor: bigint, state: text }
 * ----------------------------------------------------------------------------
 */

type RpcError = { message?: string | null; code?: string | null };

type RpcCaller = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: RpcError | null }>;
};

/**
 * What a call to a money function did.
 *
 *  - ok       the function ran and returned something
 *  - missing  the function is not applied to this database yet
 *  - failed   it ran and errored, or the call itself could not complete
 */
export type WalletRpcResult =
  | { outcome: "ok"; data: unknown }
  | { outcome: "missing"; reason: string }
  | { outcome: "failed"; reason: string };

/**
 * PostgREST's code for "no function matches that name and argument list". It
 * is the one error that means "not deployed yet" rather than "money is in an
 * unknown state", and telling those two apart is the difference between a
 * fallback and a page.
 */
const UNDEFINED_FUNCTION_CODES = new Set(["PGRST202", "42883"]);

function isMissing(error: RpcError): boolean {
  if (error.code && UNDEFINED_FUNCTION_CODES.has(error.code)) return true;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("could not find the function") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

/**
 * Call one money function through the service role.
 *
 * Never throws. Every branch says something on the money channel, because the
 * whole reason this file exists is that the money path used to decide things in
 * silence.
 */
export async function callMoneyRpc(
  admin: AdminClient,
  surface: MoneySurface,
  fn: string,
  args: Record<string, unknown>,
  context?: { reference?: string | null; amountMinor?: number | null; userId?: string | null },
): Promise<WalletRpcResult> {
  try {
    const caller = admin as unknown as RpcCaller;
    const { data, error } = await caller.rpc(fn, args);
    if (error) {
      if (isMissing(error)) {
        logMoney({
          surface,
          outcome: "unconfigured",
          reason: `rpc_not_applied:${fn}`,
          ...context,
        });
        return { outcome: "missing", reason: `${fn} is not applied to this database` };
      }
      const reason = error.message ?? error.code ?? "rpc_error";
      logMoney({ surface, outcome: "failed", reason: `rpc_error:${fn}:${reason}`, ...context });
      return { outcome: "failed", reason };
    }
    return { outcome: "ok", data };
  } catch (error) {
    logMoney({
      surface,
      outcome: "failed",
      reason: `rpc_threw:${fn}:${failureReason(error)}`,
      ...context,
    });
    return { outcome: "failed", reason: failureReason(error) };
  }
}

/** The `{ status: ... }` shape every jsonb-returning money function uses. */
export type MoneyRpcStatus = {
  status: string;
  amountMinor: number | null;
  availableMinor: number | null;
  walletId: string | null;
  state: string | null;
};

function integerOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

/**
 * Read a jsonb money answer without trusting its shape. An unreadable answer
 * becomes status "unreadable" rather than a throw, so a caller always has a
 * branch to take and never a crash halfway through a payment.
 */
export function readMoneyStatus(data: unknown): MoneyRpcStatus {
  if (typeof data === "string") {
    // transfer_between_wallets returns a bare text status.
    return { status: data, amountMinor: null, availableMinor: null, walletId: null, state: null };
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return {
      status: "unreadable",
      amountMinor: null,
      availableMinor: null,
      walletId: null,
      state: null,
    };
  }
  const row = data as Record<string, unknown>;
  const status = typeof row["status"] === "string" ? (row["status"] as string) : "unreadable";
  return {
    status,
    amountMinor: integerOrNull(row["amount_minor"]),
    availableMinor: integerOrNull(row["available_minor"]),
    walletId: typeof row["wallet_id"] === "string" ? (row["wallet_id"] as string) : null,
    state: typeof row["state"] === "string" ? (row["state"] as string) : null,
  };
}
