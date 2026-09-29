"use client";

import type { Dictionary } from "@vallo/i18n/core";
import type { AgentProfile } from "@/lib/agent/types";
import { ModeSwitcher } from "./ModeSwitcher";
import { AgentIdentityCard, AgentModePill } from "./AgentNav";
import { noWorkspaceDoor } from "./agent-doors";
import { buildAgentNav } from "./agent-nav-model";
import { NavTree } from "@/components/app/NavTree";
import { WorkspaceDrawer } from "@/components/workspace/WorkspaceDrawer";

/**
 * Agent Mode mobile navigation: a hamburger in the top bar opening a slide-in
 * drawer, below lg only.
 *
 * Agent Mode has ten frozen destinations (Master Rule 17), double what a phone
 * tab bar can hold before targets shrink past thumb size, so the workspace
 * gets a drawer where Personal Mode gets its five-tab bar. The drawer reuses
 * the exact rail content via AgentNav, so the two form factors present one
 * identical IA. The toggle and the sheet are `WorkspaceDrawer`, the one the
 * host console opens too.
 */
export function AgentMobileNav({
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
    <WorkspaceDrawer
      title={t.agent.mode.workspaceLabel}
      openLabel={t.a11y.openMenu}
      closeLabel={t.a11y.closeMenu}
      /* The workspace's marker heads the drawer. The Vallo lockup that sat
         here went with the one in the bar: inside a workspace nobody needs
         telling which product they are in. */
      head={<AgentModePill label={t.agent.mode.agent} />}
    >
      {(close) => (
        <>
          <NavTree
            sections={buildAgentNav(t, unreadMessages)}
            active={active}
            label={t.agent.mode.workspaceLabel}
            accent="agent"
            onNavigate={close}
          />

          <div className="mt-md space-y-xs">
            <AgentIdentityCard
              profile={profile}
              verifiedLabel={t.agent.mode.verifiedAgent}
              door={noWorkspaceDoor(t.agent.mode)}
            />
            <ModeSwitcher t={t} current="working" variant="menu" />
          </div>
        </>
      )}
    </WorkspaceDrawer>
  );
}
