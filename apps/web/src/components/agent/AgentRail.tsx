import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import type { AgentProfile } from "@/lib/agent/types";
import { Logo } from "@/design-system/brand/Logo";
import { ModeSwitcher } from "./ModeSwitcher";
import { AgentIdentityCard, AgentModePill, AgentNavList, buildAgentNav } from "./AgentNav";

/**
 * Agent Mode navigation rail (desktop, lg and up).
 *
 * Ten destinations, frozen (Master Rule 17). This IA is identical across the
 * three source-of-truth references that show the agent workspace, so it is
 * settled and must not drift. The amber "Agent Mode" pill under the logo, the
 * identity card and the "Switch to Personal Mode" control are all part of the
 * established chrome, not decoration. Below lg the same content renders inside
 * the slide-in drawer (AgentMobileNav), built from the same shared pieces so
 * the two surfaces cannot diverge.
 */
export function AgentRail({
  t,
  active,
  profile,
}: {
  t: Dictionary;
  active: string;
  profile: AgentProfile;
}) {
  return (
    <aside
      className="sticky top-0 hidden h-dvh w-[var(--nf-rail-width)] shrink-0 flex-col border-r border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-4 py-5 lg:flex"
      aria-label={t.agent.mode.workspaceLabel}
    >
      <Link href="/" aria-label={t.a11y.logoHome} className="mb-2 px-1">
        <Logo size={38} wordSize={19} />
      </Link>

      <AgentModePill label={t.agent.mode.agent} className="mb-5 ml-1" />

      <AgentNavList items={buildAgentNav(t)} active={active} label={t.agent.mode.workspaceLabel} />

      {/* Identity card plus switch back to Personal Mode. */}
      <div className="mt-4 space-y-2">
        <AgentIdentityCard profile={profile} verifiedLabel={t.agent.mode.verifiedAgent} />
        {/* This rail only renders inside Agent Mode, so the switch always
            offers Personal, independent of the cookie's current value. */}
        <ModeSwitcher t={t} current="agent" variant="menu" />
      </div>
    </aside>
  );
}
