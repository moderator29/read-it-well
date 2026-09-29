import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { createAdminClient } from "../supabase/admin";
import { requireAdmin } from "./guard";
import { orSafe } from "./queue-filter";
import {
  alsoHandle,
  classifyPeopleTerm,
  isUserId,
  personName,
  type ConsentRow,
  type PeopleTerm,
} from "./member-file-rules";

/**
 * THE MEMBER DESK'S READS: finding a person, and everything the person file
 * (`public.admin_person_file`) does not already carry.
 *
 * WHO. Admins and super admins only (`requireAdmin()` with no scope). The
 * person file itself refuses scoped staff inside the database
 * (`private.is_staff()`), and a member search is the widest read in the
 * console, so no staff scope opens it.
 *
 * WHICH CLIENT. The operator's own RLS client wherever an admin policy exists
 * (profiles, social_profiles, user_roles, agents, listings, bookings,
 * deal_agreements, reports, support_tickets, agent_documents, kyc_consents,
 * member_notes, staff_grants). `staff_grants` answers another person's row
 * to a super admin only, and that is honoured: an admin is told staff access
 * is visible to super admins, never shown "none". The service client is
 * used for exactly one table, only after the admin check has passed:
 * `known_devices`, which has row security on and no policy at all. Nothing
 * is written here; opening the file is audited by `admin_person_file`
 * itself.
 *
 * WHAT IS NEVER SHOWN. Device fingerprints (only the device's own words and
 * when it was seen), phone numbers, emails, document numbers. A support
 * ticket's email is the one the person typed into the form and is shown on
 * the support desk, not here.
 */

const UNAVAILABLE = { state: "unavailable" } as const;
type Read<T> = { state: "ok"; data: T } | typeof UNAVAILABLE;

/* The tables the generated types do not carry yet. Read through this narrow
   shape rather than `any`, so a typo in a column is still a runtime miss and
   not a silent `undefined` spread across the page. */
type LooseResult = PromiseLike<{ data: unknown; error: unknown }>;
type LooseQuery = LooseResult & {
  eq: (c: string, v: string) => LooseQuery;
  in: (c: string, v: string[]) => LooseQuery;
  order: (c: string, o: { ascending: boolean }) => LooseQuery;
  limit: (n: number) => LooseQuery;
  maybeSingle: () => LooseResult;
};
type Loose = { from: (t: string) => { select: (c: string) => LooseQuery } };
const loose = (db: SupabaseClient<Database>) => db as unknown as Loose;
const rowsOf = <T>(r: { data: unknown; error: unknown }): T[] => (!r.error && Array.isArray(r.data) ? (r.data as T[]) : []);

/* ------------------------------------------------------------ the search */

export type PersonHit = {
  userId: string;
  name: string | null;
  handle: string | null;
  joinedAt: string | null;
  signupRole: string | null;
  roles: string[];
  lister: { status: string | null; tier: number } | null;
};

export type PeopleSearch = {
  term: PeopleTerm | null;
  hits: PersonHit[];
  /** True when the email lookup function is not in the database. */
  emailUnavailable: boolean;
  /** True when the name search reached its cap, so there may be more. */
  capped: boolean;
};

const SEARCH_CAP = 25;
const RECENT_CAP = 20;

type ProfileRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  surname: string | null;
  created_at: string | null;
  signup_role: string | null;
};
const PROFILE_COLUMNS = "id, display_name, first_name, surname, created_at, signup_role";

async function hitsFor(db: SupabaseClient<Database>, profiles: ProfileRow[]): Promise<PersonHit[]> {
  const ids = profiles.map((p) => p.id);
  if (ids.length === 0) return [];
  const [social, roles, agents] = await Promise.all([
    db.from("social_profiles").select("user_id, handle").in("user_id", ids),
    db.from("user_roles").select("user_id, role").in("user_id", ids),
    db.from("agents").select("user_id, status, verification_tier").in("user_id", ids),
  ]);
  const handles = new Map((social.data ?? []).map((s) => [s.user_id, s.handle]));
  const roleMap = new Map<string, string[]>();
  for (const r of roles.data ?? []) roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), String(r.role)]);
  const agentMap = new Map((agents.data ?? []).map((a) => [a.user_id, { status: a.status ?? null, tier: a.verification_tier ?? 0 }]));
  return profiles.map((p) => ({
    userId: p.id,
    name: personName(p),
    handle: handles.get(p.id) ?? null,
    joinedAt: p.created_at,
    signupRole: p.signup_role,
    roles: (roleMap.get(p.id) ?? []).sort(),
    lister: agentMap.get(p.id) ?? null,
  }));
}

