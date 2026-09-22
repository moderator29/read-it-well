import {
  ADMIN_WORKSPACE_KEY,
  workspaceKey,
  type Mode,
} from "@/lib/mode.constants";
import {
  WORKSPACE_SIDE,
  WORKSPACE_STANDING_COPY,
  type WorkspaceKind,
  type WorkspaceStanding,
} from "./roles";
import type { Side } from "@/lib/side.constants";

/**
 * A workspace, as the switch sheet draws it, and the rules for choosing one.
 *
 * CLIENT SAFE. It imports three data modules and nothing that touches the
 * network, so the sheet, the dock, the server layout and the specs all read
 * the same functions. The database half is `workspaces-queries.ts`, which is
 * `server-only` and does nothing but turn RLS bound reads into this shape.
 *
 * ---------------------------------------------------------------------------
 * VIEW PREFERENCE IS NEVER AUTHORISATION, AND THIS MODULE IS WHERE THAT COULD
 * GO WRONG
 *
 * Five places, named so they can be checked:
 *
 *   1. The navigation is never built from the cookie. `buildNav` takes
 *      `isAgent` and `isAdmin` resolved from RLS bound reads, and this list
 *      comes from the same place. Building it from `nf_workspace` would offer
 *      somebody a door into a room they do not have.
 *   2. The route gate stays where it is. Every `/agent/*` page calls
 *      `getAgentContext()`, and nothing here short circuits it.
 *   3. `nf_workspace` is re-resolved on every request. A membership revoked at
 *      ten o'clock stops resolving at one minute past, not at cookie expiry in
 *      a year, because resolution is a join and not a cached claim.
 *   4. A publish is never gated on the cookie. The gate is server side. A
 *      person in personal mode who posts a publish is refused by RLS, not by a
 *      missing button.
 *   5. The badge is never a function of the current workspace. Standing in a
 *      firm's workspace does not confer the firm's standing; the firm's
 *      standing renders as the firm's, beside the person's own.
 *
 * `resolveCurrent` below therefore takes the cookie as a HINT and the held
 * list as the truth, and an unresolvable hint falls back rather than throwing:
 * a person whose cookie names a workspace they have lost should land somewhere
 * sensible, not on an error.
 */

export type Workspace = {
  /** The opaque cookie key. Never parsed to decide anything. */
  key: string;
  kind: WorkspaceKind;
  /** What the row says: the person's or the firm's own name. */
  name: string;
  standing: WorkspaceStanding;
  /** Which side of the product it belongs to, so the sheet can group it. */
  side: Side;
  /** Where selecting it lands. */
  href: string;
};

/** The personal row is the absence of a workspace, and it is always present. */
export const PERSONAL_KEY = "personal";

export type ProfileSelection =
  | { kind: "personal" }
  | { kind: "workspace"; workspace: Workspace };

/**
 * What the account holds, as one object the sheet and the dock both read.
 *
 * `workspaces` may be empty, and empty is the state nearly every account on
 * this platform is in today: there is exactly one `agents` row in the whole
 * database and it is the example lister. The zero state is therefore the
 * important one, not the edge case, which is why it has its own copy rather
 * than an empty list drawn with no explanation.
 */
export type WorkspacesView = {
  workspaces: Workspace[];
  /** The row the sheet ticks. */
  current: ProfileSelection;
};

/* --------------------------------------------------------------- building */

/**
 * The interim mapping from what the database can say today.
 *
 * `agents.role` does not exist yet: the person axis is still `agents.type`,
 * `individual` or `business`, which has never meant owner or agent and is
 * exactly the defect this direction closes. Until the column lands, an
 * individual reads as an owner workspace and a business as an agent one,
 * which is what the product already assumes on every screen. The mapping is
 * HERE, in one function, so the day the column ships there is one line to
 * change rather than a hunt.
 */
export function kindFromAgentType(type: "individual" | "business"): WorkspaceKind {
  return type === "business" ? "agent" : "owner";
}

/**
 * The application status, as the sheet's standing.
 *
 * Every one of these is selectable. `MORE_INFO_REQUIRED` reads as refused on
 * purpose: from the person's side it is the same act, something is missing and
 * they must open it and read what, and giving it a sixth label would be a
 * distinction only a reviewer cares about.
 */
