import { getDictionary } from "@vallo/i18n";
import { LandlordQuestion } from "@/app/(site)/landlord/[token]/LandlordQuestion";
import { RentLandlordFactView } from "@/app/(app)/rent/pay/[inspectionId]/RentLandlordFact";
import { OwnerAvailabilityView, PropertyOffersView } from "@/components/app/listing/LandlordFacts";
import { LandlordCardLine } from "@/components/app/listing/LandlordCardLine";
import { MandateConsent } from "@/app/admin/listings/MandateConsent";
import { ownerConfirmedLine } from "@/lib/landlord/facts";
import { PreviewClose } from "./PreviewClose";
import { SafetySharePanel } from "@/app/(site)/s/[token]/SafetySharePanel";
import { AgentLookupCard } from "@/components/app/doors/AgentLookupCard";
import { SafetyShareControl } from "@/components/app/doors/SafetyShareControl";

/**
 * THE LANDLORD LINE, DRAWN WITH FIXTURES. V-31, V-32, V-37, V-48.
 *
 * Every surface of the landlord line is empty against the live database on
 * the day it ships, and correctly so: no mandate carries a consent yet, the
 * line is switched off, and no property has been joined. This is the only
 * place any of it can be seen before that changes: the two questions a
 * landlord answers, the three dated facts a tenant reads, the owner's line
 * and the offers side by side on a listing, the consent control on the
 * mandate desk and the close sheet in the lister's workspace.
 *
 * Fixtures only, and every figure is invented; the harness is closed on
 * Vercel by its own guard.
 */
