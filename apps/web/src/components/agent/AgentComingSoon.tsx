import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentRepository } from "@/lib/agent/repository";
import { AgentShell } from "./AgentShell";
import { Icon, type IconName } from "@/design-system/icons/Icon";

/**
 * Placeholder for agent destinations not yet built.
 *
 * The rail lists ten destinations and must stay consistent (Master Rule 17), so
 * every one has to resolve to a real page rather than a 404 (Master Rule 55, no
 * dead ends). This states plainly that the section is on the way and keeps the
 * agent inside the workspace chrome, with the correct nav item highlighted.
 */
export async function AgentComingSoon({
  active,
  title,
  icon,
}: {
  active: string;
  title: string;
  icon: IconName;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const profile = await getAgentRepository().getProfile();

  return (
    <AgentShell t={t} locale={locale} active={active} profile={profile}>
      <div className="mx-auto max-w-lg py-10 text-center sm:py-16">
        <span className="mx-auto block h-16 w-16 sm:h-[72px] sm:w-[72px]">
          <Icon name={icon} fill />
        </span>
        <h1 className="nf-h2 mt-5">{title}</h1>
        <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
          This part of the agent workspace is being built. The navigation is final, so
          this destination is reserved and will fill in shortly.
        </p>
        <Link href="/agent/dashboard" className="nf-btn nf-btn--glass mt-6">
          {t.agent.nav.dashboard}
        </Link>
      </div>
    </AgentShell>
  );
}
