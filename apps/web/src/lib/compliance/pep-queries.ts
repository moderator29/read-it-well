import "server-only";

import { resolveSession } from "../actions/session";
import { requireAdmin } from "../admin/guard";
import { readEddReviews, type EddReview } from "./edd";
import { callRpc, isUndeployed } from "./rpc";

/**
 * SCUML item 20: the two reads.
 *
 * `readMyPepAnswer` is the lister's: only the date they last answered, and
 * only for somebody with an agents row. A member looking for a home is never
 * asked, so for them the answer is "not-asked" and nothing is drawn.
 *
 * `readPepDesk` is staff's, through `pep_desk`, which refuses anybody else.
 * A failed read is "unavailable", never an empty desk.
 */
export type PepAnswerRead =
  | { state: "not-asked" }
  | { state: "unavailable" }
  | { state: "ready"; answeredAt: string | null };

export async function readMyPepAnswer(): Promise<PepAnswerRead> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "not-asked" };
  /* Whether they list is read here rather than through getAgentContext,
     because that folds a failed read into "not an agent" and the question
     would silently vanish. A failed read is "the check could not run". */
  const { data: agent, error: agentError } = await session.supabase
    .from("agents")
    .select("id")
    .eq("user_id", session.user.id)
    .limit(1)
    .maybeSingle();
  if (agentError) return { state: "unavailable" };
  if (!agent) return { state: "not-asked" };
  const { data, error } = await callRpc(session.supabase, "my_pep_answered_at");
  /* The SCUML item 20 migration is not applied yet: there is no question to
     ask and nowhere to keep an answer. Drawn as "not asked" rather than as a
     failure, because "refresh the page to try again" is a promise a refresh
     can never keep. The panel appears by itself once the migration lands. */
  if (isUndeployed(error)) return { state: "not-asked" };
  if (error) return { state: "unavailable" };
  return { state: "ready", answeredAt: typeof data === "string" ? data : null };
}

export type PepPerson = {
  userId: string;
  name: string;
  relation: "self" | "family" | "associate" | null;
  role: string | null;
  source: "declared" | "staff";
  at: string;
};

export type PendingClear = { id: string; name: string; note: string; setBy: string | null; setByName: string; setAt: string };

export type PepDesk =
  | { state: "unavailable" }
  | {
      state: "ready";
      viewerId: string;
      open: EddReview[];
      settled: EddReview[];
      people: PepPerson[];
      pendingClears: PendingClear[];
      unasked: number;
    };

function readPendingClears(v: unknown): PendingClear[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.set_at !== "string") return [];
    return [
      {
        id: r.id,
        name: typeof r.name === "string" ? r.name : "A member",
        note: typeof r.note === "string" ? r.note : "",
        setBy: typeof r.set_by === "string" ? r.set_by : null,
        setByName: typeof r.set_by_name === "string" ? r.set_by_name : "A member of staff",
        setAt: r.set_at,
      } satisfies PendingClear,
    ];
  });
}

function readPeople(v: unknown): PepPerson[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    if (typeof r.user_id !== "string" || typeof r.at !== "string") return [];
    const relation = r.relation === "self" || r.relation === "family" || r.relation === "associate" ? r.relation : null;
    return [
      {
        userId: r.user_id,
        name: typeof r.name === "string" ? r.name : "A member",
        relation,
        role: typeof r.role === "string" ? r.role : null,
        source: r.source === "staff" ? "staff" : "declared",
        at: r.at,
      } satisfies PepPerson,
    ];
  });
}

export async function readPepDesk(): Promise<PepDesk> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { state: "unavailable" };
  const { data, error } = await callRpc(access.supabase, "pep_desk");
  if (error || !data || typeof data !== "object") return { state: "unavailable" };
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.open) || !Array.isArray(d.settled) || !Array.isArray(d.people)) return { state: "unavailable" };
  const unasked = Number(d.unasked);
  return {
    state: "ready",
    viewerId: access.user.id,
    open: readEddReviews(d.open),
    settled: readEddReviews(d.settled),
    people: readPeople(d.people),
    pendingClears: readPendingClears(d.pending_clears),
    unasked: Number.isFinite(unasked) && unasked > 0 ? unasked : 0,
  };
}
