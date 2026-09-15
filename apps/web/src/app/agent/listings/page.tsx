import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import {
  agentProfileFrom,
  getAgentContext,
  readMyListings,
} from "@/lib/agent/listings-queries";
import { ListingPitch } from "../list/ListingPitch";
import { ListingsWorkspace } from "./ListingsWorkspace";
import { ButtonLink } from "@/components/ui/Button";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.agent.nav.myListings, robots: { index: false, follow: false } };
}

/**
 * /agent/listings: everything the agent owns, in every status.
 *
 * The list is read on the server through the agent's own RLS-bound client, so
 * what renders is exactly what the database will let them manage. Actions live
 * in the client workspace and refresh this page after every state change.
 */
export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const context = await getAgentContext();

  if (context.state === "signed-out" || context.state === "not-agent") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/listings" profile={null}>
        <ListingPitch
          copy={t.agentListings.pitch}
          signedIn={context.state === "not-agent"}
        />
      </AgentShell>
    );
  }

  if (context.state === "unconfigured") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/listings" profile={null}>
        <div className="mx-auto max-w-md py-10 text-center">
          <h1 className="nf-h2">{t.agentListings.workspace.title}</h1>
          <p className="mx-auto mt-3 max-w-[40ch] text-[var(--nf-content-secondary)]">
            {t.agentListings.workspace.unconfigured}
          </p>
          <ButtonLink href="/agent/list" variant="primary" className="mt-6">
            {t.agentListings.workspace.start}
          </ButtonLink>
        </div>
      </AgentShell>
    );
  }

  const listings = await readMyListings(context.supabase, context.agent.id);

  return (
    <AgentShell
      t={t}
      locale={locale}
      active="/agent/listings"
      profile={agentProfileFrom(context.agent)}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="nf-h1">{t.agentListings.workspace.title}</h1>
          <p className="mt-1 text-[var(--nf-content-secondary)]">
            {t.agentListings.workspace.lede}
          </p>
        </div>
        <ButtonLink href="/agent/list" variant="primary">
          {t.agentListings.workspace.start}
        </ButtonLink>
      </div>

      <ListingsWorkspace t={t.agentListings} listings={listings} locale={locale} />
    </AgentShell>
  );
}
