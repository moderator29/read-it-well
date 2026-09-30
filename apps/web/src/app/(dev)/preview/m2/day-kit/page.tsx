import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ViewingDayKit } from "@/components/app/inspections/ViewingDayKit";

/**
 * B5: the viewing day kit, from fixtures. The first is a viewing a week
 * away (calendar only); the second is today (calendar, On my way, Running
 * late). The fixture conversation id is not real, so a send here refuses,
 * which is expected: the send path is the thread's own outbox.
 */
export const dynamic = "force-dynamic";

export default async function PreviewDayKit() {
  const locale: Locale = await getLocale();
  const copy = getDictionary(locale).memberKit.dayKit;
  const now = Date.now();
  const inAWeek = new Date(now + 7 * 86_400_000).toISOString();
  const laterToday = new Date(now + 60 * 60_000).toISOString();
  return (
    <main className="nf-page nf-md grid gap-md px-gutter pb-section">
      <h1 className="nf-h2">Viewing day kit (Example)</h1>
      <div className="nf-panel nf-panel--card p-card">
        <p className="nf-section-label">Next week</p>
        <ViewingDayKit inspectionId="00000000-0000-4000-8000-00000000d001" slotAt={inAWeek} area="Yaba" place="Yaba, Lagos" conversationId={null} copy={copy} now={now} />
      </div>
      <div className="nf-panel nf-panel--card p-card">
        <p className="nf-section-label">Today</p>
        <ViewingDayKit inspectionId="00000000-0000-4000-8000-00000000d002" slotAt={laterToday} area="Lekki Phase 1" place="Lekki Phase 1, Lagos" conversationId={null} copy={copy} now={now} />
      </div>
    </main>
  );
}
