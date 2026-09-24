import type { Metadata } from "next";
import { DemandBoard } from "@/components/agent/DemandBoard";
import { readDemandBoard } from "@/lib/demand/queries";
import { EnquiryFunnel, LostByAreaPanel } from "@/components/agent/EnquiryDesk";
import { readDeskStages, readLostReasonsByArea } from "@/lib/enquiry/queries";
import { countByStage } from "@/lib/enquiry/stage";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { readAgentAnalytics } from "@/lib/agent/analytics-queries";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";
import { ListingPitch } from "../list/ListingPitch";
import { AnalyticsWorkspace } from "./AnalyticsWorkspace";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.agentAnalytics.title, robots: { index: false, follow: false } };
}

/**
 * /agent/analytics: what the host's properties have actually done.
 *
 * The last AgentComingSoon stub in the workspace, and the one it was most
 * tempting to fill with a demonstration. A placeholder chart on an analytics
 * screen is not a placeholder in the sense the other stubs were: a host reads
 * it as their own performance and prices a flat, declines a guest or borrows
 * money on the strength of it. So the screen ships with real reads or with
 * nothing, and the empty state is written to be read rather than to be
 * replaced.
 *
 * Shaped exactly like /agent/bookings and /agent/earnings: the server page
 * resolves who is asking, reads under their own RLS-bound client, and hands
 * the figures to a plain rendering component. Nothing here mutates, so the
 * workspace stays a server component with no client JavaScript to ship, and
 * there is no revalidation path to think about.
 */
export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const context = await getAgentContext();

  if (context.state === "signed-out" || context.state === "not-agent") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/analytics" profile={null}>
        <ListingPitch copy={t.agentListings.pitch} signedIn={context.state === "not-agent"} />
      </AgentShell>
    );
  }

  if (context.state === "unconfigured") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/analytics" profile={null}>
        <div className="mx-auto max-w-md py-10 text-center">
          <span className="mx-auto block h-20 w-20">
            <BrandIcon name="report-stats" fill />
          </span>
          <h1 className="nf-h2 mt-5">{t.agentAnalytics.title}</h1>
          <p className="mx-auto mt-sm max-w-[42ch] text-[var(--nf-content-secondary)]">
            {t.agentAnalytics.unconfigured}
          </p>
          <ButtonLink href="/agent/dashboard" variant="secondary" className="mt-lg">
            {t.agent.nav.dashboard}
          </ButtonLink>
        </div>
      </AgentShell>
    );
  }

  /*
   * A throw here would take the whole screen down, and every individual read
   * inside readAgentAnalytics already degrades to a null its own panel knows
   * how to draw. This catch exists for the one failure those cannot cover,
   * which is the function itself not returning, and it resolves to null so the
   * page falls through to the same "we could not read this" rendering rather
   * than to an error boundary.
   */
  const [analytics, demand, stages, lost] = await Promise.all([
    readAgentAnalytics(context).catch(() => null),
    readDemandBoard(4),
    readDeskStages(),
    readLostReasonsByArea(12),
  ]);

  return (
    <AgentShell
      t={t}
      locale={locale}
      active="/agent/analytics"
      profile={agentProfileFrom(context.agent)}
    >
      <div className="mb-lg">
        <h1 className="nf-h1">{t.agentAnalytics.title}</h1>
        <p className="mt-2xs text-[var(--nf-content-secondary)]">{t.agentAnalytics.lede}</p>
      </div>

      {analytics ? (
        <AnalyticsWorkspace
          t={t.agentAnalytics}
          /* The counted hours phrase already exists in all four languages on
             the bookings card. It is handed down rather than duplicated under
             a second key. */
          hours={{ one: t.agentBookings.card.hoursOne, other: t.agentBookings.card.hours }}
          statusLabels={t.agentListings.workspace.status}
          analytics={analytics}
          locale={locale}
        />
      ) : (
        <p
          className="rounded-[var(--nf-container-radius)] p-md text-[length:var(--nf-text-body-sm)] font-medium leading-relaxed"
          style={{
            background: "var(--nf-state-warning-surface)",
            color: "var(--nf-state-warning)",
          }}
          role="alert"
        >
          {t.agentAnalytics.unavailable}
        </p>
      )}

      {/* V-10: what renters asked for and could not find, by neighbourhood. */}
      <DemandBoard rows={demand} copy={t.frontDoor.demand} locale={locale} listHref="/agent/list" />

      {/* V-72: the lister's enquiries by stage, and why enquiries are lost by area. */}
      <EnquiryFunnel counts={stages ? countByStage(stages.values()) : null} copy={t.frontDoor.desk} />
      <LostByAreaPanel areas={lost} copy={t.frontDoor.desk} />
    </AgentShell>
  );
}