export function standingFromStatus(status: string): WorkspaceStanding {
  switch (status) {
    case "APPROVED":
      return "active";
    case "DRAFT":
      return "draft";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "pending";
    case "REJECTED":
    case "MORE_INFO_REQUIRED":
      return "refused";
    case "SUSPENDED":
      return "suspended";
    default:
      /* An unknown status is not silently normal. Pending is the honest read
         of "the platform has said something we do not recognise": it is the
         one standing that promises nothing and opens the surface that can
         explain. */
      return "pending";
  }
}

export function makeWorkspace({
  kind,
  id,
  name,
  standing,
}: {
  kind: WorkspaceKind;
  /** The row's id. Ignored for the console, which is not a row. */
  id: string;
  name: string;
  standing: WorkspaceStanding;
}): Workspace {
  const side = WORKSPACE_SIDE[kind];
  if (kind === "console") {
    return { key: ADMIN_WORKSPACE_KEY, kind, name, standing, side, href: "/admin" };
  }
  const prefix = kind === "firm" ? "firm" : kind === "host" ? "stays" : "supply";
  return {
    key: workspaceKey(prefix, id),
    kind,
    name,
    standing,
    side,
    /*
     * Where a workspace OPENS is a function of its standing, not only of its
     * kind, and that is the honesty rule rather than a convenience.
     *
     * A refused or suspended workspace opens on the surface that carries the
     * reason in full, because a person who has been stopped and cannot find
     * out why is the exact failure the suspension design exists to prevent. A
     * pending one opens on its own dashboard, which already carries the
     * standing banner.
     */
    href:
      standing === "refused" || standing === "suspended"
        ? "/agent/verification"
        : kind === "host"
          ? "/host"
          : "/agent/dashboard",
  };
}

/* -------------------------------------------------------------- selecting */

/**
 * Which row the sheet ticks, from the two cookies and what is actually held.
 *
 * The cookie is a hint. The list is the truth. A key that names nothing the
 * account holds falls back to the single workspace when there is exactly one,
 * and to personal otherwise, because guessing between several would put
 * somebody in a workspace they did not choose.
 */
export function resolveCurrent(
  workspaces: Workspace[],
  mode: Mode,
  key: string | null,
): ProfileSelection {
  if (mode !== "working") return { kind: "personal" };
  const named = key === null ? undefined : workspaces.find((w) => w.key === key);
  if (named) return { kind: "workspace", workspace: named };
  const only = workspaces.length === 1 ? workspaces[0] : undefined;
  if (only) return { kind: "workspace", workspace: only };
  return { kind: "personal" };
}

/**
 * The order the sheet lists them in: property first, then stays, console last.
 *
 * Stable within a group, so a person's rows do not reorder themselves between
 * two openings of the same sheet.
 */
export function orderWorkspaces(workspaces: Workspace[]): Workspace[] {
  const rank = (w: Workspace) => (w.kind === "console" ? 2 : w.side === "stays" ? 1 : 0);
  return [...workspaces].sort((a, b) => rank(a) - rank(b));
}

/**
 * What the trigger says when it is not a sheet opener but a direct toggle.
 *
 * Zero workspaces: the trigger is the way in and says so. One: tapping toggles
 * directly between personal and it, which is one tap for the only two states
 * that person has, with the sheet still available. Several: it always opens
 * the sheet, because a toggle between three things is not a toggle.
 */
export function triggerBehaviour(workspaces: Workspace[]): "add" | "toggle" | "sheet" {
  if (workspaces.length === 0) return "add";
  if (workspaces.length === 1) return "toggle";
  return "sheet";
}

/** The label under a workspace row: its standing, or nothing when it is fine. */
export function standingLabel(standing: WorkspaceStanding): string | null {
  return WORKSPACE_STANDING_COPY[standing].label;
}

/**
 * Whether selecting this workspace also turns the coin over.
 *
 * `buildNav` shows the property workspace only while the shell is on the
 * property side, so a sheet listing a property workspace to a reader standing
 * on Stays must either flip the coin for them or draw a row that does nothing.
 * It flips, through the product's own signature transition, and the row names
 * the side so nobody is surprised by it.
 */
export function needsFlip(workspace: Workspace, side: Side): boolean {
  return workspace.side !== side;
}
