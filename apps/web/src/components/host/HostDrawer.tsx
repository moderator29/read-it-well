"use client";

import { usePathname } from "next/navigation";
import { NavTree } from "@/components/app/NavTree";
import { WorkspaceDrawer } from "@/components/workspace/WorkspaceDrawer";
import { AgentModePill } from "@/components/agent/AgentNav";
import { buildHostNav, hostNavActive, hostTitleFor, type HostNavLabels } from "./host-nav-model";

/**
 * The host console's drawer, below `lg`: the same `WorkspaceDrawer` the agent
 * console opens, carrying the host's destinations and then its assistant, its
 * settings, account settings and help. The chip row under the bar stays for
 * moving between the working screens; this is the whole map, one tap away.
 *
 * Client only for `usePathname`: `HostShell` is rendered by every host page
 * and none of them had to be told which one it is.
 */
export function HostDrawer({ labels }: { labels: HostNavLabels }) {
  const active = hostNavActive(usePathname()) ?? "";
  return (
    <WorkspaceDrawer
      title={labels.workspace}
      openLabel={labels.openMenu}
      closeLabel={labels.closeMenu}
      head={<AgentModePill label={labels.workspace} />}
    >
      {(close) => (
        <NavTree
          sections={buildHostNav(labels)}
          active={active}
          label={labels.workspace}
          accent="agent"
          onNavigate={close}
        />
      )}
    </WorkspaceDrawer>
  );
}

/** The bar's title, from the address. */
export function HostTitle({ labels }: { labels: HostNavLabels }) {
  return <>{hostTitleFor(labels, usePathname())}</>;
}
