import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import type { AgentProfile } from "@/lib/agent/types";
import { Logo } from "@/design-system/brand/Logo";
import { ModeSwitcher } from "./ModeSwitcher";
import { AgentIdentityCard, AgentModePill } from "./AgentNav";
import { buildAgentNav } from "./agent-nav-model";
import { NavTree } from "@/components/app/NavTree";

/**
 * Agent Mode navigation rail (desktop, lg and up).
 *
 * Ten destinations, frozen (Master Rule 17). This IA is identical across the
 * three source-of-truth references that show the agent workspace, so it is
 * settled and must not drift. The "Agent Mode" pill under the logo, the
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
      <div className="nf-nav__head flex-col items-start gap-2">
        <Link href="/" aria-label={t.a11y.logoHome} className="nf-nav__brand">
          <Logo size={34} wordSize={17} />
        </Link>
        <AgentModePill label={t.agent.mode.agent} />
      </div>

      <NavTree
        sections={buildAgentNav(t, unreadMessages)}
        active={active}
        label={t.agent.mode.workspaceLabel}
        storageKey="nf_agent_nav_open"
        accent="agent"
        expandLabel={t.a11y.expand}
        collapseLabel={t.a11y.collapse}
      />

      {/* Identity card plus switch back to Personal Mode. */}
      <div className="mt-4 space-y-2">
        <AgentIdentityCard
          profile={profile}
          verifiedLabel={t.agent.mode.verifiedAgent}
          visitorLabel={t.agent.mode.visitor}
          signInLabel={t.agent.mode.signInToWorkspace}
        />
        {/* This rail only renders inside Agent Mode, so the switch always
            offers Personal, independent of the cookie's current value. */}
        <ModeSwitcher t={t} current="agent" variant="menu" />
      </div>
    </aside>
  );
}
