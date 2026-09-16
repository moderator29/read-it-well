import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { AgentShell } from "./AgentShell";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Placeholder for agent destinations not yet built.
 *
 * The rail lists ten destinations and must stay consistent (Master Rule 17), so
 * every one has to resolve to a real page rather than a 404 (Master Rule 55, no
 * dead ends). This states plainly that the section is on the way and keeps the
 * agent inside the workspace chrome, with the correct nav item highlighted.
 *
 * The identity in that chrome is resolved here rather than assumed. It used to
 * come from a seed object called "Demo Agent", which addressed every visitor as
 * an approved verified agent; passing null instead would have swung the lie the
 * other way and told a genuinely signed-in agent they were not signed in. So it
 * asks who is actually there: their own row when there is one, an honest
 * absence when there is not.
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
  const context = await getAgentContext();
  const profile = context.state === "agent" ? agentProfileFrom(context.agent) : null;

  return (
    <AgentShell t={t} locale={locale} active={active} profile={profile}>
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

        {/*
          WHAT THIS SAYS, AND WHAT IT STOPPED SAYING.

          "will fill in shortly" is a schedule nobody can keep, and it is the
          same promise the thirteen "switches on shortly" screens were making in
          different words. The navigation being final IS the useful fact here:
          it tells an agent this destination is reserved rather than missing,
          which is why the rail lists it at all. So the sentence states that and
          stops there, and the chip says what is true of the page rather than
          what is planned for it.
        */}
        <span className="nf-tag-pill nf-tag-pill--neutral mx-auto mt-5 inline-flex">
          Not built yet
        </span>
        <h1 className="nf-h2 mt-3">{title}</h1>
        <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
          The navigation is final, so this destination is reserved rather than missing.
          Nothing you can do today happens here, and everything that does is on the
          dashboard.
        </p>
        <ButtonLink href="/agent/dashboard" variant="secondary" className="mt-6">
          {t.agent.nav.dashboard}
        </ButtonLink>
      </div>
    </AgentShell>
  );
}
