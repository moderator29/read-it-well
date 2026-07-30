import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentRepository } from "@/lib/agent/repository";
import { AgentShell } from "@/components/agent/AgentShell";
import {
  agentProfileFrom,
  getAgentContext,
  readMyListings,
} from "@/lib/agent/listings-queries";
import { ListingPitch } from "../list/ListingPitch";
import { ListingsWorkspace } from "./ListingsWorkspace";

export const metadata: Metadata = {
  title: "My listings",
  robots: { index: false, follow: false },
};

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
    const profile = await getAgentRepository().getProfile();
    return (
      <AgentShell t={t} locale={locale} active="/agent/listings" profile={profile}>
        <ListingPitch signedIn={context.state === "not-agent"} />
      </AgentShell>
    );
  }

  if (context.state === "unconfigured") {
    const profile = await getAgentRepository().getProfile();
    return (
      <AgentShell t={t} locale={locale} active="/agent/listings" profile={profile}>
        <div className="mx-auto max-w-md py-10 text-center">
          <h1 className="nf-h2">My listings</h1>
          <p className="mx-auto mt-3 max-w-[40ch] text-[var(--nf-content-secondary)]">
            Your listings appear here the moment the platform keys land. You can start building one
            now: the wizard keeps your work on this device until then.
          </p>
          <Link href="/agent/list" className="nf-btn nf-btn--primary mt-6">
            Start a listing
          </Link>
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="nf-h1">{t.agent.nav.myListings}</h1>
          <p className="mt-1 text-[var(--nf-content-secondary)]">
            Every property you have on RentMe, and where each one stands.
          </p>
        </div>
        <Link href="/agent/list" className="nf-btn nf-btn--primary">
          Start a listing
        </Link>
      </div>

      <ListingsWorkspace listings={listings} locale={locale} />
    </AgentShell>
  );
}
