import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/database.types";
import { kindFromAgentType } from "../../supply/workspaces";
import { requireAdmin } from "../guard";
import type { AdminRead } from "../queries";
import { exactCount, readEvery } from "./money";
import { lagosMonth } from "./money-derive";
import { SUPPLY_ROLE_KEYS, type SupplyConsole, type SupplyRoleKey, type SupplyRow } from "./money-types";

/**
 * THE SUPPLY DESK'S READ. Select only, through the admin's RLS client
 * (`agents_select_admin`, `agent_applications_select_admin`,
 * `businesses_admin_all`, `listings_admin_all`, `accommodations_admin_all`,
 * `escrows_select_admin`, `bookings_admin_all`).
 *
 * THE FOUR ROLES are the product's own, from `lib/supply/workspaces-queries.ts`:
 * an `agents` row is an owner or an agent by its application's `supply_role`,
 * falling back to `kindFromAgentType` exactly as the workspace switch does; a
 * `businesses` row is a firm when `kind = 'agency'` and a host otherwise.
 *
 * EXAMPLES ARE NOT SUPPLY. On 22 September every listing, accommodation,
 * agent and business on the platform carried `is_demo`. They are left out of
 * every figure unless the operator asks for them, and the count left out is
 * returned so the page can say so. An example never passes as a real one.
 *
 * WHAT "LISTINGS" AND "TOTAL TRANSACTED" MEAN, so the column is not a guess:
 * listings are LIVE (`PUBLISHED`) listings for an owner, agent or firm (a
 * firm's through its `agent_id`), and live accommodations for a host.
 * Transacted is escrow money released to the account's user plus confirmed
 * and completed bookings on its live listings.
 */

type Client = SupabaseClient<Database>;
const UNAVAILABLE = { state: "unavailable" } as const;
const WEEK_MS = 7 * 86_400_000;

export type SupplyDeskFilter = {
  role?: SupplyRoleKey;
  examples: boolean;
  page: number;
  pageSize: number;
};

type AgentRow = {
  id: string;
  user_id: string;
  display_name: string;
  type: "individual" | "business" | null;
  /**
   * THE PUBLISHED BADGE, NOT THE COLUMN BESIDE IT. `agents.verified` still
   * exists and still holds the same answer, because `agents_derive_badge`
   * sets it from `verification_tier` under a check constraint. Reading it
   * here would still be a SECOND derivation of one fact, and the second
   * derivation is the thing that drifts. A missing embed reads as not
   * verified, the same way `lib/messages/live.ts` treats a missing row: the
   * failure mode has to be a tick that does not appear.
   */
  agent_badges: { verified: boolean } | null;
  is_demo: boolean;
  created_at: string;
  application_id: string | null;
};
type BusinessRow = {
  id: string;
  owner_id: string | null;
  agent_id: string | null;
  kind: string;
  name: string;
  verified: boolean;
  is_demo: boolean;
  created_at: string;
};
type ListingRow = {
  id: string;
  agent_id: string;
  property_type: string;
  status: string;
  area: string | null;
  city: string | null;
  is_demo: boolean;
};
type StayRow = { business_id: string; status: string; area: string | null; city: string | null; is_demo: boolean };

export type SupplyInputs = {
  agents: AgentRow[];
  supplyRoleByApplication: Map<string, string | null>;
  businesses: BusinessRow[];
  listings: ListingRow[];
  stays: StayRow[];
  /** Escrow released to a user id, kobo. */
  releasedTo: Map<string, number>;
  /** Confirmed and completed booking totals by listing id, kobo. */
  bookedOn: Map<string, number>;
};

