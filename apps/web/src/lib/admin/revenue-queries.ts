import "server-only";

import type { AdminRead } from "./money-queries";
import { requireAdmin } from "./guard";

/**
 * What the platform has actually earned.
 *
 * WHY THIS READS THROUGH A FUNCTION AND NOT THE TABLE. `public.platform_revenue`
 * has row level security ENABLED WITH NO POLICIES, which denies `anon` and
 * `authenticated` outright and leaves `service_role` as the only reader. That
 * is the correct posture for an append-only revenue ledger, and it means the
 * operator's own client cannot select a single row. The door is
 * `public.admin_revenue_summary`, a SECURITY DEFINER function that checks
 * `private.has_role(auth.uid(), 'admin' | 'super_admin')` and answers
 * `{"status":"forbidden"}` otherwise. A permissive RLS policy would have been
 * the shorter fix and the wrong one: it publishes the whole table to anything
 * holding an authenticated session, where the function publishes one computed
 * shape to a caller whose role was just checked.
 *
 * THERE IS NO WRITE PATH HERE ON PURPOSE. The table is written by
 * `private.escrow_settle` in the same transaction as the payee's credit, which
 * is what makes a revenue row reconcilable against the escrow that produced it.
 * A row an operator could type by hand would destroy that property, so the
 * console reads this ledger and never touches it.
 *
 * Money is integer kobo. Nothing here divides by a hundred.
 */

const UNAVAILABLE = { state: "unavailable" } as const;

/** The enum's two sources. `listing_fee` has no charging path yet; see below. */
export type RevenueSource = "escrow_commission" | "listing_fee";

export type RevenueBySource = {
  source: string;
  amountMinor: number;
  entries: number;
};

export type RevenueEntry = {
  id: string;
  source: string;
  amountMinor: number;
  currency: string | null;
  escrowId: string | null;
  listingId: string | null;
  reference: string;
  createdAt: string;
};

export type RevenueSummary = {
  windowDays: number;
  bySource: RevenueBySource[];
  windowTotalMinor: number;
  allTimeMinor: number;
  recent: RevenueEntry[];
};

export const REVENUE_WINDOW_DAYS = 90;

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
 * a string, or a value past 2^53 is not a kobo amount that can be added up
 * honestly, so it becomes 0 rather than an approximation nobody can trace.
 */
function integer(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : 0;
}

export async function getRevenueSummary(
  days: number = REVENUE_WINDOW_DAYS,
): Promise<AdminRead<RevenueSummary>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  try {
    const { data, error } = await access.supabase.rpc("admin_revenue_summary", {
      p_days: days,
    });
    if (error) return UNAVAILABLE;
    if (data === null || typeof data !== "object" || Array.isArray(data)) return UNAVAILABLE;

    const envelope = data as Record<string, unknown>;
    /* "forbidden" is unavailable, not zero. Rendering a refusal as a zero
       balance would tell an operator the platform has earned nothing, which is
       a different and much worse statement than "you cannot see this". */
    if (envelope["status"] !== "ok") return UNAVAILABLE;

    return {
      state: "ok",
      data: {
        windowDays: integer(envelope["window_days"]) || days,
        bySource: rows(envelope["by_source"]).map((row) => ({
          source: text(row, "source") ?? "unknown",
          amountMinor: integer(row["amount_minor"]),
          entries: integer(row["entries"]),
        })),
        windowTotalMinor: integer(envelope["window_total_minor"]),
        allTimeMinor: integer(envelope["all_time_minor"]),
        recent: rows(envelope["recent"]).map((row) => ({
          id: text(row, "id") ?? "",
          source: text(row, "source") ?? "unknown",
          amountMinor: integer(row["amount_minor"]),
          currency: text(row, "currency"),
          escrowId: text(row, "escrow_id"),
          listingId: text(row, "listing_id"),
          reference: text(row, "reference") ?? "",
          createdAt: text(row, "created_at") ?? "",
        })),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
