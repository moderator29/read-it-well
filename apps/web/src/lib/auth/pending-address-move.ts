import "server-only";

import { formatDate, type Locale } from "@vallo/i18n/core";
import { createClient } from "../supabase/server";

/**
 * SEC-15: the end of the 7-day money hold on the signed-in person's account,
 * formatted, or null when there is none. Read through their own client (the
 * owner policy on account_money_holds).
 */
export async function loadMoneyHoldUntil(locale: Locale): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase
      .from("account_money_holds" as never)
      .select("hold_until")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    const until = (data as { hold_until?: string } | null)?.hold_until;
    if (!until || new Date(until).getTime() <= Date.now()) return null;
    return formatDate(new Date(until), locale, {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Lagos",
    });
  } catch {
    return null;
  }
}

/** `earliest` is null until the old address has been told; the clock starts then. */
export type PendingMove = {
  id: string;
  newAddressMasked: string;
  earliest: string | null;
};

const HOURS_72 = 72 * 60 * 60 * 1000;

/**
 * SEC-15: the signed-in person's own address-move request, if support has one
 * cooling off against their account. Read through their own client: the
 * table's owner policy returns only rows on `auth.uid()`. The earliest time
 * is the later of `eligible_at` and 72 hours after the first notice, the same
 * rule `admin_begin_email_recovery` enforces.
 */
export async function loadPendingAddressMove(
  locale: Locale
): Promise<PendingMove | null> {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase
      .from("email_recovery_requests" as never)
      .select("id, new_email, eligible_at, opened_notice_at")
      .eq("user_id", auth.user.id)
      .eq("status", "cooling_off")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = data as {
      id: string;
      new_email: string;
      eligible_at: string;
      opened_notice_at: string | null;
    } | null;
    if (!row) return null;
    const [local = "", domain = ""] = row.new_email.split("@");
    const eligible = new Date(row.eligible_at).getTime();
    const earliest = row.opened_notice_at
      ? Math.max(eligible, new Date(row.opened_notice_at).getTime() + HOURS_72)
      : null;
    return {
      id: row.id,
      newAddressMasked: `${local.slice(0, 1)}***@${domain}`,
      earliest:
        earliest === null
          ? null
          : formatDate(new Date(earliest), locale, {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Africa/Lagos",
            }),
    };
  } catch {
    return null;
  }
}
