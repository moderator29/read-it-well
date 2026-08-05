import "server-only";

import { requireAdmin } from "./guard";
import {
  asTier,
  VERIFICATION_RUNGS,
  type VerificationRung,
  type VerificationTier,
} from "../trust/verification";

/**
 * Where every approved agent stands on the verification ladder.
 *
 * Read separately from the applications queue rather than joined into it. The
 * ladder hangs off `agents`, which only exists once an application is approved,
 * and folding a left join through the six-step application projection would
 * make the one query that has to be right about somebody's identity documents
 * harder to read for the sake of saving a round trip on a page that already
 * signs a storage URL per document.
 *
 * Keyed by application id, because that is what the queue page has in its hand.
 *
 * Read through the admin's own RLS-bound client: `agent_verification_checks`
 * carries an admin policy and an own-agent read policy, so a page bug cannot
 * turn into somebody else's verification history.
 */

export type LadderRung = {
  kind: VerificationRung;
  status: "passed" | "failed";
  note: string | null;
  decidedAt: string;
  decidedByName: string | null;
};

export type AgentLadder = {
  agentId: string;
  tier: VerificationTier;
  /** Every rung that has a decision. A rung with none is simply absent. */
  rungs: Partial<Record<VerificationRung, LadderRung>>;
};

export type LadderRead =
  | { state: "ok"; data: Map<string, AgentLadder> }
  | { state: "unavailable" };

function isRung(value: string): value is VerificationRung {
  return (VERIFICATION_RUNGS as readonly string[]).includes(value);
}

export async function getVerificationLadders(
  applicationIds: string[],
): Promise<LadderRead> {
  if (applicationIds.length === 0) return { state: "ok", data: new Map() };

  const access = await requireAdmin();
  if (access.state !== "admin") return { state: "unavailable" };

  try {
    const { data: agents, error: agentError } = await access.supabase
      .from("agents")
      .select("id, application_id, verification_tier")
      .in("application_id", applicationIds);
    if (agentError) return { state: "unavailable" };

    const rows = agents ?? [];
    if (rows.length === 0) return { state: "ok", data: new Map() };

    const { data: checks, error: checkError } = await access.supabase
      .from("agent_verification_checks")
      .select("agent_id, kind, status, note, decided_at, decided_by")
      .in(
        "agent_id",
        rows.map((row) => row.id),
      );
    if (checkError) return { state: "unavailable" };

    const deciderIds = [
      ...new Set(
        (checks ?? []).map((c) => c.decided_by).filter((id): id is string => Boolean(id)),
      ),
    ];
    const names = new Map<string, string>();
    if (deciderIds.length > 0) {
      const { data: profiles } = await access.supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", deciderIds);
      for (const profile of profiles ?? []) {
        if (profile.display_name) names.set(profile.id, profile.display_name);
      }
    }

    const byAgent = new Map<string, AgentLadder["rungs"]>();
    for (const check of checks ?? []) {
      if (!isRung(check.kind)) continue;
      if (check.status !== "passed" && check.status !== "failed") continue;
      const bucket = byAgent.get(check.agent_id) ?? {};
      bucket[check.kind] = {
        kind: check.kind,
        status: check.status,
        note: check.note,
        decidedAt: check.decided_at,
        decidedByName: check.decided_by ? (names.get(check.decided_by) ?? null) : null,
      };
      byAgent.set(check.agent_id, bucket);
    }

    const ladders = new Map<string, AgentLadder>();
    for (const row of rows) {
      if (!row.application_id) continue;
      ladders.set(row.application_id, {
        agentId: row.id,
        tier: asTier(row.verification_tier),
        rungs: byAgent.get(row.id) ?? {},
      });
    }

    return { state: "ok", data: ladders };
  } catch {
    return { state: "unavailable" };
  }
}
