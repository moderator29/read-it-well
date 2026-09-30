import { ConfirmPanel } from "@/components/app/confirm/ConfirmPanel";
import { RoomRequestAnswer } from "@/app/host/bookings/RoomRequestAnswer";
import { bookingAcceptedPreview } from "@/lib/email/everyone-gets";
import { NO_CUSTODY_SENTENCE } from "@/lib/money/copy";
import { Button } from "@/components/ui/Button";

/**
 * The one confirm panel (plan item 22), drawn two ways for the side by side
 * with references 35 and 37: static, as it reads inside a dialog, and live,
 * behind the host's real Accept and Decline on a room request (the sheet
 * opens on tap; the actions refuse in a sandbox with no session). Every
 * name, date and amount is a fixture.
 */
export const dynamic = "force-dynamic";

const SUMMARY = {
  guestName: "Seyi Omojuni",
  room: "Deluxe king",
  hotel: "Grand Vista Hotel",
  dates: "Sat 4 Oct to Mon 6 Oct",
  stay: "2 nights · 2 guests",
  total: "₦240,000",
  listingTitle: "Grand Vista Hotel",
  checkIn: "2026-10-04",
  checkOut: "2026-10-06",
  nights: 2,
  totalMinor: 24_000_000,
};

export default function ConfirmPreview() {
  return (
    <div className="nf-shell grid gap-section py-section">
      <div className="nf-panel nf-panel--card mx-auto w-full max-w-[32rem] p-card">
        <ConfirmPanel
          icon="credit-card"
          title="Pay ₦360,000 to Tunde Adebayo?"
          context="Move-in total for the 2 bedroom flat in Lekki Phase 1"
          summary={[
            { label: "Landlord", value: "Tunde Adebayo" },
            { label: "Place", value: "Lekki Phase 1" },
            { label: "Method", value: "Card" },
          ]}
          lines={[
            { label: "Rent, 12 months", amount: "₦280,000" },
            { label: "Caution deposit", amount: "₦50,000" },
            { label: "Agreement", amount: "₦30,000" },
          ]}
          total={{ label: "Total", amount: "₦360,000" }}
          reassurance={NO_CUSTODY_SENTENCE}
          next={[
            { icon: "credit-card", text: "Your card is charged once." },
            { icon: "file-check", text: "The payment is recorded against the agreement." },
          ]}
          everyone={bookingAcceptedPreview({
            guestName: "Seyi Omojuni",
            listingTitle: "Grand Vista Hotel",
            checkIn: "2026-10-04",
            checkOut: "2026-10-06",
            nights: 2,
            totalMinor: 24_000_000,
          })}
          told="Tunde and Seyi are told at once."
          cancel={<Button variant="secondary">Cancel</Button>}
          primary={<Button variant="primary">Pay ₦360,000</Button>}
        />
      </div>
      <div className="nf-panel nf-panel--card mx-auto w-full max-w-[32rem] p-card" data-testid="confirm-live">
        <p className="font-semibold">Deluxe king · Grand Vista Hotel</p>
        <p className="nf-caption">Sat 4 Oct to Mon 6 Oct · Seyi Omojuni</p>
        <RoomRequestAnswer bookingId="00000000-0000-4000-8000-00000000c001" summary={SUMMARY} />
      </div>
    </div>
  );
}
