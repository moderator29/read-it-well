import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ThreadView } from "@/app/(app)/messages/[id]/ThreadView";
import { HOTEL, PERSON } from "../../_fixtures/people";
import { BOOKING_CONTEXT, BOOKING_THREAD, CONVERSATION_ID } from "../fixtures";

/**
 * The booking card's own half of GOVERNING-chat-booking-card.png.
 *
 * The thread opens on its newest message, exactly as the product does, so at
 * 390x844 the card's photograph and its Confirmed badge sit above the fold on
 * `/preview/f5/thread-booking`. That is the real scroll state and it is not
 * something to fake by shrinking real content. This page is the same
 * component with the same card and the greeting that introduces it, so the
 * top of the card can be read against the render beside it.
 */
export const dynamic = "force-dynamic";

export default async function PreviewThreadBookingCard() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="flex h-dvh flex-col">
      <ThreadView
        live={false}
        conversationId={CONVERSATION_ID}
        meId={PERSON.id}
        counterpartName={HOTEL.name}
        counterpartVerified
        /* The render's call control. Null in a thread where the read withheld
           the number, and then the header simply carries the kebab alone. */
        counterpartPhone="+2348010000000"
        listing={{
          id: HOTEL.id,
          title: HOTEL.name,
          area: HOTEL.area,
          city: HOTEL.city,
          verified: true,
          approved: true,
          hue: 2,
        }}
        inspected={false}
        messages={BOOKING_THREAD.slice(0, 2)}
        context={BOOKING_CONTEXT}
        role="guest"
        threadCopy={t.threads}
        locale={locale}
      />
    </div>
  );
}
