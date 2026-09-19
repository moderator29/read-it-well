import "server-only";

import { blockedInRows } from "../messages/blocks";
import { normalisePhone } from "../phone";
import { createAdminClient } from "../supabase/admin";

/**
 * WHO MAY BE HANDED WHOSE NUMBER.
 *
 * A thread header and an inspection row both want to draw a call control, and
 * a call control needs a real number. The number lives in `profiles.phone`,
 * which is the account record: `profiles` is own-row only under RLS, so a
 * reader's own client can never see another person's, and correctly so. That
 * is exactly why the rule has to be written down once, in one file, rather
 * than re-decided at each surface that wants a button.
 *
 * THE RULE, in the same shape messaging already resolves a counterpart's
 * display name (`identitiesOf` in lib/messages/live.ts): RLS answers first and
 * decides whether the caller is a party at all, and only AFTER that does the
 * service role resolve the identity. This module is the second half of that
 * and never the first: every caller passes ids it has already proven the
 * reader is entitled to be looking at, and this file adds the two limits that
 * the row-level answer cannot carry.
 *
 * LIMIT ONE, A BLOCK WITHHOLDS THE NUMBER. `public.blocks` is bidirectional
 * invisibility: if either side has blocked the other, neither sees the other
 * anywhere. Messaging enforces it on send and on thread-open; a stale row
 * still on screen must not hand a dialler to somebody who has been blocked.
 *
 * LIMIT TWO, AND IT IS THE OPPOSITE OF THE ONE MESSAGING TAKES: a read that
 * FAILS withholds. `blockedBetween` answers false when it cannot read, because
 * the database's restrictive insert policies are the backstop for a write.
 * There is no backstop for a disclosure. So every failure here, a missing
 * service key included, resolves to no number, which draws no control, which
 * is the same screen somebody with no number on file gets.
 *
 * Nothing here throws and nothing here logs a number. A number is personal
 * data and the only place it is allowed to arrive is the entitled reader's own
 * screen.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A stored number in a form a dialler will take, or null.
 *
 * `normalisePhone` is the platform's one canonical form and refuses anything
 * that is not a Nigerian mobile. A row that does not normalise is handed back
 * trimmed rather than dropped, because the profile form validated the shape on
 * the way in and a landline is still a number somebody can ring; a row that is
 * empty or absent is null, and null is how a surface knows not to draw the
 * control at all.
 */
export function callableNumber(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length === 0) return null;
  return normalisePhone(trimmed) ?? trimmed;
}

/**
 * The numbers this reader may ring, keyed by the other party's user id.
 *
 * Ids the caller has not proven entitlement for must never be passed in: this
 * function does not and cannot check membership of a conversation or an
 * inspection. There is deliberately no own-client fallback of the kind
 * `blockedBetween` keeps: a block check that could not be read withholds here
 * rather than guessing, for the reason in this file's header.
 *
 * An id with no row, no number, a block either way, or any read failure is
 * simply absent from the map.
 */
export async function callableNumbersFor(
  me: string,
  otherIds: readonly string[],
): Promise<Map<string, string>> {
  const empty = new Map<string, string>();
  if (!UUID_RE.test(me)) return empty;
  const ids = [...new Set(otherIds)].filter((id) => UUID_RE.test(id) && id !== me);
  if (ids.length === 0) return empty;

  try {
    const admin = createAdminClient();

    /*
     * One read for every block row standing between this reader and anybody in
     * the set, in either direction. Bounded by the set itself rather than by
     * the reader's whole block list, so a person who has blocked five hundred
     * accounts still costs one narrow indexed lookup here.
     */
    const list = ids.join(",");
    const { data: blockRows, error: blockError } = await admin
      .from("blocks")
      .select("user_id, other_id")
      .or(
        `and(user_id.eq.${me},other_id.in.(${list})),and(user_id.in.(${list}),other_id.eq.${me})`,
      )
      .limit(ids.length * 2);
    if (blockError) return empty;
    const rows = blockRows ?? [];
    const reachable = ids.filter((id) => !blockedInRows(rows, me, id));
    if (reachable.length === 0) return empty;

    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, phone")
      .in("id", reachable);
    if (profileError) return empty;

    /* The filter went out with the query; the answer is checked again on the
       way back. A row that arrives for somebody this reader is not entitled
       to ring is dropped here rather than trusted, because the whole cost of
       one wrong row is a stranger's number on a stranger's screen. */
    const allowed = new Set(reachable);
    const out = new Map<string, string>();
    for (const row of profiles ?? []) {
      if (!allowed.has(row.id)) continue;
      const number = callableNumber(row.phone);
      if (number) out.set(row.id, number);
    }
    return out;
  } catch {
    /* No service key, or the read fell over. Withhold, never guess. */
    return empty;
  }
}

/** The same answer for one person, which is what a thread header asks. */
export async function callableNumberFor(me: string, otherId: string): Promise<string | null> {
  const numbers = await callableNumbersFor(me, [otherId]);
  return numbers.get(otherId) ?? null;
}
