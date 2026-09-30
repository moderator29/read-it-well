import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ViewingDayKit } from "@/components/app/inspections/ViewingDayKit";
import { ThreadCard } from "./ThreadCard";
import { INSPECTION, LISTING_ID, RENTAL_CONTEXT } from "../../f5/fixtures";

/**
 * B5: the viewing day kit, from fixtures. The first is a viewing a week
 * away (calendar only); the second is today (calendar, On my way, Running
 * late); the third is the same kit on a thread's confirmed inspection card.
 * The fixture conversation id is not real, so a send here refuses, which is
 * expected: the send path is the thread's own outbox.
 */
export const dynamic = "force-dynamic";

export default async function PreviewDayKit() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.memberKit.dayKit;
  const now = requestTime();
  const inAWeek = new Date(now + 7 * 86_400_000).toISOString();
  const laterToday = new Date(now + 60 * 60_000).toISOString();
  return (
    <main className="nf-page nf-md grid grid-cols-[minmax(0,1fr)] gap-md px-gutter pb-section">
      <h1 className="nf-h2">Viewing day kit (Example)</h1>
      <div className="nf-panel nf-panel--card p-card">
        <p className="nf-section-label mb-xs">A week away</p>
        <ViewingDayKit inspectionId="00000000-0000-4000-8000-00000000d001" slotAt={inAWeek} area="Yaba" place="Yaba, Lagos" conversationId={null} copy={copy} now={now} />
      </div>
      <div className="nf-panel nf-panel--card p-card">
        <p className="nf-section-label mb-xs">Later today</p>
        <ViewingDayKit inspectionId="00000000-0000-4000-8000-00000000d002" slotAt={laterToday} area="Lekki Phase 1" place="Lekki Phase 1, Lagos" conversationId={null} copy={copy} now={now} />
      </div>
      <section>
        <p className="nf-section-label mb-xs">On the thread&apos;s inspection card</p>
        <ThreadCard
          context={RENTAL_CONTEXT}
          inspection={{ ...INSPECTION, slotAt: laterToday }}
          role="guest"
          counterpartName="Michael T."
          listing={{ id: LISTING_ID, title: "Example 2 bedroom apartment", area: "Lekki Phase 1", city: "Lagos" }}
          copy={t.threads}
          locale={locale}
          dayKit={copy}
          conversationId={null}
        />
      </section>
    </main>
  );
}

/** The request's clock, read once. */
function requestTime(): number {
  return Date.now();
}