/** Pure: the whole desk from its rows, so the arithmetic is tested without a database. */
export function buildSupply(inputs: SupplyInputs, filter: SupplyDeskFilter, now: number): SupplyConsole {
  const keep = <T extends { is_demo: boolean }>(r: T) => filter.examples || !r.is_demo;
  const agents = inputs.agents.filter(keep);
  const businesses = inputs.businesses.filter(keep);
  const listings = inputs.listings.filter(keep).filter((l) => l.status === "PUBLISHED");
  const stays = inputs.stays.filter(keep).filter((s) => s.status === "PUBLISHED");
  const examplesExcluded = filter.examples
    ? 0
    : inputs.agents.filter((a) => a.is_demo).length + inputs.businesses.filter((b) => b.is_demo).length;

  const listingsByAgent = new Map<string, ListingRow[]>();
  for (const l of listings) listingsByAgent.set(l.agent_id, [...(listingsByAgent.get(l.agent_id) ?? []), l]);
  const staysByBusiness = new Map<string, number>();
  for (const s of stays) staysByBusiness.set(s.business_id, (staysByBusiness.get(s.business_id) ?? 0) + 1);
  const bookedFor = (agentId: string | null) =>
    agentId ? (listingsByAgent.get(agentId) ?? []).reduce((s, l) => s + (inputs.bookedOn.get(l.id) ?? 0), 0) : 0;

  const all: SupplyRow[] = [
    ...agents.map((a): SupplyRow => {
      const declared = a.application_id ? inputs.supplyRoleByApplication.get(a.application_id) : null;
      const role: SupplyRoleKey =
        declared === "owner" || declared === "agent" ? declared : (kindFromAgentType(a.type ?? "individual") as SupplyRoleKey);
      return {
        id: a.id,
        kind: "agent",
        name: a.display_name,
        role,
        verified: a.agent_badges?.verified ?? false,
        listings: (listingsByAgent.get(a.id) ?? []).length,
        transactedMinor: (inputs.releasedTo.get(a.user_id) ?? 0) + bookedFor(a.id),
        joinedAt: a.created_at,
      };
    }),
    ...businesses.map((b): SupplyRow => {
      const firm = b.kind === "agency";
      return {
        id: b.id,
        kind: "business",
        name: b.name,
        role: firm ? "firm" : "host",
        verified: b.verified,
        listings: firm ? (b.agent_id ? (listingsByAgent.get(b.agent_id) ?? []).length : 0) : (staysByBusiness.get(b.id) ?? 0),
        transactedMinor: (b.owner_id ? (inputs.releasedTo.get(b.owner_id) ?? 0) : 0) + (firm ? bookedFor(b.agent_id) : 0),
        joinedAt: b.created_at,
      };
    }),
  ];

  const weekAgo = now - WEEK_MS;
  const counts = Object.fromEntries(
    SUPPLY_ROLE_KEYS.map((role) => {
      const of = all.filter((r) => r.role === role);
      return [role, { now: of.length, weekAgo: of.filter((r) => Date.parse(r.joinedAt) < weekAgo).length }];
    }),
  ) as SupplyConsole["counts"];

  const narrowed = all
    .filter((r) => !filter.role || r.role === filter.role)
    .sort((a, b) => Date.parse(b.joinedAt) - Date.parse(a.joinedAt));
  const pages = Math.max(1, Math.ceil(narrowed.length / filter.pageSize));
  const page = Math.min(Math.max(1, filter.page), pages);

  /* Six Lagos months ending this one, cumulative: how many accounts in each
     role had joined by the end of that month. */
  const months: string[] = [];
  const cursor = new Date(now + 3_600_000);
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 15));
    months.push(lagosMonth(d.getTime()));
  }
  const growth = all.length === 0
    ? []
    : months.map((month) => ({
        month,
        counts: Object.fromEntries(
          SUPPLY_ROLE_KEYS.map((role) => [
            role,
            all.filter((r) => r.role === role && lagosMonth(r.joinedAt) <= month).length,
          ]),
        ) as Record<SupplyRoleKey, number>,
      }));

  const areaCounts = new Map<string, number>();
  for (const place of [...listings, ...stays]) {
    const area = (place.area ?? place.city ?? "").trim();
    if (area) areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
  }
  const typeCounts = new Map<string, number>();
  for (const l of listings) typeCounts.set(l.property_type, (typeCounts.get(l.property_type) ?? 0) + 1);

  return {
    counts,
    examplesExcluded,
    rows: narrowed.slice((page - 1) * filter.pageSize, page * filter.pageSize),
    total: narrowed.length,
    page,
    pageSize: filter.pageSize,
    growth,
    topAreas: [...areaCounts.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area))
      .slice(0, 5),
    byPropertyType: [...typeCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getSupplyDesk(
  filter: SupplyDeskFilter,
  now = Date.now(),
): Promise<AdminRead<SupplyConsole & { complete: boolean }>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;
  const db: Client = access.supabase;

  try {
    const [agents, applications, businesses, listings, stays, released, bookings] = await Promise.all([
      readEvery<AgentRow>((f, t) =>
        db
          .from("agents")
          .select("id, user_id, display_name, type, agent_badges(verified), is_demo, created_at, application_id")
          .order("id")
          .range(f, t),
      ),
      readEvery<{ id: string; supply_role: string | null }>((f, t) =>
        db.from("agent_applications").select("id, supply_role").order("id").range(f, t),
      ),
      readEvery<BusinessRow>((f, t) =>
        db
          .from("businesses")
          .select("id, owner_id, agent_id, kind, name, verified, is_demo, created_at")
          .order("id")
          .range(f, t),
      ),
      readEvery<ListingRow>((f, t) =>
        db.from("listings").select("id, agent_id, property_type, status, area, city, is_demo").order("id").range(f, t),
      ),
      readEvery<StayRow>((f, t) =>
        db.from("accommodations").select("business_id, status, area, city, is_demo").order("id").range(f, t),
      ),
      readEvery<{ payee_id: string; amount_minor: number }>((f, t) =>
        db.from("escrows").select("payee_id, amount_minor").not("released_at", "is", null).order("id").range(f, t),
      ),
      readEvery<{ listing_id: string; total_minor: number }>((f, t) =>
        db
          .from("bookings")
          .select("listing_id, total_minor")
          .in("status", ["CONFIRMED", "COMPLETED"])
          .order("id")
          .range(f, t),
      ),
    ]);
    if (!agents || !applications || !businesses || !listings || !stays || !released || !bookings) return UNAVAILABLE;

    const releasedTo = new Map<string, number>();
    for (const r of released.rows) releasedTo.set(r.payee_id, (releasedTo.get(r.payee_id) ?? 0) + r.amount_minor);
    const bookedOn = new Map<string, number>();
    for (const b of bookings.rows) bookedOn.set(b.listing_id, (bookedOn.get(b.listing_id) ?? 0) + b.total_minor);

    const data = buildSupply(
      {
        agents: agents.rows,
        supplyRoleByApplication: new Map(applications.rows.map((a) => [a.id, a.supply_role])),
        businesses: businesses.rows,
        listings: listings.rows,
        stays: stays.rows,
        releasedTo,
        bookedOn,
      },
      filter,
      now,
    );
    const complete = [agents, applications, businesses, listings, stays, released, bookings].every((r) => r.complete);
    return { state: "ok", data: { ...data, complete } };
  } catch {
    return UNAVAILABLE;
  }
}

