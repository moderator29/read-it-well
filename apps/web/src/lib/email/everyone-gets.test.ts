import { describe, expect, it } from "vitest";

import {
  agreementSignedPreview,
  bookingAcceptedPreview,
  paymentReceivedPreview,
  pgDayMon,
  pgSlot,
  viewingConfirmedPreview,
} from "./everyone-gets";
import { agreementSubmitted } from "./lifecycle-messages";
import { bookingConfirmed, inspectionScheduled } from "./messages";
import { PREHEADER_MAX, SUBJECT_MAX } from "./render";
import { PUSH_BODY_MAX, PUSH_TITLE_MAX } from "../push/copy";

/**
 * The confirm panel's "What everyone gets" preview must be what is sent. The
 * email half is checked against the real builders; the push half is pinned
 * to the database trigger copy it mirrors, so a migration that changes the
 * words fails here until the mirror follows.
 */

const LISTING = "Two bedroom flat, Herbert Macaulay Way, Yaba";
const STAY = {
  guestName: "Ada Obi",
  listingTitle: LISTING,
  checkIn: "2026-09-01",
  checkOut: "2026-09-05",
  nights: 4,
  totalMinor: 30_000_000,
};

const ALL = [
  ...bookingAcceptedPreview({ ...STAY, arriving: { name: "Nkem Obi", phone: "+2348012345678" } }),
  ...paymentReceivedPreview({ kind: "rent", tenantName: "Tunde", landlordName: "Seyi", listingTitle: LISTING }),
  ...paymentReceivedPreview({ kind: "stay", ...STAY }),
  ...viewingConfirmedPreview({ viewerName: "Ada", listerName: "Chidi", listingTitle: LISTING, slotAt: "2026-10-04T14:00:00Z" }),
  ...viewingConfirmedPreview({ viewerName: "Ada", listerName: "Chidi", listingTitle: LISTING, slotAt: "2026-10-04T14:00:00Z", fromWindow: true }),
  ...agreementSignedPreview({ renterName: "Ada", ownerName: "Chidi", listingTitle: LISTING, amountMinor: 450_000_000, agreementId: "a1" }),
];

describe("what everyone gets", () => {
  it.each(ALL)("$role card keeps every lock-screen limit", (preview) => {
    expect(preview.email || preview.push).toBeTruthy();
    if (preview.email) {
      expect(preview.email.subject.length).toBeLessThanOrEqual(SUBJECT_MAX);
      expect(preview.email.preheader.length).toBeLessThanOrEqual(PREHEADER_MAX);
    }
    if (preview.push) {
      expect(preview.push.title.length).toBeLessThanOrEqual(PUSH_TITLE_MAX);
      expect(preview.push.body.length).toBeLessThanOrEqual(PUSH_BODY_MAX);
    }
    expect(preview.channel).toBe(preview.email && preview.push ? "Email + app" : preview.email ? "Email" : "App");
  });

  it("booking accepted: the guest's email is the real bookingConfirmed", () => {
    const [guest, arriving] = bookingAcceptedPreview({ ...STAY, arriving: { name: "Nkem Obi", phone: "+234" } });
    const real = bookingConfirmed({ ...STAY, arriving: { name: "Nkem Obi", phone: "+234" } });
    expect(guest?.email).toEqual({ subject: real.subject, preheader: real.preheader });
    expect(guest?.push).toEqual({ title: "Booking confirmed", body: `${LISTING} is confirmed for 01 Sep.` });
    expect(arriving?.role).toBe("Arriving guest");
    expect(arriving?.push).toBeNull();
  });

  it("payment received on a tenancy mirrors notify_booking_change", () => {
    const [tenant, landlord] = paymentReceivedPreview({ kind: "rent", tenantName: "Tunde", listingTitle: "Flat" });
    expect(tenant?.push).toEqual({ title: "Rent paid", body: "Flat: the move-in total is paid and recorded to the kobo." });
    expect(landlord?.push).toEqual({ title: "Rent received", body: "Tunde has paid the move-in total for Flat." });
    expect(tenant?.email).toBeNull();
  });

  it("viewing confirmed mirrors notify_inspection_change and sends inspectionScheduled", () => {
    const [viewer, lister] = viewingConfirmedPreview({ viewerName: "Ada", listerName: "Chidi", listingTitle: "Flat", slotAt: "2026-10-04T14:00:00Z" });
    expect(viewer?.push).toEqual({ title: "Inspection confirmed", body: "Flat on Sunday 04 Oct, 15:00. The lister is expecting you." });
    expect(lister?.push).toBeNull();
    const real = inspectionScheduled({ audience: "viewer", name: "Ada", listingTitle: "Flat", address: "Flat", date: "2026-10-04", time: "15:00", otherPartyName: "Chidi", otherPartyPhone: null });
    expect(viewer?.email?.subject).toBe(real.subject);
  });

  it("agreement signed: both parties get agreementSubmitted", () => {
    const [renter] = agreementSignedPreview({ renterName: "Ada", listingTitle: "Flat", amountMinor: 100, agreementId: "a" });
    const real = agreementSubmitted({ name: "Ada", viewer: "renter", listingTitle: "Flat", amountMinor: 100, agreementId: "a" });
    expect(renter?.email).toEqual({ subject: real.subject, preheader: real.preheader });
  });

  it("formats dates the way Postgres to_char does", () => {
    expect(pgDayMon("2026-09-01")).toBe("01 Sep");
    expect(pgSlot("2026-10-04T14:00:00Z")).toBe("Sunday 04 Oct, 15:00");
  });
});
