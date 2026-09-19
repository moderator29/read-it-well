import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { CalendarEditor } from "@/app/agent/listings/[listingId]/calendar/CalendarEditor";
import { AGENT_PROFILE } from "../../f5/ops-fixtures";

/**
 * The listing calendar on the day the listing is made: nothing closed by the
 * host, nothing booked. The real `CalendarEditor`, with `nights` empty, which
 * is the exact shape `getListingCalendar` returns for a new listing.
 */
export const dynamic = "force-dynamic";

const SUBJECT = {
  listingId: "00000000-0000-4000-8000-000000000001",
  title: "Three bedroom terrace, Lekki Phase 1",
  today: "2026-09-19",
};

export default async function PreviewAgentCalendar() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AgentShell t={t} locale={locale} active="/agent/listings" profile={AGENT_PROFILE}>
      <div className="mb-lg">
        <h1 className="nf-h1 mt-2xs">Calendar</h1>
        <p className="mt-2xs text-[var(--nf-content-secondary)]">
          {SUBJECT.title}. Close nights you cannot host, and reopen them
          whenever you like.
        </p>
      </div>
      <CalendarEditor subject={SUBJECT} nights={[]} />
    </AgentShell>
  );
}
