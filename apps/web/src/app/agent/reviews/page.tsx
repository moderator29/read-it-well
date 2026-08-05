import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { getAgentReviews } from "@/lib/agent/reviews-queries";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ListingPitch } from "../list/ListingPitch";
import { ReviewsWorkspace, type ReviewsFilter } from "./ReviewsWorkspace";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.agent.nav.reviews, robots: { index: false, follow: false } };
}

/**
 * /agent/reviews: what guests said, and the host's answer to it.
 *
 * Reviews became real when the write path shipped, and the host's side of them
 * did not: the rating landed on the public listing page, the host saw it there
 * like any visitor, and this route was an eleven-line coming-soon stub. There
 * was no way to answer a review anywhere on the platform.
 *
 * Shaped like /agent/messages and /agent/bookings: the server page resolves
 * who is asking, reads under their own RLS-bound client, and hands the result
 * to a rendering component with one client leaf for the reply form.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { filter: filterParam } = await searchParams;
  const filter: ReviewsFilter = filterParam === "all" ? "all" : "unanswered";

  const context = await getAgentContext();

  if (context.state === "signed-out" || context.state === "not-agent") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/reviews" profile={null}>
        <ListingPitch copy={t.agentListings.pitch} signedIn={context.state === "not-agent"} />
      </AgentShell>
    );
  }

  if (context.state === "unconfigured") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/reviews" profile={null}>
        <div className="mx-auto max-w-md py-10 text-center">
          <span className="mx-auto block h-20 w-20">
            <BrandIcon name="reviews" fill />
          </span>
          <h1 className="nf-h2 mt-5">{t.agent.nav.reviews}</h1>
          <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
            Guest reviews of your stays appear here the moment the platform keys land.
          </p>
          <Link href="/agent/dashboard" className="nf-btn nf-btn--glass mt-6">
            {t.agent.nav.dashboard}
          </Link>
        </div>
      </AgentShell>
    );
  }

  const read = await getAgentReviews(locale);
  const profile = agentProfileFrom(context.agent);

  return (
    <AgentShell t={t} locale={locale} active="/agent/reviews" profile={profile}>
      <div className="mb-6">
        <h1 className="nf-h1">{t.agent.nav.reviews}</h1>
        <p className="mt-1 text-[var(--nf-content-secondary)]">
          {read.state === "ready" && read.summary.unanswered > 0
            ? `${read.summary.unanswered} ${
                read.summary.unanswered === 1 ? "review is" : "reviews are"
              } waiting on your answer. Your reply is public, and the next guest reads it.`
            : "What guests said about your stays, and what you said back."}
        </p>
      </div>

      {read.state === "ready" ? (
        <ReviewsWorkspace
          reviews={read.reviews}
          summary={read.summary}
          filter={filter}
          locale={locale}
        />
      ) : (
        <div className="nf-card p-8 text-center">
          <span className="mx-auto block h-16 w-16">
            <BrandIcon name="reviews" fill />
          </span>
          <p className="mt-3.5 font-semibold text-[var(--nf-content-primary)]">
            Reviews are unavailable for a moment
          </p>
          <p className="mx-auto mt-1 max-w-[40ch] text-[0.875rem] text-[var(--nf-content-muted)]">
            Nothing has been lost and no review was missed. Please try again shortly.
          </p>
          <Link href="/agent/dashboard" className="nf-btn nf-btn--glass mt-4">
            {t.agent.nav.dashboard}
          </Link>
        </div>
      )}
    </AgentShell>
  );
}
