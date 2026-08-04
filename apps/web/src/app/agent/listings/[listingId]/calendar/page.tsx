import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentRepository } from "@/lib/agent/repository";
import { getAgentContext, agentProfileFrom } from "@/lib/agent/listings-queries";
import { getListingCalendar } from "@/lib/agent/calendar-queries";
import { AgentShell } from "@/components/agent/AgentShell";
import { ListingPitch } from "../../../list/ListingPitch";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { CalendarEditor } from "./CalendarEditor";

export const metadata: Metadata = {
  title: "Listing calendar",
  robots: { index: false, follow: false },
};

/**
 * /agent/listings/[listingId]/calendar
 *
 * The first and only writer of availability_status 'unavailable'. Before this
 * screen the only rows in public.availability came from the bookings loop
 * marking nights 'booked', so a host could not close a weekend for repairs, for
 * a relative, or because they were away, and the third value of the enum had no
 * writer anywhere on the platform.
 *
 * Every state that is not "ready" is a designed screen with a way onward.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const read = await getListingCalendar(listingId);

  if (read.state === "signed-out" || read.state === "not-agent") {
    const profile = await getAgentRepository().getProfile();
    return (
      <AgentShell t={t} locale={locale} active="/agent/listings" profile={profile}>
        <ListingPitch copy={t.agentListings.pitch} signedIn={read.state === "not-agent"} />
      </AgentShell>
    );
  }

  if (read.state === "unconfigured" || read.state === "missing" || read.state === "unavailable") {
    const profile = await getAgentRepository().getProfile();
    const copy =
      read.state === "unconfigured"
        ? {
            title: "Calendars switch on shortly",
            body: "This platform is still waiting on its keys, so there is no calendar to manage yet.",
          }
        : read.state === "missing"
          ? {
              title: "We could not find that listing",
              body: "It may belong to another account, or it may have been removed. Your listings are all in one place.",
            }
          : {
              title: "The calendar is unavailable for a moment",
              body: "Your listing and its nights are unchanged. Please try again shortly.",
            };

    return (
      <AgentShell t={t} locale={locale} active="/agent/listings" profile={profile}>
        <div className="mx-auto max-w-md py-10 text-center">
          <span className="mx-auto block h-20 w-20">
            <BrandIcon name="calendar-clock" fill />
          </span>
          <h1 className="nf-h2 mt-5">{copy.title}</h1>
          <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
            {copy.body}
          </p>
          <Link href="/agent/listings" className="nf-btn nf-btn--glass mt-6">
            My listings
          </Link>
        </div>
      </AgentShell>
    );
  }

  const context = await getAgentContext();
  const profile =
    context.state === "agent"
      ? agentProfileFrom(context.agent)
      : await getAgentRepository().getProfile();

  return (
    <AgentShell t={t} locale={locale} active="/agent/listings" profile={profile}>
      <div className="mb-6">
        <Link
          href="/agent/listings"
          className="text-[0.8125rem] font-semibold text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
        >
          My listings
        </Link>
        <h1 className="nf-h1 mt-1">Calendar</h1>
        <p className="mt-1 text-[var(--nf-content-secondary)]">
          {read.subject.title}. Close nights you cannot host, and reopen them
          whenever you like.
        </p>
      </div>

      <CalendarEditor subject={read.subject} nights={read.nights} />
    </AgentShell>
  );
}
