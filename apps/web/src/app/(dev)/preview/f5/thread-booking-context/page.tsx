import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ThreadView } from "@/app/(app)/messages/[id]/ThreadView";
import { HOTEL, PERSON } from "../../_fixtures/people";
import { BOOKING_CONTEXT, BOOKING_THREAD, CONVERSATION_ID } from "../fixtures";

/**
 * A STAY THREAD WITH NO CARD IN IT, which is where the context row lives.
 *
 * Where the booking card has been shared into the thread it carries the way
 * into the booking and the banner stands down, exactly as
 * GOVERNING-chat-booking-card.png draws it. Where it has not, the thread used
 * to have no route at all to the hotel, the booking or the trip: the booking
 * face drew a timeline and contained no link, no button and no href. This is
 * that thread, with the context row that answers it.
 */
export const dynamic = "force-dynamic";

export default async function PreviewThreadBookingContext() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="flex h-dvh flex-col">
      <ThreadView
        live={false}
        conversationId={CONVERSATION_ID}
        meId={PERSON.id}
        counterpartName={HOTEL.name}
        counterpartTier="gold"
        counterpartPhone="+2348010000000"
        listing={null}
        inspected={false}
        /* The greeting and the two replies, and no shared card. */
        messages={BOOKING_THREAD.filter((m) => !m.card)}
        context={BOOKING_CONTEXT}
        role="guest"
        threadCopy={t.threads}
        locale={locale}
      />
    </div>
  );
}
