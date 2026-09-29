"use client";

import { usePathname } from "next/navigation";
import { NavTree } from "@/components/app/NavTree";
import { WorkspaceDrawer } from "@/components/workspace/WorkspaceDrawer";
import { AgentModePill } from "@/components/agent/AgentNav";
import { buildHostNav, hostNavActive, hostTitleFor } from "./host-nav-model";

/**
 * The host console's drawer, below `lg`: the same `WorkspaceDrawer` the agent
 * console opens, carrying the host's destinations and then its assistant, its
 * settings, account settings and help. The chip row under the bar stays for
 * moving between the working screens; this is the whole map, one tap away.
 *
 * Client only for `usePathname`: `HostShell` is rendered by every host page
 * and none of them had to be told which one it is.
 */
export function HostDrawer() {
  const active = hostNavActive(usePathname()) ?? "";
  return (
    <WorkspaceDrawer
      title="Host workspace"
      openLabel="Open the host menu"
      closeLabel="Close the host menu"
      head={<AgentModePill label="Host workspace" />}
    >
      {(close) => (
        <NavTree
          sections={buildHostNav()}
          active={active}
          label="Host workspace"
          accent="agent"
          onNavigate={close}
        />
      )}
    </WorkspaceDrawer>
  );
}

/** The bar's title, from the address. */
export function HostTitle() {
  return <>{hostTitleFor(usePathname())}</>;
}
