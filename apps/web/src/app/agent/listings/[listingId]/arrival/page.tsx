import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentContext, agentProfileFrom } from "@/lib/agent/listings-queries";
import { readDeclaration } from "@/lib/stays/arrival-queries";
import { AgentShell } from "@/components/agent/AgentShell";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ArrivalChargesForm } from "@/components/stays/ArrivalChargesForm";
import { ListingPitch } from "../../../list/ListingPitch";

export const metadata: Metadata = { title: "Charges at the door", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

/**
 * V-57, for a stay listed as a nightly listing (today's only bookable stays).
 * The owner declares every arrival charge, an amount or none, beside the
 * calendar. A listing that is not theirs, or not nightly, reads as missing.
 */
export default async function ListingArrivalPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.afterTheGate.arrival;
  const context = await getAgentContext();
  if (context.state !== "agent") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/listings" profile={null}>
        <ListingPitch copy={t.agentListings.pitch} signedIn={context.state === "not-agent"} />
      </AgentShell>
    );
  }
  const profile = agentProfileFrom(context.agent);
  const { data: listing, error } = await context.supabase
    .from("listings")
    .select("id, title, rate_period")
    .eq("id", listingId)
    .eq("agent_id", context.agent.id)
    .maybeSingle();
  const existing = listing && !error ? await readDeclaration({ listingId: listing.id }) : undefined;

  return (
    <AgentShell t={t} locale={locale} active="/agent/listings" profile={profile}>
      <div className="mx-auto max-w-2xl">
        <Link href="/agent/listings" className="nf-caption font-semibold text-[var(--nf-content-muted)]">
          {t.agent.nav.myListings}
        </Link>
        {error ? (
          <EmptyState icon="calendar-home" title={copy.title} body={t.afterTheGate.tenancy.unavailableBody} />
        ) : !listing || listing.rate_period !== "night" ? (
          <EmptyState icon="calendar-home" title={t.afterTheGate.tenancy.missingTitle} body={copy.noStays} data-testid="arrival-missing" />
        ) : (
          <>
            <h1 className="nf-h2 mt-sm">{copy.title}</h1>
            <p className={`mt-2xs ${TYPE.rowMeta}`}>{listing.title}</p>
            <p className={`mt-xs ${TYPE.body}`}>{copy.lede}</p>
            <div className="mt-lg">
              {existing === undefined ? (
                <p className={TYPE.body}>{t.afterTheGate.tenancy.unavailableBody}</p>
              ) : (
                <ArrivalChargesForm target={{ listingId: listing.id }} existing={existing} copy={copy} />
              )}
            </div>
          </>
        )}
      </div>
    </AgentShell>
  );
}
