/**
 * Session 3's copy for the move-in ledger, bookings, receipts and email surfaces (W9).
 *
 * One module per owner so nine agents can add strings without editing en.ts
 * at the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. Money sentences never live
 * here; they come from `lib/money/copy.ts` (Session 2).
 */
export const experienceMoneyEn = {
  /* The receipt (components/app/money/receipt-model.ts): the words the
     on-screen receipt and the receipt email share, so the two read the same. */
  receipt: {
    kind: "Receipt",
    confirmations: "Confirmations",
    /* Reference 7082's two rows, each shown only once it is a fact. */
    payment: "Payment",
    booking: "Booking",
    confirmed: "Confirmed",
    /* The length of the stay is its own fact, beside Guests. */
    nights: "Nights",
  },
  /* The move-in ledger on its document sheet (reference 7073). */
  ledger: {
    /* The way on from a home that cannot take an inspection request. Said
       about the search, never about the home, so it labels nothing (D24). */
    similar: "See similar homes nearby",
  },
  /* /payments, the page's own words (C9). Every sentence about money on it is
     lib/money/copy.ts's; these are its title, its signed-out door and the
     list's heading. */
  payments: {
    title: "Payments",
    signInTitle: "Sign in to see your payments",
    signIn: "Sign in",
    seeAgreements: "See your agreements",
    listHeading: "Your payments and refunds",
  },
  /* /bookings and /bookings/[id] (reference 7071). */
  bookings: {
    receiptTitle: "Your receipt",
  },
  /* The share split as named rows (/rent/share/[id]). */
  share: {
    yours: "Your share",
    total: "Move-in total",
    due: "Move-in",
  },
  /* The receipt email (lib/email/receipt.ts). */
  email: {
    openReceipt: "Open the receipt",
    footerWhy: "You are receiving this because you paid for a stay on Vallo.",
  },
  /* M2: /agreements as a document register, and /agreements/[id]'s versions,
     confirmations and history (components/app/agreements). Labels and record
     words only; every money sentence on those pages is lib/money/copy.ts. */
  agreements: {
    /** The register row: the version the terms stand at, from the kept snapshots. */
    version: "Version {n}",
    /** Counted through `plural`, so the form is the locale's own. */
    earlier: { one: "{count} earlier version kept", other: "{count} earlier versions kept" },
    updated: "Updated {date}",
    /** The line-by-line change from the version before, on the terms sheet. */
    changedFrom: "What changed from version {n}",
    noLineMoved: "The version moved, but no line reads differently.",
    unkept: "Version {n} was made before Vallo kept every version of an agreement, so this change cannot be shown line by line.",
    versionsTitle: "Every version",
    thisVersion: "This version",
    drawnUp: "Drawn up on {date}",
    drawnUpUndated: "Drawn up",
    changedBy: "Changed by {name} on {date}",
    changedByUndated: "Changed by {name}",
    changedUndated: "The terms were changed",
    notKept: "Made before every version was kept",
    confirmedBy: "{name} confirmed it on {date}",
    neitherConfirmed: "Neither side confirmed this version",
    replacedBy: "Replaced by version {n}",
    historyTitle: "History",
    historyVersion: "Version {n}",
    /* `/agreements`, the register's own words (Round 3 sweep, C3). The
       sentences about payment are lib/money/copy.ts's. */
    listTitle: "Your agreements",
    emptyTitle: "No agreements yet",
    emptyBody: "An agreement is drawn up after an inspection report is submitted, or when a host accepts your stay.",
    /* `/agreements/[id]`, the page's own words (Round 3 sweep, C3). The
       sentences about paying and payment are lib/money/copy.ts's, and the
       Guarantee section's are counsel's, so neither is here. `{n}` a version,
       `{date}` a date, `{renter}` and `{owner}` the two names. */
    page: {
      title: "Agreement",
      liveStatus: "Live status",
      rental: "Rental",
      stay: "Stay",
      progress: "Agreement progress",
      awaitingYou: "Awaiting you",
      since: "Since {date}",
      confirmVersion: "Confirm version {n} of the terms",
      total: "Total",
      readTerms: "Read the terms",
      sentBack: "Vallo sent this back",
      sentBackRent: "Change the terms below and both of you confirm again.",
      sentBackStay: "A stay's terms are its booking, so they cannot be changed here. Message the host about the reason, or cancel this agreement.",
      termsTitle: "The terms (version {n})",
      between: "Between",
      /* The two parties, each by name and role, or by role alone when the
         read has no name for them. Joined by `between`. */
      between2: "{first} and {second}",
      partyRenter: "{name} (renter)",
      partyRenterUnnamed: "The renter",
      partyGuest: "{name} (guest)",
      partyGuestUnnamed: "The guest",
      partyOwner: "{name} (owner or agent)",
      partyOwnerUnnamed: "the owner or agent",
      moveIn: "Move in",
      keys: "Keys handed over",
      stayDates: "{from} to {to}",
      perNight: "Per night",
      cleaning: "Cleaning",
      inspectionFee: "Inspection fee",
      alsoAgreed: "Also agreed",
      youConfirmed: "You confirmed this version.",
      youNotConfirmed: "You have not confirmed this version yet.",
      otherConfirmed: "The other side confirmed it.",
      otherNotConfirmed: "The other side has not confirmed it yet.",
      theTerms: "The terms",
      whatNext: "What happens next",
      confirm: "Confirm",
      withVallo: "With Vallo",
      track: {
        drawn: "Drawn up",
        confirmed: "Both confirmed",
        approved: "Vallo approved",
        paid: "Paid",
        sentBack: "Sent back by Vallo",
        cancelled: "Cancelled",
      },
    },
  },
  /* M2: the tenancy's caution register as a documented exchange
     (components/app/tenancy/CautionRegister.tsx). The sentences about the
     money itself stay in afterTheGate.tenancy, as they were. */
  caution: {
    register: "Caution register",
    deductions: "Deductions",
    returns: "Returns",
    deduction: "Deduction {n}",
    return: "Return {n}",
    actor: {
      lister: "Landlord or agent",
      tenant: "Tenant",
      vallo: "Vallo staff",
    },
    proposed: "Proposed",
    disputed: "Disputed",
    awaitingAnswer: "Not answered yet",
    awaitingRuling: "Waiting for Vallo staff to rule",
    contested: "Says it did not arrive",
    nothingYet: "Nothing has been proposed or returned yet.",
    sameEntries: "The tenant and the landlord or agent see these same entries. A ruling appears here only once Vallo staff make it.",
    photo: "Move-out photo: {item}",
    /** The panel under the sheet holding the reader's own answers. */
    yourAnswer: "Waiting for your answer",
  },
};
