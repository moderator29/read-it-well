import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { DetailAboutCard } from "@/components/app/listing/DetailAnatomy";
import { AuthGateProvider } from "@/components/auth/AuthGate";
import { resolveSession } from "@/lib/actions/session";

/**
 * Track F harness: the host row of a hotel and of a restaurant that have no
 * listing row, with the "Message" control that opens `MessageVenue`.
 *
 * Every live business is an example today, so no real venue page draws the
 * control yet. This draws it against one example venue (the action answers
 * with the example refusal, which proves the round trip) and one venue id that
 * does not exist (the not-found refusal).
 */
export default async function TrackFPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  /* The real gate, from the real session: signed out, "Message" asks you to
     sign up exactly as it does on a venue page. */
  const signedIn = (await resolveSession()).state === "signed-in";
  return (
    <AuthGateProvider signedIn={signedIn}>
    <main id="main" className="mx-auto grid max-w-xl gap-block p-gutter">
      <DetailAboutCard
        title="About this stay"
        paragraphs={["A resort on the lagoon. Used here to show the host row of a business-grade hotel."]}
        host={{
          name: "Lagoon Crest Resort",
          role: "Resort",
          verified: false,
          verifiedLabel: t.catalogue.detail.verifiedHost,
          messageHref: null,
          messageVenue: { businessId: "eb000000-0000-4000-8000-000000000003", venueName: "Lagoon Crest Resort" },
          messageLabel: t.catalogue.detail.message,
        }}
      />
      <DetailAboutCard
        title="About this restaurant"
        paragraphs={["A venue id nobody has published, to show the not-found answer."]}
        host={{
          name: "Nowhere Kitchen",
          role: t.stays.restaurantsTitle,
          verified: false,
          verifiedLabel: t.catalogue.detail.verifiedHost,
          messageHref: null,
          messageVenue: { businessId: "00000000-0000-4000-8000-0000000f0f0f", venueName: "Nowhere Kitchen" },
          messageLabel: t.catalogue.detail.message,
        }}
      />
    </main>
    </AuthGateProvider>
  );
}
