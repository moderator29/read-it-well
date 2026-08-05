import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { getAgentInbox } from "@/lib/agent/messages-queries";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ListingPitch } from "../list/ListingPitch";
import { AgentInbox, type InboxFilter } from "./AgentInbox";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.agent.nav.messages, robots: { index: false, follow: false } };
}

/**
 * /agent/messages: the host side of conversations that were already live.
 *
 * Agents have been receiving real threads under RLS since messaging shipped and
 * could only read them at /messages, the guest surface, with no host framing.
 * Worse, the navigation carried a hardcoded unread badge of 3 pointing here, at
 * a placeholder, so every agent saw three unread messages permanently and could
 * never clear them. This closes both.
 *
 * Shaped like /agent/earnings and /agent/bookings: the server page resolves who
 * is asking, reads under their own RLS-bound client, and hands the result to a
 * plain rendering component. Replying happens on the existing thread route
 * through the existing sendMessage action, so there is no second composer and
 * no second write path to keep in step.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { filter: filterParam } = await searchParams;
  const filter: InboxFilter = filterParam === "all" ? "all" : "waiting";

  const context = await getAgentContext();

  if (context.state === "signed-out" || context.state === "not-agent") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/messages" profile={null}>
        <ListingPitch copy={t.agentListings.pitch} signedIn={context.state === "not-agent"} />
      </AgentShell>
    );
  }

  if (context.state === "unconfigured") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/messages" profile={null}>
        <div className="mx-auto max-w-md py-10 text-center">
          <span className="mx-auto block h-20 w-20">
            <BrandIcon name="chat-duo" fill />
          </span>
          <h1 className="nf-h2 mt-5">{t.agent.nav.messages}</h1>
          <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
            Guest enquiries appear here the moment the platform keys land.
          </p>
          <Link href="/agent/dashboard" className="nf-btn nf-btn--glass mt-6">
            {t.agent.nav.dashboard}
          </Link>
        </div>
      </AgentShell>
    );
  }

  const read = await getAgentInbox();
  const profile = agentProfileFrom(context.agent);

  return (
    <AgentShell t={t} locale={locale} active="/agent/messages" profile={profile}>
      <div className="mb-6">
        <h1 className="nf-h1">{t.agent.nav.messages}</h1>
        <p className="mt-1 text-[var(--nf-content-secondary)]">
          {read.state === "ready" && read.inbox.waitingCount > 0
            ? `${read.inbox.waitingCount} ${
                read.inbox.waitingCount === 1 ? "enquiry is" : "enquiries are"
              } waiting on your reply. Guests book the hosts who answer.`
            : "Every guest enquiry about your listings, oldest wait first."}
        </p>
      </div>

      {read.state === "ready" ? (
        <AgentInbox inbox={read.inbox} filter={filter} />
      ) : (
        <div className="nf-card p-8 text-center">
          <span className="mx-auto block h-16 w-16">
            <BrandIcon name="chat-duo" fill />
          </span>
          <p className="mt-3.5 font-semibold text-[var(--nf-content-primary)]">
            Enquiries are unavailable for a moment
          </p>
          <p className="mx-auto mt-1 max-w-[40ch] text-[0.875rem] text-[var(--nf-content-muted)]">
            Nothing has been lost and no guest message was missed. Please try
            again shortly.
          </p>
          <Link href="/agent/dashboard" className="nf-btn nf-btn--glass mt-4">
            {t.agent.nav.dashboard}
          </Link>
        </div>
      )}
    </AgentShell>
  );
}
