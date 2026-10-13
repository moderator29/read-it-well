import "server-only";

import { cache } from "react";
import { resolveSession } from "@/lib/actions/session";
import { getMode, getWorkspaceKey } from "@/lib/mode";
import {
  kindFromSupplyRole,
  makeWorkspace,
  orderWorkspaces,
  resolveCurrent,
  standingFromStatus,
  type Workspace,
  type WorkspacesView,
} from "./workspaces";

/**
 * Every workspace this caller actually holds, read under their own RLS.
 *
 * THE LIST IS THE TRUTH AND THE COOKIE IS A HINT. Nothing here reads
 * `nf_workspace` to decide what exists; it reads it only to decide which of
 * the rows that DO exist gets the tick. That is the whole of the discipline in
 * `workspaces.ts`, applied at the one place the two meet.
 *
 * Three reads, all select-own by policy, none needing a service key:
 *
 *   `agents`      the person's own supply account, whatever its status, so a
 *                 refused or suspended one appears in the sheet rather than
 *                 vanishing. `agents_select_own` is `auth.uid() = user_id`.
 *   `businesses`  the stays side and the firm, through `owner_id` or
 *                 `agent_id`. `kind = 'agency'` is the firm; everything else
 *                 is a stays workspace.
 *   `user_roles`  staff, for the console.
 *
 * The agents row's side is `agents.role`, read through `kindFromSupplyRole`.
 *
 * EVERYTHING FAILS SOFT. Navigation chrome is never worth taking a page down
 * for: a read that failed is not a workspace, and the person sees the personal
 * row and the way to add one, which is exactly what they see today.
 */
export const resolveWorkspaces = cache(async function resolveWorkspaces(): Promise<WorkspacesView> {
  const empty: WorkspacesView = { workspaces: [], current: { kind: "personal" } };
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return empty;

    const [mode, key, agentResult, businessResult, roleResult] = await Promise.all([
      getMode(),
      getWorkspaceKey(),
      session.supabase
        .from("agents")
        .select("id, display_name, role, status")
        .eq("user_id", session.user.id)
        .maybeSingle(),
      session.supabase
        .from("businesses")
        .select("id, name, kind, status")
        .or(`owner_id.eq.${session.user.id},agent_id.eq.${session.user.id}`),
      session.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "super_admin"]),
    ]);

    const workspaces: Workspace[] = [];

    const agent = agentResult.error ? null : agentResult.data;
    if (agent) {
      workspaces.push(
        makeWorkspace({
          kind: kindFromSupplyRole(agent.role),
          id: agent.id,
          name: agent.display_name,
          standing: standingFromStatus(agent.status),
        }),
      );
    }

    for (const business of businessResult.error ? [] : (businessResult.data ?? [])) {
      workspaces.push(
        makeWorkspace({
          kind: business.kind === "agency" ? "firm" : "host",
          id: business.id,
          name: business.name,
          standing: standingFromStatus(business.status),
        }),
      );
    }

    if (!roleResult.error && (roleResult.data?.length ?? 0) > 0) {
      workspaces.push({
        key: "admin",
        kind: "console",
        name: "Operations console",
        standing: "active",
        side: "property",
        href: "/admin",
      });
    }

    const ordered = orderWorkspaces(workspaces);
    return { workspaces: ordered, current: resolveCurrent(ordered, mode, key) };
  } catch {
    return empty;
  }
});