/**
 * Find a person by id, email address, handle or name. With nothing typed it
 * answers the newest sign-ups, which is the question an operator asks first
 * on a quiet morning ("who joined overnight?").
 */
export async function searchPeople(raw: string): Promise<Read<PeopleSearch> | { state: "forbidden" }> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { state: "forbidden" };
  const db = access.supabase;
  const term = classifyPeopleTerm(raw);

  try {
    if (!term) {
      if (raw.trim().length > 0) return { state: "ok", data: { term: null, hits: [], emailUnavailable: false, capped: false } };
      const { data, error } = await db
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(RECENT_CAP);
      if (error) return UNAVAILABLE;
      return { state: "ok", data: { term: null, hits: await hitsFor(db, (data ?? []) as ProfileRow[]), emailUnavailable: false, capped: false } };
    }

    let ids: string[] = [];
    let emailUnavailable = false;
    let capped = false;

    if (term.by === "id") {
      ids = [term.value];
    } else if (term.by === "email") {
      const { data, error } = await (access.userClient as unknown as {
        rpc: (fn: string, a: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
      }).rpc("admin_user_id_by_email", { p_email: term.value });
      if (error) {
        if (error.code === "42883" || error.code === "PGRST202") emailUnavailable = true;
        else return UNAVAILABLE;
      } else if (isUserId(data)) {
        ids = [data];
      }
    } else if (term.by === "handle") {
      const { data, error } = await db.from("social_profiles").select("user_id").eq("handle", term.value).limit(1);
      if (error) return UNAVAILABLE;
      ids = (data ?? []).map((r) => r.user_id);
    } else {
      const like = orSafe(`%${term.value}%`);
      const words = term.value.split(" ");
      /* "Ada Obi" is a first name and a surname, so a two-word search also
         matches first_name on the first word AND surname on the last. Every
         value is quoted with `orSafe`, so a space or a dot in a name cannot
         restructure the filter. */
      const pair =
        words.length >= 2
          ? `,and(first_name.ilike.${orSafe(`%${words[0]}%`)},surname.ilike.${orSafe(`%${words[words.length - 1]}%`)})`
          : "";
      const handle = alsoHandle(term);
      const [byName, byHandle] = await Promise.all([
        db
          .from("profiles")
          .select("id")
          .or(`display_name.ilike.${like},first_name.ilike.${like},surname.ilike.${like}${pair}`)
          .order("created_at", { ascending: false })
          .limit(SEARCH_CAP + 1),
        handle
          ? /* `_` is a LIKE wildcard and handles use it, so it is escaped. */
            db.from("social_profiles").select("user_id").ilike("handle", `${handle.replace(/_/g, "\\_")}%`).limit(5)
          : Promise.resolve({ data: [] as { user_id: string }[], error: null }),
      ]);
      if (byName.error) return UNAVAILABLE;
      const nameIds = (byName.data ?? []).map((r) => r.id);
      capped = nameIds.length > SEARCH_CAP;
      ids = [...new Set([...(byHandle.data ?? []).map((r) => r.user_id), ...nameIds.slice(0, SEARCH_CAP)])];
    }

    if (ids.length === 0) return { state: "ok", data: { term, hits: [], emailUnavailable, capped } };
    const { data, error } = await db.from("profiles").select(PROFILE_COLUMNS).in("id", ids);
    if (error) return UNAVAILABLE;
    const order = new Map(ids.map((id, i) => [id, i]));
    const profiles = ((data ?? []) as ProfileRow[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return { state: "ok", data: { term, hits: await hitsFor(db, profiles), emailUnavailable, capped } };
  } catch {
    return UNAVAILABLE;
  }
}

/* ------------------------------------------------------ the member file */

export type MemberExtras = {
  profile: { signupRole: string | null; termsAcceptedAt: string | null; termsVersion: string | null; phoneOnFile: boolean } | null;
  staff: { scopes: string[]; grantedAt: string | null; revokedAt: string | null; revokeReason: string | null } | null;
  /** False for an admin who is not a super admin: `staff_grants_read` shows them nothing. */
  staffVisible: boolean;
  documents: {
    id: string;
    kind: string;
    subtype: string | null;
    reviewStatus: string;
    issuedOn: string | null;
    uploadedAt: string;
    rejectionReason: string | null;
    viaApplication: boolean;
  }[];
  consents: ConsentRow[];
  listings: { id: string; title: string | null; status: string; reference: string | null; createdAt: string }[];
  listingsTotal: number;
  agreements: {
    id: string;
    kind: string;
    status: string;
    side: "renter" | "owner";
    listingTitle: string | null;
    amountMinor: number;
    createdAt: string;
  }[];
  bookings: { id: string; status: string; checkIn: string; checkOut: string; totalMinor: number; listingTitle: string | null }[];
  tickets: { id: string; reference: string; topic: string | null; status: string; createdAt: string }[];
  reportsFiled: number;
  reportsAgainst: { id: string; category: string | null; status: string; createdAt: string }[];
  devices: { words: string | null; firstSeenAt: string | null; lastSeenAt: string | null }[];
  notes: { id: string; body: string; authorName: string | null; createdAt: string }[];
  /** Which sections could not be read, so the page says so instead of "none". */
  failed: string[];
};

const LIST_CAP = 20;

/**
 * The rest of a member's file, one read per section, run together. A section
 * that fails is named in `failed` and drawn as "could not be read", never as
 * an empty list: "no reports against them" and "we could not look" are
 * different answers about a person.
 */
export async function readMemberExtras(userId: string): Promise<Read<MemberExtras>> {
  if (!isUserId(userId)) return UNAVAILABLE;
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;
  const db = access.supabase;
  let service: SupabaseClient<Database> | null = null;
  try {
    service = createAdminClient();
  } catch {
    service = null;
  }
  const failed: string[] = [];

  try {
    const agentRes = await db.from("agents").select("id").eq("user_id", userId).limit(1);
    const agentId = agentRes.data?.[0]?.id ?? null;

    const [
      profile,
      grant,
      docs,
      consents,
      listings,
      listingsCount,
      agreements,
      bookings,
      tickets,
      filed,
      against,
      devices,
      notes,
    ] = await Promise.all([
      db.from("profiles").select("signup_role, terms_accepted_at, terms_version, phone").eq("id", userId).maybeSingle(),
      /* The operator's own client: RLS (`staff_grants_read`) lets a super
         admin read another person's grant and nobody else. */
      access.isSuperAdmin
        ? loose(db).from("staff_grants").select("scopes, granted_at, revoked_at, revoke_reason").eq("user_id", userId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      db
        .from("agent_documents")
        .select("id, kind, subtype, review_status, issued_on, uploaded_at, rejection_reason, application_id")
        .eq("uploader_id", userId)
        .order("uploaded_at", { ascending: false })
        .limit(LIST_CAP),
      loose(db).from("kyc_consents").select("consent, consented_at").eq("user_id", userId).order("consented_at", { ascending: false }).limit(30),
      agentId
        ? db.from("listings").select("id, title, status, reference, created_at").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(LIST_CAP)
        : Promise.resolve({ data: [], error: null }),
      agentId
        ? db.from("listings").select("id", { count: "exact", head: true }).eq("agent_id", agentId)
        : Promise.resolve({ count: 0, error: null }),
      db
        .from("deal_agreements")
        .select("id, kind, status, renter_id, owner_id, listing_id, amount_minor, created_at")
        .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(LIST_CAP),
      db
        .from("bookings")
        .select("id, status, check_in, check_out, total_minor, listing_id")
        .eq("guest_id", userId)
        .order("created_at", { ascending: false })
        .limit(LIST_CAP),
      db
        .from("support_tickets")
        .select("id, reference, topic, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(LIST_CAP),
      db.from("reports").select("id", { count: "exact", head: true }).eq("reporter_id", userId),
      db
        .from("reports")
        .select("id, category, status, created_at")
        .or(
          `and(target_type.in.(user,profile),target_id.eq.${userId})${agentId ? `,and(target_type.eq.agent,target_id.eq.${agentId})` : ""}`,
        )
        .order("created_at", { ascending: false })
        .limit(LIST_CAP),
      service
        ? service.from("known_devices").select("device_words, first_seen_at, last_seen_at").eq("user_id", userId).order("last_seen_at", { ascending: false }).limit(10)
        : Promise.resolve({ data: null, error: "no service client" }),
      loose(db).from("member_notes").select("id, body, author_id, created_at").eq("subject_id", userId).order("created_at", { ascending: false }).limit(50),
    ]);

    if (profile.error) failed.push("profile");
    if (grant.error) failed.push("staff");
    if (docs.error) failed.push("documents");
    if (consents.error) failed.push("consents");
    if (listings.error || listingsCount.error) failed.push("listings");
    if (agreements.error) failed.push("agreements");
    if (bookings.error) failed.push("bookings");
    if (tickets.error) failed.push("tickets");
    if (filed.error || against.error) failed.push("reports");
    if (devices.error) failed.push("devices");
    if (notes.error) failed.push("notes");

    const agreementRows = (agreements.data ?? []) as {
      id: string;
      kind: string;
      status: string;
      renter_id: string;
      owner_id: string;
      listing_id: string;
      amount_minor: number;
      created_at: string;
    }[];
    const bookingRows = bookings.data ?? [];
    const noteRows = rowsOf<{ id: string; body: string; author_id: string | null; created_at: string }>(notes);

    const listingIds = [...new Set([...agreementRows.map((a) => a.listing_id), ...bookingRows.map((b) => b.listing_id)])];
    const authorIds = [...new Set(noteRows.map((n) => n.author_id).filter((id): id is string => Boolean(id)))];
    const [titles, authors] = await Promise.all([
      listingIds.length ? db.from("listings").select("id, title").in("id", listingIds) : Promise.resolve({ data: [] as { id: string; title: string | null }[] }),
      authorIds.length
        ? db.from("profiles").select("id, display_name, first_name, surname").in("id", authorIds)
        : Promise.resolve({ data: [] as { id: string; display_name: string | null; first_name: string | null; surname: string | null }[] }),
    ]);
    const titleOf = new Map((titles.data ?? []).map((l) => [l.id, l.title]));
    const authorOf = new Map((authors.data ?? []).map((p) => [p.id, personName(p)]));

    const grantRow = grant.data as { scopes?: unknown; granted_at?: string; revoked_at?: string | null; revoke_reason?: string | null } | null;

    return {
      state: "ok",
      data: {
        profile: profile.data
          ? {
              signupRole: profile.data.signup_role ?? null,
              termsAcceptedAt: profile.data.terms_accepted_at ?? null,
              termsVersion: profile.data.terms_version ?? null,
              phoneOnFile: Boolean(profile.data.phone && profile.data.phone.trim()),
            }
          : null,
        staffVisible: access.isSuperAdmin,
        staff: grantRow
          ? {
              scopes: Array.isArray(grantRow.scopes) ? grantRow.scopes.map(String) : [],
              grantedAt: grantRow.granted_at ?? null,
              revokedAt: grantRow.revoked_at ?? null,
              revokeReason: grantRow.revoke_reason ?? null,
            }
          : null,
        documents: (docs.data ?? []).map((d) => ({
          id: d.id,
          kind: d.kind,
          subtype: d.subtype,
          reviewStatus: d.review_status,
          issuedOn: d.issued_on,
          uploadedAt: d.uploaded_at,
          rejectionReason: d.rejection_reason,
          viaApplication: d.application_id !== null,
        })),
        consents: rowsOf<{ consent: string; consented_at: string }>(consents).map((c) => ({ consent: c.consent, consentedAt: c.consented_at })),
        listings: (listings.data ?? []).map((l) => ({
          id: l.id,
          title: l.title,
          status: String(l.status),
          reference: l.reference ?? null,
          createdAt: l.created_at,
        })),
        listingsTotal: listingsCount.count ?? 0,
        agreements: agreementRows.map((a) => ({
          id: a.id,
          kind: a.kind,
          status: String(a.status),
          side: a.renter_id === userId ? ("renter" as const) : ("owner" as const),
          listingTitle: titleOf.get(a.listing_id) ?? null,
          amountMinor: Number(a.amount_minor) || 0,
          createdAt: a.created_at,
        })),
        bookings: bookingRows.map((b) => ({
          id: b.id,
          status: String(b.status),
          checkIn: b.check_in,
          checkOut: b.check_out,
          totalMinor: Number(b.total_minor) || 0,
          listingTitle: titleOf.get(b.listing_id) ?? null,
        })),
        tickets: (tickets.data ?? []).map((t) => ({
          id: t.id,
          reference: t.reference,
          topic: t.topic,
          status: String(t.status),
          createdAt: t.created_at,
        })),
        reportsFiled: filed.count ?? 0,
        reportsAgainst: (against.data ?? []).map((r) => ({
          id: r.id,
          category: r.category,
          status: String(r.status),
          createdAt: r.created_at,
        })),
        devices: rowsOf<{ device_words: string | null; first_seen_at: string | null; last_seen_at: string | null }>(devices).map((d) => ({
          words: d.device_words,
          firstSeenAt: d.first_seen_at,
          lastSeenAt: d.last_seen_at,
        })),
        notes: noteRows.map((n) => ({
          id: n.id,
          body: n.body,
          authorName: n.author_id ? (authorOf.get(n.author_id) ?? null) : null,
          createdAt: n.created_at,
        })),
        failed,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