/* ======================================================================
 * FIRM ROSTERS: who works at which firm (`firm_members`), written only by
 * `private.admit_firm_member` and `private.revoke_firm_member`. Read here
 * under `firm_members_staff_all`, select only.
 * ==================================================================== */

export type FirmMemberStatus = "pending" | "active" | "revoked";
export const FIRM_MEMBER_STATUSES: readonly FirmMemberStatus[] = ["pending", "active", "revoked"];

export type FirmMemberRow = {
  id: string;
  agentName: string | null;
  role: "principal" | "staff" | string;
  status: FirmMemberStatus | string;
  admittedAt: string;
  revokedAt: string | null;
  revokeNote: string | null;
};

export type FirmRoster = {
  firmId: string;
  firmName: string | null;
  counts: Record<FirmMemberStatus, number>;
  members: FirmMemberRow[];
};

export type FirmRosters = {
  /** Exact count of `firm_members` rows counted (examples left out unless asked for). */
  total: number;
  byStatus: Record<FirmMemberStatus, number>;
  firms: FirmRoster[];
  /** Members of example firms left out of every figure. */
  examplesExcluded: number;
  complete: boolean;
};

type MemberRaw = {
  id: string;
  firm_id: string;
  agent_id: string;
  member_role: string;
  status: string;
  admitted_at: string;
  revoked_at: string | null;
  revoke_note: string | null;
};

