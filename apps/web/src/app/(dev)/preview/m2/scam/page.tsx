import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ThreadView, type ThreadBubble } from "@/app/(app)/messages/[id]/ThreadView";
import { PERSON } from "../../_fixtures/people";
import { CONVERSATION_ID, INSPECTION, LISTING_ID, RENTAL_CONTEXT } from "../../f5/fixtures";

/**
 * B12: the scam shield, on the RENTER's side of a rental thread. The fixture
 * messages are invented; the detector and the row are the real ones. The
 * first and last "theirs" messages must stay unshielded.
 */
export const dynamic = "force-dynamic";

const THREAD: ThreadBubble[] = [
  { id: "m1", mine: true, body: "Hello, is the flat still available? Can I see it this week?", timeLabel: "09:10", imageUrl: null },
  { id: "m2", mine: false, body: "Yes it is. Caution is 250k and it is refundable at the end.", timeLabel: "09:14", imageUrl: null },
  { id: "m3", mine: false, body: "The inspection fee is 10k, pay before Saturday so I can book you in.", timeLabel: "09:20", imageUrl: null },
  { id: "m4", mine: true, body: "Is Saturday by 2pm okay?", timeLabel: "09:31", imageUrl: null },
  { id: "m5", mine: false, body: "Send the caution to my personal account to hold it for you before others come.", timeLabel: "09:40", imageUrl: null },
  { id: "m6", mine: false, body: "Saturday by 2pm is fine. See you at the gate.", timeLabel: "09:52", imageUrl: null },
];

export default async function PreviewScamShield() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="flex h-dvh flex-col">
      <ThreadView
        sheetCopy={{ passport: t.trustVisible.passport, unsafe: t.trustVisible.unsafe }}
        live={false}
        conversationId={CONVERSATION_ID}
        meId={PERSON.id}
        counterpartName="Michael T."
        counterpartTier="none"
        listing={{
          id: LISTING_ID,
          title: "Example 2 bedroom apartment",
          area: "Lekki Phase 1",
          city: "Lagos",
          verified: false,
          approved: true,
          hue: 1,
        }}
        inspected={false}
        messages={THREAD}
        context={RENTAL_CONTEXT}
        inspection={INSPECTION}
        role="guest"
        threadCopy={t.threads}
        locale={locale}
        scamCopy={t.memberKit.scam}
      />
    </div>
  );
}
