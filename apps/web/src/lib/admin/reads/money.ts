import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/database.types";
import { requireAdmin } from "../guard";
import type { AdminRead } from "../queries";
import {
  flowFromWhole,
  ledgerFromWhole,
  pulseFromWhole,
  reconciliationFromAudit,
  rentFromWhole,
  settledBetween,
  type RentChargeLike,
} from "./money-derive";
import type { LedgerPage, MoneyFlow, MoneyPulse, ReconciliationHealth, RentCharges } from "./money-types";

/**
 * THE MONEY DESK'S READS. Session B's, under the founder's reads split of 22
 * September: select and aggregate only, through the admin's own RLS-bound
 * client from `requireAdmin()`, never the service role. `wallets`,
 * `wallet_entries`, `escrows`, `transactions`, `profiles` and `audit_log` all
 * publish their rows to the two admin roles by policy, checked live.
 *
 * NO CAP THAT MAKES A TOTAL LIE. PostgREST aggregates are not enabled on this
 * project, so a sum has to be taken over rows. Every sum here is taken over
 * EVERY row: `readEvery` pages through the table in chunks until it runs out,
 * and the count it reaches is checked against an exact `count` of the same
 * table. Past `READ_CEILING` rows it stops and says so (`complete: false`),
 * and the desk draws that as an incomplete figure rather than as a total.
 *
 * Money is integer kobo throughout. The formatter at the edge divides.
 */

type Client = SupabaseClient<Database>;

const UNAVAILABLE = { state: "unavailable" } as const;
const CHUNK = 1000;

/** Rows a desk will page through before it admits it has not seen them all. */
export const READ_CEILING = 50_000;

/**
 * Every row a query returns, in chunks, up to the ceiling. Null on any error,
 * because half a ledger summed is a wrong number, not a smaller one.
 */
export async function readEvery<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  ceiling = READ_CEILING,
): Promise<{ rows: T[]; complete: boolean } | null> {
  const rows: T[] = [];
  for (let from = 0; from < ceiling; from += CHUNK) {
    const { data, error } = await page(from, Math.min(from + CHUNK, ceiling) - 1);
    if (error) return null;
    const got = data ?? [];
    rows.push(...got);
    if (got.length < CHUNK) return { rows, complete: true };
  }
  return { rows, complete: false };
}

