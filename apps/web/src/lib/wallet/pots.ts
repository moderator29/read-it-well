import "server-only";

import { resolveSession } from "../actions/session";
import { failureReason, logMoney } from "../payments/observability";

/**
 * Savings pots: money the owner has set aside inside their own wallet.
 *
 * ---------------------------------------------------------------------------
 * WHY THE READ IS UNTYPED, IN THIS ONE FILE.
 *
 * `wallet_pots` arrives with a migration the owner applies themselves, so it is
 * absent from `database.types.ts` until those types are regenerated against
 * the live database. The same situation `lib/wallet/rpc.ts` is in, and it is
 * answered the same way: narrow the client to the one method used, in one file,
 * with the expected shape written down beside it, and leave the generated types
 * untouched rather than hand-editing a file a tool owns.
 *
 * When the types are regenerated this file keeps working unchanged; the casts
 * simply stop being load-bearing.
 *
 * ---------------------------------------------------------------------------
 * WHAT HAPPENS BEFORE THE MIGRATION IS APPLIED.
 *
 * `readPots` answers `{ state: "unavailable" }`, never throws, and the wallet
 * draws no pots section at all. That is the same gate the crypto top-up uses
 * and it exists for the same reason: a control that cannot work must not be on
 * screen. So this can ship ahead of the SQL and light up by itself the moment
 * the SQL is run, with nothing to redeploy.
 *
 * IT DISTINGUISHES "NOT THERE YET" FROM "COULD NOT BE READ", because those are
 * different facts and only one of them is worth a line on the money channel.
 * A missing table is a deployment step nobody has taken; a failing read on a
 * table that exists is an incident.
 */

/** Postgres codes for "there is no such table". */
const MISSING_TABLE = new Set(["42P01", "PGRST205", "PGRST202"]);

export type Pot = {
  id: string;
  name: string;
  /** Integer kobo, always >= 0. */
  balanceMinor: number;
  /** What they are aiming for, or null. A private note, never enforced. */
  targetMinor: number | null;
  createdAt: string;
};

export type PotsRead =
  | { state: "ok"; pots: Pot[] }
  /** Signed out, or the table is not in this database yet. Draw nothing. */
  | { state: "unavailable" }
  /** The table is there and the read failed. Say so; do not show an empty list. */
  | { state: "failed" };

type PotRow = {
  id: string;
  name: string;
  balance_minor: number;
  target_minor: number | null;
  created_at: string;
};

type Reader = {
  from: (table: string) => {
    select: (columns: string) => {
      is: (
        column: string,
        value: null,
      ) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => Promise<{ data: PotRow[] | null; error: { code?: string } | null }>;
      };
    };
  };
};

/**
 * This person's open pots, newest last.
 *
 * Read through the SIGNED-IN SESSION's client, so RLS decides which rows come
 * back. The policy is `user_id = auth.uid()`; nothing here filters by user and
 * nothing here should, because a filter in application code is a second place
 * for that rule to be written and the weaker of two rules is the one that gets
 * enforced.
 */
export async function readPots(): Promise<PotsRead> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "unavailable" };

  try {
    const reader = session.supabase as unknown as Reader;
    const { data, error } = await reader
      .from("wallet_pots")
      .select("id, name, balance_minor, target_minor, created_at")
      .is("archived_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      if (error.code && MISSING_TABLE.has(error.code)) {
        /* Not applied yet. Deliberately NOT logged as a money failure: it is a
           deployment step nobody has taken, and a line on the money channel
           every time somebody opens their wallet would bury real incidents. */
        return { state: "unavailable" };
      }
      logMoney({
        surface: "fund",
        outcome: "failed",
        reason: `pots_read_failed:${error.code ?? "unknown"}`,
        userId: session.user.id,
      });
      return { state: "failed" };
    }

    return {
      state: "ok",
      pots: (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        balanceMinor: row.balance_minor ?? 0,
        targetMinor: row.target_minor ?? null,
        createdAt: row.created_at,
      })),
    };
  } catch (error) {
    logMoney({
      surface: "fund",
      outcome: "failed",
      reason: `pots_read_threw:${failureReason(error)}`,
      userId: session.user.id,
    });
    return { state: "failed" };
  }
}

/** What all the pots hold together, for the balance breakdown. */
export function potsTotalMinor(read: PotsRead): number {
  return read.state === "ok" ? read.pots.reduce((sum, pot) => sum + pot.balanceMinor, 0) : 0;
}
