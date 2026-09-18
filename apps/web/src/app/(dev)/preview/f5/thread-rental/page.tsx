import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ThreadView } from "@/app/(app)/messages/[id]/ThreadView";
import { PERSON } from "../../_fixtures/people";
import { CONVERSATION_ID, INSPECTION, LISTING_ID, RENTAL_CONTEXT, RENTAL_THREAD } from "../fixtures";

/**
 * 9E06F51C: the rental thread as the AGENT sees it (role tags on the names,
 * the context card, the photo bundle inside a bubble, the inspection face).
 */
export const dynamic = "force-dynamic";

export default async function PreviewThreadRental() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="flex h-dvh flex-col">
      <ThreadView
        live={false}
        conversationId={CONVERSATION_ID}
        meId={PERSON.id}
        counterpartName="Michael T."
        counterpartVerified={false}
        listing={{
          id: LISTING_ID,
          title: "Luxury 2 bedroom apartment",
          area: "Lekki Phase 1",
          city: "Lagos",
          verified: true,
          approved: true,
          hue: 1,
        }}
        inspected={false}
        messages={RENTAL_THREAD}
        context={RENTAL_CONTEXT}
        inspection={INSPECTION}
        role="host"
        threadCopy={t.threads}
        locale={locale}
      />
    </div>
  );
}
