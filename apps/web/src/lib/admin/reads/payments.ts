import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/database.types";
import { requireAdmin } from "../guard";
import type { AdminRead } from "../queries";
import { lagosDay } from "./bookings";
import { exactCount, readEvery } from "./money";

/**
 * THE PAYMENTS DESK'S READ: every payment attempt the platform has started,
 * select only, through the admin's RLS client (`transactions_admin_select`,
 * `wallet_entries_select_admin`).
 *
 * TWO KINDS OF ATTEMPT, because the platform takes money two ways:
 *   - a booking checkout, one `transactions` row per charge, and
 *   - a wallet top-up, one `wallet_entries` row of kind `deposit`, whose
 *     `metadata.channel` is the Paystack channel it was paid through.
 *
 * FIVE OUTCOMES, named for an operator and derived from each row's own status:
 *   succeeded   SUCCESSFUL or COMPLETED
 *   failed      FAILED or REVERSED
 *   refunded    REFUNDED
 *   initialised PENDING and younger than `ABANDON_AFTER_HOURS`
 *   abandoned   PENDING and older than that. The provider was asked and the
 *               person never finished; the reconcile job settles any that did.
 *
 * The existing health reads (`getPaymentHealth`, `getSavedMethods`) and the
 * two actions (`expireStaleWithdrawalHolds`, the saved method removals) are
 * called unchanged by the page.
 */

type Client = SupabaseClient<Database>;
const UNAVAILABLE = { state: "unavailable" } as const;
const DAY_MS = 86_400_000;

export const ABANDON_AFTER_HOURS = 24;

export type PaymentOutcome = "initialised" | "succeeded" | "failed" | "abandoned" | "refunded";
export const PAYMENT_OUTCOMES: readonly PaymentOutcome[] = ["succeeded", "initialised", "abandoned", "failed", "refunded"];

export type PaymentKind = "checkout" | "topup";

export type PaymentAttempt = {
  id: string;
  kind: PaymentKind;
  reference: string;
  /** The Paystack channel where recorded ("card", "bank", "ussd"...), otherwise null. */
  channel: string | null;
  provider: string | null;
  outcome: PaymentOutcome;
  amountMinor: number;
  bookingId: string | null;
  createdAt: string;
};

export type PaymentsDesk = {
  /** Attempts started in the last 7 days and the 7 before, by outcome. */
  week: { thisWeek: Record<PaymentOutcome | "started", number>; lastWeek: Record<PaymentOutcome | "started", number> };
  /** The last 30 days by outcome, for the status bar. */
  last30: Record<PaymentOutcome, number>;
  /** The last 30 days by channel. */
  byChannel: { channel: string; attempts: number; succeeded: number; succeededMinor: number }[];
  /** Succeeded value per Lagos day, the last 30 days, oldest first, zero days included. */
  perDay: { day: string; amountMinor: number; count: number }[];
  table: { rows: PaymentAttempt[]; total: number; page: number; pageSize: number };
  complete: boolean;
};

export type PaymentsFilter = { outcome?: string; kind?: string; page: number; pageSize: number };

export function outcomeOf(status: string, createdAt: string, now: number): PaymentOutcome {
  switch (status) {
    case "SUCCESSFUL":
    case "COMPLETED":
      return "succeeded";
    case "FAILED":
    case "REVERSED":
      return "failed";
    case "REFUNDED":
      return "refunded";
    default:
      return now - Date.parse(createdAt) > ABANDON_AFTER_HOURS * 3_600_000 ? "abandoned" : "initialised";
  }
}

/** The channel as the desk groups it. A checkout's channel is not recorded on its row. */
export function channelLabel(a: Pick<PaymentAttempt, "kind" | "channel">): string {
  if (a.channel) return a.channel;
  return a.kind === "checkout" ? "checkout, unrecorded" : "top-up, unrecorded";
}

function tally(list: readonly PaymentAttempt[]): Record<PaymentOutcome | "started", number> {
  const out = { started: list.length, initialised: 0, succeeded: 0, failed: 0, abandoned: 0, refunded: 0 };
  for (const a of list) out[a.outcome] += 1;
  return out;
}

