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
};
