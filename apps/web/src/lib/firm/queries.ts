import "server-only";
import { reportReadError } from "@/lib/observability/read-error";

import { resolveSession } from "../actions/session";

/**
 * V-99: THE FIRM DESK'S READS, each a guarded function answering only to the
 * firm's principal or a coordinator (`firm_desk`, `firm_team`), or under the
 * members' own RLS (`firm_routing`). Null is a failed read.
 */

type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

export type RoutingFirm = { firmId: string; firmName: string; role: "principal" | "coordinator" };
export type FirmListing = {
  listingId: string;
  title: string;
  status: string;
  area: string | null;
  listedBy: string;
  assignedAgentId: string | null;
  enquiries30d: number;
};
export type FirmMember = { agentId: string; name: string; role: "principal" | "coordinator" | "staff"; routed30d: number };
export type FirmRouting = {
  mode: "lister" | "area" | "round_robin";
  areaAgents: Record<string, string>;
  officeStart: string | null;
  officeEnd: string | null;
};

async function rpc(fn: string, args?: Record<string, unknown>): Promise<unknown[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const call = session.supabase.rpc.bind(session.supabase) as unknown as Rpc;
    const { data, error } = await call(fn, args);
    return error || !Array.isArray(data) ? null : data;
  } catch {
    return null;
  }
}

export async function readMyRoutingFirms(): Promise<RoutingFirm[] | null> {
  const rows = await rpc("my_routing_firms");
  return rows === null
    ? null
    : (rows as { firm_id: string; firm_name: string; member_role: RoutingFirm["role"] }[]).map((r) => ({
        firmId: r.firm_id,
        firmName: r.firm_name,
        role: r.member_role,
      }));
}

export async function readFirmDesk(firmId: string): Promise<FirmListing[] | null> {
  const rows = await rpc("firm_desk", { p_firm: firmId });
  return rows === null
    ? null
    : (rows as { listing_id: string; title: string; status: string; area: string | null; listed_by: string; assigned_agent_id: string | null; enquiries_30d: number }[]).map(
        (r) => ({
          listingId: r.listing_id,
          title: r.title,
          status: r.status,
          area: r.area,
          listedBy: r.listed_by,
          assignedAgentId: r.assigned_agent_id,
          enquiries30d: Number(r.enquiries_30d ?? 0),
        }),
      );
}

export async function readFirmTeam(firmId: string): Promise<FirmMember[] | null> {
  const rows = await rpc("firm_team", { p_firm: firmId });
  return rows === null
    ? null
    : (rows as { agent_id: string; display_name: string; member_role: FirmMember["role"]; routed_30d: number }[]).map((r) => ({
        agentId: r.agent_id,
        name: r.display_name,
        role: r.member_role,
        routed30d: Number(r.routed_30d ?? 0),
      }));
}

type RoutingTable = {
  from: (t: "firm_routing") => {
    select: (cols: string) => {
      eq: (col: string, value: string) => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> };
    };
  };
};

export async function readFirmRouting(firmId: string): Promise<FirmRouting | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data, error } = await (session.supabase as unknown as RoutingTable)
      .from("firm_routing")
      .select("mode, area_agents, office_start, office_end")
      .eq("firm_id", firmId)
      .maybeSingle();
    await reportReadError("read.firm.readFirmRouting", error);
    if (error) return null;
    const row = data as { mode: FirmRouting["mode"]; area_agents: Record<string, string>; office_start: string | null; office_end: string | null } | null;
    if (!row) return { mode: "lister", areaAgents: {}, officeStart: null, officeEnd: null };
    return {
      mode: row.mode,
      areaAgents: row.area_agents ?? {},
      officeStart: row.office_start ? row.office_start.slice(0, 5) : null,
      officeEnd: row.office_end ? row.office_end.slice(0, 5) : null,
    };
  } catch {
    return null;
  }
}
