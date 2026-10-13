import "server-only";

import { createAdminClient } from "../../supabase/admin";
import { requireAdmin } from "../guard";
import { shapeLedgerBooks, type LedgerBook } from "./ledger-books-shape";

export type LedgerRead = { state: "ok"; books: LedgerBook[] } | { state: "forbidden" } | { state: "unavailable" };

/**
 * `public.ledger_balances_by_book` is a service-role view: `authenticated`
 * has no select on it (migration b2_ledger revokes it on purpose, so no
 * browser-reachable role can read the books), exactly like the other
 * service-role reads of the money desk. So the read happens on the server,
 * on the service client, and only after the finance door has let this person
 * through. A failed read is "unavailable", never an empty book: a book that
 * cannot be read and a book that is empty must not look alike.
 */
export async function readLedgerBooks(): Promise<LedgerRead> {
  const access = await requireAdmin("finance");
  if (access.state !== "admin") return { state: "forbidden" };
  try {
    const db = createAdminClient();
    const { data, error } = await db.from("ledger_balances_by_book").select("pot, currency, balance_minor, entries");
    if (error || !data) return { state: "unavailable" };
    return { state: "ok", books: shapeLedgerBooks(data) };
  } catch {
    return { state: "unavailable" };
  }
}
