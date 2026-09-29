import type { Dictionary } from "@vallo/i18n/core";
import type { AgentProfile } from "@/lib/agent/types";
import { ModeSwitcher } from "./ModeSwitcher";
import { AgentIdentityCard, AgentModePill } from "./AgentNav";
import { noWorkspaceDoor } from "./agent-doors";
import { buildAgentNav } from "./agent-nav-model";
import { NavTree } from "@/components/app/NavTree";

/**
 * Agent Mode navigation rail (desktop, lg and up).
 *
 * Ten destinations, frozen (Master Rule 17). This IA is identical across the
 * three source-of-truth references that show the agent workspace, so it is
 * settled and must not drift. The "Agent Mode" pill at the head, the
 * identity card and the "Switch to Personal Mode" control are all part of the
 * established chrome, not decoration. Below lg the same content renders inside
 * the slide-in drawer (AgentMobileNav), built from the same shared pieces so
 * the two surfaces cannot diverge.
 */
export function AgentRail({
  t,
  active,
  profile,
  unreadMessages = 0,
}: {
  t: Dictionary;
  active: string;
  /** The real agent behind this workspace, or null when nobody is. */
  profile: AgentProfile | null;
  /** Real unread count for the messages badge. Zero renders no badge. */
  unreadMessages?: number;
}) {
  return (
    <aside
      className="nf-nav nf-nav--rail"
      aria-label={t.agent.mode.workspaceLabel}
    >
      <div className="nf-nav__head flex-col items-start gap-xs">
        {/* No Vallo lockup inside a workspace (founder, 29 September 2026):
            the workspace's own marker heads the rail, as it heads the drawer. */}
        <AgentModePill label={t.agent.mode.agent} />
      </div>

      <NavTree
        sections={buildAgentNav(t, unreadMessages)}
        active={active}
        label={t.agent.mode.workspaceLabel}
        accent="agent"
      />

      {/* Identity card plus switch back to Personal Mode. */}
      <div className="mt-md space-y-xs">
        <AgentIdentityCard
          profile={profile}
          verifiedLabel={t.agent.mode.verifiedAgent}
          door={noWorkspaceDoor(t.agent.mode)}
        />
        {/* This rail only renders inside Agent Mode, so the switch always
            offers Personal, independent of the cookie's current value. */}
        <ModeSwitcher t={t} current="working" variant="menu" />
      </div>
    </aside>
  );
}
