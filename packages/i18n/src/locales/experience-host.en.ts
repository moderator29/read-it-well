/**
 * THE HOST PAGES' REMAINING WORDS (C5, the route sweep, 6 October 2026).
 *
 * The host pages still spelled these in English, in `title=`, `body=` and as
 * JSX text, where no dictionary could see them. They are the pages' own words,
 * moved here unchanged.
 *
 * WHY NOT `hostWorkspace`. That namespace carries Hausa, Yoruba and Igbo
 * MACHINE DRAFTS (`locales/drafts/<locale>/`, registered in
 * `review-status.ts`), and a registered draft must stay nearly whole. A new
 * English line there would need a machine draft in three languages written
 * on the spot, and an invented translation of a new line is worse than none.
 * So, like the experience-* modules, these are English only: ha, ig and yo
 * fall back to them through `withFallback` until a translator supplies a line.
 */
export const experienceHostEn = {
  tryAgain: "Try again",
  /** The headings of the screens whose page wrote its own. */
  screens: {
    photos: "Photographs",
    tables: "Tables",
    reviews: "Reviews",
    transfer: "Hand over a business",
  },
  photosNone: "{name} has no photographs yet, so its page shows a Vallo plate with a label saying so.",
  tablesNothingWaiting: "Nothing is waiting on you.",
  tablesYourVenue: "Your venue",
  reviews: {
    signedOutTitle: "Your reviews",
    signedOutBody: "Sign in to read what guests wrote about your stays, and to answer them.",
    subtitle: "What guests wrote about their stay",
    none: "No reviews yet",
    notReadyTitle: "Reviews of hotel stays open soon",
    notReadyBody:
      "Guests will be able to review a stay at your hotel after they check out, and you will answer them here. Nothing is needed from you.",
    unavailable: "Your reviews could not be read just now. Refresh to try again.",
    emptyBody: "After a guest checks out they can review their stay. It appears here, and you can answer it in public.",
    ratingLabel: "Your rating",
    /** After the average: "4.6 of 5". */
    ofFive: "of 5",
    /** `{count}` is five or more: the rating is only shown from five reviews. */
    ratingSentence: "From {count} reviews guests can read. A review we hid does not count.",
    barLabel: "Reviews by stars",
    ratingPending: "Your rating shows here once {min} guests have reviewed a stay. Until then each review speaks for itself.",
  },
  /* /host/bookings and its answer sheet (RoomRequestAnswer). The money
     sentences on this screen are not here: they are in lib/money/copy.ts. */
  bookings: {
    title: "Room bookings",
    signedOutTitle: "Your room bookings",
    signedOutBody: "Sign in to see the rooms guests have asked for at your hotel, and to accept or decline them.",
    /** Followed on screen by the payment sentence from lib/money/copy.ts. */
    lede: "Accept a request and the stay agreement is drawn up for you and the guest to confirm.",
    unavailable: "Your room bookings could not be read just now. Nothing has changed. Refresh to try again.",
    emptyTitle: "No room requests yet",
    emptyBody: "When a guest asks for one of your rooms, the request appears here and we tell you straight away.",
    sections: { waiting: "Waiting for you", accepted: "Accepted", past: "Past and closed" },
    status: {
      PENDING: "Waiting for you",
      CONFIRMED: "Accepted",
      CANCELLED: "Cancelled",
      COMPLETED: "Stayed",
      NO_SHOW: "No-show",
    },
    agreement: {
      awaiting_parties: "Agreement waiting for you or the guest to confirm",
      in_review: "Agreement with Vallo for checking",
      approved: "Agreement approved: the guest can pay",
      rejected: "Agreement sent back",
      cancelled: "Agreement cancelled",
      paid: "Paid",
    },
    paid: "Paid",
    openAgreement: "Open the agreement",
    /** "Sat 4 Oct to Mon 6 Oct". */
    dateRange: "{from} to {to}",
    /** After the guest's name, when the stay is for somebody else: "Ada Obi, for Tunde". */
    forSomebody: ", for {name}",
    answer: {
      accept: "Accept",
      decline: "Decline",
      acceptTitle: "Accept {name}'s booking?",
      declineTitle: "Decline {name}'s request?",
      /** "Deluxe double at Marina Court Hotel". */
      roomAt: "{room} at {hotel}",
      guest: "Guest",
      dates: "Dates",
      room: "Room",
      nextAgreement: "The stay agreement is drawn up for you and the guest to confirm.",
      nextChecked: "Vallo checks the agreement.",
      nextNightsBack: "The nights go back on sale at once.",
      told: "{name} is told at once.",
      cancel: "Cancel",
      acceptBooking: "Accept booking",
      keepIt: "Keep it",
      declineRequest: "Decline the request",
      why: "Tell the guest why (optional)",
      failed: "That did not go through.",
    },
  },
};