/** Pure: the desk from its attempts, so the arithmetic is tested without a database. */
export function buildPayments(attempts: readonly PaymentAttempt[], filter: PaymentsFilter, now: number): Omit<PaymentsDesk, "complete"> {
  const within = (from: number, to: number) =>
    attempts.filter((a) => {
      const at = Date.parse(a.createdAt);
      return at >= from && at < to;
    });
  const last30List = within(now - 30 * DAY_MS, now + 1);
  const t30 = tally(last30List);

  const channels = new Map<string, { attempts: number; succeeded: number; succeededMinor: number }>();
  for (const a of last30List) {
    const key = channelLabel(a);
    const c = channels.get(key) ?? { attempts: 0, succeeded: 0, succeededMinor: 0 };
    c.attempts += 1;
    if (a.outcome === "succeeded") {
      c.succeeded += 1;
      c.succeededMinor += a.amountMinor;
    }
    channels.set(key, c);
  }

  const days = Array.from({ length: 30 }, (_, i) => lagosDay(now - (29 - i) * DAY_MS));
  const perDay = new Map(days.map((d) => [d, { amountMinor: 0, count: 0 }]));
  for (const a of last30List) {
    if (a.outcome !== "succeeded") continue;
    const d = perDay.get(lagosDay(Date.parse(a.createdAt)));
    if (d) {
      d.amountMinor += a.amountMinor;
      d.count += 1;
    }
  }

  const outcome = PAYMENT_OUTCOMES.find((o) => o === filter.outcome);
  const kind = filter.kind === "checkout" || filter.kind === "topup" ? filter.kind : undefined;
  const narrowed = attempts
    .filter((a) => (!outcome || a.outcome === outcome) && (!kind || a.kind === kind))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const pages = Math.max(1, Math.ceil(narrowed.length / filter.pageSize));
  const page = Math.min(Math.max(1, filter.page), pages);

  return {
    week: { thisWeek: tally(within(now - 7 * DAY_MS, now + 1)), lastWeek: tally(within(now - 14 * DAY_MS, now - 7 * DAY_MS)) },
    last30: { initialised: t30.initialised, succeeded: t30.succeeded, failed: t30.failed, abandoned: t30.abandoned, refunded: t30.refunded },
    byChannel: [...channels.entries()]
      .map(([channel, c]) => ({ channel, ...c }))
      .sort((a, b) => b.attempts - a.attempts || a.channel.localeCompare(b.channel)),
    perDay: days.map((day) => ({ day, ...(perDay.get(day) ?? { amountMinor: 0, count: 0 }) })),
    table: { rows: narrowed.slice((page - 1) * filter.pageSize, page * filter.pageSize), total: narrowed.length, page, pageSize: filter.pageSize },
  };
}

export async function getPaymentsDesk(filter: PaymentsFilter, now = Date.now()): Promise<AdminRead<PaymentsDesk>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;
  const db: Client = access.supabase;

  try {
    const [tx, txCount] = await Promise.all([
      readEvery<{
        id: string;
        booking_id: string | null;
        provider: string | null;
        provider_ref: string | null;
        amount_minor: number;
        status: string;
        created_at: string;
      }>((f, t) =>
        db.from("transactions").select("id, booking_id, provider, provider_ref, amount_minor, status, created_at").order("id").range(f, t),
      ),
      exactCount(db.from("transactions").select("id", { count: "exact", head: true })),
    ]);
    if (!tx || txCount === null) return UNAVAILABLE;

    const attempts: PaymentAttempt[] = [
      ...tx.rows.map((r) => ({
        id: r.id,
        kind: "checkout" as const,
        reference: r.provider_ref ?? r.id,
        channel: null,
        provider: r.provider,
        outcome: outcomeOf(r.status, r.created_at, now),
        amountMinor: r.amount_minor,
        bookingId: r.booking_id,
        createdAt: r.created_at,
      })),
    ];

    return {
      state: "ok",
      data: {
        ...buildPayments(attempts, filter, now),
        complete: tx.complete && tx.rows.length === txCount,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
