import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { HostStandingBody } from "@/app/host/page";
import { emptyHostDraft } from "@/lib/host/onboarding";

/** Where a host stands: one application in progress and one business on record. */
export const dynamic = "force-dynamic";

export default async function PreviewHostLanding() {
  const t = getDictionary(await getLocale());
  return (
    <HostShell logoLabel={t.a11y.logoHome}>
      <HostStandingBody
        businesses={[
          {
            id: "00000000-0000-4000-8000-00000000h001",
            name: "Grand Vista Hotel",
            slug: "grand-vista-hotel",
            kind: "hotel",
            status: "PUBLISHED",
            hostType: "business",
            verificationTier: 3,
            verified: true,
            submittedAt: "2026-05-02T09:00:00.000Z",
            reviewedAt: "2026-05-06T09:00:00.000Z",
            reviewNotes: null,
            createdAt: "2026-05-01T09:00:00.000Z",
          },
          {
            id: "00000000-0000-4000-8000-00000000h002",
            name: "The Harbour Kitchen",
            slug: "the-harbour-kitchen",
            kind: "restaurant",
            status: "MORE_INFO_REQUIRED",
            hostType: "business",
            verificationTier: 1,
            verified: false,
            submittedAt: "2026-06-10T09:00:00.000Z",
            reviewedAt: "2026-06-12T09:00:00.000Z",
            reviewNotes:
              "The hygiene certificate has expired. Send the current one and we will finish the check the same day.",
            createdAt: "2026-06-09T09:00:00.000Z",
          },
        ]}
        draft={{
          ...emptyHostDraft(),
          businessId: "00000000-0000-4000-8000-00000000h003",
          status: "DRAFT",
          hostType: "business",
          kind: "guest_house",
          name: "Ikoyi Guest House",
        }}
      />
    </HostShell>
  );
}
