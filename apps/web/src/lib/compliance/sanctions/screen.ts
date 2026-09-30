import "server-only";

import { createMatcher, outcomeOf, type ListedName, type NameMatch, type PersonFacts } from "./match";

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
 * accounts). A split-settlement card payment (public.transactions): the guest
 * (and the name on the booking), the listing's agent and the split's payee. A
 * rent payment: tenant and lister. A business transfer: both people. Vallo
 * holds no customer money (ADR 0002), so there are no wallet or held-payment
 * kinds.
 *
 * A screening whose matches could not be recorded as hits is NOT done: the
 * queue row stays open and the run counts it failed, so no match is lost.
 * Every run also renews the rolling 30-day hold of anyone with a confirmed
 * match (`sanctions_renew_holds`).
 *
 * WITH NO LIST LOADED the outcome is `no_list`, never `clear`: a screening
 * against nothing is not a clean screening.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

type QueueRow = {
  id: number;
  enqueued_at: string;
  subject_kind: "person" | "transaction";
  person_id: string | null;
  transaction_kind: "card_payment" | "rent_payment" | "business_transfer" | null;
  transaction_id: string | null;
  trigger: string;
};

/** A person on a screening: the names we hold, and any date of birth or nationality (none held today). */
export type Party = { personId: string | null; names: string[]; facts?: PersonFacts };

export type ScreeningRecord = {
  outcome: "clear" | "exact" | "fuzzy" | "no_list" | "no_name";
  best: number | null;
  namesScreened: string[];
  matches: (NameMatch & { personId: string | null })[];
};

/** Pure: the screening a set of parties gets against one matcher. */
export function screenParties(
  parties: readonly Party[],
  matcher: ((names: readonly string[], facts?: PersonFacts) => NameMatch[]) | null,
): ScreeningRecord {
  const namesScreened = [...new Set(parties.flatMap((p) => p.names.map((n) => n.trim()).filter(Boolean)))];
  if (!matcher) return { outcome: "no_list", best: null, namesScreened, matches: [] };
  if (namesScreened.length === 0) return { outcome: "no_name", best: null, namesScreened, matches: [] };
  const matches = parties.flatMap((party) => matcher(party.names, party.facts).map((m) => ({ ...m, personId: party.personId })));
  const { outcome, best } = outcomeOf(matches);
  return { outcome, best, namesScreened, matches };
}

/**
 * Every read must answer. A read that failed is thrown, so the row is counted
 * failed and left undone: a failure is never recorded as `clear` or
 * `no_name`.
 */
type Answer<T> = { data: T; error: unknown };
async function must<T>(query: PromiseLike<Answer<T>>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error("sanctions screening read failed");
  return data;
}

const joinName = (...parts: (string | null | undefined)[]) => parts.map((p) => (p ?? "").trim()).filter(Boolean).join(" ");

