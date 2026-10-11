import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { RealDashboard } from "@/app/agent/dashboard/RealDashboard";
import { DeskFigure } from "@/components/workspace/DeskFigure";
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

/* Fixture viewing requests for the figure card: hours back from the render,
   the way `inspection_requests.created_at` would read. Dev preview only. */
const REQUEST_HOURS_AGO = [1, 3, 20, 26, 30, 50, 75, 98, 120, 150, 200, 260, 300, 380, 450, 520, 610, 700];
function figureRows(now: Date) {
  return REQUEST_HOURS_AGO.map((hours) => ({ at: new Date(now.getTime() - hours * 3_600_000).toISOString() }));
}

export default async function PreviewAgentDashboard() {
  const now = new Date();
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
      {/*
        NO STAT TILE ROW. It was four stat tiles built from fixtures, and the
        route does not render them: `RealDashboard` is the whole dashboard. A
        proof that shows something the surface does not have proves nothing.
        The tiles went, the component they were built from turned out to have
        no caller anywhere in the product once its own screenshot stopped
        propping it up, and it has since been deleted. This note is what is
        left of it, so nobody reintroduces the row to fill the space.
      */}
      <RealDashboard
        t={t}
        locale={locale}
        displayName={COUNTERPART.name}
        numbers={NUMBERS}
        inspections={{ inspections: [{ ...INSPECTION, state: "REQUESTED", slotAt: null }], openCount: 1, readFailed: false }}
        figure={<DeskFigure rows={figureRows(now)} kind="viewings" t={t} locale={locale} now={now} />}
      />
    </AgentShell>
  );
}
