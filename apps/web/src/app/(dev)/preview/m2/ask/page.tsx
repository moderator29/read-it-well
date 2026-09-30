import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { FirstMessage } from "@/app/(app)/messages/new/FirstMessage";
import { renterQuestions } from "@/lib/enquiry/renter-questions";

/**
 * B6: the first-message screen with the renter's question chips. Two fixture
 * listings: one that states nothing (five chips), one that answers water, the
 * meter and the term (the chips for those are gone). Sending is live and will
 * refuse on these fixture ids, which is expected here.
 */
export const dynamic = "force-dynamic";

export default async function PreviewAsk() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const bare = renterQuestions({ intent: "rent", pricePeriod: "year" }, t.memberKit.questions);
  const answered = renterQuestions(
    {
      intent: "rent",
      pricePeriod: "year",
      minimumTenancyMonths: 12,
      utilities: { waterSupply: "BOREHOLE", prepaidMeter: true, hasEstateAccess: false },
    },
    t.memberKit.questions,
    { viewingSlots: true },
  );
  return (
    <div className="mx-auto grid max-w-2xl gap-lg px-gutter pb-section">
      <PageHeader title="Message the agent" fallback="/preview/m2" />
      <FirstMessage
        listingId="00000000-0000-4000-8000-00000000a001"
        listingTitle="Example 2 bedroom flat, Yaba"
        questions={bare}
        questionsTitle={t.memberKit.questions.title}
      />
      <FirstMessage
        listingId="00000000-0000-4000-8000-00000000a002"
        listingTitle="Example mini flat that states its water, meter and term"
        questions={answered}
        questionsTitle={t.memberKit.questions.title}
      />
    </div>
  );
}
