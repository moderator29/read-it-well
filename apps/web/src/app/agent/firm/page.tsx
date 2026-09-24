import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { readFirmDesk, readFirmRouting, readFirmTeam, readMyRoutingFirms } from "@/lib/firm/queries";
import { publicAreaName } from "@/lib/share/public-text";
import { FirmDesk } from "@/components/agent/FirmDesk";
import { FirmPicker } from "@/components/agent/FirmPicker";
import { Unreachable } from "@/components/app/Unreachable";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.frontDoor.firm.title, robots: { index: false, follow: false } };
}

/**
 * /agent/firm (V-99): the firm desk, for a firm's principal (the coordinator
 * role cannot be granted yet: admit_firm_member, audit-owned, refuses it). Everything it shows is read through functions that answer
 * only to them; anybody else sees one sentence saying who it is for.
 */
export default async function FirmDeskPage({ searchParams }: { searchParams: Promise<{ firm?: string | string[] }> }) {
  const wanted = (await searchParams).firm;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.frontDoor.firm;
  const context = await getAgentContext();
  const profile = context.state === "agent" ? agentProfileFrom(context.agent) : null;

  const firms = context.state === "agent" ? await readMyRoutingFirms() : [];
  /* A principal of more than one firm picks it with ?firm=; the first is the
     default. Only a firm this person may route is ever chosen. */
  const firm = firms?.find((f) => f.firmId === wanted) ?? firms?.[0] ?? null;

  if (firms === null) {
    return (
      <AgentShell t={t} locale={locale} active="/agent/listings" profile={profile}>
        <h1 className="nf-h1">{copy.title}</h1>
        <Unreachable noun="firm desk" icon="chat-duo" action={{ label: t.agent.nav.dashboard, href: "/agent/dashboard" }} />
      </AgentShell>
    );
  }
  if (!firm) {
    return (
      <AgentShell t={t} locale={locale} active="/agent/listings" profile={profile}>
        <h1 className="nf-h1">{copy.title}</h1>
        <p className="mt-inline nf-body text-[var(--nf-content-secondary)]">{copy.notRouter}</p>
      </AgentShell>
    );
  }

  const [listings, team, routing] = await Promise.all([
    readFirmDesk(firm.firmId),
    readFirmTeam(firm.firmId),
    readFirmRouting(firm.firmId),
  ]);
  /* The area map offers only closed-list neighbourhoods the firm's own
     listings sit in: the database refuses anything else anyway. */
  const areas = [...new Set((listings ?? []).map((l) => publicAreaName(l.area)).filter((a): a is string => a !== null))].sort();

  return (
    <AgentShell t={t} locale={locale} active="/agent/listings" profile={profile}>
      <div className="mb-block">
        <h1 className="nf-h1">
          {copy.title}: {firm.firmName}
        </h1>
        <p className="mt-3xs text-[var(--nf-content-secondary)]">{copy.lede}</p>
        {firms && firms.length > 1 && (
          <FirmPicker firms={firms} current={firm.firmId} label={copy.pickFirm} />
        )}
      </div>
      <FirmDesk firmId={firm.firmId} listings={listings} team={team} routing={routing} areas={areas} copy={copy} />
    </AgentShell>
  );
}
