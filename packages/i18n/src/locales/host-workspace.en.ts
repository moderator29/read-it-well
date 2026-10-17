/**
 * THE HOST WORKSPACE'S OWN WORDS, MOVED OUT OF THE PAGES (C11, 30 September
 * 2026).
 *
 * These were English literals passed straight into `title=`, `body=`,
 * `label=` and `aria-label=` in `app/host` and `components/host`, where no
 * dictionary and no completeness measure could see them: a Hausa-speaking
 * host in Kano met English across their whole workspace. The words are the
 * pages' own, moved here unchanged; `host-copy.test.ts` keeps them out of the
 * pages.
 */
export const hostWorkspaceEn = {
  loading: "Loading",
  home: {
    signedOutTitle: "Host on Vallo",
    signedOutBody:
      "List a hotel, a guest house, serviced apartments or a restaurant. Sign in and the application saves to your account as you go.",
    startTitle: "Become a host",
    startBody:
      "Ten short steps at most, saved as you go. A person on our team reads it, and the badge only ever means a human was checked.",
  },
  apply: {
    signedOutTitle: "Sign in to become a host",
    signedOutBody:
      "Your application is saved to your account as you go, so it needs one. You will come straight back here.",
    failedTitle: "We could not open your application",
    failedBody:
      "Nothing has been changed and your saved details are still there; we just could not load them this time. Try again in a moment.",
  },
  photos: {
    signedOutTitle: "Photographs of your venue",
    signedOutBody: "Sign in to put your own photographs on your venue's page.",
    noVenueTitle: "No venue yet",
    noVenueBody:
      "Photographs hang on a venue, so there is one thing to do first. An application takes ten short steps at most and saves as you go.",
    venuesLabel: "Your venues",
    saveFirstTitle: "Save the property first",
    saveFirstBody:
      "Photographs hang on the property itself, so the application asks for its name and pin first. Save the property there, and the photographs go up on the same step.",
  },
  reservations: {
    signedOutTitle: "Your tables",
    signedOutBody: "Sign in to see the tables guests have asked for at your venue, and to accept or decline them.",
    failedTitle: "We could not load your tables",
    failedBody:
      "This is on our side, not yours, and nothing has been lost. Try again in a few minutes. Any request a guest has made is still waiting for you.",
    emptyTitle: "No tables yet",
    emptyBody:
      "When somebody asks for a table at your venue it appears here, with their name, party and time on the Lagos clock. It costs nobody anything, and nothing is held until you accept.",
  },
  rooms: {
    signedOutTitle: "Your rooms and your nights",
    signedOutBody: "Sign in to see how many rooms you have on sale and how far ahead guests can book them.",
    noPropertyTitle: "No property yet",
    noPropertyBody:
      "Rooms hang on a property, so there is one thing to do first. An application takes ten short steps at most and saves as you go.",
    saveFirstTitle: "Save the property first",
    saveFirstBody:
      "Rooms and their nights hang on the property itself, so the application asks for its name and pin first. Save the property there, and the rooms follow on the next step.",
    propertiesLabel: "Your properties",
    noRoomTypesTitle: "No room types yet",
    noRoomTypesBody:
      "A room type is a kind of room a guest books, such as a deluxe double. Add at least one, with how many there are and what a night costs, and the property can go on the shelf.",
  },
  settings: {
    signedOutTitle: "Host settings",
    signedOutBody: "Sign in to change what reaches you about your stays and your restaurant.",
    businessesTitle: "Your businesses",
  },
  transfer: {
    signedOutTitle: "Hand over a business",
    signedOutBody: "Sign in to move a business to somebody else, or to answer an offer somebody has made you.",
    offeredTitle: "Offered to you",
    businessesTitle: "Your businesses",
    nothingTitle: "Nothing to hand over",
    nothingBody: "There is no business on this account, so nothing here is standing between you and anything.",
  },
  facilitiesLabel: "What the property offers",
  wizard: {
    hostKindLabel: "What kind of host are you?",
    businessKindLabel: "Kind of business",
    businessName: "Registered business name",
    rcNumber: "RC or BN number",
    tin: "TIN",
    fullName: "Your full name",
    phone: "Your phone",
    bank: "Bank",
    accountNumber: "Account number",
    permissionsLabel: "Permissions",
    /* The wizard's own lines, moved out of `HostWizard` in the language audit (17 October 2026). */
    unsavedTitle: "You have unsaved changes",
    unsavedBody: "What you changed here is not saved yet. Save it before you go, or discard it.",
    saveAndGoBack: "Save and go back",
    saveAndGo: "Save and go",
    discard: "Discard",
    stay: "Stay",
    failed: "That did not go through. Check your connection and try again.",
    resubmitRejected:
      "You can change this application and send it again. It goes back to our team as a resubmission, with the note above beside it.",
    resubmitMore: "Change what they asked for, then send it again from the last step.",
    continue: "Continue",
    savedAsYouGo: "Saved to your application as you go.",
    keptOnDevice: "Kept on this device until the business step saves.",
    exactKind: "What is it, exactly?",
    kinds: {
      agency: "Agency",
      hotel: "Hotel",
      serviced_apartments: "Serviced apartments",
      guest_house: "Guest house",
      resort: "Resort",
      shortlet_operator: "Shortlet operator",
      restaurant: "Restaurant",
    },
    agreed: "You agreed to the Terms of service, the Privacy policy and the Host Agreement.",
    /** `{terms}`, `{privacy}` and `{agreement}` are drawn as links with the words below. */
    agreeText:
      "I agree to the {terms}, the {privacy} and the {agreement}. In short: I only charge guests what is listed on Vallo, with a reason for every charge.",
    termsLink: "Terms of service",
    privacyLink: "Privacy policy",
    agreementLink: "Host Agreement",
    cacTitle: "As the CAC holds it",
    rcHint: "The one on your certificate, like RC 1234567.",
    ifYouHaveOne: "(if you have one)",
    youTitle: "You",
    nameHint: "As it appears on the ID you upload.",
    hygieneTitle: "Health permit",
    hygieneBody: "This venue holds a current Local Government health permit and its food handlers hold current medical certificates.",
    hygieneDone: "Attested and dated on your application.",
    checkFirst: "Check the account with the bank first, then save it.",
    accountSaved: "The account is saved, in the name the bank gave.",
    payoutsTitle: "Where payouts go",
    accountOnRecord: "An account is on record. Add another only if payouts should go somewhere else.",
    confirmFirst: "We confirm the account with the bank before it is saved, and show you the name it holds.",
    loadingBanks: "Loading banks",
    chooseBank: "Choose a bank",
    isThisYou: "Is this you, or your business?",
    checkWithBank: "Check with the bank",
    saveAccount: "Yes, save this account",
    hostTerms: "Host terms",
    privacyPolicy: "Privacy policy",
    yourBusiness: "Your business",
    hostTypeMissing: "Host type not chosen",
    bankOnRecord: "Bank account on record",
    everythingHere: "Everything is here",
    /** `{count}` is a number. */
    stillMissing: "Still missing ({count})",
    teamReads: "A person on our team reads it next. We write to you when it has been read.",
    sendAgain: "Send it again",
    sendForReview: "Send for review",
    notGiven: "Not given",
    edit: "Edit",
    yourApplication: "Your application",
    /** `{name}` is the business, or "Your application". */
    sentTitle: "{name} is with our team",
    sentBody: "A person reads it next. You will hear from us when it has been read, and you can see where it stands on your host page.",
    hostPage: "Your host page",
    review: {
      contact: "Contact",
      address: "Address",
      registration: "Registration",
      representative: "Representative",
      property: "Property",
      service: "Service",
      payouts: "Payouts",
    },
  },
  nights: {
    firstNight: "First night",
    lastNight: "Last night",
    roomsOnSale: "Rooms on sale each night",
  },
  steps: {
    pinLabel: "The pin on the map",
    hotelName: "Hotel name",
    rcNumber: "RC number",
    address: "Address",
    changeAddress: "Change the address",
    starRating: "Star rating",
    roomCount: "Number of rooms",
    roomsUnit: "rooms",
    cancellationPolicy: "Cancellation policy",
    shortletKind: "What kind of shortlet are you listing?",
    placeName: "What you call it",
    bedrooms: "Bedrooms",
    beds: "Beds",
    maxGuests: "Maximum guests",
    nightlyPrice: "Nightly price",
    cancellation: "Cancellation",
    freeCancellation: "Free cancellation",
    mealPlan: "What the night includes",
    restaurantName: "Restaurant name",
    cuisine: "Cuisine",
    priceBand: "Price band",
    roomTypeName: "Name",
    roomTypePlaceholder: "Deluxe double",
    roomKind: "What kind of room",
    roomsOfKind: "rooms of this kind",
    guestsUnit: "guests",
    openingHours: "Opening hours",
    tableInventory: "Table inventory",
    sittingDuration: "Sitting duration",
  },
  /* The doors into the application and the calendar, moved out of the
     pages with the rest (C11 follow-up, 30 September 2026). */
  doors: {
    start: "Start",
    startApplication: "Start an application",
    continueApplication: "Continue the application",
    openApplication: "Open the application",
    checkCalendar: "Check the calendar",
  },
  nothingYet: {
    home: "Nothing listed yet. One application, saved as you go.",
    settings: "Nothing listed yet. Your businesses appear here once you apply.",
  },
  calendar: {
    noPropertyTitle: "No property yet",
    saveFirstTitle: "Save the property first",
    emptyBody: "A calendar hangs on a property and its rooms. Start or finish your application, and the calendar opens here.",
  },
  /**
   * A cancellation policy in plain words (`lib/host/cancellation-presets.ts`),
   * the same lines the host reads in the wizard and the guest reads on the
   * stay page. `{notice}`, `{shorter}` and `{longer}` are counted phrases
   * ("24 hours", "5 days"); `{outcome}` is one of the three refund phrases.
   */
  cancellation: {
    firstTier: "Cancel at least {notice} before check-in: {outcome}.",
    anyTime: "Cancel any time before check-in: {outcome}.",
    between: "Cancel between {shorter} and {longer} before check-in: {outcome}.",
    lessThan: "Cancel less than {notice} before check-in: {outcome}.",
    fullRefund: "a full refund",
    noRefund: "no refund",
    /** `{percent}` is a number ("50"). */
    partRefund: "{percent}% back",
    /** `{time}` is the property's check-in time, as the locale writes it ("14:00"). */
    footAtTime: "Deadlines are counted in Lagos time from check-in at {time}.",
    footNoTime: "Deadlines are counted in Lagos time from the property's check-in time.",
    /* "through our payment provider" came off: a payment held in escrow is
       refunded by the partner holding it, so the line names neither. */
    footRefund: "Refunds are paid in naira to the card or account you paid with.",
    footCaution: "A caution deposit is always returned under the rules listed with it, whatever the policy.",
    noPolicies:
      "This estate publishes no cancellation policies yet, so there is nothing to choose from. A rate cannot be sold without one.",
    pickOne: "Pick one. Guests see its refund rules on your page and before they pay, and a rate cannot be sold without one.",
    /** A restaurant's table rules, as the guest reads them. */
    tableFree: "Asking for a table is free. The restaurant confirms it when a table is free, and you pay the bill at the restaurant.",
    tableCancelNotice: "Please cancel at least {notice} ahead if you cannot come.",
    /** `{minutes}` is a counted phrase ("15 minutes"). */
    tableHeld: "A table is held for {minutes} after the booked time.",
    /** `{duration}` is "2 hours" or "1 hour 30 minutes". */
    tableSitting: "A table is yours for about {duration}.",
    /** Two counted phrases joined, for a sitting that is not whole hours. */
    hoursAndMinutes: "{hours} {minutes}",
  },
  /** What each host screen's loading state says to a screen reader while it waits (D-10). */
  loadingScreens: {
    calendar: "Loading your calendar",
    decide: "Loading the requests waiting for you",
    reviews: "Loading your reviews",
    earnings: "Loading your earnings",
    tables: "Loading your tables",
    rooms: "Loading your rooms",
  },
};
