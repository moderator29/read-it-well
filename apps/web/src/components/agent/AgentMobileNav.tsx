"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import type { Dictionary } from "@vallo/i18n/core";
import type { AgentProfile } from "@/lib/agent/types";
import { Logo } from "@/design-system/brand/Logo";
import { ModeSwitcher } from "./ModeSwitcher";
import { AgentIdentityCard, AgentModePill } from "./AgentNav";
import { noWorkspaceDoor } from "./agent-doors";
import { buildAgentNav } from "./agent-nav-model";
import { NavTree } from "@/components/app/NavTree";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Agent Mode mobile navigation: a hamburger in the top bar opening a slide-in
 * drawer, below lg only.
 *
 * Agent Mode has ten frozen destinations (Master Rule 17), double what a phone
 * tab bar can hold before targets shrink past thumb size, so the workspace
 * gets a drawer where Personal Mode gets its five-tab bar. The drawer reuses
 * the exact rail content via AgentNav, so the two form factors present one
 * identical IA. The drawer is the platform's `Sheet` in its page shape, so it
 * has the drag and flick to close, Back, Escape, the focus trap and return,
 * the scroll lock and the safe areas every other sheet has. The sheet portals
 * itself to <body>, which matters here: the top bar's backdrop blur makes it
 * the containing block for fixed descendants, and a drawer rendered inside it
 * was once 60px tall.
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
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t.a11y.openMenu}
        className="nf-icon-btn nf-tap -ml-2xs h-10 w-10 shrink-0 lg:hidden"
      >
        {/* The panel toggle, matching Personal Mode. Three stacked lines say
            "a list is behind this" and say it identically whatever opens; this
            says a panel arrives beside the content. */}
        <UiIcon name="panel-left" size={20} />
      </button>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={t.agent.mode.workspaceLabel}
        hideTitle
        fullPage
      >
            <div className="nf-agent-drawer flex flex-col">
              <div className="mb-xs flex items-center justify-between px-2xs">
                <Link href="/" aria-label={t.a11y.logoHome} onClick={close}>
                  <Logo size={44} wordSize={22} />
                </Link>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t.a11y.closeMenu}
                  className="nf-icon-btn -mr-2xs h-10 w-10"
                >
                  <UiIcon name="close" size="sm" />
                </button>
              </div>

              <AgentModePill
                label={t.agent.mode.agent}
                className="mb-5 ml-2xs"
              />

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
            </div>
      </Sheet>
    </>
  );
}
