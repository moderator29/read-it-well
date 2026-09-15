import * as messages from "./messages";
import type { EmailMessage } from "./messages";

/**
 * One representative call for every message this product can send.
 *
 * WHY THIS IS A MODULE AND NOT A CONST IN A TEST FILE. Two test files need the
 * same matrix: `messages.test.ts` checks what each message SAYS, `shell.test.ts`
 * checks what every message IS, structurally, as a piece of email HTML. Two
 * copies of a list like this drift within a month, and the way they drift is
 * always the same: somebody adds a message, adds it to one list, and the new
 * message is the one that ships without a text alternative.
 *
 * It lives in `src` rather than beside the tests because that is where the rest
 * of this module lives and because `covers()` below has to read the catalogue's
 * own source to prove the list is complete. It exports data and no behaviour,
 * so nothing in the application will ever import it.
 *
 * The data is deliberately awkward rather than tidy: long Lagos addresses, an
 * amount carrying kobo, a name with three parts, a party booked for somebody
 * else. Fixtures that are all "Ada" and "1000" prove a template compiles and
 * nothing else.
 */

export type NamedMessage = { name: string; message: EmailMessage };

const LISTING = "Two bedroom flat, Herbert Macaulay Way, Yaba";

export const EVERY_MESSAGE: NamedMessage[] = [
  { name: "welcome:renter", message: messages.welcome({ name: "Ada", role: "renter" }) },
  { name: "welcome:buyer", message: messages.welcome({ name: "Ada", role: "buyer" }) },
  { name: "welcome:landlord", message: messages.welcome({ name: "Ada", role: "landlord" }) },
  { name: "welcome:seller", message: messages.welcome({ name: "Ada", role: "seller" }) },
  { name: "welcome:agent", message: messages.welcome({ name: "Ada", role: "agent" }) },
  { name: "welcome:unstated", message: messages.welcome({}) },
  {
    name: "verificationCode",
    message: messages.verificationCode({ name: "Ada", code: "482 913", expiresInMinutes: 10 }),
  },
  {
    name: "passwordReset",
    message: messages.passwordReset({
      name: "Ada",
      resetUrl: "https://vallo.ng/auth/reset?token=abc",
      expiresInMinutes: 30,
    }),
  },
  {
    name: "walletFunded",
    // Carries kobo, so the receipt has to stay exact to the last kobo.
    message: messages.walletFunded({
      ownerName: "Ada",
      amountMinor: 12_345_678,
      balanceMinor: 98_765_401,
    }),
  },
  {
    name: "withdrawalOutcome:paid",
    message: messages.withdrawalOutcome({
      ownerName: "Ada",
      outcome: "paid",
      amountMinor: 250_000,
      bankName: "GTBank",
      accountLast4: "4417",
      reference: "NF-WDL-9K2M",
      balanceMinor: 1_000_000,
    }),
  },
  {
    name: "withdrawalOutcome:failed",
    message: messages.withdrawalOutcome({ ownerName: "Ada", outcome: "failed", amountMinor: 250_000 }),
  },
  {
    name: "withdrawalOutcome:reversed",
    message: messages.withdrawalOutcome({
      ownerName: "Ada",
      outcome: "reversed",
      amountMinor: 250_000,
    }),
  },
  {
    name: "withdrawalFailed",
    message: messages.withdrawalFailed({ ownerName: "Ada", amountMinor: 250_000 }),
  },
  {
    name: "escrowFunded",
    message: messages.escrowFunded({
      payerName: "Ada",
      listingTitle: LISTING,
      amountMinor: 450_000_000,
      reference: "NF-ESC-77QT",
      releaseCondition: "you confirm you have the keys and the tenancy agreement is signed",
    }),
  },
  {
    name: "escrowReleased:payer",
    message: messages.escrowReleased({
      audience: "payer",
      name: "Ada",
      listingTitle: LISTING,
      amountMinor: 450_000_000,
      reference: "NF-ESC-77QT",
      releasedBecause: "you confirmed you had the keys",
    }),
  },
  {
    name: "escrowReleased:recipient",
    message: messages.escrowReleased({
      audience: "recipient",
      name: "Chidi",
      listingTitle: LISTING,
      amountMinor: 450_000_000,
      reference: "NF-ESC-77QT",
      releasedBecause: "the tenant confirmed they had the keys",
    }),
  },
  {
    name: "inspectionScheduled:viewer",
    message: messages.inspectionScheduled({
      audience: "viewer",
      name: "Ada",
      listingTitle: LISTING,
      address: "12 Herbert Macaulay Way, Yaba, Lagos",
      date: "2026-08-15",
      time: "11:30",
      otherPartyName: "Chidi Okeke",
      otherPartyPhone: "+2348012345678",
    }),
  },
  {
    name: "inspectionScheduled:lister",
    message: messages.inspectionScheduled({
      audience: "lister",
      name: "Chidi",
      listingTitle: LISTING,
      address: "12 Herbert Macaulay Way, Yaba, Lagos",
      date: "2026-08-15",
      time: "11:30",
    }),
  },
  {
    name: "listingApproved",
    message: messages.listingApproved({
      listerName: "Chidi",
      listingTitle: LISTING,
      listingId: "0f1c9b2a-1111-2222-3333-444455556666",
    }),
  },
  {
    name: "listingRejected",
    message: messages.listingRejected({
      listerName: "Chidi",
      listingTitle: LISTING,
      reason: "The photographs are of a different building from the one in the address.",
    }),
  },
  {
    name: "listingRejected:final",
    message: messages.listingRejected({
      listerName: "Chidi",
      listingTitle: LISTING,
      reason: "This address already has a live listing from another lister.",
      canResubmit: false,
    }),
  },
  {
    name: "verificationRungPassed",
    message: messages.verificationRungPassed({
      name: "Chidi",
      rung: "identity",
      nextRung: "address",
    }),
  },
  {
    name: "verificationRungPassed:top",
    message: messages.verificationRungPassed({ name: "Chidi", rung: "inspection" }),
  },
  {
    name: "newEnquiry",
    message: messages.newEnquiry({
      listerName: "Chidi",
      enquirerName: "Adaeze Chinwe Obi",
      listingTitle: LISTING,
      preview: "Good afternoon. Is the service charge yearly, and does it cover the generator?",
      conversationPath: "/messages/abc",
    }),
  },
  {
    name: "bookingRequested",
    message: messages.bookingRequested({
      guestName: "Ada",
      listingTitle: LISTING,
      checkIn: "2026-09-01",
      checkOut: "2026-09-05",
      nights: 4,
      adults: 2,
      children: 1,
      totalMinor: 30_000_000,
    }),
  },
  {
    name: "bookingRequestedHost",
    message: messages.bookingRequestedHost({
      agentName: "Chidi",
      guestName: "Ada",
      listingTitle: LISTING,
      checkIn: "2026-09-01",
      checkOut: "2026-09-05",
      nights: 4,
      totalMinor: 30_000_000,
      arriving: { name: "Nkem Obi", phone: "+2348012345678" },
    }),
  },
  {
    name: "bookingConfirmed",
    message: messages.bookingConfirmed({
      guestName: "Ada",
      listingTitle: LISTING,
      checkIn: "2026-09-01",
      checkOut: "2026-09-05",
      nights: 4,
      totalMinor: 30_000_000,
      access: {
        estateName: "Ocean Breeze Estate",
        gateDirections: "Second gate on the left after the filling station, ask for block C",
        securityPhone: "+2348012345678",
        accessCode: "4471",
      },
    }),
  },
  {
    name: "stayArrivalDetails",
    message: messages.stayArrivalDetails({
      arrivingName: "Nkem",
      bookedByName: "Ada Obi",
      listingTitle: LISTING,
      checkIn: "2026-09-01",
      checkOut: "2026-09-05",
      nights: 4,
      access: { estateName: "Ocean Breeze Estate", accessCode: "4471" },
    }),
  },
  {
    name: "stayArrivalDetails:nogate",
    message: messages.stayArrivalDetails({
      arrivingName: "Nkem",
      listingTitle: LISTING,
      checkIn: "2026-09-01",
      checkOut: "2026-09-05",
      nights: 4,
    }),
  },
  {
    name: "bookingCancelled",
    message: messages.bookingCancelled({
      guestName: "Ada",
      listingTitle: LISTING,
      checkIn: "2026-09-01",
      checkOut: "2026-09-05",
    }),
  },
  {
    name: "bookingRefunded",
    message: messages.bookingRefunded({
      guestName: "Ada",
      listingTitle: LISTING,
      checkIn: "2026-09-01",
      checkOut: "2026-09-04",
      paidMinor: 30_000_000,
      refundMinor: 15_000_000,
      retainedMinor: 15_000_000,
      reasonLine:
        "You cancelled inside 72 hours of check in, so half of what you paid comes back.",
      reference: "NF-RFD-2Q7X",
    }),
  },
  {
    name: "bookingRefunded:nothing",
    message: messages.bookingRefunded({
      guestName: "Ada",
      listingTitle: LISTING,
      checkIn: "2026-09-01",
      checkOut: "2026-09-04",
      paidMinor: 30_000_000,
      refundMinor: 0,
      retainedMinor: 30_000_000,
      reasonLine: "You cancelled on the day of check in, so nothing comes back.",
    }),
  },
  {
    name: "supportTicketFiled",
    message: messages.supportTicketFiled({
      name: "Ada",
      reference: "VAL-SUP-4K2P",
      topic: "wallet",
      body: "My withdrawal has not arrived after two working days.",
    }),
  },
];

/**
 * The names of the builders the matrix above actually exercises.
 *
 * Derived from the fixture keys rather than listed again, so adding a fixture
 * is the only thing anybody has to do. `shell.test.ts` compares this against
 * the catalogue's own exports and fails when a message exists that nothing
 * renders, which is the check that stops an untested email reaching an inbox.
 */
export function coveredBuilders(): Set<string> {
  return new Set(EVERY_MESSAGE.map(({ name }) => name.split(":")[0] ?? name));
}
