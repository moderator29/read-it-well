import "server-only";

import type { AdminClient } from "@/lib/supabase/service";
import { ledgerEntryProblem, type LedgerEntryInput } from "./events";

/**
 * The app's door into the ledger pots. Nothing here writes a table: both
 * calls are database functions that are the only writers
 * (`public.ledger_record`, `public.ledger_record_escrow_commission`,
 * service_role only).
 *
 * DEPENDS ON THE PENDING MIGRATION `supabase/migrations/pending/b2_ledger.sql`.
 * Until it is applied the RPC does not exist and every call answers
 * `{ ok: false }` with the database's error; nothing calls these yet except
 * their tests. The direct-rail settlement needs no call from here: a trigger
 * on `ledger_entries` posts its pot entries in the database.
 */

export type LedgerWrite = { ok: true; id: string } | { ok: false; reason: string };

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }> };

export async function recordLedgerEntry(admin: AdminClient, entry: LedgerEntryInput): Promise<LedgerWrite> {
  const problem = ledgerEntryProblem(entry);
  if (problem) return { ok: false, reason: problem };
  try {
    const { data, error } = await (admin as unknown as Rpc).rpc("ledger_record", {
      p_pot: entry.pot,
      p_key: entry.key.trim(),
      p_event: entry.event,
      p_direction: entry.direction,
      p_amount: entry.amountMinor,
      p_currency: entry.currency,
      p_provider: entry.provider,
      p_provider_reference: entry.providerReference ?? null,
      p_transaction: entry.transactionId ?? null,
      p_rail: entry.rail ?? null,
      p_status: entry.status ?? "confirmed",
      p_metadata: entry.metadata ?? {},
      p_corrects: entry.correctsEntryId ?? null,
      p_actor: entry.actorId ?? null,
    });
    if (error) return { ok: false, reason: error.message ?? "ledger write failed" };
    if (typeof data !== "string") return { ok: false, reason: "ledger write returned no entry" };
    return { ok: true, id: data };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "ledger write failed" };
  }
}

/**
 * On the escrow rail Payluk cannot split, so Vallo's commission is a separate
 * movement: out of customer funds and into revenue, recorded together or not
 * at all, and only for a transaction that opened on the escrow rail.
 */
export async function recordEscrowCommission(
  admin: AdminClient,
  input: { transactionId: string; amountMinor: number; providerReference?: string | null; actorId?: string | null },
): Promise<{ ok: true; customerFundsEntry: string; revenueEntry: string } | { ok: false; reason: string }> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    return { ok: false, reason: "the commission must be a positive whole number of minor units" };
  }
  try {
    const { data, error } = await (admin as unknown as Rpc).rpc("ledger_record_escrow_commission", {
      p_transaction: input.transactionId,
      p_amount: input.amountMinor,
      p_provider_reference: input.providerReference ?? null,
      p_actor: input.actorId ?? null,
    });
    if (error) return { ok: false, reason: error.message ?? "escrow commission not recorded" };
    const row = (data ?? {}) as { customer_funds_entry?: unknown; revenue_entry?: unknown };
    if (typeof row.customer_funds_entry !== "string" || typeof row.revenue_entry !== "string") {
      return { ok: false, reason: "escrow commission returned no entries" };
    }
    return { ok: true, customerFundsEntry: row.customer_funds_entry, revenueEntry: row.revenue_entry };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "escrow commission not recorded" };
  }
}
