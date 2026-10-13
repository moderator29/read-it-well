import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { flagIsOn } from "../flags/read";
import { reportReadError } from "@/lib/observability/read-error";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/service";
import { RESTAURANT_DEPOSITS_FLAG } from "./deposits";
import { settingsFromRules, type DepositRule, type DepositSettings, type DepositWindow } from "./deposit-rules";

/**
 * RESTAURANT TABLE DEPOSITS: THE READS (track/restaurant-deposits).
 *
 * Every read here answers null while `restaurant_deposits` is off, read on
 * the server and failing closed (`flagIsOn`): with the switch off the desk
 * draws no settings card and the restaurant page shows no deposit, so turning
 * the switch on is the one step that opens both.
 *
 * WHO MAY BE PAID. `private.reservation_deposit_quote` asks for nothing when
 * the venue owner has no Paystack subaccount (`private.payee_subaccount`: an
 * agent payout account, else a bank account), because a deposit that cannot
 * reach the venue must not be taken. The private schema is not on the API, so
 * `payeeReady` asks the same two tables with the service role, for one owner,
 * and answers a boolean and nothing else. The guest is then never shown a
 * deposit the database would not ask for.
 */

/** A service window with the times the card names it by. */
export type DeskWindow = DepositWindow & { closes: string };

export type DeskDepositVenue = {
  businessId: string;
  name: string;
  windows: DeskWindow[];
  rules: DepositRule[];
  settings: DepositSettings;
};

export type DeskDeposits = {
  venues: DeskDepositVenue[];
  /** True when a deposit can reach this owner's bank (see the header). */
  payoutReady: boolean;
  /** Vallo's commission on a deposit, from money_policy (`money_policy_at`); null when the read failed. */
  commissionBps: number | null;
};

type RuleRow = {
  id: string;
  business_id: string;
  service_window_id: string | null;
  min_party_size: number | null;
  amount_minor: number;
  per_guest: boolean;
  refund_until_hours: number;
  active: boolean;
  created_at: string;
};

type WindowRow = { id: string; business_id: string; weekday: number; opens: string; last_seating: string; closes: string };

export function ruleFromRow(row: RuleRow): DepositRule {
  return {
    id: row.id,
    serviceWindowId: row.service_window_id,
    minPartySize: row.min_party_size,
    amountMinor: Number(row.amount_minor),
    perGuest: row.per_guest,
    refundUntilHours: row.refund_until_hours,
    active: row.active,
    createdAt: row.created_at,
  };
}

function windowFromRow(row: WindowRow): DeskWindow {
  return { id: row.id, weekday: row.weekday, opens: row.opens, lastSeating: row.last_seating, closes: row.closes };
}

/** True when `private.payee_subaccount(owner)` would answer a code. Service role, one owner, a boolean. */
export async function payeeReady(ownerId: string): Promise<boolean> {
  const admin = getAdminClient() as unknown as SupabaseClient | null;
  if (!admin) return false;
  try {
    const [bank, agents] = await Promise.all([
      admin
        .from("bank_accounts")
        .select("id")
        .eq("user_id", ownerId)
        .is("deleted_at", null)
        .not("paystack_subaccount_code", "is", null)
        .limit(1),
      admin.from("agents").select("id").eq("user_id", ownerId),
    ]);
    if (Array.isArray(bank.data) && bank.data.length > 0) return true;
    const agentIds = ((agents.data ?? []) as { id: string }[]).map((a) => a.id);
    if (agentIds.length === 0) return false;
    const { data: payout } = await admin
      .from("payout_accounts")
      .select("id")
      .in("agent_id", agentIds)
      .not("paystack_subaccount_code", "is", null)
      .limit(1);
    return Array.isArray(payout) && payout.length > 0;
  } catch {
    return false;
  }
}

/** Vallo's commission today, in basis points, from the money policy. Null when it cannot be read. */
async function commissionBps(db: SupabaseClient): Promise<number | null> {
  try {
    const { data, error } = await db.rpc("money_policy_at", {});
    const bps = (data as { commission_bps?: unknown } | null)?.commission_bps;
    return !error && typeof bps === "number" && Number.isInteger(bps) ? bps : null;
  } catch {
    return null;
  }
}

/**
 * The settings card's read: every restaurant this person owns, its service
 * windows and its rules (inactive ones too, under the owner policy), whether
 * a deposit can reach them, and Vallo's commission. Null when the switch is
 * off, nobody is signed in, or they own no restaurant.
 */
export async function readDeskDeposits(): Promise<DeskDeposits | null> {
  if (!(await flagIsOn(RESTAURANT_DEPOSITS_FLAG))) return null;
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const db = session.supabase as unknown as SupabaseClient;
  const { data: owned, error } = await db
    .from("businesses")
    .select("id, name")
    .eq("owner_id", session.user.id)
    .eq("kind", "restaurant")
    .order("created_at", { ascending: true });
  await reportReadError("read.reservations.depositVenues", error);
  const venues = (owned ?? []) as { id: string; name: string }[];
  if (error || venues.length === 0) return null;
  const ids = venues.map((v) => v.id);
  const [rulesRead, windowsRead, ready, bps] = await Promise.all([
    db.from("restaurant_deposit_rules").select("*").in("business_id", ids),
    db.from("service_windows").select("id, business_id, weekday, opens, last_seating, closes").in("business_id", ids),
    payeeReady(session.user.id),
    commissionBps(db),
  ]);
  await reportReadError("read.reservations.depositRules", rulesRead.error, windowsRead.error);
  if (rulesRead.error) return null;
  const rules = (rulesRead.data ?? []) as RuleRow[];
  const windows = (windowsRead.error ? [] : (windowsRead.data ?? [])) as WindowRow[];
  return {
    payoutReady: ready,
    commissionBps: bps,
    venues: venues.map((v) => {
      const own = rules.filter((r) => r.business_id === v.id).map(ruleFromRow);
      return {
        businessId: v.id,
        name: v.name,
        windows: windows
          .filter((w) => w.business_id === v.id)
          .map(windowFromRow)
          .sort((a, b) => a.weekday - b.weekday || a.opens.localeCompare(b.opens)),
        rules: own,
        settings: settingsFromRules(own),
      };
    }),
  };
}

/** What the restaurant page hands the reservation form: the active rules a guest may be asked for. */
export type VenueDeposit = { rules: DepositRule[]; windows: DepositWindow[] };

/**
 * The venue's active rules, for the guest's preview. Null when the switch is
 * off, the venue sets none, or a deposit could not reach the venue (then the
 * database asks for none either, see the header). Read under the visitor's own
 * client: `restaurant_deposit_rules_read` shows active rules to anybody.
 */
export async function readVenueDeposit(businessId: string, ownerId: string | null): Promise<VenueDeposit | null> {
  if (!ownerId) return null;
  if (!(await flagIsOn(RESTAURANT_DEPOSITS_FLAG))) return null;
  try {
    const db = (await createClient()) as unknown as SupabaseClient;
    const [rulesRead, windowsRead] = await Promise.all([
      db.from("restaurant_deposit_rules").select("*").eq("business_id", businessId).eq("active", true),
      db.from("service_windows").select("id, business_id, weekday, opens, last_seating, closes").eq("business_id", businessId),
    ]);
    if (rulesRead.error || !rulesRead.data || rulesRead.data.length === 0) return null;
    if (!(await payeeReady(ownerId))) return null;
    return {
      rules: (rulesRead.data as RuleRow[]).map(ruleFromRow),
      windows: ((windowsRead.data ?? []) as WindowRow[]).map(windowFromRow),
    };
  } catch {
    return null;
  }
}
