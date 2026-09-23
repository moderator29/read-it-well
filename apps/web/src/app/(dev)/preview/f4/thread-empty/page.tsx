import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ThreadView } from "@/app/(app)/messages/[id]/ThreadView";
import { PERSON } from "../../_fixtures/people";
import { CONVERSATION_ID, LISTING_ID, RENTAL_CONTEXT } from "../../f5/fixtures";

/**
 * A conversation nobody has spoken in yet, which is the state EVERY thread on
 * this platform starts in and the one nothing was drawn for (R2-9): the
 * safety strip, a void, then the composer.
 *
 * F5 owns the thread's other faces and their fixtures; this page reuses them
 * rather than inventing a second set, and proves only the zero branch.
 */
export const dynamic = "force-dynamic";

export default async function PreviewEmptyThread() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="flex h-dvh flex-col">
      <ThreadView
        live={false}
        conversationId={CONVERSATION_ID}
        meId={PERSON.id}
        counterpartName="Michael T."
        counterpartTier="none"
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
        messages={[]}
        context={RENTAL_CONTEXT}
        role="guest"
        threadCopy={t.threads}
        locale={locale}
      />
    </div>
  );
}
