import "server-only";

import type { Locale } from "@vallo/i18n/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { InspectionState } from "@/lib/inspections/types";
import { getListingRepository } from "@/lib/listings/repository";
import { getRentPayView } from "@/lib/rent/queries";
import type { AccountCheckOutcome, AccountCheckView } from "./account-check";
import { isAccountMoment } from "./account-moment";
import { chargeOfferFrom, inspectionIsAccepted, type ChargeOffer } from "./charge-offer";

/**
 * WHAT THE RECEIVER'S ACCOUNT CARD NEEDS, READ ONCE PER THREAD (V-04).
 *
 * Two reads, both under the viewer's own RLS, and both skipped entirely when
 * no message from the other side carries an account number, which is almost
 * every thread: the card costs nothing where it does not appear.
 *
 *   checks  `message_account_checks` for the other side's messages. The
 *           policy returns only rows for messages the viewer did NOT send, so
 *           a sender asking gets nothing, by the database's decision.
 *   offer   the real charge, decided by `chargeOfferFrom`.
 */

type Client = SupabaseClient<Database>;

type UntypedFrom = {
  from(table: string): {
    select(columns: string): {
      in(column: string, values: string[]): Promise<{ data: unknown; error: unknown }>;
    };
  };
};

export type AccountMomentRead = {
  checks: Record<string, AccountCheckView>;
  offer: ChargeOffer;
};

const NONE: AccountMomentRead = { checks: {}, offer: { kind: "none" } };

export async function readAccountMoment(
  supabase: Client,
  input: {
    conversationId: string;
    meId: string;
    role: "host" | "guest";
    listingId: string | null;
    messages: { id: string; mine: boolean; body: string }[];
    locale: Locale;
  },
): Promise<AccountMomentRead> {
  /* Only a listing thread, and only when the other side is the lister: the
     card and the check are both about the lister's own account. */
  if (input.role !== "guest") return NONE;
  const theirs = input.messages.filter((m) => !m.mine && isAccountMoment(m.body)).map((m) => m.id);
  if (theirs.length === 0) return NONE;

  const checks: Record<string, AccountCheckView> = {};
  try {
    const { data } = await (supabase as unknown as UntypedFrom)
      .from("message_account_checks")
      .select("message_id, outcome, shares_a_name")
      .in("message_id", theirs);
    for (const row of (Array.isArray(data) ? data : []) as {
      message_id: string;
      outcome: AccountCheckOutcome;
      shares_a_name: boolean | null;
    }[]) {
      checks[row.message_id] = { outcome: row.outcome, sharesAName: row.shares_a_name };
    }
  } catch {
    /* A failed read is no rows: the card prints nothing about ownership. */
  }

  return { checks, offer: await readOffer(supabase, input) };
}

async function readOffer(
  supabase: Client,
  input: { conversationId: string; meId: string; role: "host" | "guest"; listingId: string | null; locale: Locale },
): Promise<ChargeOffer> {
  if (input.role === "host" || !input.listingId) return { kind: "none" };
  try {
    const listing = await getListingRepository().byId(input.listingId);
    const listingIsTenancy =
      listing !== null &&
      !listing.isDemo &&
      listing.intent !== "sale" &&
      (listing.pricePeriod === "year" || listing.pricePeriod === "quarter" || listing.pricePeriod === "month");

    const { data: row } = await supabase
      .from("inspection_requests")
      .select("id, state, outcome")
      .eq("conversation_id", input.conversationId)
      .eq("requester_id", input.meId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const inspection = row
      ? { id: row.id, state: row.state as InspectionState, outcome: row.outcome }
      : null;

    let charge: { totalMinor: number; currency: string; paid: boolean } | null = null;
    if (inspection && inspectionIsAccepted(inspection.state, inspection.outcome)) {
      const read = await getRentPayView(inspection.id, input.locale);
      if (read.state === "ready") {
        charge = { totalMinor: read.view.totalMinor, currency: read.view.currency, paid: read.view.paid };
      }
    }

    return chargeOfferFrom({
      viewerIsLister: false,
      listingId: input.listingId,
      listingIsTenancy,
      inspection,
      charge,
    });
  } catch {
    return { kind: "none" };
  }
}