export default function PreviewLandlord() {
  const t = getDictionary("en");
  const copy = t.landlord;
  const now = Date.parse("2026-09-24T11:00:00Z");

  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">The landlord in the room</h1>

      <h2 className="nf-h3 mt-section">The vacancy question</h2>
      <div className="mx-auto mt-md max-w-xl">
        <LandlordQuestion
          token="preview-token-preview-token-00"
          locale="en"
          copy={copy.reply}
          view={{
            state: "open",
            purpose: "vacancy",
            place: "2 bedroom apartment in Ikeja GRA",
            listerName: "Chidi Okeke",
            askedAt: "2026-09-24T08:00:00Z",
            answeredAt: null,
            answer: null,
            rent: null,
          }}
        />
      </div>

      <h2 className="nf-h3 mt-section">The rent, countersigned</h2>
      <div className="mx-auto mt-md max-w-xl">
        <LandlordQuestion
          token="preview-token-preview-token-01"
          locale="en"
          copy={copy.reply}
          view={{
            state: "open",
            purpose: "rent",
            place: "2 bedroom apartment in Ikeja GRA",
            listerName: "Chidi Okeke",
            askedAt: "2026-09-24T08:00:00Z",
            answeredAt: null,
            answer: null,
            rent: {
              rentMinor: 280_000_000,
              cautionMinor: 56_000_000,
              serviceMinor: 30_000_000,
              agencyMinor: 28_000_000,
              legalMinor: 28_000_000,
              agreementMinor: null,
              totalMinor: 422_000_000,
              totalStated: false,
              currency: "NGN",
              moveIn: "2026-11-01",
            },
          }}
        />
      </div>

      <h2 className="nf-h3 mt-section">On the listing</h2>
      <div className="mx-auto mt-md max-w-xl">
        <OwnerAvailabilityView notReconfirmed={false} line={ownerConfirmedLine(copy.listing, "2026-09-21T09:00:00Z", now)} copy={copy.listing} />
        <OwnerAvailabilityView notReconfirmed line={null} copy={copy.listing} />
        <PropertyOffersView
          locale="en"
          nowMs={now}
          copy={copy.offers}
          listingCopy={copy.listing}
          offers={[
            { listingId: "a", isThisListing: true, title: "Two bed, Ikeja GRA", listingRole: "agent", listerName: "Chidi Okeke", rentMinor: 280_000_000, rentPeriod: "year", moveInMinor: 420_000_000, ownerConfirmedAt: "2026-09-21T09:00:00Z" },
            { listingId: "b", isThisListing: false, title: "Two bed flat", listingRole: "agent", listerName: "Ada Nwosu", rentMinor: 280_000_000, rentPeriod: "year", moveInMinor: 460_000_000, ownerConfirmedAt: "2026-09-21T09:00:00Z" },
            { listingId: "c", isThisListing: false, title: "GRA apartment", listingRole: "firm", listerName: "Acme Properties Ltd", rentMinor: 300_000_000, rentPeriod: "year", moveInMinor: null, ownerConfirmedAt: null },
          ]}
        />
        <PropertyOffersView locale="en" nowMs={now} copy={copy.offers} listingCopy={copy.listing} offers={null} />
      </div>

      <h2 className="nf-h3 mt-section">Under a search card</h2>
      <div className="mx-auto mt-md grid max-w-xl grid-cols-2 gap-sm">
        <LandlordCardLine notReconfirmed={false} confirmed={ownerConfirmedLine(copy.listing, "2026-09-21T09:00:00Z", now)} copy={copy.listing} />
        <LandlordCardLine notReconfirmed confirmed={null} copy={copy.listing} />
      </div>

      <h2 className="nf-h3 mt-section">The tenant, after paying</h2>
      <div className="mx-auto mt-md max-w-xl text-center">
        <RentLandlordFactView
          locale="en"
          copy={copy.rentFact}
          fact={{ state: "confirmed", askedAt: "2026-11-01T09:00:00Z", answeredAt: "2026-11-02T10:00:00Z", firstName: "Adebayo" }}
        />
        <RentLandlordFactView locale="en" copy={copy.rentFact} fact={{ state: "waiting", askedAt: "2026-11-01T09:00:00Z", answeredAt: null, firstName: "Adebayo" }} />
        <RentLandlordFactView
          locale="en"
          copy={copy.rentFact}
          fact={{ state: "disputed", askedAt: "2026-11-01T09:00:00Z", answeredAt: "2026-11-02T10:00:00Z", firstName: "Adebayo" }}
        />
      </div>

      <h2 className="nf-h3 mt-section">The mandate call</h2>
      <div className="mx-auto mt-md grid max-w-xl gap-md">
        <MandateConsent
          mandateId="00000000-0000-4000-8000-000000000001"
          hasNumber
          initial={{ state: "none", line: copy.admin.consentNone }}
          readFailed={false}
          lineOpen={false}
          copy={copy.admin}
        />
        <MandateConsent
          mandateId="00000000-0000-4000-8000-000000000002"
          hasNumber
          initial={{ state: "given", line: copy.admin.consentRecorded.replace("{date}", "24 Sep 2026").replace("{name}", "Ada") }}
          readFailed={false}
          lineOpen={false}
          copy={copy.admin}
        />
      </div>

      <h2 className="nf-h3 mt-section">Closing a rental</h2>
      <PreviewClose copy={copy.close} />

      <h2 className="nf-h3 mt-section">The agent&apos;s own code (V-61)</h2>
      <div className="mx-auto mt-md max-w-xl">
        <AgentLookupCard copy={t.trustDoors.agentCard} code="VA-7K3MP" hint="123" />
      </div>

      <h2 className="nf-h3 mt-section">Going to an inspection alone (V-62)</h2>
      <div className="mx-auto mt-md grid max-w-xl gap-md">
        <SafetyShareControl
          inspectionId="00000000-0000-4000-8000-000000000003"
          title="2 bedroom flat"
          slotAt="2026-09-27T13:00:00Z"
          locale="en"
          copy={t.trustDoors.safetyShare}
          initial="none"
        />
        <div className="nf-panel nf-panel--card">
          <SafetySharePanel
            locale="en"
            copy={t.trustDoors.safetyShare}
            view={{
              state: "live",
              firstName: "Ada",
              area: "Ikoyi",
              agentName: "Chidi Okeke",
              identityCheckedAt: "2026-08-12T10:00:00Z",
              slotAt: "2026-09-24T13:00:00Z",
              expectedBackAt: "2026-09-24T14:00:00Z",
              checkedInAt: null,
              overdue: true,
            }}
          />
        </div>
      </div>
    </main>
  );
}