/** An exact row count, without the rows. Null on error. */
export async function exactCount(
  query: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number | null> {
  const { count, error } = await query;
  return error ? null : (count ?? 0);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/** Lagos calendar day bounds, inclusive, as instants. Lagos is UTC+1, no DST. */
function lagosDayStartMs(day: string): number {
  return Date.parse(`${day}T00:00:00+01:00`);
}
function lagosDayEndMs(day: string): number {
  return Date.parse(`${day}T23:59:59.999+01:00`);
}

function noteOf(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const note = (metadata as Record<string, unknown>)["note"];
    if (typeof note === "string" && note.trim().length > 0) return note;
  }
  return null;
}

export type MoneyDeskFilter = {
  /** A person's name, a wallet id or an entry reference, as on the money console. */
  q?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

export type MoneyDesk = {
  pulse: MoneyPulse;
  flow: MoneyFlow;
  ledger: LedgerPage;
  /** False when a table was larger than `READ_CEILING`, so the figures are floors. */
  complete: boolean;
};

type EntryRow = {
  id: string;
  wallet_id: string;
  kind: string;
  direction: "credit" | "debit";
  amount_minor: number;
  reference: string;
  status: string;
  metadata: unknown;
  created_at: string;
};

/**
 * The four KPI cards, the flow chart, the transaction summary and the ledger
 * page, from one pass over every wallet entry.
 *
 * THE LEDGER UNDER A FILTER is the same one-subject contract as
 * `getMoneyConsole`: one term matched against an owner's name, a wallet id and
 * an entry reference, plus a Lagos date range. The running balance is the
 * platform float, so it is only given for the unfiltered ledger; a balance
 * over a filtered subset is not a balance.
 */
export async function getMoneyDesk(filter: MoneyDeskFilter, now = Date.now()): Promise<AdminRead<MoneyDesk>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;
  const db: Client = access.supabase;

  try {
    const since14 = new Date(now - 2 * WEEK_MS).toISOString();
    const [entries, entryCount, wallets, escrows, failed] = await Promise.all([
      readEvery<EntryRow>((from, to) =>
        db
          .from("wallet_entries")
          .select("id, wallet_id, kind, direction, amount_minor, reference, status, metadata, created_at")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      ),
      exactCount(db.from("wallet_entries").select("id", { count: "exact", head: true })),
      readEvery<{ id: string; user_id: string }>((from, to) =>
        db.from("wallets").select("id, user_id").order("id").range(from, to),
      ),
      readEvery<{
        state: string;
        amount_minor: number;
        held_at: string | null;
        released_at: string | null;
        refunded_at: string | null;
        resolved_at: string | null;
      }>((from, to) =>
        db
          .from("escrows")
          .select("state, amount_minor, held_at, released_at, refunded_at, resolved_at")
          .order("id")
          .range(from, to),
      ),
      readEvery<{ amount_minor: number; created_at: string }>((from, to) =>
        db
          .from("transactions")
          .select("amount_minor, created_at")
          .eq("status", "FAILED")
          .gte("created_at", since14)
          .order("id")
          .range(from, to),
      ),
    ]);
    if (!entries || !wallets || !escrows || !failed || entryCount === null) return UNAVAILABLE;

    const all = entries.rows.map((row) => ({
      id: row.id,
      walletId: row.wallet_id,
      kind: row.kind,
      direction: row.direction,
      amountMinor: row.amount_minor,
      reference: row.reference,
      status: row.status,
      note: noteOf(row.metadata),
      createdAt: row.created_at,
    }));

    /* ---------------------------------------------------------- the pulse */
    const whole = pulseFromWhole(all, now);
    const weekAgo = now - WEEK_MS;
    const heldAt = (t: number) =>
      escrows.rows
        .filter((e) => {
          if (!e.held_at || Date.parse(e.held_at) > t) return false;
          const settled = [e.released_at, e.refunded_at, e.resolved_at]
            .filter((x): x is string => Boolean(x))
            .map((x) => Date.parse(x));
          return settled.every((s) => s > t);
        })
        .reduce((sum, e) => sum + e.amount_minor, 0);
    const failedIn = (from: number, to: number) => {
      const tx = failed.rows.filter((r) => {
        const at = Date.parse(r.created_at);
        return at >= from && at < to;
      });
      const deposits = all.filter((e) => {
        const at = Date.parse(e.createdAt);
        return e.kind === "deposit" && e.status === "FAILED" && at >= from && at < to;
      });
      return {
        count: tx.length + deposits.length,
        amountMinor:
          tx.reduce((s, r) => s + r.amount_minor, 0) + deposits.reduce((s, e) => s + e.amountMinor, 0),
      };
    };
    const pulse: MoneyPulse = {
      asOf: new Date(now).toISOString(),
      floatMinor: whole.floatMinor,
      floatWeekAgoMinor: whole.floatWeekAgoMinor,
      inEscrowMinor: escrows.rows
        .filter((e) => ["HELD", "RELEASE_REQUESTED", "DISPUTED"].includes(e.state))
        .reduce((sum, e) => sum + e.amount_minor, 0),
      inEscrowWeekAgoMinor: heldAt(weekAgo),
      settledMinor: {
        thisWeek: settledBetween(all, weekAgo, now + 1),
        lastWeek: settledBetween(all, now - 2 * WEEK_MS, weekAgo),
      },
      failedCharges: {
        thisWeek: failedIn(weekAgo, now + 1),
        lastWeek: failedIn(now - 2 * WEEK_MS, weekAgo),
      },
    };

    /* ---------------------------------------------------------- the ledger */
    const term = (filter.q ?? "").replace(/[,()*"\\%]/g, "").trim();
    const narrowed = term.length > 0 || Boolean(filter.from) || Boolean(filter.to);
    const ownerByWallet = new Map(wallets.rows.map((w) => [w.id, w.user_id]));

    let matchedWallets: Set<string> | null = null;
    if (term.length > 0) {
      matchedWallets = new Set<string>();
      if (UUID_RE.test(term)) matchedWallets.add(term.toLowerCase());
      const { data: people, error } = await db
        .from("profiles")
        .select("id")
        .ilike("display_name", `%${term}%`)
        .limit(200);
      if (error) return UNAVAILABLE;
      const owners = new Set((people ?? []).map((p) => p.id));
      for (const w of wallets.rows) if (owners.has(w.user_id)) matchedWallets.add(w.id);
    }
    const lowered = term.toLowerCase();
    const fromMs = filter.from ? lagosDayStartMs(filter.from) : null;
    const toMs = filter.to ? lagosDayEndMs(filter.to) : null;
    const subset = narrowed
      ? all.filter((e) => {
          const at = Date.parse(e.createdAt);
          if (fromMs !== null && at < fromMs) return false;
          if (toMs !== null && at > toMs) return false;
          if (term.length === 0) return true;
          return e.reference.toLowerCase().includes(lowered) || (matchedWallets?.has(e.walletId) ?? false);
        })
      : all;

    const pageRows = ledgerFromWhole(
      subset.map((e) => ({ ...e, ownerName: null as string | null })),
      filter.page,
      filter.pageSize,
    );
    const pageOwners = [
      ...new Set(
        pageRows.rows
          .map((r) => ownerByWallet.get(all.find((e) => e.id === r.id)?.walletId ?? ""))
          .filter((x): x is string => Boolean(x)),
      ),
    ];
    const names = new Map<string, string>();
    if (pageOwners.length > 0) {
      const { data } = await db.from("profiles").select("id, display_name").in("id", pageOwners);
      for (const row of data ?? []) if (row.display_name) names.set(row.id, row.display_name);
    }
    const walletOf = new Map(all.map((e) => [e.id, e.walletId]));
    const ledger: LedgerPage = {
      ...pageRows,
      rows: pageRows.rows.map((r) => ({
        ...r,
        ownerName: names.get(ownerByWallet.get(walletOf.get(r.id) ?? "") ?? "") ?? null,
        ownerId: ownerByWallet.get(walletOf.get(r.id) ?? "") ?? null,
        balanceAfterMinor: narrowed ? null : r.balanceAfterMinor,
      })),
    };

    return {
      state: "ok",
      data: {
        pulse,
        flow: flowFromWhole(all, now),
        ledger,
        complete:
          entries.complete &&
          wallets.complete &&
          escrows.complete &&
          failed.complete &&
          entries.rows.length === entryCount,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/**
 * Every reconciliation run in the last `days`, read from where the job writes
 * its history: `audit_log` rows with action `wallet.reconciliation.run`
 * (`app/api/paystack/reconcile/route.ts`). Readable by the admin roles under
 * `audit_log_admin_select`.
 *
 * `lastReply` stays null: the job's last HTTP reply and verdict are in
 * `private.reconciliation_watch`, which no admin-callable read reaches. That
 * is a request in the scope file, because it needs a migration.
 */
export async function getReconciliationHealth(
  days = 7,
  now = Date.now(),
): Promise<AdminRead<ReconciliationHealth>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;
  const db: Client = access.supabase;
  try {
    const since = new Date(now - days * DAY_MS).toISOString();
    const [runs, latestClean] = await Promise.all([
      readEvery<{ created_at: string; metadata: unknown }>((from, to) =>
        db
          .from("audit_log")
          .select("created_at, metadata")
          .eq("action", "wallet.reconciliation.run")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .range(from, to),
      ),
      /* The last clean run may be older than the window, and "none in seven
         days" must not read as "never". */
      db
        .from("audit_log")
        .select("created_at")
        .eq("action", "wallet.reconciliation.run")
        .eq("metadata->>outcome", "clean")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (!runs || latestClean.error) return UNAVAILABLE;
    const health = reconciliationFromAudit(
      runs.rows.map((r) => ({ createdAt: r.created_at, metadata: r.metadata })),
      days,
    );
    if (!health.lastCleanAt && latestClean.data) health.lastCleanAt = latestClean.data.created_at;
    if (!health.lastRunAt) {
      const { data: last } = await db
        .from("audit_log")
        .select("created_at")
        .eq("action", "wallet.reconciliation.run")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last) health.lastRunAt = last.created_at;
    }
    return { state: "ok", data: health };
  } catch {
    return UNAVAILABLE;
  }
}

/** Ids per `in (...)` filter, so a long list never makes an over-long URL. */
const IN_CHUNK = 200;

/**
 * TENANCY CHARGES, `rent_payments`, the one money path no desk showed.
 *
 * Every row, checked against an exact count, under `rent_payments_admin_select`
 * (read live: admin and super_admin). A charge carries no status of its own;
 * it rides a `bookings` row, so every carrying booking's status is read
 * (`bookings_admin_all`) and every SUCCESSFUL transaction against those
 * bookings (`transactions_admin_select`). `rentFromWhole` turns that into
 * exact counts by state. Titles and tenant names are read only for the rows
 * the panel prints. Select only; nothing here writes.
 */
export async function getRentCharges(latest = 6): Promise<AdminRead<RentCharges>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;
  const db: Client = access.supabase;
  try {
    const [total, charges] = await Promise.all([
      exactCount(db.from("rent_payments").select("id", { count: "exact", head: true })),
      readEvery<{
        id: string;
        booking_id: string;
        listing_id: string;
        tenant_id: string;
        move_in: string;
        rent_period: string;
        total_minor: number;
        currency: string;
        created_at: string;
      }>((from, to) =>
        db
          .from("rent_payments")
          .select("id, booking_id, listing_id, tenant_id, move_in, rent_period, total_minor, currency, created_at")
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to),
      ),
    ]);
    if (total === null || !charges) return UNAVAILABLE;

    const bookingIds = [...new Set(charges.rows.map((c) => c.booking_id))];
    const statusOf = new Map<string, string>();
    const paid = new Set<string>();
    for (let i = 0; i < bookingIds.length; i += IN_CHUNK) {
      const ids = bookingIds.slice(i, i + IN_CHUNK);
      const [bookings, settled] = await Promise.all([
        db.from("bookings").select("id, status").in("id", ids),
        db.from("transactions").select("booking_id").eq("status", "SUCCESSFUL").in("booking_id", ids),
      ]);
      if (bookings.error || settled.error) return UNAVAILABLE;
      for (const b of bookings.data ?? []) statusOf.set(b.id, b.status);
      for (const t of settled.data ?? []) if (t.booking_id) paid.add(t.booking_id);
    }

    const like: RentChargeLike[] = charges.rows.map((c) => ({
      id: c.id,
      bookingId: c.booking_id,
      moveIn: c.move_in,
      rentPeriod: c.rent_period,
      totalMinor: c.total_minor,
      currency: c.currency,
      createdAt: c.created_at,
      bookingStatus: statusOf.get(c.booking_id) ?? null,
      paid: paid.has(c.booking_id),
    }));
    const out = rentFromWhole(like, total, charges.complete, latest);

    const byId = new Map(charges.rows.map((c) => [c.id, c]));
    const listingIds = [...new Set(out.latest.map((r) => byId.get(r.id)?.listing_id).filter((x): x is string => Boolean(x)))];
    const tenantIds = [...new Set(out.latest.map((r) => byId.get(r.id)?.tenant_id).filter((x): x is string => Boolean(x)))];
    const [titles, people] = await Promise.all([
      listingIds.length ? db.from("listings").select("id, title").in("id", listingIds) : Promise.resolve({ data: [], error: null }),
      tenantIds.length ? db.from("profiles").select("id, display_name").in("id", tenantIds) : Promise.resolve({ data: [], error: null }),
    ]);
    const titleOf = new Map((titles.data ?? []).map((l: { id: string; title: string | null }) => [l.id, l.title]));
    const nameOf = new Map((people.data ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]));
    return {
      state: "ok",
      data: {
        ...out,
        latest: out.latest.map((r) => {
          const row = byId.get(r.id);
          return {
            ...r,
            listingTitle: (row && titleOf.get(row.listing_id)) ?? null,
            tenantName: (row && nameOf.get(row.tenant_id)) ?? null,
            tenantId: row?.tenant_id ?? null,
          };
        }),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
