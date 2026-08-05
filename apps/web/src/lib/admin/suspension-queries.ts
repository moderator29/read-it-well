import "server-only";

import { requireAdmin } from "./guard";

/**
 * Read side of the stops desk.
 *
 * Stopping an agent is the heaviest thing this console does to a person who has
 * done nothing criminal. It takes every live listing down, it takes their name
 * out of search, and it leaves their confirmed guests untouched because those
 * guests already paid. `public.agent_suspensions` has recorded all of that
 * since 20260805110426 and nothing has ever shown it to anybody.
 *
 * Two lists, because an operator is doing one of two jobs when they open this.
 * Either somebody has to be stopped, which means finding a trading agent. Or
 * somebody has been stopped and it is time to let them back, which means seeing
 * exactly what was taken and what a lift would put back.
 *
 * Everything reads through the admin's own RLS-bound client, so the console's
 * power is the power their policies give them and nothing more.
 */

/** One listing that a stop took down, with the status it will return to. */
export type WithdrawnListing = {
  id: string;
  /** The status it held the moment before the stop, in the database's spelling. */
  from: string;
  /** Its title now, or null when it has been deleted since. */
  title: string | null;
  /** Its status now. When this is no longer SUSPENDED, a lift will leave it alone. */
  statusNow: string | null;
};

export type StopRecord = {
  id: string;
  reason: string;
  suspendedAt: string;
  /** The admin who signed it, or null when their account has since been closed. */
  suspendedByName: string | null;
  /** True when the signer's account is gone, which is not the same as unsigned. */
  suspendedBySignerGone: boolean;
  withdrawn: WithdrawnListing[];
  /** Confirmed stays whose last night was still ahead when the stop landed. */
  staysAhead: number;
  liftedAt: string | null;
  liftedByName: string | null;
  liftNote: string | null;
  /** How many listings the lift actually put back, which can be fewer. */
  restoredCount: number;
};

export type AgentStanding = {
  agentId: string;
  userId: string;
  displayName: string;
  /** APPROVED or SUSPENDED. Nothing else reaches either list. */
  status: string;
  liveListingCount: number;
  /** The stop that is still standing, when there is one. */
  openStop: StopRecord | null;
  /** Every stop that has been lifted, newest first. */
  pastStops: StopRecord[];
};

export type StopsRead =
  | { state: "unavailable" }
  | { state: "ready"; stopped: AgentStanding[]; trading: AgentStanding[] };

/**
 * The statuses a stop takes down, matching `withdrawable` in
 * private.suspend_agent. `as const` so the compiler checks these against the
 * generated listing_status union: if that enum ever gains or loses a value,
 * this list fails to build rather than quietly counting the wrong listings.
 */
const LIVE_STATUSES = [
  "PUBLISHED",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "MORE_INFO_REQUIRED",
] as const;

type WithdrawnEntry = { id: string; from: string };

/**
 * `withdrawn` and `restored` are jsonb arrays written by the database, so they
 * arrive as unknown and are proved here rather than asserted. A row that has
 * been hand-edited into some other shape yields an empty list instead of
 * throwing on a page an operator opened to deal with an incident.
 */
function readEntries(value: unknown): WithdrawnEntry[] {
  if (!Array.isArray(value)) return [];
  const out: WithdrawnEntry[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as Record<string, unknown>;
    const id = row.id;
    const from = row.from ?? row.to;
    if (typeof id === "string" && typeof from === "string") out.push({ id, from });
  }
  return out;
}

