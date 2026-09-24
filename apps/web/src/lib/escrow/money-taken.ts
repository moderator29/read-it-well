import type { Database } from "@/lib/supabase/database.types";

type EscrowState = Database["public"]["Enums"]["escrow_state"];

/**
 * ESC-01. WHETHER AN AGREEMENT IS HOLDING MONEY THAT WAS ACTUALLY TAKEN.
 *
 * DISPUTED says an argument is open, not that anything was ever debited. Until
 * the dispute door was narrowed, a proposal nobody funded could be disputed
 * straight from INITIATED, and the balance breakdown and the desk's held total
 * both counted it as held money: the payer saw "N5,000,000 held out" of a
 * balance that never moved. A DISPUTED row counts only when it was funded,
 * which the database stamps (`funded_at`) in the same transaction as the hold.
 * The database refuses to settle anything else (`never_funded`), so these
 * reads now say what the ledger says.
 */
export function escrowHoldsTakenMoney(row: {
  state: EscrowState;
  funded_at: string | null;
}): boolean {
  if (row.state === "FUNDED" || row.state === "HELD" || row.state === "RELEASE_REQUESTED") {
    return true;
  }
  return row.state === "DISPUTED" && row.funded_at !== null;
}