const STATUS_ORDER: Record<string, number> = { pending: 0, active: 1, revoked: 2 };

/** Members into counts by state and rosters under their firms. Pure, for the test. */
export function rostersFromRows(
  members: readonly MemberRaw[],
  firms: ReadonlyMap<string, { name: string | null; isDemo: boolean }>,
  agentNames: ReadonlyMap<string, string>,
  examples: boolean,
  complete: boolean,
): FirmRosters {
  const byStatus: Record<FirmMemberStatus, number> = { pending: 0, active: 0, revoked: 0 };
  const byFirm = new Map<string, FirmRoster>();
  let examplesExcluded = 0;
  let total = 0;
  for (const m of members) {
    const firm = firms.get(m.firm_id);
    if (firm?.isDemo && !examples) {
      examplesExcluded += 1;
      continue;
    }
    total += 1;
    const known = FIRM_MEMBER_STATUSES.find((s) => s === m.status);
    if (known) byStatus[known] += 1;
    let roster = byFirm.get(m.firm_id);
    if (!roster) {
      roster = { firmId: m.firm_id, firmName: firm?.name ?? null, counts: { pending: 0, active: 0, revoked: 0 }, members: [] };
      byFirm.set(m.firm_id, roster);
    }
    if (known) roster.counts[known] += 1;
    roster.members.push({
      id: m.id,
      agentName: agentNames.get(m.agent_id) ?? null,
      role: m.member_role,
      status: m.status,
      admittedAt: m.admitted_at,
      revokedAt: m.revoked_at,
      revokeNote: m.revoke_note,
    });
  }
  const firmsOut = [...byFirm.values()];
  for (const f of firmsOut) {
    f.members.sort(
      (a, b) =>
        (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) ||
        (a.role === "principal" ? -1 : 0) - (b.role === "principal" ? -1 : 0) ||
        Date.parse(b.admittedAt) - Date.parse(a.admittedAt),
    );
  }
  firmsOut.sort((a, b) => b.counts.pending - a.counts.pending || (a.firmName ?? "").localeCompare(b.firmName ?? ""));
  return { total, byStatus, firms: firmsOut, examplesExcluded, complete };
}

/** Every firm membership, its firm's name and its agent's name, checked against an exact count. */
export async function getFirmRosters(examples: boolean): Promise<AdminRead<FirmRosters>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;
  const db: Client = access.supabase;
  try {
    const [members, count] = await Promise.all([
      readEvery<MemberRaw>((f, t) =>
        db
          .from("firm_members")
          .select("id, firm_id, agent_id, member_role, status, admitted_at, revoked_at, revoke_note")
          .order("id")
          .range(f, t),
      ),
      exactCount(db.from("firm_members").select("id", { count: "exact", head: true })),
    ]);
    if (!members || count === null) return UNAVAILABLE;
    const firmIds = [...new Set(members.rows.map((m) => m.firm_id))];
    const agentIds = [...new Set(members.rows.map((m) => m.agent_id))];
    const firms = new Map<string, { name: string | null; isDemo: boolean }>();
    const agentNames = new Map<string, string>();
    for (let i = 0; i < Math.max(firmIds.length, agentIds.length); i += 200) {
      const [b, a] = await Promise.all([
        firmIds.length > i ? db.from("businesses").select("id, name, is_demo").in("id", firmIds.slice(i, i + 200)) : null,
        agentIds.length > i ? db.from("agents").select("id, display_name").in("id", agentIds.slice(i, i + 200)) : null,
      ]);
      if (b?.error || a?.error) return UNAVAILABLE;
      for (const row of b?.data ?? []) firms.set(row.id, { name: row.name, isDemo: row.is_demo });
      for (const row of a?.data ?? []) if (row.display_name) agentNames.set(row.id, row.display_name);
    }
    return {
      state: "ok",
      data: rostersFromRows(members.rows, firms, agentNames, examples, members.complete && members.rows.length === count),
    };
  } catch {
    return UNAVAILABLE;
  }
}
