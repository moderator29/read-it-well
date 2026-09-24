import "server-only";

import { createMatcher, outcomeOf, type ListedName, type NameMatch } from "./match";

/**
 * THE SCREENING RUN. SCUML items 8 and 9.
 *
 * Service role only, and never inside the money: it reads the queue the AFTER
 * triggers filled and writes screenings and hits, nothing else. For each
 * queued person or transaction it gathers the names we hold, matches them
 * against the lists in force, and records ONE screening (clean ones too),
 * with the list versions it used. Each match raises a hit for the person it
 * belongs to; a hit already decided for that person, reference and name is
 * not raised again.
 *
 * WHICH NAMES. A person: the profile's first name and surname and display
 * name, the name on their agent application and the business name, and the
 * account names their banks returned (bank accounts and agent payout
 * accounts). A card payment: the guest (and the name on the booking) and the
 * listing's agent. A wallet entry: the wallet's owner and, on a withdrawal,
 * the name on the receiving account.
 *
 * WITH NO LIST LOADED the outcome is `no_list`, never `clear`: a screening
 * against nothing is not a clean screening.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = { from: (table: string) => any };

type QueueRow = {
  id: number;
  subject_kind: "person" | "transaction";
  person_id: string | null;
  transaction_kind: "card_payment" | "wallet_entry" | null;
  transaction_id: string | null;
  trigger: string;
};

export type Party = { personId: string | null; names: string[] };

export type ScreeningRecord = {
  outcome: "clear" | "exact" | "fuzzy" | "no_list" | "no_name";
  best: number | null;
  namesScreened: string[];
  matches: (NameMatch & { personId: string | null })[];
};

/** Pure: the screening a set of parties gets against one matcher. */
export function screenParties(parties: readonly Party[], matcher: ((names: readonly string[]) => NameMatch[]) | null): ScreeningRecord {
  const namesScreened = [...new Set(parties.flatMap((p) => p.names.map((n) => n.trim()).filter(Boolean)))];
  if (!matcher) return { outcome: "no_list", best: null, namesScreened, matches: [] };
  if (namesScreened.length === 0) return { outcome: "no_name", best: null, namesScreened, matches: [] };
  const matches = parties.flatMap((party) => matcher(party.names).map((m) => ({ ...m, personId: party.personId })));
  const { outcome, best } = outcomeOf(matches);
  return { outcome, best, namesScreened, matches };
}

const joinName = (...parts: (string | null | undefined)[]) => parts.map((p) => (p ?? "").trim()).filter(Boolean).join(" ");

async function namesForPerson(admin: Admin, userId: string): Promise<string[]> {
  const names: string[] = [];
  const { data: profile } = await admin.from("profiles").select("first_name, surname, display_name").eq("id", userId).maybeSingle();
  if (profile) names.push(joinName(profile.first_name, profile.surname), profile.display_name ?? "");
  const { data: applications } = await admin.from("agent_applications").select("full_name, account_name, business_name").eq("user_id", userId);
  for (const a of applications ?? []) names.push(a.full_name ?? "", a.account_name ?? "", a.business_name ?? "");
  const { data: banks } = await admin.from("bank_accounts").select("resolved_account_name").eq("user_id", userId);
  for (const b of banks ?? []) names.push(b.resolved_account_name ?? "");
  const { data: agents } = await admin.from("agents").select("id").eq("user_id", userId);
  const agentIds = (agents ?? []).map((a: { id: string }) => a.id);
  if (agentIds.length > 0) {
    const { data: payouts } = await admin.from("payout_accounts").select("account_name, resolved_account_name").in("agent_id", agentIds);
    for (const p of payouts ?? []) names.push(p.account_name ?? "", p.resolved_account_name ?? "");
  }
  return [...new Set(names.map((n) => n.trim()).filter((n) => n.length > 1))];
}

async function partiesFor(admin: Admin, row: QueueRow): Promise<Party[]> {
  if (row.subject_kind === "person" && row.person_id) {
    return [{ personId: row.person_id, names: await namesForPerson(admin, row.person_id) }];
  }
  if (row.transaction_kind === "card_payment") {
    const { data: tx } = await admin.from("transactions").select("booking_id").eq("id", row.transaction_id).maybeSingle();
    if (!tx?.booking_id) return [];
    const { data: booking } = await admin.from("bookings").select("guest_id, guest_name, listing_id").eq("id", tx.booking_id).maybeSingle();
    if (!booking) return [];
    const parties: Party[] = [];
    if (booking.guest_id) {
      parties.push({ personId: booking.guest_id, names: [...(await namesForPerson(admin, booking.guest_id)), booking.guest_name ?? ""].filter(Boolean) });
    }
    const { data: listing } = await admin.from("listings").select("agent_id").eq("id", booking.listing_id).maybeSingle();
    if (listing?.agent_id) {
      const { data: agent } = await admin.from("agents").select("user_id").eq("id", listing.agent_id).maybeSingle();
      if (agent?.user_id) parties.push({ personId: agent.user_id, names: await namesForPerson(admin, agent.user_id) });
    }
    return parties;
  }
  if (row.transaction_kind === "wallet_entry") {
    const { data: entry } = await admin.from("wallet_entries").select("wallet_id, kind, metadata").eq("id", row.transaction_id).maybeSingle();
    if (!entry) return [];
    const { data: wallet } = await admin.from("wallets").select("user_id").eq("id", entry.wallet_id).maybeSingle();
    const parties: Party[] = [];
    if (wallet?.user_id) parties.push({ personId: wallet.user_id, names: await namesForPerson(admin, wallet.user_id) });
    const payee = entry.kind === "withdrawal" && typeof entry.metadata?.account_name === "string" ? entry.metadata.account_name : null;
    /* The receiving account's holder is screened; a hit on it belongs to the
       wallet's owner, who sent money there. */
    if (payee && wallet?.user_id) parties.push({ personId: wallet.user_id, names: [payee] });
    return parties;
  }
  return [];
}