async function namesForPerson(admin: Admin, userId: string): Promise<string[]> {
  const names: string[] = [];
  const profile = await must<{ first_name: string | null; surname: string | null; display_name: string | null } | null>(
    admin.from("profiles").select("first_name, surname, display_name").eq("id", userId).maybeSingle(),
  );
  if (profile) names.push(joinName(profile.first_name, profile.surname), profile.display_name ?? "");
  const applications = await must<{ full_name: string | null; account_name: string | null; business_name: string | null }[] | null>(
    admin.from("agent_applications").select("full_name, account_name, business_name").eq("user_id", userId),
  );
  for (const a of applications ?? []) names.push(a.full_name ?? "", a.account_name ?? "", a.business_name ?? "");
  const banks = await must<{ resolved_account_name: string | null }[] | null>(
    admin.from("bank_accounts").select("resolved_account_name").eq("user_id", userId),
  );
  for (const b of banks ?? []) names.push(b.resolved_account_name ?? "");
  const agents = await must<{ id: string }[] | null>(admin.from("agents").select("id").eq("user_id", userId));
  const agentIds = (agents ?? []).map((a) => a.id);
  if (agentIds.length > 0) {
    const payouts = await must<{ account_name: string | null; resolved_account_name: string | null }[] | null>(
      admin.from("payout_accounts").select("account_name, resolved_account_name").in("agent_id", agentIds),
    );
    for (const p of payouts ?? []) names.push(p.account_name ?? "", p.resolved_account_name ?? "");
  }
  return [...new Set(names.map((n) => n.trim()).filter((n) => n.length > 1))];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any> | null;

async function partiesFor(admin: Admin, row: QueueRow): Promise<Party[]> {
  if (row.subject_kind === "person" && row.person_id) {
    return [{ personId: row.person_id, names: await namesForPerson(admin, row.person_id) }];
  }
  const one = (table: string, columns: string) => must<Row>(admin.from(table).select(columns).eq("id", row.transaction_id).maybeSingle());
  const people = async (...ids: (string | null | undefined)[]): Promise<Party[]> => {
    const out: Party[] = [];
    for (const id of [...new Set(ids.filter((x): x is string => typeof x === "string"))]) out.push({ personId: id, names: await namesForPerson(admin, id) });
    return out;
  };
  if (row.transaction_kind === "rent_payment") {
    const data = await one("rent_payments", "tenant_id, lister_id");
    return data ? people(data.tenant_id, data.lister_id) : [];
  }
  if (row.transaction_kind === "business_transfer") {
    const data = await one("business_transfers", "from_user_id, to_user_id");
    return data ? people(data.from_user_id, data.to_user_id) : [];
  }
  if (row.transaction_kind === "card_payment") {
    const tx = await one("transactions", "booking_id, payee_user_id");
    if (!tx?.booking_id) return [];
    const booking = await must<Row>(admin.from("bookings").select("guest_id, guest_name, listing_id").eq("id", tx.booking_id).maybeSingle());
    if (!booking) return [];
    const parties: Party[] = [];
    if (booking.guest_id) {
      parties.push({ personId: booking.guest_id, names: [...(await namesForPerson(admin, booking.guest_id)), booking.guest_name ?? ""].filter(Boolean) });
    }
    const listing = await must<Row>(admin.from("listings").select("agent_id").eq("id", booking.listing_id).maybeSingle());
    if (listing?.agent_id) {
      const agent = await must<Row>(admin.from("agents").select("user_id").eq("id", listing.agent_id).maybeSingle());
      if (agent?.user_id) parties.push({ personId: agent.user_id, names: await namesForPerson(admin, agent.user_id) });
    }
    /* The split's payee, when it is somebody not already screened. */
    if (tx.payee_user_id && !parties.some((p) => p.personId === tx.payee_user_id)) {
      parties.push({ personId: tx.payee_user_id, names: await namesForPerson(admin, tx.payee_user_id) });
    }
    return parties;
  }
  return [];
}

/** `ourNames`: names we screened lately, so a name common among OUR people weighs less. */
type Lists = { unVersion: string | null; ngVersion: string | null; listed: ListedName[]; ourNames: string[] };

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
        .select("id, source, reference, primary_name, names_normalised, dates_of_birth, nationalities")
        .eq("version_id", versionId)
        .order("reference", { ascending: true })
        .range(from, from + 999);
      if (pageError) return null;
      for (const e of page ?? []) {
        listed.push({
          entryId: e.id,
          source: e.source,
          reference: e.reference,
          primaryName: e.primary_name,
          names: e.names_normalised,
          datesOfBirth: e.dates_of_birth ?? [],
          nationalities: e.nationalities ?? [],
        });
      }
      if (!page || page.length < 1000) break;
    }
  }
  const { data: recent, error: recentError } = await admin
    .from("sanctions_screenings")
    .select("names_screened")
    .order("screened_at", { ascending: false })
    .limit(5000);
  if (recentError) return null;
  const ourNames = (Array.isArray(recent) ? recent : []).flatMap((r: { names_screened?: string[] | null }) =>
    Array.isArray(r.names_screened) ? r.names_screened : [],
  );
  return { unVersion, ngVersion, listed, ourNames };
}

export type DrainCounts = {
  screened: number;
  clear: number;
  exact: number;
  fuzzy: number;
  noList: number;
  hits: number;
  failed: number;
  renewed: number;
  /**
   * 1 when the rolling hold renewal could not run. Kept apart from `failed`
   * (C13): no person went unscreened, so it is not a screening failure, and
   * counting it there raised "screening failed" on every quarter hour for a
   * housekeeping step (420 attention runs by 29 September 2026).
   */
  renewFailed?: number;
  listsUnreadable: boolean;
};

export async function drainScreenQueue(admin: Admin, now: Date = new Date(), limit = 200): Promise<DrainCounts> {
  const counts: DrainCounts = { screened: 0, clear: 0, exact: 0, fuzzy: 0, noList: 0, hits: 0, failed: 0, renewed: 0, listsUnreadable: false };
  /* The rolling hold: thirty days from now for everyone still confirmed. */
  const { data: renewed, error: renewError } = await admin.rpc("sanctions_renew_holds");
  if (renewError) counts.renewFailed = 1;
  else counts.renewed = Number(renewed) || 0;
  const lists = await currentLists(admin);
  if (!lists) return { ...counts, listsUnreadable: true };
  const matcher = lists.listed.length > 0 ? createMatcher(lists.listed, undefined, lists.ourNames) : null;

  /* Claimed, not read: update ... returning, for update skip locked,
     transactions first; a row a dead run took is claimable after 30 min. */
  const { data: rows, error: claimError } = await admin.rpc("sanctions_claim_queue", { p_limit: limit });
  if (claimError) return { ...counts, failed: counts.failed + 1 };

  for (const row of (Array.isArray(rows) ? rows : []) as QueueRow[]) {
    try {
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
      /* A close match whose facts disagree is on the screening, not the queue. */
      const hits = record.matches
        .filter((m) => m.personId && m.raise)
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
          common_name: m.common,
        }));
      if (hits.length > 0) {
        const { data: raised, error: hitError } = await admin
          .from("sanctions_hits")
          .upsert(hits, { onConflict: "person_id,source,entry_reference,screened_name", ignoreDuplicates: true })
          .select("id");
        if (hitError) {
          /* The screening is recorded; its matches are not. The row stays
             open, so the next run screens it again and raises them. */
          counts.failed += 1;
          continue;
        }
        counts.hits += Array.isArray(raised) ? raised.length : 0;
      }
      /* Done only if nobody queued this row again while it was being screened
         (a list change bumps enqueued_at): otherwise it stays for the next run. */
      await admin.from("sanctions_screen_queue").update({ done_at: now.toISOString() }).eq("id", row.id).eq("enqueued_at", row.enqueued_at);
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
