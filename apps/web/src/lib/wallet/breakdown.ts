import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { ESCROW_PREFIX, isEscrowReference } from "../payments/references";
import type { BalanceBreakdown, EscrowLine, EscrowState } from "./types";

/**
 * WHAT THE ONE NUMBER IS ACTUALLY MADE OF.
 *
 * The wallet states a single balance, correctly: it is the sum of COMPLETED
 * credits minus COMPLETED debits, derived in the database by
 * `private.wallet_balance` and read through `public.wallet_balances`. There is
 * one ledger and one number, and nothing here changes either of those.
 *
 * The problem is that the one number stopped answering the question the moment
 * escrow became real. An escrow hold is a DEBIT: the money leaves the payer's
 * spendable balance and has not reached anybody. So somebody who paid a
 * ₦1,200,000 rent deposit into escrow this morning opens the wallet and finds
 * ₦1,200,000 missing, on a screen that shows one figure labelled "Available
 * balance" and a statement row reading "escrow hold". Every part of that is
 * true and the composite is alarming, because the money is not gone, it is
 * held, and the wallet had no vocabulary for held.
 *
 * The reference platforms both solve this the same way and it is the shape
 * this follows: ONE headline figure, and a breakdown behind a tap that names
 * each part. Not three figures competing on the front of the card - three
 * numbers of equal weight is how a person ends up unsure which one is theirs.
 *
 * ---------------------------------------------------------------------------
 * THE THREE PARTS, AND WHY EXACTLY THESE THREE
 * ---------------------------------------------------------------------------
 *
 *   AVAILABLE     What can be spent, withdrawn or sent right now. This is the
 *                 wallet balance, unmodified, straight from the view. It is
 *                 the headline figure and it does not move because of anything
 *                 in this file.
 *
 *   HELD FOR YOU  Money you have paid into escrow that has not been released
 *                 or refunded yet. It has left `available` and it is still
 *                 yours in every sense that matters: if the deal falls
 *                 through, it comes back.
 *
 *   COMING TO YOU Money somebody else has put into escrow naming you as the
 *                 payee, not yet released. It is NOT in `available` and it is
 *                 not yours yet either, which is why it is stated separately
 *                 rather than added into a total. A lister needs to see it -
 *                 it is the whole reason to trust an escrow - and a lister who
 *                 spends against it before release is a support case.
 *
 * NOTHING IS SUMMED ACROSS THE THREE. There is deliberately no "total worth"
 * figure. Adding money you might get back to money you might receive produces
 * a number that is true of no moment in time.
 *
 * ---------------------------------------------------------------------------
 * WHICH STATES COUNT AS HELD
 * ---------------------------------------------------------------------------
 *
 * `FUNDED`, `HELD`, `RELEASE_REQUESTED` and `DISPUTED`. Those are exactly the
 * states in which the platform is sitting on money: the payer has been
 * debited and neither the release nor the refund has happened.
 *
 * `INITIATED` is excluded because no money has moved - the escrow is an
 * agreement, not a balance, and counting it would show somebody a hold against
 * funds still in their available balance, which is the same figure twice.
 * `RELEASED`, `REFUNDED` and `RESOLVED` are terminal: the money has arrived
 * somewhere and is already in whichever wallet balance it belongs to.
 */
const HELD_STATES: EscrowState[] = ["FUNDED", "HELD", "RELEASE_REQUESTED", "DISPUTED"];

export const EMPTY_BREAKDOWN: BalanceBreakdown = {
  availableMinor: 0,
  heldOutMinor: 0,
  heldInMinor: 0,
  outgoing: [],
  incoming: [],
  readFailed: false,
};

type EscrowRow = {
  id: string;
  amount_minor: number;
  state: Database["public"]["Enums"]["escrow_state"];
  purpose: Database["public"]["Enums"]["escrow_purpose"];
  payer_id: string;
  payee_id: string;
  listing_id: string | null;
  created_at: string;
};

/**
 * Read what this person has in escrow, in both directions.
 *
 * Under the caller's own RLS. `escrows_select_party` lets a payer or a payee
 * see their own rows and nobody else's, so this needs no privileged client and
 * cannot leak: the filter below is a narrowing of what the policy already
 * allows, not the thing that enforces it.
 *
 * Never throws. The wallet page must render whatever happens here; a breakdown
 * that could take the balance screen down would be a worse feature than no
 * breakdown at all.
 */