type Lists = { unVersion: string | null; ngVersion: string | null; listed: ListedName[] };

export async function currentLists(admin: Admin): Promise<Lists | null> {
  const { data: versions, error } = await admin
    .from("sanctions_list_versions")
    .select("id, source, activated_at")
    .not("activated_at", "is", null)
    .order("activated_at", { ascending: false });
  if (error) return null;
  const latest = (source: "un" | "ng") => (versions ?? []).find((v: { source: string }) => v.source === source)?.id ?? null;
  const unVersion = latest("un");
  const ngVersion = latest("ng");
  const listed: ListedName[] = [];
  for (const versionId of [unVersion, ngVersion].filter(Boolean)) {
    for (let from = 0; ; from += 1000) {
      const { data: page, error: pageError } = await admin
        .from("sanctions_entries")
        .select("id, source, reference, primary_name, names_normalised")
        .eq("version_id", versionId)
        .order("reference", { ascending: true })
        .range(from, from + 999);
      if (pageError) return null;
      for (const e of page ?? []) listed.push({ entryId: e.id, source: e.source, reference: e.reference, primaryName: e.primary_name, names: e.names_normalised });
      if (!page || page.length < 1000) break;
    }
  }
  return { unVersion, ngVersion, listed };
}

export type DrainCounts = { screened: number; clear: number; exact: number; fuzzy: number; noList: number; hits: number; failed: number; listsUnreadable: boolean };

export async function drainScreenQueue(admin: Admin, now: Date = new Date(), limit = 200): Promise<DrainCounts> {
  const counts: DrainCounts = { screened: 0, clear: 0, exact: 0, fuzzy: 0, noList: 0, hits: 0, failed: 0, listsUnreadable: false };
  const lists = await currentLists(admin);
  if (!lists) return { ...counts, listsUnreadable: true };
  const matcher = lists.listed.length > 0 ? createMatcher(lists.listed) : null;

  /* A row taken more than thirty minutes ago by a run that died is taken again. */
  const stale = new Date(now.getTime() - 30 * 60_000).toISOString();
  const { data: rows } = await admin
    .from("sanctions_screen_queue")
    .select("id, subject_kind, person_id, transaction_kind, transaction_id, trigger")
    .is("done_at", null)
    .or(`taken_at.is.null,taken_at.lt.${stale}`)
    .order("enqueued_at", { ascending: true })
    .limit(limit);

  for (const row of (rows ?? []) as QueueRow[]) {
    try {
      await admin.from("sanctions_screen_queue").update({ taken_at: now.toISOString() }).eq("id", row.id);
      const record = screenParties(await partiesFor(admin, row), matcher);
      const { data: screening, error } = await admin
        .from("sanctions_screenings")
        .insert({
          subject_kind: row.subject_kind,
          person_id: row.person_id,
          transaction_kind: row.transaction_kind,
          transaction_id: row.transaction_id,
          trigger: row.trigger,
          names_screened: record.namesScreened,
          un_version_id: lists.unVersion,
          ng_version_id: lists.ngVersion,
          outcome: record.outcome,
          best_score: record.best,
          matches: record.matches,
        })
        .select("id")
        .single();
      if (error || !screening) {
        counts.failed += 1;
        continue;
      }
      const hits = record.matches
        .filter((m) => m.personId)
        .map((m) => ({
          screening_id: screening.id,
          person_id: m.personId,
          source: m.source,
          entry_id: m.entryId,
          entry_reference: m.reference,
          match_kind: m.kind,
          score: m.score,
          screened_name: m.screenedName,
          matched_name: m.matchedName,
        }));
      if (hits.length > 0) {
        const { data: raised } = await admin
          .from("sanctions_hits")
          .upsert(hits, { onConflict: "person_id,source,entry_reference,screened_name", ignoreDuplicates: true })
          .select("id");
        counts.hits += Array.isArray(raised) ? raised.length : 0;
      }
      await admin.from("sanctions_screen_queue").update({ done_at: now.toISOString() }).eq("id", row.id);
      counts.screened += 1;
      if (record.outcome === "clear") counts.clear += 1;
      else if (record.outcome === "exact") counts.exact += 1;
      else if (record.outcome === "fuzzy") counts.fuzzy += 1;
      else if (record.outcome === "no_list") counts.noList += 1;
    } catch {
      counts.failed += 1;
    }
  }
  return counts;
}
