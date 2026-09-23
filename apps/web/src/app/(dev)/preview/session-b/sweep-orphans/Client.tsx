"use client";

import type { BookingView } from "@/lib/bookings/queries";
import { CancelBookingSheet } from "@/components/app/bookings/CancelBookingSheet";
import { KycFlow } from "@/components/verification/KycFlow";

/*
 * The two views whose real component takes a function prop, which a server
 * page cannot hand across. Both functions do nothing: this is a proof of how
 * the screen is drawn, and the harness never submits anything.
 */
export function CancelSheetFixture({ booking }: { booking: BookingView }) {
  return <CancelBookingSheet booking={booking} onClose={() => {}} />;
}

export function KycFlowFixture() {
  return (
    <KycFlow
      submit={async () => ({ ok: false, message: "This harness does not send anything." })}
    />
  );
}