export async function getStopsDesk(): Promise<StopsRead> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { state: "unavailable" };

  try {
    const { data: agents, error: agentError } = await access.supabase
      .from("agents")
      .select("id, user_id, display_name, status")
      .in("status", ["APPROVED", "SUSPENDED"])
      .order("display_name");
    if (agentError) return { state: "unavailable" };

    const agentRows = agents ?? [];
    if (agentRows.length === 0) return { state: "ready", stopped: [], trading: [] };

    const agentIds = agentRows.map((a) => a.id);

    const { data: stops, error: stopError } = await access.supabase
      .from("agent_suspensions")
      .select(
        "id, agent_id, reason, withdrawn, stays_ahead, suspended_by, suspended_at, lifted_by, lifted_at, lift_note, restored",
      )
      .in("agent_id", agentIds)
      .order("suspended_at", { ascending: false });
    if (stopError) return { state: "unavailable" };

    const stopRows = stops ?? [];

    // Every listing any stop ever took down, so the desk can say what each one
    // is called and where it stands now rather than printing a uuid.
    const withdrawnIds = [
      ...new Set(stopRows.flatMap((s) => readEntries(s.withdrawn).map((e) => e.id))),
    ];
    const listingNow = new Map<string, { title: string; status: string }>();
    if (withdrawnIds.length > 0) {
      const { data: listings } = await access.supabase
        .from("listings")
        .select("id, title, status")
        .in("id", withdrawnIds);
      for (const l of listings ?? []) listingNow.set(l.id, { title: l.title, status: l.status });
    }

    // How much is live right now, which is what a stop is about to take away.
    const liveCount = new Map<string, number>();
    const { data: live } = await access.supabase
      .from("listings")
      .select("id, agent_id")
      .in("agent_id", agentIds)
      .in("status", LIVE_STATUSES);
    for (const l of live ?? []) {
      liveCount.set(l.agent_id, (liveCount.get(l.agent_id) ?? 0) + 1);
    }

    // Names for both sides of every stop, in one keyed read.
    const actorIds = [
      ...new Set(
        stopRows
          .flatMap((s) => [s.suspended_by, s.lifted_by])
          .filter((v): v is string => Boolean(v)),
      ),
    ];
    const names = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: profiles } = await access.supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", actorIds);
      for (const p of profiles ?? []) {
        if (p.display_name) names.set(p.id, p.display_name);
      }
    }

    const toRecord = (row: (typeof stopRows)[number]): StopRecord => ({
      id: row.id,
      reason: row.reason,
      suspendedAt: row.suspended_at,
      suspendedByName: row.suspended_by
        ? (names.get(row.suspended_by) ?? "An administrator")
        : null,
      // A stop always named its signer when it was written, because the column
      // is only ever filled by private.suspend_agent. Null here therefore means
      // the signer's own account has since been closed and the foreign key
      // released the row, not that nobody signed it. Saying "an administrator
      // who has since left" is the truth; saying nothing would read as unsigned.
      suspendedBySignerGone: row.suspended_by === null,
      withdrawn: readEntries(row.withdrawn).map((entry) => {
        const now = listingNow.get(entry.id);
        return {
          id: entry.id,
          from: entry.from,
          title: now?.title ?? null,
          statusNow: now?.status ?? null,
        };
      }),
      staysAhead: row.stays_ahead,
      liftedAt: row.lifted_at,
      liftedByName: row.lifted_by ? (names.get(row.lifted_by) ?? "An administrator") : null,
      liftNote: row.lift_note,
      restoredCount: readEntries(row.restored).length,
    });

    const byAgent = new Map<string, StopRecord[]>();
    for (const row of stopRows) {
      const list = byAgent.get(row.agent_id) ?? [];
      list.push(toRecord(row));
      byAgent.set(row.agent_id, list);
    }

    const standing: AgentStanding[] = agentRows.map((agent) => {
      const records = byAgent.get(agent.id) ?? [];
      return {
        agentId: agent.id,
        userId: agent.user_id,
        displayName: agent.display_name,
        status: agent.status,
        liveListingCount: liveCount.get(agent.id) ?? 0,
        openStop: records.find((r) => r.liftedAt === null) ?? null,
        pastStops: records.filter((r) => r.liftedAt !== null),
      };
    });

    return {
      state: "ready",
      stopped: standing.filter((a) => a.status === "SUSPENDED"),
      // A trading agent with no history at all is not work and not a record, so
      // the second list stays the list of agents somebody might need to stop
      // and the ones who have been stopped before.
      trading: standing.filter((a) => a.status !== "SUSPENDED"),
    };
  } catch {
    return { state: "unavailable" };
  }
}
