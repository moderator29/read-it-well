/**
 * THE SIGNED-IN MEMBER FLOWS' OWN WORDS, MOVED OUT OF THE COMPONENTS
 * (language audit, 17 October 2026).
 *
 * Booking a table, reserving a stay, the rental panel: sentences that were
 * written into the components in English, so a Hausa, Yoruba or Igbo reader
 * met them in a language they had not chosen on the screens they use most.
 * The words are the components' own, unchanged except where a line was not
 * true (said beside each).
 *
 * Its own module for the reason `price-check.en.ts` gives: `en.ts` is written
 * by several people at once, and a namespace here costs that file one import
 * and one line. The three translations are MACHINE DRAFTS in
 * `drafts/<locale>/memberFlows.ts`, recorded in `review-status.ts` until a
 * native speaker has read them.
 *
 * Money sentences do not live here; they come from `lib/money/copy.ts`.
 * No em dashes. No claim words without a mechanism behind them.
 */
export const memberFlowsEn = {
  /** Shared day words for the quick-date rails. */
  days: {
    today: "Today",
    tomorrow: "Tomorrow",
  },

  /** Asking a restaurant to hold a table (`ReserveTable`). */
  table: {
    title: "Book a table",
    sentTitle: "Request sent",
    /** `{party}` is a counted phrase ("2 guests"), `{day}` is "Today", "Tomorrow" or "Fri 9", `{time}` is "19:00". */
    sentBody:
      "The restaurant has your request for {party} on {day} at {time}. They will confirm or decline it, and you will see the answer in your bookings.",
    seeBookings: "See your bookings",
    day: "Day",
    time: "Time",
    noTimesLeftToday: "No times left today. Pick another day.",
    closedThatDay: "Not seating on this day. Pick another day.",
    guests: "Guests",
    fewerGuests: "One fewer guest",
    moreGuests: "One more guest",
    /** `{link}` is drawn as a link reading `largerPartyLink`. */
    largerParty: "For a larger party, {link}.",
    largerPartyLink: "message the restaurant",
    largestTable: "That is the largest table that can be held here.",
    note: "Anything they should know",
    notePlaceholder: "A birthday, a wheelchair, an allergy",
    sending: "Sending",
    submit: "Request a table",
    promise: "The restaurant confirms it. Nothing is held until they do.",
  },

  /** What a listing's loading screens announce while they wait. */
  loading: {
    listing: "Loading this place",
    listingTrust: "Loading the checks on this space",
    messages: "Loading your messages",
    conversation: "Loading this conversation",
    newMessage: "Loading a new message",
  },

  /** Reserving a shortlet (`ReservePanel`). */
  stayReserve: {
    perNight: "/ night",
    total: "total",
    instantBook: "Instant Book available",
    checkInRail: "Check in",
    checkInRailLabel: "Check-in date",
    howLong: "How long",
    howLongLabel: "Length of stay",
    lengths: {
      weekend: "Weekend",
      week: "1 week",
      twoWeeks: "2 weeks",
      month: "1 month",
    },
    checkIn: "Check-in",
    checkOut: "Check-out",
    adults: "Adults",
    children: "Children",
    /** The steppers' accessible names. `{what}` is the row's own label ("Adults"). */
    fewer: "Fewer: {what}",
    more: "More: {what}",
    someoneElse: "Someone else is arriving",
    someoneElseBody: "Booking this for a family member or a friend.",
    theirName: "Their full name",
    theirNamePlaceholder: "As it appears on their ID",
    theirPhone: "Their phone number",
    theirPhoneHint: "The estate gate rings this number when they arrive.",
    theirEmail: "Their email address, if you have it",
    optional: "Optional",
    theirEmailHint:
      "We send them the dates and how to get through the gate once the host confirms. Leave it blank and it all comes to you to pass on.",
    showBreakdown: "See per night",
    hideBreakdown: "Hide the breakdown",
    cleaning: "Cleaning",
    serviceCharge: "Service charge",
    totalRow: "Total",
    nothingAdded: "Vallo adds nothing of its own. Every figure here is the host's.",
    signIn: "Sign in",
    reserve: "Reserve",
    message: "Message agent",
    payAfterInspecting: "Pay only after you have inspected the property",
    /* The moment after reserving. The heading follows what is true: held when
       the stay books instantly, requested when the agent confirms it. It said
       "Booking requested" on an instant booking whose next line said the
       dates were held. */
    heldTitle: "Dates held",
    requestedTitle: "Booking requested",
    /** `{from}` and `{to}` are dates. */
    range: "{from} to {to}",
    /** `{name}` is the person arriving. */
    arriving: "{name} is the one arriving. We send them the details the moment the host confirms.",
    heldBody: "Your dates are held. Paying now confirms the stay straight away.",
    requestedBody:
      "The agent will confirm your dates personally. You can pay now to secure them, and we will notify you the moment the agent confirms.",
    /** `{amount}` is drawn as the money figure. */
    pay: "Pay {amount} for this stay",
    payLater: "Pay later, view your bookings",
  },

  /** A rental or a sale (`RentalPanel`). */
  rental: {
    saleTerms: "Agreed with the agent after an inspection.",
    annualTerms: "Annual tenancy, agreed with the agent after an inspection.",
    tenancyTerms: "Tenancy agreed with the agent after an inspection.",
    steps: {
      message: "Message the agent",
      messageDetail: "Ask your questions inside Vallo.",
      inspect: "Inspect the property",
      inspectDetail: "Arrange an inspection before anything is agreed.",
      pay: "Pay through Vallo",
      payDetail: "Only once you have seen the place.",
    },
    message: "Message agent",
    /** The tenancy length stepper (`TenancyTerm`). */
    howLong: "How long",
    shorter: "Shorter tenancy",
    longer: "Longer tenancy",
    /** `{term}` is a counted phrase ("2 years"). */
    rentFor: "Rent for {term}",
    rentOnly: "Rent only, before caution, agency and legal fees. The agent agrees the final terms with you.",
    /** The owner's canonical safety rule, verbatim (`SAFETY_EDUCATION_COPY`, docs/PRODUCT.md section 6). */
    keepInside:
      "For your safety, keep every chat and payment inside Vallo. Deals made outside the platform are not protected by us. Pay only after you have inspected the property.",
  },
};
