import "server-only";

import { requireAdmin } from "../guard";
import { nairaToMinor, parseQuote, parseSchedule, type WithdrawalQuote, type WithdrawalSchedule } from "./withdrawal-fees";
import { reportReadFault } from "@/lib/observability/read-error";

export type WithdrawalFeesRead =
  | { state: "ok"; schedule: WithdrawalSchedule; quote: { asked: string; minor: number | null; answer: WithdrawalQuote } | null }
  | { state: "forbidden" }
  | { state: "unavailable" };

type Reader = {
  from: (table: string) => {
    select: (cols: string) => {
      is: (col: string, value: null) => {
        order: (col: string, o: { ascending: boolean }) => { limit: (n: number) => PromiseLike<{ data: unknown; error: unknown }> };
      };
      eq: (col: string, value: number) => { order: (col: string, o: { ascending: boolean }) => PromiseLike<{ data: unknown; error: unknown }> };
    };
  };
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * The withdrawal fee schedule in force and, when an amount is asked for, the
 * database's own quote for it (`withdrawal_fee_quote`, the same function a
 * member is quoted by). `asked` is the naira text from the URL.
 */
export async function readWithdrawalFees(asked: string | null): Promise<WithdrawalFeesRead> {
  const access = await requireAdmin("finance");
  if (access.state !== "admin") return { state: "forbidden" };
  const db = access.supabase as unknown as Reader;
  try {
    const versions = await db
      .from("money_policy_versions")
      .select("id, version, effective_from, withdrawal_min_minor")
      .is("effective_to", null)
      .order("effective_from", { ascending: false })
      .limit(1);
    const row = Array.isArray(versions.data) ? (versions.data[0] as Record<string, unknown> | undefined) : undefined;
    await reportReadFault("read.admin.withdrawal_policy", versions.error);
    if (versions.error || !row || typeof row["id"] !== "number") return { state: "unavailable" };
    const bands = await db
      .from("money_policy_withdrawal_bands")
      .select("id, from_minor, to_minor, flat_fee_minor, fee_bps, fee_cap_minor, confirmed")
      .eq("policy_version_id", row["id"])
      .order("from_minor", { ascending: true });
    const schedule = parseSchedule(row, Array.isArray(bands.data) ? (bands.data as Record<string, unknown>[]) : null);
    await reportReadFault("read.admin.withdrawal_bands", bands.error);
    if (bands.error || !schedule) return { state: "unavailable" };

    if (!asked || asked.trim() === "") return { state: "ok", schedule, quote: null };
    const minor = nairaToMinor(asked);
    if (minor === null) return { state: "ok", schedule, quote: { asked, minor: null, answer: { status: "bad" } } };
    const { data, error } = await db.rpc("withdrawal_fee_quote", { p_amount_minor: minor });
    await reportReadFault("read.admin.withdrawal_quote", error);
    return {
      state: "ok",
      schedule,
      quote: { asked, minor, answer: error ? { status: "unavailable" } : parseQuote(data) },
    };
  } catch {
    return { state: "unavailable" };
  }
}