export async function readBalanceBreakdown(
  supabase: SupabaseClient<Database>,
  userId: string,
  availableMinor: number,
): Promise<BalanceBreakdown> {
  try {
    const { data, error } = await supabase
      .from("escrows")
      .select("id, amount_minor, state, purpose, payer_id, payee_id, listing_id, created_at")
      .in("state", HELD_STATES)
      .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as EscrowRow[];
    const titles = await readListingTitles(
      supabase,
      rows.map((row) => row.listing_id),
    );

    const outgoing: EscrowLine[] = [];
    const incoming: EscrowLine[] = [];
    let heldOutMinor = 0;
    let heldInMinor = 0;

    for (const row of rows) {
      const line: EscrowLine = {
        id: row.id,
        amountMinor: row.amount_minor,
        state: row.state,
        purpose: row.purpose,
        listingId: row.listing_id,
        listingTitle: row.listing_id ? (titles.get(row.listing_id) ?? null) : null,
      };
      /*
       * A row where the same person is both parties would otherwise be counted
       * twice, once in each direction, and show a hold against a balance that
       * never moved. It should not exist and the escrow functions do not make
       * one, but this read is over data rather than over intent, so payer wins
       * and the row is counted exactly once.
       */
      if (row.payer_id === userId) {
        outgoing.push(line);
        heldOutMinor += row.amount_minor;
      } else if (row.payee_id === userId) {
        incoming.push(line);
        heldInMinor += row.amount_minor;
      }
    }

    return { availableMinor, heldOutMinor, heldInMinor, outgoing, incoming, readFailed: false };
  } catch {
    return { ...EMPTY_BREAKDOWN, availableMinor, readFailed: true };
  }
}

/**
 * THE PROPERTY A LEDGER ROW IS ABOUT.
 *
 * A statement reading "Escrow hold, ₦1,200,000, 14 March" is a receipt for
 * something the reader has to remember. "Escrow hold, ₦1,200,000, 3 bedroom
 * flat at Admiralty Way, Lekki" is a receipt they can check. Both reference
 * platforms name the property on every money row that has one, and it is the
 * single most useful thing missing from ours.
 *
 * It is derivable with no schema change, because the reference already carries
 * it: every escrow leg is keyed `rm-esc-<escrow uuid>-<leg>`, so the uuid in
 * the reference names the escrow, the escrow names the listing, and the
 * listing names itself. Nothing invents a title; a row whose listing has since
 * been taken down simply keeps its plain description, which is the honest
 * answer rather than a guessed one.
 *
 * Returns a map from wallet-entry reference to property title, so the caller
 * annotates rows it already has rather than re-reading them.
 */
export async function readPropertyNamesForReferences(
  supabase: SupabaseClient<Database>,
  references: string[],
): Promise<Map<string, string>> {
  const byEscrowId = new Map<string, string[]>();
  for (const reference of references) {
    if (!isEscrowReference(reference)) continue;
    const rest = reference.slice(ESCROW_PREFIX.length);
    const escrowId = rest.slice(0, rest.lastIndexOf("-"));
    const existing = byEscrowId.get(escrowId);
    if (existing) existing.push(reference);
    else byEscrowId.set(escrowId, [reference]);
  }
  if (byEscrowId.size === 0) return new Map();

  try {
    const { data, error } = await supabase
      .from("escrows")
      .select("id, listing_id")
      .in("id", [...byEscrowId.keys()]);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as { id: string; listing_id: string | null }[];
    const titles = await readListingTitles(
      supabase,
      rows.map((row) => row.listing_id),
    );

    const out = new Map<string, string>();
    for (const row of rows) {
      const title = row.listing_id ? titles.get(row.listing_id) : undefined;
      if (!title) continue;
      for (const reference of byEscrowId.get(row.id) ?? []) out.set(reference, title);
    }
    return out;
  } catch {
    /* A statement without property names is the statement we already had.
       Nothing here is worth failing a money screen over. */
    return new Map();
  }
}

/** Titles for a set of listing ids, deduplicated, under the caller's RLS. */
async function readListingTitles(
  supabase: SupabaseClient<Database>,
  ids: (string | null)[],
): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((id): id is string => typeof id === "string"))];
  if (wanted.length === 0) return new Map();

  const { data, error } = await supabase.from("listings").select("id, title").in("id", wanted);
  if (error) throw new Error(error.message);

  const out = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; title: string | null }[]) {
    if (typeof row.title === "string" && row.title.trim().length > 0) {
      out.set(row.id, row.title.trim());
    }
  }
  return out;
}
