import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { StatCard } from "@/components/agent/StatCard";
import { Amount, Figure } from "@/components/ui/Amount";
import { RealDashboard } from "@/app/agent/dashboard/RealDashboard";
import type { AgentNumbers } from "@/lib/agent/listings-queries";
import { COUNTERPART } from "../../_fixtures/people";
import { INSPECTION } from "../fixtures";

/**
 * The agent dashboard in the register, from fixture numbers: the glass stat
 * tiles above the real dashboard component. The route needs an approved
 * agent's session; this renders the same pieces on the same shell.
 */
export const dynamic = "force-dynamic";

const NUMBERS: AgentNumbers = {
  byStatus: {
    DRAFT: 1,
    SUBMITTED: 1,
    UNDER_REVIEW: 0,
    MORE_INFO_REQUIRED: 0,
    APPROVED: 0,
    PUBLISHED: 4,
    REJECTED: 0,
    SUSPENDED: 0,
  },
  totalListings: 6,
  liveListings: 4,
  inReview: 1,
  drafts: 1,
  upcomingBookings: [
    {
      id: "00000000-0000-4000-8000-00000000b002",
      listingTitle: "Lekki Phase 1 apartment",
      checkIn: "2026-06-22",
      checkOut: "2026-06-25",
      totalMinor: 18_000_000,
      status: "CONFIRMED",
    },
  ],
  upcomingBookingCount: 1,
  unreadMessages: 3,
};

export default async function PreviewAgentDashboard() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AgentShell
      t={t}
      locale={locale}
      active="/agent/dashboard"
      profile={{
        id: COUNTERPART.id,
        displayName: COUNTERPART.name,
        status: "APPROVED",
        type: "individual",
        verified: true,
      }}
    >
      <div className="mb-block grid grid-cols-2 gap-row lg:grid-cols-4">
        <StatCard icon="naira-hand" label="Earned this month" value={<Amount minorUnits={42_500_000} locale={locale} />} />
        <StatCard icon="calendar-check" label="Upcoming stays" value={<Figure value={1} locale={locale} />} />
        <StatCard icon="home-check" label="Live listings" value={<Figure value={4} locale={locale} />} />
        <StatCard icon="chat-duo" label="Unread messages" value={<Figure value={3} locale={locale} />} />
      </div>
      <RealDashboard
        t={t}
        locale={locale}
        displayName={COUNTERPART.name}
        numbers={NUMBERS}
        inspections={{ inspections: [{ ...INSPECTION, state: "REQUESTED", slotAt: null }], openCount: 1, readFailed: false }}
      />
    </AgentShell>
  );
}
