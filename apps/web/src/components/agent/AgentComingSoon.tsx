import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentRepository } from "@/lib/agent/repository";
import { AgentShell } from "./AgentShell";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

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
  icon: BrandIconName;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <AgentShell t={t} locale={locale} active={active} profile={null}>
      <div className="mx-auto max-w-lg py-10 text-center sm:py-16">
        <div className="relative mx-auto grid h-24 w-24 place-items-center sm:h-28 sm:w-28">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full opacity-60 blur-2xl"
            style={{ background: "var(--nf-gradient-agent)" }}
          />
          <span className="relative block h-20 w-20 sm:h-[72px] sm:w-[72px]">
            <BrandIcon name={icon} fill />
          </span>
        </div>

        <span className="nf-tag-pill nf-tag-pill--neutral mx-auto mt-5 inline-flex">
          In development
        </span>
        <h1 className="nf-h2 mt-3">{title}</h1>
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
