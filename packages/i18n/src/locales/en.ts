import type { CountForms, PluralForms } from "../plural";
import { unitsEn as units, type UnitNoun } from "./units";
/* Price Check lives in its own module: `en.ts` is 4,900 lines, many changes
   touch it at once, and this namespace was lost to a concurrent overwrite
   once already. One import and one line is the smallest footprint a
   namespace can have here. */
import { priceCheckEn } from "./price-check.en";
import { reelEn } from "./reel.en";
import { shapeEn } from "./shape.en";
/* The front of the funnel (share door, area pages, store desk, broadcast,
   board): its own module for the same reason. */
import { frontDoorEn } from "./front-door.en";
import { landingRoomsEn } from "./landing-rooms.en";
import { afterTheGateEn } from "./after-the-gate.en";
import { cryptoPayEn } from "./crypto-pay.en";
import { trustVisibleEn } from "./trust-visible.en";
import { landlordEn } from "./landlord.en";
import { trustDoorsEn } from "./trust-doors.en";
import { arrivalCheckEn } from "./arrival-check.en";
/* The platform and the craft (devices, sign-in alert, wallet hold, feedback),
   in its own module for the same reason as Price Check. */
import { platformEn } from "./platform.en";
import { complianceEn } from "./compliance.en";
import { complianceStrEn } from "./compliance-str.en";
import { complianceThresholdEn } from "./compliance-7.en";
import { compliancePepEn } from "./compliance-pep.en";
import { complianceRiskEn } from "./compliance-risk.en";
import { complianceBeneficialOwnershipEn } from "./compliance-17.en";
/* The passcode lock (docs/PASSCODE.md), in its own module like the rest. */
import { passcodeEn } from "./passcode.en";

/**
 * The counted nouns, in every form English uses.
 *
 * Annotated with `CountForms` rather than left to inference on purpose. The
 * `Dictionary` type is `typeof en`, so an inferred shape here would demand a
 * `one` key from Yoruba and Igbo, and neither language has a `one` category:
 * `Intl` would never select it, so three files would carry a key that could not
 * be reached. The annotation makes every category except `other` optional, and
 * each locale fills in the ones CLDR says it actually uses.
 */
const counts: CountForms = {
  nights: { one: "1 night", other: "{count} nights" },
  guests: { one: "1 guest", other: "{count} guests" },
  adults: { one: "1 adult", other: "{count} adults" },
  children: { one: "1 child", other: "{count} children" },
  party: "{adults}, {children}",
};


/**
 * English. The source of truth.
 *
 * Every other locale is typed against this shape, so a missing or misspelled
 * key is a compile error rather than a blank space in production.
 */
export type { UnitNoun };

export const en = {
  counts,
  units: units as Record<UnitNoun, PluralForms>,

  /*
   * The reserve panel on a listing.
   *
   * Only the two sentences that state a count live here so far. The rest of
   * that panel is still written in English in the component, which is a real
   * gap and a larger piece of work than a plural fix: it needs its own pass,
   * including the date formatting, which currently goes through a hardcoded
   * en-GB formatter. These two are here because a sentence that wraps a counted
   * noun cannot be pluralised without also owning the words around it.
   */
  /*
   * The example disclosure and what an example cannot do (UX-09, UI-P2-01).
   * `statement` is the agreed sentence (`EXAMPLE_STATEMENT` in
   * lib/listings/syndication.ts, which a test keeps equal to it).
   */
  examples: {
    statement:
      "This is an example listing. No such property is available. Vallo has not verified anything on this page.",
    stayNotBookable: "Nothing here can be booked or paid for. Search for a real place with a host you can reach.",
    browseStays: "Browse real stays",
    roomsExample: "These rooms are an example of how a stay looks on Vallo. None of them can be booked.",
    restaurantNotBookable: "Nothing here can be booked or held. Search for a real restaurant you can reach.",
    browseRestaurants: "Browse real restaurants",
  },
  /*
   * Paying for a stay (checkout) and for a move-in (rent). The two panels
   * share every sentence that does not name what is being paid for.
   */
  checkout: {
    dates: "Dates",
    guests: "Guests",
    totalToPay: "Total to pay",
    moveInTotal: "Move-in total",
    inFull: "in full",
    takesNothing: "Vallo adds nothing of its own to this total. Every naira goes to the stay.",
    howToPay: "How would you like to pay?",
    savedCardTitle: "Pay with a saved card",
    savedCardBody: "The card you saved, charged straight away. Your card details still never touch Vallo.",
    payWithThisCard: "Pay with this card",
    cardTitle: "Pay by card",
    cardBody: "A secure page in naira, then straight back here. Your card details never touch Vallo.",
    payByCard: "Pay by card",
    cardUnavailable: "Card payment is not available right now.",
    cardUnavailableStayNote:
      "Your dates stay held and nothing has been charged. Try the card again from here, or pay by bank transfer.",
    cardUnavailableRentNote: "Nothing has been charged. Try the card again from here, or pay by bank transfer.",
    addMoney: "Add money",
    onPlatformStay:
      "Money moves inside Vallo, so the stay and the payment stay attached to each other. Keep every conversation and every payment on the platform.",
    onPlatformRent:
      "Money moves inside Vallo, so the tenancy and the payment stay attached to each other. Keep every conversation and every payment on the platform.",
    rentTotalStated: "Move-in total, as stated by the lister",
    rentTotalFromParts: "Move-in total, from the parts the lister stated",
    rentPeriod: { month: "monthly", quarter: "quarterly", year: "yearly" },
    rentTerms:
      "Rent is {period}, moving in from {moveIn}. Vallo charges nothing on this payment; a card processor may show its own charge on the payment page.",
    rentStepOpen:
      "This payment step stays open for 48 hours from when you opened it. If it closes unpaid, open it again from here.",
    holdRunOut: "Hold has run out",
    holdHeld: "Your dates are held",
    holdExpired:
      "These dates are no longer held and somebody else can book them. If the stay is still open, paying now still confirms it. If it has already been released, the payment is refused before anything is charged.",
    holdLeft: "{minutes}m {seconds}s left",
    holdUntil: "Until {time}",
    title: "Checkout",
    step: "Step 2 of 3: review and pay",
    loading: "Loading your booking",
    acceptedNote:
      "The agent has accepted these dates, so the stay is yours. All that is left is paying for it, and your dates are not counting down while you do.",
    completedNote:
      "These dates have already passed and the stay is recorded as taken. Nothing is counting down. The total below is what is still outstanding on it.",
    noShowNote:
      "The agent recorded that this stay was not taken up, so nothing is counting down. If this total is still owed, paying settles it. If that does not match what happened, get help before you pay.",
    recordedOnce:
      "Amounts are naira, recorded to the kobo. A payment is only ever recorded once, however many times a page is reloaded.",
    onlyYourBooking: "You pay only for a booking you have made, and only the total shown here.",
    rentTitle: "Pay the rent",
    pageNotOpened: "The secure payment page could not be opened.",
    notCompleted: "The payment could not be completed.",
    paidFootnote: "Paid inside Vallo, recorded to the kobo.",
    openingPaymentPage: "Opening your payment page",
    slowNothingMoved: "This is taking longer than usual. Nothing has moved yet and nothing has been charged. Stay here.",
    nothingChargedYet: "Nothing has been charged yet.",
    continueToBank: "Continue to your bank",
    payAnotherWay: "Pay another way",
    notHeardBack: "We have not heard back",
    tryAgain: "Try again",
    paymentNotCompleted: "Payment not completed",
    nothingTaken: "Nothing has been taken from your card or your account.",
    getHelp: "Get help",
    paymentSent: "Payment sent",
    seeStays: "See your stays",
    backToStay: "Back to the stay",
    stalledCardStay: "Your card has not been charged. Check your stays before you try again, so you do not pay twice.",
    rentPaid: "Rent paid",
    openThread: "Open the thread",
    backToListing: "Back to the listing",
    preparingPayment: "Preparing your payment",
    stalledCardRent: "Your card has not been charged. Reload this page before you try again, so you do not pay twice.",
    reload: "Reload",
    confirmingPayment: "Confirming your payment",
    returnSlow: "This is taking longer than usual. Your card has not been charged twice and nothing has been lost. Stay here.",
    returnChecking: "Checking with the payment service. This usually takes a few seconds.",
    paymentReceived: "Payment received",
    stayConfirmed: "Your stay is confirmed and the dates are yours.",
    alreadyRecorded: "This payment was already recorded, so your stay is confirmed.",
    stillChecking: "Still checking",
    returnStalled: "We have not heard back from the payment service. Do not pay again. Your stay appears under your stays the moment it settles, and the reference above is what support will trace it by.",
    /* A charge the processor took that has not yet been applied to this
       booking: never "paid", never "not charged". */
    chargedConfirming:
      "Your card was charged and we are applying it to this booking. Do not pay again. If it cannot be applied, the whole amount goes back to your card.",
    paymentNotConfirmed: "Payment not confirmed",
    returnFailed: "Your card has not been charged. If money did leave your account, it returns within 24 hours.",
    cannotReachPayment: "We cannot reach payment right now",
    cannotReachStay: "This is on our side, not yours. Nothing has been charged and your dates are unchanged. Try again in a few minutes.",
    signInToPayStay: "Sign in to pay for this stay",
    signInKeptStay: "Your booking and its dates are kept. Sign in and you land straight back here.",
    signIn: "Sign in",
    bookingNotFound: "We could not find that booking",
    bookingNotFoundBody: "It may have been cancelled, or it belongs to another account. Your stays are all in one place.",
    checkoutDidNotOpen: "Checkout did not open",
    checkoutDidNotOpenBody: "Your booking is unchanged and nothing has been charged. Try again in a few minutes.",
    stayPaidFor: "This stay is paid for",
    bookingCancelled: "This booking was cancelled",
    bookingCancelledBody: "Cancelled stays cannot be paid for. The dates are open again, so search and reserve them afresh if you still want them.",
    stayPaidBody: "{total} has been received and your dates are confirmed.",
    cannotReachRent: "This is on our side, not yours. Nothing has been charged and your inspection is unchanged. Try again in a few minutes.",
    seeInspections: "See your inspections",
    signInToPayRent: "Sign in to pay the rent",
    signInKeptRent: "Your inspection is kept. Sign in and you land straight back here.",
    inspectionNotFound: "We could not find that inspection",
    inspectionNotFoundBody: "It may have been withdrawn, or it belongs to another account. Your inspections are all in one place.",
    rentStepDidNotOpen: "The payment step did not open",
    rentStepDidNotOpenBody: "Nothing has been charged. Try again in a few minutes.",
    yourListing: "This is your listing",
    yourListingBody: "The person who inspected it pays the move-in total here, and you are told the moment it lands.",
    waitingOnLister: "Waiting on the lister",
    waitingOnListerBody: "Nothing can be paid until the lister accepts your inspection. You will be told the moment they do, and this page opens then.",
    noFigure: "There is no figure to pay yet",
    noFigureBody: "This listing does not state a rent and its fees, so there is nothing to charge. Ask the lister in your thread to put the move-in figure on the listing.",
    openMessages: "Open messages",
    rentIsPaid: "The rent is paid",
    cannotHoldRoom: "Vallo cannot hold this room",
    stayNotFound: "We could not find that stay",
    cannotHoldRoomBody: "Rooms at this property are not reserved through Vallo, so nothing has been held and nothing has been charged. Go back to the stay for its rates and the ways to reach the property, or find another stay.",
    stayNotFoundBody: "It may have been taken off the shelf, or the link is incomplete. Nothing has been held and nothing has been charged.",
    cannotTakePayment: "We cannot take this payment right now.",
    paidRent: "The move-in total is paid and recorded to the kobo. Arrange the keys with the agent in your thread.",
    paidStay: "Paid and recorded to the kobo, and these dates are yours.",
    rentSubtitle: "The move-in total, paid inside Vallo",
  },

  /* Confirming an address, by code or by link, and the auth screens' edges. */
  authFlow: {
    /** Track M: the line that comes out of depth as a new account walks
        through the door after verifying. */
    welcomeThrough: "Welcome to Vallo.",
    enterCode: "Enter your code",
    sentTo: "We sent {count} digits to",
    sentToTail: ". Type them here and you are in. No second sign-in.",
    sentNoAddress: "We sent {count} digits to the address you signed up with. Type them here and you are in. No second sign-in.",
    codeLabel: "Confirmation code",
    confirmAndGo: "Confirm and go in",
    sendAnother: "Send me another code",
    sameEmailButton: "The same email carries a button that does this in one tap.",
    alreadyConfirmed: "Already confirmed? Sign in",
    verifyingTitle: "Verifying your email",
    verifyingBody: "One moment. We are confirming your address and opening your account.",
    signingInTitle: "Signing you in",
    signingInBody: "One moment. We are checking it is you and opening your account.",
    noScriptSignUp:
      "This step needs JavaScript to finish. The same email carries a six digit code, and entering it needs nothing but the form.",
    noScriptSignIn:
      "This step needs JavaScript to finish. Signing in with your email address and password needs nothing but the form.",
    enterCodeInstead: "Enter the code instead",
    signInWithYourEmail: "Sign in with your email",
    signInWithEmail: "Sign in with email",
    linkFailedTitle: "We could not confirm that link",
    codeStillWorks: "The same email carries a six digit code, and that one does not expire on opening.",
    providerOff:
      "Vallo signs you in with your email address and password, not with that provider. Nothing was signed in. If your account was made with Google, use Forgot password on the email sign-in screen to set a password.",
    unconfigured:
      "This platform is not holding its email keys yet, so nothing could be confirmed. Nothing is wrong with your account.",
    invalidLink:
      "That link is missing the part that confirms who it belongs to. It may have been cut in half by an email client.",
    expiredLink: "That link has expired or has already been used. Confirmation links are good for one visit.",
    takenGoogleLead: "That address is already signed up, with Google. Use",
    continueWithGoogle: "Continue with Google",
    takenGoogleOn: "on the",
    signInScreen: "sign in screen",
    takenGoogleTail: ", not a password.",
    takenLead: "That address is already signed up.",
    signInInstead: "Sign in instead",
    takenOr: ", or",
    resetPassword: "reset the password",
    takenTail: "if you cannot remember it.",
    errorTitle: "This screen did not load",
    errorBody:
      "Something on our side stopped part way through. Nothing was submitted and no account was created or changed. Trying again usually settles it.",
    tryAgain: "Try again",
    backHome: "Back to the home page",
    reference: "Reference {digest}",
    loading: "Loading",
    notices: {
      "link-expired": "That link has expired or was already used. Sign in below, or ask for a new link.",
      "link-invalid": "That link was incomplete. Sign in below and it will work as normal.",
      unconfigured: "We cannot reach accounts right now. Nothing you typed was lost.",
      "signed-out": "You are signed out. Sign in whenever you are ready.",
      "sign-in-required": "Sign in to open that. It takes a moment, and new accounts are free.",
      "catalogue-paced":
        "You have opened a lot of pages in a few minutes. Sign in to keep browsing, or come back in a few minutes.",
      "passcode-reset": "Sign in with your password, then choose a new passcode.",
      "passcode-locked":
        "Your passcode was entered wrongly too many times, so you were signed out. Sign in, then choose a new passcode.",
    } as Record<string, string>,
    appleUnfinished: "Apple did not finish signing you in. Try again, or use your email address.",
    appleFailed: "Apple sign-in did not finish. You can try again or use your email address.",
    passwordsDiffer: "Passwords do not match.",
  },

  reserve: {
    /** The confirmation moment. Both counts arrive already pluralised. */
    confirmedRange: "{from} to {to}, {nights} for {guests}.",
    capacityNote: "This place takes up to {guests}.",
    /** The sticky bar caption once real dates are picked. */
    totalForNights: "Total for {nights}",
  },

  meta: {
    localeName: "English",
    localeNativeName: "English",
    dir: "ltr",
  },

  /*
   * The three cards on the way in, shown once, straight after a confirmed
   * sign-up. Three sentences about what this place is: what is on it, what it
   * costs, and the one rule that keeps somebody's money safe. That last card
   * is not marketing, it is the messaging trust rule stated before anybody has
   * a chance to break it.
   */
  welcomeCards: {
    /* The intro a stranger meets first (the Slate pass, 29 September): the
       name, one line, a small moving scene and the two doors. Not
       skippable and with no tour door (the founder, 29 September). */
    intro: {
      tagline: "Homes to rent, buy and stay in, from agents a person has checked.",
      chip: "Your move-in total, printed",
      getStarted: "Get started",
      signIn: "Sign in",
      sceneLabel: "A house and its keys, with the move-in total printed on a receipt",
    },
    label: "What Vallo is",
    skip: "Skip",
    /* The same control when the slides were opened from the sign-up form's
       "What Vallo is" link (E2E audit L-5): it returns to the form, and the
       founder wants nothing on the first-run path labelled skip. */
    backToSignUp: "Back to sign up",
    start: "Let me in",
    goTo: "Go to card {n}",
    /* The first-run opener, to its governing render (BUILD_06, F1): the two
       sides of the product and the coin that flips between them. The headline
       is two lines on purpose; the second carries the gradient. */
    twoWorlds: {
      titleA: "Two worlds.",
      titleB: "One platform.",
      body: "Flip between Property and Stays with a single account.",
      property: "Property",
      propertyHint: "Rent, buy and sell",
      stays: "Stays",
      staysHint: "Hotels, shortlets and tables",
      getStarted: "Get Started",
      step: "Step {n} of {total}",
    },
    /* The other three slides of first run and the choice it ends on. Every
       sentence is a statement the product stands behind today: the tick is
       `agent_badges.verified`, which is tier 1 of the ladder in
       `lib/trust/verification.ts` (a member of staff has seen the agent's
       government ID) and says nothing about the property; paying on Vallo is
       advice, not a guarantee; nothing inside the platform is visible signed
       out, so the ending offers an account, not a look around. */
    firstRun: {
      carousel: "Getting started with Vallo",
      slideLive: "Slide {n} of {total}: {title}",
      next: "Next",
      verified: {
        titleA: "Verified means",
        titleB: "a person checked.",
        body: "The tick means someone at Vallo checked the agent's government ID by hand. It is about the person, not the property.",
        left: "Agent",
        right: "ID",
        art: "An agent, an identity card and the verified mark",
      },
      safe: {
        titleA: "Talk first.",
        titleB: "Pay when sure.",
        body: "Message the agent or host and book an inspection first. When you pay, pay on Vallo, never to anybody outside it.",
        left: "Message",
        right: "Pay",
        art: "A conversation, an inspection and an agreement",
      },
      choice: {
        titleA: "Ready when",
        titleB: "you are.",
        body: "An account lets you search, save, message agents and hosts, and book inspections.",
        left: "Search",
        right: "Account",
        art: "Search and an account, with the coin between them",
        create: "Create account",
        signIn: "Sign in",
      },
      member: {
        titleA: "You are in.",
        titleB: "Make it yours.",
        bodyAsk: "One question next, so home opens on the markets you care about.",
        bodyDone: "Home opens on both sides. The coin in the menu turns between them.",
        continue: "Continue",
      },
      worldsArt: "Property and Stays, with the coin that turns between them",
    },
    /*
     * `one` AND `two` WERE HERE AND ARE DELETED, as one unreferenced pair.
     *
     * `one.body` read "Homes to rent, hotels for the weekend, restaurants and
     * experiences. All of Nigeria, all thirty-six states, one search." Two rule
     * 15 faults in one sentence: `experiences` is a `ListingKind` with ZERO
     * rows live (the two `experiences` keys deleted elsewhere in this pass are
     * the same fault), and "all thirty-six states" is a coverage claim the
     * catalogue does not support, on a product whose live rows are Lagos.
     *
     * Nothing renders either card: `FirstRun.tsx` draws `twoWorlds` and `three`
     * and never `one` or `two`. R2 filed it and recommended deletion over
     * rewording, because a first-run card should be written against what the
     * catalogue holds on the day it is written, not patched now against what it
     * held tonight. `two` goes with it as R2 asked, being the other half of an
     * unreferenced pair; it broke no rule, so if a future first run wants it,
     * it is in the history.
     */
    three: {
      title: "Message first, pay when you are sure",
      body:
        "Talk to the host, inspect the place, then pay on the platform. Never send money to anybody outside Vallo.",
    },
  },

  common: {
    search: "Search",
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
    viewAll: "View all",
    seeAll: "See all",
    back: "Back",
    next: "Next",
    continue: "Continue",
    loading: "Loading",
    travelTime: "Travel time",
    perNight: "per night",
    night: "night",
    year: "year",
    reviews: "reviews",
    verified: "Verified",
    skipToContent: "Skip to content",
    /* Shared by every row that has no answer yet: "Not set" appearing three
       different ways down one screen reads as three different states. */
    notSet: "Not set",

    /* -------------------------------------------------- the property card.
       Seven words the card needs and the dictionary did not have, which is why
       "guest", "Instant" and the bed and bath counts were English literals
       inside a component on a four-language platform. Singular and plural are
       separate entries rather than an appended "s": Yoruba, Hausa and Igbo do
       not mark a plural noun that way, so the arithmetic version produced a
       word that exists in no language here. */
    bed: "bed",
    beds: "beds",
    bath: "bath",
    baths: "baths",
    guest: "guest",
    instantBook: "Instant",
    /* A listing with no real price. Never a guessed naira figure and never a
       zero, both of which are worse than saying we do not know. */
    priceOnRequest: "Price on request",
  },

  /*
   * The side switch and the flip. "{side}" is filled with the side's name.
   */
  side: {
    propertyName: "Property",
    staysName: "Stays",
    switchToStays: "Switch to Stays",
    switchToProperty: "Switch to Property",
    /* UX-04: the header names the side the app is on, so a turn is never silent. */
    indicatorPrefix: "You are browsing",
    /* The founder's wording, 23 September: it is "Flip", not "Flip coin".
       The KEY is left as `flipCoin` on purpose. Four locale files change
       together and the standing rule on this
       package is add keys, never restructure; renaming a key is a restructure
       and this change is about the word a person reads. */
    flipCoin: "Flip",
    staysSubShort: "Hotels, shortlets, resorts and more",
    propertySubShort: "Rentals, sales, agents and inspections",
    staysSub: "Hotels, shortlets and restaurants",
    propertySub: "Rentals, sales and agents",
    switching: "Switching to {side}",
    coverStaysLine: "Hotels, apartments, resorts and tables, booked with the account you already have.",
    coverPropertyLine: "Rentals, sales, agents and inspections, on the account you already have.",
    flipped: "Now on {side}",
  },
  /* The Stays side: home, search, restaurants and trips. */
  stays: {
    heroTitle: "Where to next?",
    heroLine: "Hotels, shortlets, serviced apartments and tables, booked with the account you already have.",
    where: "Where",
    wherePlaceholder: "City, area or landmark",
    checkIn: "Check in",
    checkOut: "Check out",
    guests: "Guests",
    search: "Find stays",
    hotels: "Hotels",
    shortlets: "Shortlets",
    serviced: "Serviced",
    resorts: "Resorts",
    guestHouses: "Guest houses",
    restaurants: "Restaurants",
    featured: "Stays people are booking",
    tables: "Tables worth the drive",
    seeAll: "See all",
    resultsTitle: "Stays",
    resultsCount: "{count} places",
    resultsForDates: "{count} places for {nights} nights",
    totalForNights: "Total for {nights} nights",
    perNight: "per night",
    sleeps: "Sleeps {count}",
    shelfEmptyTitle: "No stays listed yet",
    shelfEmptyBody: "Hosts list hotels, shortlets and apartments on Vallo themselves. When they do, they appear here.",
    emptyTitle: "Nothing here for those dates yet",
    emptyBody: "Try another area or widen the dates. New stays are listed by real hosts every week.",
    clearDates: "Clear dates",
    restaurantsTitle: "Restaurants",
    restaurantsLine: "Book a table on Vallo. The restaurant confirms, and the conversation lives inside the reservation.",
    restaurantsEmptyTitle: "No restaurants listed here yet",
    restaurantsEmptyBody: "Restaurants come onto Vallo through their owners. When one near you lists, it appears here.",
    tripsTitle: "Trips",
    tripsLine: "Your stays and reservations, by date.",
    findStay: "Find a stay",
    /* The date spine on /trips. */
    tripsToday: "Today",
    tripsPast: "Past trips",
    tripsNothingAhead: "Nothing ahead right now. Your past trips are below.",
    sortRecommended: "Recommended",
    sortPriceAsc: "Price, low to high",
    sortPriceDesc: "Price, high to low",
    sortRating: "Top rated",
    sortLabel: "Sort",
  },
  nav: {
    /* The two sides. Added 18 September 2026 with the flip; Trips is the
       Stays side's name for its bookings surface. */
    stays: "Stays",
    exploreStays: "Explore stays",
    home: "Home",
    hotels: "Hotels",
    apartments: "Apartments",
    homes: "Homes",
    buy: "Buy",
    shortlets: "Shortlets",
    land: "Land",
    commercial: "Commercial",
    restaurants: "Restaurants",
    /* `experiences` WAS HERE AND IS DELETED, with `home.topExperiences`.
       `experience` is a real `ListingKind` and the live catalogue holds ZERO
       rows of it, so a category name and an "Explore top experiences" rail
       were advertising an empty shelf: rule 15. R2 filed both
       (`docs/design/audits/R2-content-truth-and-carried-items.md` section 1.3)
       and recommended deletion over rewording, because there is nothing
       honest to reword them to and nothing reads either key today.
       `FilterDrawer` is the pattern that stays: it narrows `KIND_ORDER` to
       the kinds actually in the results, so the chip appears when the row
       does. Write these again when there is an experience to name. */
    services: "Services",
    properties: "Properties",
    bookings: "Plans",
    messages: "Messages",
    agreements: "Agreements",
    /*
     * The dock's centre "+" and the sheet it opens (29 September 2026). The
     * workspace switch that button used to be moved into this sheet as its
     * last row, so nothing it did was lost.
     */
    create: {
      trigger: "Create",
      title: "Create",
      list: "List a property",
      listSub: "Rent it out or sell it, with the move-in total on the card",
      post: "Post to the feed",
      postSub: "Say something about a place you know",
      viewing: "Book a viewing",
      viewingSub: "Find a place and choose a time to see it",
      stay: "Create a stay listing",
      staySub: "A room type or a whole place for guests",
      switch: "Switch workspace",
      switchSub: "Personal, or a workspace you hold",
    },
    helpSupport: "Help and support",
    aiAssistant: "AI Assistant",
    profile: "Profile",
    settings: "Settings",
    explore: "Explore",
    saved: "Saved",
    around: "Around",
    feed: "Feed",
    map: "Map",
    primaryLabel: "Primary",
    accountLabel: "Account",
    notifications: "Notifications",
    places: "Places",
    people: "People",
    agentMode: "Agent workspace",
    hostMode: "Host workspace",
    consoleLabel: "Console",
    workspacesLabel: "Workspaces",
    becomeAgent: "Become an agent",
    more: "More",
    search: "Search",
    crypto: "Crypto",
    viewProfile: "View profile",
    menuLabel: "Menu",
  },

  /**
   * The host workspace's navigation: the chip row under the bar, the drawer
   * and the bar's title (`components/host/host-nav-model.ts`). Read on the
   * server by `HostShell` and handed to the two client components as plain
   * strings, so none of it rides in the client copy every screen carries.
   * The rows shared with other workspaces (Account, Help and support,
   * Notifications, Host workspace) come from `nav`.
   */
  hostNav: {
    overview: "Overview",
    reservations: "Reservations",
    rooms: "Rooms and nights",
    photos: "Photographs",
    arrival: "Charges at the door",
    transfer: "Hand over",
    assistant: "Assistant",
    accountSettings: "Account settings",
    application: "Application",
    host: "Host",
    openMenu: "Open the host menu",
    closeMenu: "Close the host menu",
  },

  /**
   * Around: the feed shell.
   *
   * Most of the social layer's words live in `lib/social/*-schema.ts`, beside
   * the database rules they have to agree with, and they stay there. What is
   * here is the shell a person reads before any row loads at all: the switcher
   * above the timeline, the sentence explaining whose timeline it is, and the
   * way through to the place directory. Those are read on arrival, in whatever
   * language somebody chose, so they belong in the dictionary rather than in a
   * server module that only speaks English.
   */
  social: {
    /** The location chip when the profile has no place, or nobody is signed in. */
    locationEverywhere: "Everywhere on Vallo",
    locationLabel: "Where this feed is read from",
    changePlace: "Change where you are",
    yourStory: "Your story",
    feedName: "Vallo feed",
    tabForYou: "For you",
    tabFollowing: "Following",
    tabNew: "New",
    tabsLabel: "Which feed to read",
    feedSettings: "Feed settings",
    filters: "Filters",
    emptyFollowing: "You have not joined a place yet. Pick the ones you know and this becomes your feed.",
    emptyFollowingSignedOut: "Following shows the places you have joined. Sign in and pick a few.",
    emptyNew: "Nothing new has been said in an open place yet.",
    settingsLede: "Where this feed comes from, and what it is allowed to show you.",
    /** The header control that leaves the feed for the directory. */
    manage: "Manage places",
    /** The first chip of the switcher: the combined timeline. */
    allPlaces: "All your places",
    /** The last chip of the switcher, and the way out of an unjoined feed. */
    pickPlaces: "Pick your places",
    switcherLabel: "Which places to read",
    openPlacePage: "Open this place on its own page",
    browsingOpen:
      "You have not joined a place yet, so this is the busiest open places rather than yours. Pick the ones you know and this becomes your feed.",
    browsingOpenSignedOut:
      "This is the busiest open places. Sign in, pick the ones you know, and this becomes your feed.",
    emptyJoined:
      "Nothing has been said in your places yet. What you write will be the first thing anybody arriving reads.",
    emptyAnywhere:
      "Nothing has been said in any open place yet. Nothing is hidden and nothing is missing: Around is this new.",
  },

  /**
   * A person's page, and only its chrome.
   *
   * The words a profile is BUILT from - somebody's name, their bio, the place
   * they set - are theirs and are never translated. What is here is everything
   * the platform says around those: what a control does, what a number means,
   * and what each tab is a list of. Those are read by whoever is looking, in
   * whatever language they chose, so they belong here rather than in a server
   * module that only speaks English.
   *
   * `{handle}`, `{place}` and `{month}` are substituted by the caller. Each
   * sentence carries its own slot so a language can put the number, the name or
   * the date wherever its grammar wants it, rather than having an English word
   * order welded on by concatenation.
   */
  socialProfile: {
    /** The account page's tab pair and the rows under Belongings (`50E032EA`). */
    belongings: "Belongings",
    myBookings: "Plans",
    myBookingsSub: "Viewings, move-ins and stays",
    savedSub: "Homes, hotels and places",
    agreementsSub: "Agreements, payments and claims",
    /*
     * The same four rows, said in one line each.
     *
     * The renders draw four rows and the Switch role capsule on one screen.
     * The subs above wrap at 390, which cost a line per row and pushed the
     * capsule off the bottom. These are the phone's wording; the longer subs
     * stay for the wider layouts that have the room.
     */
    myBookingsRow: "Property and stays bookings",
    savedRow: "Saved properties and places",
    /*
     * The account page itself (`/profile`). Row values carry the
     * figure in `{count}`; the Switch role line names only the roles the
     * account holds, joined by the two patterns below.
     */
    accountPage: {
      upcoming: "{count} upcoming",
      saved: "{count} saved",
      open: "{count} open",
      followers: "Followers",
      following: "Following",
      settings: "Settings",
      switchTitle: "Your workspaces",
      switchNone: "Add a workspace",
      switchTwo: "Change between {a} and {b}",
      switchMany: "Change between {list} or {last}",
      roleUser: "user",
      roleOwner: "owner",
      roleAgent: "agent",
      roleFirm: "firm",
      roleHost: "host",
      roleAdmin: "admin",
      more: "More of your account",
      activity: "Your activity",
      editProfile: "Edit profile",
      editProfileSub: "Your name on Vallo, bio and handle",
      publicPage: "Your public page",
      publicPageSub: "What other people see",
      coverPhoto: "Cover photo",
      coverPhotoSub: "The picture across the top of your page",
      memberSince: "Member since",
      claimHandle: "Claim your handle",
      claimHandleNote:
        "A handle is your address on Vallo. Claim one and this page gets a cover, a public page and somewhere for what you write to live.",
    },
    back: "Back",
    verified: "Verified agent",
    verifiedTitle: "A verified Vallo agent",
    /* The badge beside the name reads MOD, then the place. Short because it
       sits on the same line as a display name at 390px. The full sentence is
       the badge's accessible name, so nothing is lost to the abbreviation. */
    moderatorShort: "MOD",
    moderatorOf: "Looks after {place}",
    pidginWelcome: "Pidgin welcome",
    follow: "Follow",
    followingAction: "Following",
    followAria: "Follow @{handle}",
    unfollowAria: "Following @{handle}. Tap to unfollow.",
    followers: "Followers",
    following: "Following",
    posts: "Posts",
    joined: "Joined {month}",
    editProfile: "Edit profile",
    completedDeals: "Completed deals",
    responseTime: "Response time",
    tabsLabel: "What @{handle} has on their page",
    tabPosts: "Posts",
    tabReplies: "Replies",
    tabMedia: "Media",
    tabActivity: "Activity",
    tabProperties: "Properties",
    tabStories: "Stories",
    tabReviews: "Reviews",
  },

  landing: {
    navHome: "Home",
    /*
     * The true face. The landing rebuilt to the two governing desktop images
     * (docs/DESIGN_DIRECTION.md section 2). Every string the rebuilt sections
     * print lives here so the four locales cannot drift, and every count on
     * the page is read from lib/platform-stats or the catalogue at request
     * time, never from a string in this file.
     */
    face: {
      nav: {
        home: "Home",
        properties: "Properties",
        stays: "Stays",
        ai: "AI",
        more: "More",
        search: "Search",
        signIn: "Sign In",
        getStarted: "Get Started",
        about: "About Vallo",
        help: "Help centre",
        docs: "Docs",
        contact: "Contact",
        careers: "Careers",
      },
      hero: {
        /*
         * THE HEADLINE IS THE FOUNDER'S, WORD FOR WORD, AND IT IS COUPLED TO
         * THE SEARCH CONTROL. DO NOT EDIT EITHER ONE ALONE.
         *
         * `title1` names the same three actions as the segments of the landing
         * search control, and that is not a coincidence to be tidied away:
         * the headline teaches the control and the control proves the
         * headline. The headline reads them rent,
         * buy, stay and the control draws them buy, rent, stay, which is the
         * founder's own wording of each kept as he approved it: the rule is
         * the same three words, never the same sequence. The segments are
         * declared in `components/site/landing/segments.ts`. IF ONE CHANGES,
         * THE OTHER CHANGES IN THE SAME COMMIT, and
         * `components/site/landing/headline-coupling.test.ts` fails the build
         * if they ever drift apart.
         *
         * The line it replaced was "Real Estate / reimagined.", which is the
         * old positioning: it told a first time visitor nothing about what
         * Vallo helps them do. The position now is one sentence. VALLO DOES
         * NOT REMOVE THE AGENT. VALLO REMOVES THE RUNAROUND.
         *
         * NIGERIA, NOT AFRICA, and the word changes when the fact changes.
         *
         * THE SUB-LINE IS ONE LINE (the clean pass, 29 September). It used to
         * run four, naming the lister and dealing with the owner "where there
         * is one"; the hero now says where you can look and the one thing
         * Vallo shows you first, and the owner clause, which is conditional
         * on owner listings existing, is left to the pages that can show one.
         */
        title1: "Rent, buy or stay.",
        title2: "Without the runaround.",
        subtitle:
          "Homes, land and stays across Nigeria, with the real cost up front.",
        explore: "Explore Properties",
      },
      search: {
        label: "Search Vallo",
        placeholder: "Where do you want to go?",
        buy: "Buy",
        rent: "Rent",
        stay: "Stay",
        filters: "Open filters",
        go: "Search",
      },
      card: {
        verified: "Verified",
        save: "Save this place",
        prev: "Previous listing",
        next: "Next listing",
        of: "of",
      },
      stats: {
        overline: "Real people. Real places.",
        title: "Reviewed listings. Named people. Serious property.",
        listings: "Listings",
        agents: "Approved agents",
        cities: "Cities",
        states: "States",
      },
      community: {
        overline: "Real people. Real places.",
        /*
         * The render sets two phrases of this headline in the brand ramp.
         * Double brackets mark them, so a translator marks the phrases that
         * carry the emphasis in their own language and a locale that has not
         * been through this pass simply renders the whole line in white
         * rather than losing its translation to the English fallback.
         */
        /* "A growing community" was the line here and growth is a claim: this
           platform has had no transaction yet, so nothing in the database can
           answer for the word. One account for both sides is a fact about the
           product and says the same thing without asking the reader to take
           anything on trust. */
        /* The clean pass (29 September): "One account" headlined four rooms
           of this page, so each room now has a line of its own. This one is
           about who the platform is for; brackets are no longer used, so
           the heading takes the one section-title style. */
        title: "Built for both sides of the deal.",
        /* THE FIGURES BESIDE THIS LINE CAN BE NONE, AND THE LINE HAS TO READ
           CORRECTLY WHEN THEY ARE. `statTiles` drops any count of zero and
           returns nothing at all when the platform cannot answer, so the band
           prints no figures rather than a nought dressed as a fact. The line
           said "every count on this page" and pointed at an empty space. */
        body: "Renters, buyers and guests on one side. Agents and hosts on the other.",
        thirdParty: "Third party",
        thirdPartyTitle: "Partner inventory, always labelled",
        thirdPartyBody:
          "A stay fulfilled by a partner carries this tag and says who confirms it. It is never dressed as first party.",
      },
      categories: {
        overline: "Explore by category",
        title: "Browse by kind of place.",
        body: "Every tile opens a real search across Nigeria, on the Property side or on Vallo Stays.",
        apartments: "Apartments",
        houses: "Houses",
        shortlets: "Shortlets",
        hotels: "Hotels",
        /* The founder's render names these three and the Stays side really
           serves all three, so they are doors into markets that exist:
           `resort` and `guest_house` are stay types in lib/stays/types.ts,
           and Commercial is the office market the catalogue holds. Villas and
           yearly rentals stood in these slots while the three were thought
           unavailable; both remain reachable from the search filters. */
        resorts: "Resorts",
        guestHouses: "Guest Houses",
        commercial: "Commercial",
        land: "Land",
        count: "{count} listed",
      },
      app: {
        title: "Take Vallo with you.",
        body: "Both sides in your pocket: property to rent or buy, and stays and tables to book.",
        /*
         * The store badges' own wording, which is set by Apple's and Google's
         * guidelines rather than by us: "Download on the / App Store" and
         * "GET IT ON / Google Play", the small line above the large one.
         * The founder's ruling of 19 September: the listings go live shortly
         * and the badges carry the real marks from now.
         */
        ios: "App Store",
        iosSub: "Download on the",
        android: "Google Play",
        androidSub: "GET IT ON",
        rightTitle: "Property and stays, now on mobile.",
        /* The landing's app panel (29 September: the drawn phones are gone).
           The eyebrow over the title, and the install line printed when no
           store badge is live, which is what the FAQ's "Is there an app?"
           answer already says. */
        eyebrow: "On your phone",
        installTitle: "Add it to your home screen",
        installBody: "Open Vallo in your phone's browser and choose Add to Home Screen (on iPhone, from the Share button). No download needed.",
        /* STORE-06 / UI-07: "Full access to all features" and "Secure and
           fast" were claims nothing backs, and they are gone. */
        points: {
          notify: "Notifications for replies, bookings and payments",
          sides: "Property and stays on the same account",
          record: "Messages, agreements and bookings kept on the record",
        },
      },
      footer: {
        legalName: "VALLO SPACES LTD",
        /* The one line on the footer that says what the company is for. It
           sits under VALLO SPACES LTD, which is a legal surface, so it stays
           a sentence about the company rather than a slogan, and it carries
           the position because the foot of the page is where a reader who
           has scrolled the whole thing is still working out what this is. */
        legalLine: "A Nigerian technology company, building a way to rent, buy or stay without the runaround.",
        stayConnected: "Stay connected",
        newsletterBody: "New listings, product news and the occasional honest update.",
        emailLabel: "Email address",
        emailPlaceholder: "Enter your email",
        subscribe: "Subscribe",
        newsletterNote: "Filed with our support desk as a keep-me-posted request. Your address is never sold.",
        subscribed: "Thank you. You are on the list.",
        home: "Home",
        ai: "AI Assistant",
        safety: "Safety",
        standards: "Standards",
        cancellations: "Cancellations",
        buy: "Buy",
        rent: "Rent",
        /* The render's Product column lists Invest. There is no investment
           product, so the slot carries Restaurants, which is shipped at
           /restaurants. Land is still a door on the category grid. */
        restaurants: "Restaurants",
        aboutUs: "About Us",
        helpSupport: "Help & Support",
        termsOfService: "Terms of Service",
        privacyPolicy: "Privacy Policy",
        cookies: "Cookies",
      },
    },
    /*
     * The slogan, deliberately not translated, one form in every locale the
     * way Nike never translates Just Do It.
     *
     * IT IS NOW READ BY EXACTLY ONE SURFACE: the lockup on the auth screens.
     * It used to be read by three. The metadata moved to the approved position
     * on 22 September, and the landing's phone mock moved to a key of its own,
     * because that mock was a picture OF THE APP on the marketing front page
     * and the last place the retired positioning still showed to a visitor.
     * The mock and its key were deleted on 29 September with the phones.
     *
     * WHETHER THE AUTH LOCKUP KEEPS IT IS THE FOUNDER'S CALL AND IT IS IN THE
     * LEDGER. "Real Estate reimagined!" is the OLD positioning line, and this
     * comment used to say so in those words. The new one is "Rent, buy or
     * stay. Without the runaround." A slogan beside a wordmark is a brand
     * decision rather than a copy fix, so it is not changed here as a copy
     * edit; splitting the key is what lets it change in one line when he
     * rules, without dragging the auth screen along by accident.
     */
    slogan: "Real Estate reimagined!",
    /*
     * The property card's own words. Small on purpose: a card is read at a
     * glance and every one of these is one or two words on a 390px grid cell.
     * `market` is the label that finally separates a sale from a tenancy from
     * a stay, which the card could not say at all before it existed.
     */
    card: {
      moveIn: "to move in",
      rent: "Rent",
      noPhotos: "No photographs yet",
      market: { rent: "To rent", sale: "For sale", night: "Per night", head: "Per head" },
    },
    hero: {
      /*
       * SUPERSEDED ON 22 SEPTEMBER, AND ONLY `searchLabel` IS STILL READ.
       *
       * This block is the landing page BEFORE the rebuild to the founder's
       * governing images; the live landing reads `landing.face` above. The
       * one key anything still reads is `searchLabel`, which the signed-in
       * home screen uses (`components/app/home/HomeScreen.tsx`). Every other
       * key here, including the "Real Estate, / reimagined." headline and the
       * "Nigeria's real estate marketplace" overline, is dead copy carrying
       * the OLD POSITIONING and is left rather than deleted only because the
       * three other locales mirror this shape and a namespace removal is a
       * change to all four at once, not a copy edit. IF YOU
       * ARE ABOUT TO COPY A LINE OUT OF HERE, DO NOT. The position is
       * "Rent, buy or stay. Without the runaround." and it lives in
       * `landing.face.hero` above.
       *
       * The historical reasoning is kept below because it explains why the
       * overline, the h1 and the subtitle were split across three jobs.
       *
       * THE SLOGAN IS THE HEADLINE, AND THAT IS THE FOUNDER'S DIRECT CALL.
       *
       * The first rebuild made the h1 the offer ("Rent, buy or sell. The
       * move-in total, printed.") on the argument that a slogan as a headline
       * says nothing. The founder read it and asked for the brand line
       * instead, steered toward "real estate marketplace". So the three jobs
       * are dealt differently now, and nothing is lost: the OVERLINE names
       * what this is (Nigeria's real estate marketplace), the H1 is the brand
       * making its one claim, and the SUBTITLE carries the offer and the
       * proof. The move-in argument still gets a whole band of its own two
       * scrolls down.
       *
       * The h1 stays in English in every locale, like the wordmark; the
       * overline and subtitle translate.
       */
      overline: "Nigeria's real estate marketplace",
      title1: "Real Estate,",
      title2: "reimagined.",
      subtitle:
        "Somewhere for a night, somewhere for the year, a house to buy, a shop to trade from, or the land itself. Nine markets, agents checked by real people, and payments Vallo never holds.",
      searchPlaceholder: "Where do you want to go?",
      searchLabel: "Start exploring",
      popularLabel: "Popular right now",
    },
    /*
     * THE MARKETS, AND WHY THEY ARE BACK ON THE FRONT DOOR.
     *
     * The first rebuild cut the category grid as repetition and built the page
     * around the move-in total. That is a yearly tenancy's concern, so the
     * page ended up describing one market out of nine. A marketplace is
     * defined by its breadth, and breadth has to be stated, not implied.
     */
    markets: {
      overline: "Nine markets, one account",
      title: "Somewhere for a night. Somewhere for a decade. Ground to build on.",
      body: "Vallo carries the whole property market: a hotel room tonight, a flat for the year, a house to buy, a shop to trade from, an office to grow into, and the land itself. Every market is searched the same way and run from the same account.",
      shortlet: "Shortlets",
      hotel: "Hotels",
      apartment: "Apartments",
      rental: "Yearly rent",
      home: "Homes to buy",
      villa: "Villas",
      shop: "Shops",
      office: "Offices",
      land: "Land",
      /* "{count} listed" reads as a fact. A market with nothing in it says so
         in words rather than printing a zero dressed as a figure. */
      count: "{count} listed",
      none: "Nothing listed yet",
    },
    /*
     * The roadmap. The one section describing what does not exist yet, and the
     * component enforces the rules that keeps it honest: future tense, no
     * links, no dates. See the note at the top of NextBand.tsx.
     */
    /*
     * The landing FAQ, which was twelve hardcoded English questions on a page
     * translated into four languages, then five hardcoded English ones.
     *
     * Two of the five also carried the old scope. "Is there a booking fee"
     * and "What happens after I book" are a shortlet's questions, and the
     * platform sells houses, land, shops and offices as well, so a buyer read
     * a page that did not think they existed. They ask about fees and about
     * paying now, which is the same question in every market.
     */
    faq: {
      title: "Questions, answered",
      items: [
        {
          q: "How is my money handled?",
          a: "Payments run in naira through a licensed Nigerian payment provider, and your card details never touch our servers. You are never charged before you confirm.",
        },
        {
          q: "Are there any fees?",
          a: "None from us, in any market. The price on a listing is the price, and on a tenancy the move-in total is printed in full before you commit to anything.",
        },
        {
          q: "Can I list my property?",
          a: "Yes, whatever it is: a room, a flat, a house, a shop, an office or land. Apply from Become an agent in about ten minutes. A person reviews every application by hand, and only approved agents can publish.",
        },
        {
          q: "Which languages does Vallo speak?",
          a: "English, Yorùbá, Hausa and Igbo, switchable at any time, and the assistant answers in all four.",
        },
        {
          q: "What happens after I pay?",
          a: "Your confirmation and the details arrive at once, the conversation with the agent stays in your account, and every payment keeps a reference you can open from the booking.",
        },
      ],
    },
    next: {
      overline: "The road ahead",
      title: "What we are building next",
      body: "Stated as a plan, because that is what it is. Nothing below is available yet, and anything that ships moves out of this list and into the product.",
      items: {
        stablecoin: "Saving in stablecoins, so money set aside for rent holds its value while it waits.",
        chain: "Settlement on chain, so a payment carries its own proof rather than a screenshot of one.",
        instalments: "Paying rent in instalments, for tenancies where the lister agrees to it.",
        more: "More markets, more cities, and the tools agents keep asking us for.",
      },
    },
    /*
     * The three steps. These had no keys of their own: HowItWorks borrowed
     * hero.line1/2/3 as its step titles, so the how-it-works section was
     * whatever the slogan happened to be. Changing the slogan without giving
     * these their own words would have made the product explain itself by
     * saying the slogan three times.
     */
    how: {
      overline: "How it works",
      title: "Three steps, in every market",
      step1: {
        title: "Search",
        body: "Rent, buy, shortlet, land and commercial, in one search, with the full move-in total on every price.",
      },
      step2: {
        title: "Inspect",
        body: "Message the agent inside Vallo, see the place in person, and pay only after you have stood in it.",
      },
      step3: {
        title: "Move in",
        body: "Agreement, payments and messages, kept in one account you can show anyone, for as long as you live there.",
      },
    },
    /*
     * The move-in truth band: the product argument, stated once, plainly.
     * Every competitor leads with the rent and buries the rest. Vallo prints
     * the number somebody actually pays at the door.
     */
    truth: {
      overline: "The honest number",
      title: "The price is never only the price. We print the whole of it.",
      body:
        "A two million naira rent can cost three and a half million at the door once caution, service, agency and legal are added, and a shop or an office is no different. Every Vallo listing carries the whole figure, added up in front of you, before you fall in love with the place.",
      ledgerTitle: "What moving in actually costs",
      statedNote: "Stated by the lister as the whole figure, checked against the parts.",
    },
    /*
     * The standard band: the five answers a Nigerian renter needs that no
     * other platform structures, plus the two promises the product is built
     * on. Power, water and the gate are real columns on every listing.
     */
    standard: {
      overline: "The Vallo standard",
      title: "Questions other platforms leave you to ask, answered on the listing",
      points: {
        power: { title: "The light and the water", body: "Grid band, backup and water supply, stated on a listing rather than discovered after you arrive." },
        water: { title: "What it really costs", body: "Rent, caution, service, agency and legal, added up in front of you before you commit to anything." },
        gate: { title: "Who you are dealing with", body: "A named agent, checked by a person, with the date of the check on the listing." },
        checked: { title: "Checked by a person", body: "The verified tick appears only after a person has checked the agent, by hand, and it shows the date." },
        inside: { title: "Everything inside Vallo", body: "Chat, inspection and payment stay on the platform, so there is a record if anything goes wrong." },
      },
    },
    vision: {
      overline: "Why Vallo exists",
      title: "Renting in Nigeria runs on trust that does not exist yet. We are building it.",
      body: "Fake listings, fees invented at the door, agents nobody checked, rent handed over in cash with no record. Everyone knows the stories because everyone has one. Vallo is the version where the person is real, the price is whole, and the paper trail belongs to you.",
      missionOverline: "The mission",
      missionTitle: "Real estate, with the fear taken out.",
      missionBody: "Every agent checked by hand before they can list. Every price carried to the door. Every conversation, inspection and payment inside one account. That is the whole product, and nothing ships that breaks it.",
      points: {
        verified: { title: "Checked by a person", body: "The verified tick goes on a listing once we have checked the agent behind it, by hand." },
        naira: { title: "Priced in naira", body: "Whole figures, printed in full, never a rate that hides the rest." },
        everywhere: { title: "Built for all 36 states", body: "Every state and local government is in the system, and we open cities as agents arrive in them." },
        assistant: { title: "An assistant that speaks yours", body: "Ask in English, Yorùbá, Hausa or Igbo and get real places back." },
      },
    },
    cta: {
      title: "Your next place is on here",
      subtitle: "Create a free account to see every listing, save the ones that fit, and talk to the person who listed them.",
      action: "Get started free",
      secondary: "Become an agent",
    },
    footer: {
      /* The slogan, not a summary. One form in every locale, per the note on
         `landing.slogan`. */
      /*
       * A DESCRIPTION, NOT THE SLOGAN AGAIN.
       *
       * This key held "Real Estate reimagined!" and so does `landing.slogan`,
       * which the footer prints beside the copyright about 200px below it. The
       * same eight words twice on every page of the site, once as though it
       * were a summary of the company and once as the signature it actually
       * is. The signature stays where a signature belongs. This slot says what
       * Vallo is, which is the thing somebody scrolling to the bottom of a
       * page is usually still trying to work out.
       */
      tagline: "Rent, buy or stay across Nigeria, without the runaround. Homes, land, hotels and shortlets, in one account.",
      rights: "All rights reserved.",
      product: "Product",
      company: "Company",
      support: "Support",
      legal: "Legal",
      about: "About",
      careers: "Careers",
      help: "Help centre",
      contact: "Contact",
      privacy: "Privacy",
      terms: "Terms",
      disclaimer: "Disclaimer",
      /* THE STORE BLOCKER. Google Play requires a publicly reachable page
         explaining how to request account deletion, and a reviewer looks for
         it beside Privacy and Terms rather than hunting for it. `/delete-account`
         has been live and unlinked; this is the line that makes it findable. */
      deleteAccount: "Delete account",
      docs: "Docs",
      /*
       * THE ONLY DOOR INTO THE SUPPLY SIDE ON THIS PAGE, AND IT WAS MARKED
       * FOR THE WRONG PERSON.
       *
       * It read "Become an agent". Most of the supply this platform now wants
       * is landlords who are not agents and never will be, and that label was
       * the defect: the only door was marked
       * for the one visitor who was least likely to be standing at it. The
       * destination already changed under it. `/agents` redirects to
       * `/profile?switch=owner`, which opens the chooser with the owner door
       * first, so the label was also no longer describing where it goes.
       *
       * "List your property" is true for an owner, an agent and a firm, and
       * it says what the person wants to do rather than what they must first
       * agree to become.
       */
      becomeAgent: "List your property",
    },
  },

  /*
   * SAFETY. The namespace for the controls that exist so a person can stop
   * another person reaching them, and for the agreement they accept at sign
   * up. Added for the store rejection sweep; `auth.termsNotice` above is the
   * old passive notice and is left alone, because two authors were editing
   * this file in the same week.
   */
  safety: {
    acceptLabel:
      "I agree to the Terms, the Privacy Policy and the Community Rules, and I understand that abusive content gets an account removed.",
    acceptRead: "Read them:",
    acceptRequired: "Please tick the box to continue. It is how we record what you agreed to.",
    /* STORE-19: the Terms require 18 or over, so sign-up asks, and the
       server refuses an account without the answer. */
    ageLabel: "I am 18 or older.",
    ageRequired: "Vallo is for adults. Tick the box to confirm you are 18 or older.",
    termsLink: "Terms",
    privacyLink: "Privacy Policy",
    rulesLink: "Community Rules",
  },

  auth: {
    welcomeBack: "Welcome back",
    signInToContinue: "Sign in to continue",
    createAccount: "Create your account",
    signUpToStart: "Start discovering in under a minute",
    orContinue: "or continue with",
    continueWithEmail: "Continue with Email",
    continueWithGoogle: "Continue with Google",
    continueWithApple: "Continue with Apple",
    continueWithX: "Continue with X",
    orDivider: "or",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "At least 8 characters",
    /* Sign in only (E2E audit L-3): the length rule belongs to choosing a
       password, not to typing one somebody already has. */
    signInPasswordPlaceholder: "Your password",
    fullNameLabel: "Full name",
    fullNamePlaceholder: "Your name",
    forgotPassword: "Forgot password?",
    noAccount: "Do not have an account?",
    /* The sign-in card's foot line, beside "Sign up": warmer than
       noAccount, and a question the person can answer. */
    newToVallo: "New to Vallo?",
    haveAccount: "Already have an account?",
    termsNotice: "By continuing you agree to our Terms and Privacy Policy.",
    providerUnavailable: "This sign in method is not configured yet.",
    /* B-2: the one step a new Google or Apple account passes before it goes
       in, because it never saw the sign-up form's two ticks. */
    finishTitle: "Finish setting up",
    finishLead: "One last step. Check your name, then agree to the terms and confirm you are 18 or older.",
    finishCta: "Continue to Vallo",
    finishNotYou: "Not you?",
    finishSignOut: "Sign out",
    backToHome: "Back to home",
    otherWays: "Other ways to continue",
    resetTitle: "Reset your password",
    resetLead: "Type the email address on your account and we will send you a link to set a new password.",
    resetSend: "Send the reset link",
    resetSentLead: "Check your inbox.",
    resetNotArrived: "Nothing after a few minutes? Look in spam, and check the address you typed. You can ask again from the sign-in screen.",
    resetExpiredTitle: "That link has expired",
    resetExpiredLead: "A reset link lasts an hour and works once. Ask for a new one and open it on the same device.",
    /* The code fallback for a reset link opened somewhere else: another
       phone, another browser, or a mail app's own browser. The code works
       on any device, where the link only works where it was asked for. */
    resetHaveCode: "Opened the email somewhere else? Type the code from it instead.",
    resetEnterCode: "Enter the code",
    resetCodeTitle: "Enter your reset code",
    resetCodeLead: "Type your email address and the code from the reset email. The code works on any device, once.",
    resetCodeLabel: "Code",
    resetCodeSubmit: "Check the code",
    resetCodeAskAgain: "Ask for a new code",
    newPasswordTitle: "Choose a new password",
    newPasswordLead: "Pick something you have not used here before. You will be signed in as soon as it is saved.",
    currentPasswordLabel: "Current password",
    currentPasswordPlaceholder: "The password you use now",
    newPasswordLabel: "New password",
    newPasswordSave: "Save and sign in",
    confirmPasswordLabel: "Confirm password",
    confirmPasswordPlaceholder: "Repeat your password",
    /* The sign-in card, to its governing render (BUILD_06, F1): the line under
       the greeting, and its sign-up twin. The email-first Continue reuses
       `common.continue`; the rule between the two doors reuses `orDivider`. */
    signInSub: "Sign in to your Vallo account",
    signUpSub: "Create your Vallo account in a minute",
    /* The password step, when the address typed on the chooser is not an
       email-and-password account. Sign-in only. */
    accountUsesGoogle:
      "This address signs in with Google, so there is no password to type. Continue with Google to get in.",
    /* Google sign-in is switched off (STORE-02). A person whose account was
       made with Google still has a way in: a password, set by reset. */
    accountUsesGoogleOff:
      "This address was set up with Google, which Vallo no longer uses to sign in. Type your password below. If you never set one, choose Forgot password and we will email you a link to set it.",
    accountNotFound: "No account uses this address yet.",
    accountCreate: "Create one with it",
    /* The curved top block every auth screen shares (the Slate pass, 29
       September): one line under the wordmark, chosen by the screen. */
    heroSignIn: "Welcome back! Sign in to continue.",
    heroSignUp: "New here? Your account takes a minute.",
    heroVerify: "One code and you are in.",
    heroReset: "Locked out? We will get you back in.",
    /* The round provider buttons carry no words, so these are their names. */
    googleShort: "Google",
    appleShort: "Apple",
    socialLabel: "Or continue with",
    /* The wordmark in the curved block and on the intro: the brand's own
       name, set in spaced capitals, the same in every language. */
    wordmark: "VALLO",
    /* The sign-up options page, after Get started on the intro. */
    optionsTitle: "Create your account",
    optionsLead: "Choose how you want to sign up.",
    signUpWithEmail: "Sign up with email",
    haveAccountCta: "I already have an account",
  },

  /**
   * The sign-up form's own copy.
   *
   * Apart from `auth` because these words belong to one screen and one shape:
   * four headed groups, the counter beside each heading, and the fields inside
   * them. `auth` is read by sign-in, the reset flow and the provider rows too,
   * and a key only the sign-up form can ever reach does not belong in a
   * section three other screens have to read past. The two password keys the
   * form shares with the reset screen stay in `auth`, where they already were.
   *
   * `stepOf` is a template. Keep both placeholders in every translation, and
   * keep their spelling, or a group loses its place in the count.
   */
  signUp: {
    groups: {
      identity: "Who you are",
      credentials: "How you sign in",
      place: "Where you stay, and what you do",
      discovery: "How you found us",
    },
    stepOf: "{current} of {total}",
    optional: "Optional",
    firstNameLabel: "First name",
    /** An example, not a default. Each locale names somebody it would name. */
    firstNamePlaceholder: "Ada",
    surnameLabel: "Surname",
    surnamePlaceholder: "Okafor",
    nicknameLabel: "Nickname",
    nicknamePlaceholder: "What friends call you",
    passwordMismatch: "Passwords do not match.",
    /** The four rungs of the strength meter. Rung 0 shows nothing at all. */
    strength: {
      weak: "Weak",
      fair: "Fair",
      good: "Good",
      strong: "Strong",
    },
    showPassword: "Show password",
    hidePassword: "Hide password",
    placeNote:
      "Your local government decides which places your home screen opens on. Both can be changed later in settings.",
    hearAboutLabel: "Where did you hear about us",
    hearAboutPlaceholder: "Select an option",
    /**
     * The LABELS only.
     *
     * What is stored and what the server validates against is the English
     * value in `lib/auth/signup-options.ts`, which is why these are a separate
     * lookup rather than the option list itself. Translate freely: nothing
     * here reaches the database, and rows written before this existed keep
     * matching.
     */
    hearAbout: {
      instagram: "Instagram",
      tiktok: "TikTok",
      x: "X",
      friendOrFamily: "Friend or family",
      googleSearch: "Google search",
      other: "Other",
    },
    referralLabel: "Referral code",
    referralPlaceholder: "Enter your code",
    /* The form in two steps on one page (the Slate pass). Step one is the
       account (name, email, password), step two is everything else. The
       server still checks every field; these are only the early answers the
       Next button gives before it moves on. */
    stepIndicator: "Step {current} of {total}",
    stepAccount: "Your account",
    stepAbout: "A little about you",
    backToStep: "Back to step 1",
    createAccountCta: "Create account",
    firstNameRequired: "Enter your first name.",
    surnameRequired: "Enter your surname.",
    emailRequired: "Enter your email address.",
    emailInvalid: "That does not look like a valid email.",
    passwordShort: "Use at least 8 characters.",
    confirmRequired: "Re-enter your password.",
  },

  /**
   * The long-list pickers, and the three place fields that mount them.
   *
   * Its own section rather than a corner of `signUp`, because these same three
   * fields are the whole of `/settings/place`. Somebody changing their state a
   * year after joining reads every one of these words and is not signing up,
   * so folding them into the sign-up section would have put the settings
   * screen's copy behind a name that lies about where it is used.
   *
   * `searchIn` carries the chosen state's name and `commonOccupations` is a
   * heading over rows, not a row itself. The occupation and local government
   * NAMES come from the database and are English there; translating them is a
   * data question, not a dictionary one.
   */
  pickers: {
    clear: "Clear",
    close: "Close",
    search: "Search",
    clearSearch: "Clear the search",
    loading: "Loading the list.",
    emptyTitle: "Nothing matches that",
    emptyUnreachable:
      "We could not load the list just now. Close this and try again in a moment.",
    emptySearch: "Try a shorter word, or part of the name.",

    countryLabel: "Country",
    countryName: "Nigeria",
    countryOnly: "The only one, for now",

    stateLabel: "State",
    statePlaceholder: "Choose your state",
    stateSearch: "Search 37 states",

    lgaLabel: "Local government",
    lgaPlaceholder: "Choose your local government",
    lgaLocked: "Choose a state first",
    lgaDisabledHint: "Your state decides which local governments are on this list.",
    searchIn: "Search {place}",

    occupationLabel: "What you do",
    occupationHint:
      "The common ones are at the top, the rest are grouped by field. Prefer not to say is on the list and is a real answer.",
    occupationPlaceholder: "Choose your occupation",
    occupationSearch: "Search 749 occupations",
    commonOccupations: "Common in Nigeria",
  },

  /**
   * What somebody came here for, and the control that changes it from a card.
   *
   * `markets` is every value of `public.property_type` said out loud, in
   * the plural, because a person is choosing a market to be shown rather than
   * one building. It is ONE list: the welcome cards, the settings row and the
   * per-card control all name a market from here, so an enum that grows is
   * translated once and appears everywhere at once.
   *
   * `tune` is the control that sits on a search result. Its sentences are whole
   * sentences with a `{market}` slot rather than fragments assembled in the
   * component, because "moved up" does not attach to a noun the same way in
   * four languages, and a component that concatenates cannot know that.
   *
   * Both the "already" lines exist because the write is idempotent. Saying
   * "moved up" over a list that already held that market would be the screen
   * claiming a save that never happened.
   */
  interests: {
    markets: {
      apartment: "Apartments",
      hotel: "Hotels",
      home: "Homes",
      villa: "Villas",
      shortlet: "Shortlets",
      rental: "Rentals",
      shop: "Shops",
      office: "Offices",
      land: "Land",
      restaurant: "Restaurants",
    },
    tune: {
      open: "Change what comes first",
      title: "What should come first?",
      explain:
        "This only changes the order of results you have not narrowed yourself. Nothing is ever hidden, and any search or filter you set always wins.",
      more: "More like this",
      less: "Not for me",
      close: "Close",
      standingOn: "{market} come first right now.",
      standingOff: "{market} are not ranked ahead right now.",
      movedUp: "{market} moved up.",
      alreadyUp: "{market} already came first, so nothing changed.",
      steppedBack: "{market} will not be ranked ahead.",
      alreadyBack: "{market} were not being ranked ahead, so nothing changed.",
    },
    /* The line under each market name on the nine cards. It exists because
       "rental" and "shortlet" are not the same thing to somebody arriving for
       the first time, and neither is "apartment" versus "home". */
    hints: {
      apartment: "Nightly stays in a flat",
      hotel: "Rooms, booked by the night",
      home: "A whole house for your stay",
      villa: "Larger private places",
      shortlet: "A few nights to a few weeks",
      rental: "Somewhere to live, by the year",
      shop: "Retail space, by the year",
      office: "Workspace, by the year",
      land: "Plots to buy or lease",
      restaurant: "Tables at places to eat",
    },
    /* The screen the cards live on, at the door and in settings. */
    question: "What are you here for?",
    save: "Save what I am here for",
    skip: "Skip",
    savedSomething: "Saved. This is what we will put in front of you first.",
    savedNothing:
      "Saved. You have said nothing in particular, so nothing is ranked ahead of anything else.",
    note:
      "This only changes what we show first. Any search or filter you set yourself always wins.",
    noteFirstRun: " You can change it later in Settings.",
    screenTitle: "What you are here for",
    screenSubtitle: "Choose as many as you like, or none at all",
    accountTitle: "This one belongs to your account",
    accountBodyUnconfigured:
      "We cannot reach accounts right now. What you are here for is kept on your account, so it follows you to every device.",
    accountBodySignedOut:
      "What you are here for is kept on your account, so it follows you to every device and decides what we put in front of you first.",
    /* The settings row that reads the answer back. */
    rowLabel: "What you are looking for",
    rowNothing: "Nothing in particular",
    rowNotAsked: "Not answered yet",
    rowNote:
      "This only decides what we put in front of you first. Any search or filter you set yourself always wins.",
    rowNoteSignedOut:
      "Sign in to keep this with your account, so it follows you to every device.",
  },

  /**
   * The settings screen, end to end.
   *
   * Grouped by the card each string belongs to rather than by kind, because
   * that is how somebody translating reads it: a group's label, its note and
   * its rows are one paragraph of meaning, and splitting them into "labels"
   * and "descriptions" would hand a translator three words with no context.
   *
   * `notify` carries the account-backed switches TWICE, once for a guest and
   * once for a host. It is one preference either way; a host reading "changes
   * to your trips" would reasonably think it meant trips they had booked
   * rather than the guests arriving at their property. Two honest descriptions
   * of one setting, not two settings.
   *
   * `delete.typeToConfirm` carries the phrase in a `{phrase}` slot because
   * `DELETE_CONFIRM_PHRASE` is a constant in the app, not a word to translate,
   * and the sentence around it does not put it in the same place in four
   * languages.
   */
  settings: {
    /**
     * SEC-15: a request by support to move this account to another email
     * address, shown to its owner while it is cooling off, with the one
     * action that matters: stop it.
     */
    addressMove: {
      title: "A request to move your account to another email address",
      body: "Our support team opened a request to move this account to {address}. It completes no earlier than {when}.",
      afterNotice: "72 hours after we email this address about it",
      ifYou: "If you asked for this, there is nothing to do.",
      cancel: "This was not me, cancel it",
      cancelled: "Cancelled. Your account stays at this address.",
    },
    /** SEC-15: the 7-day hold after support moved this account to a new address. */
    moneyHold: {
      title: "Your payout details are locked until {when}",
      body: "Support moved this account to a new email address. For 7 days after that, nobody can add or change a bank or payout account, so nobody who took the account over can redirect where you are paid. Paying by card and receiving payouts to the account already on file work as normal.",
    },
    /** The settings home to `7F96BE6C`: the headline, the profile row, the hub rows. */
    hub: {
      lede: "Manage your account, preferences and payment methods.",
      /* The phone's own line. The full lede wraps to three lines at 390 and
         pushes the first row under the fold, and a stylesheet squeezing a
         sentence to fit is a rule that breaks the day the copy changes, so
         the short line is written rather than tracked. */
      ledeShort: "Your account, preferences and payments.",
      signInRow: "Sign in to Vallo",
      signInRowSub: "Your preferences follow you to every device once you do.",
      accountInfo: "Account Information",
      accountInfoSub: "Name, email, phone number",
      notificationsSub: "Push, email, in-app",
      on: "On",
      off: "Off",
      privacy: "Privacy & Security",
      privacySub: "Password, sign-in and devices",
      appearanceSub: "Text size, motion, data",
      languageSub: "App language",
      help: "Help & Support",
      helpSub: "FAQs, contact us",
      payments: "Payment Methods",
      paymentsSub: "Manage your cards and bank accounts.",
      add: "Add",
      logOut: "Log Out",
      loggingOut: "Signing out",
      verified: "Verified",
      devices: { one: "{count} device", other: "{count} devices" },
    },
      searchPlaceholder: "Search settings",
      searchNoMatchTitle: "Nothing in settings matches that",
      searchNoMatchBody:
        "Try a shorter word, or part of it. Nothing has been changed by searching, and every setting is still here.",
      searchClear: "Show every setting",
    appearance: {
      label: "Appearance",
      note: "Kept on this device. Dark is the designed default.",
      theme: "Theme",
      themeSystem: "System",
      themeLight: "Light",
      themeDark: "Dark",
      textSize: "Text size",
      textSmall: "Small",
      textMedium: "Medium",
      textLarge: "Large",
      reduceMotion: "Reduce motion",
      reduceMotionSub: "Calms entrance animations and hover movement across the app.",
      /* Track M: the motion setting, four levels and three switches. */
      motion: "Motion",
      motionNote: "Kept on this device. If your phone asks for less motion, Vallo always follows it.",
      motionPreview: "Preview",
      motionCinematic: "Cinematic",
      motionCinematicSub: "Everything, deeper and slower. Pages rise into place.",
      motionStandard: "Standard",
      motionStandardSub: "The way Vallo is designed to move.",
      motionCalm: "Calm",
      motionCalmSub: "Short fades only. No splash, no doors, nothing that loops.",
      motionOff: "Off",
      motionOffSub: "Nothing moves. Every screen appears finished.",
      motionSplash: "Opening splash",
      motionSplashSub: "The Vallo mark assembling when the app opens.",
      motionDoors: "Door moments",
      motionDoorsSub: "Walking through after you verify, and the doors closing when you sign out.",
      motionAmbient: "Living backgrounds",
      motionAmbientSub: "The slow light that drifts behind the pages.",
      motionReplay: "Replay the opening",
      motionNeedsMore: "Needs Standard or Cinematic",
      lessData: "Use less data",
      lessDataSub:
        "Stops the app loading a place before you have opened it, and asks for smaller photographs.",
    },

    language: {
      label: "Language",
      appLanguage: "App language",
    },

    /* The three rows that point at /settings/place, and the screen itself. */
    place: {
      label: "Where you are",
      noteSet:
        "This is the city home opens on.",
      noteUnset: "Set these and home opens where you are.",
      noteSignedOut: "Sign in to keep your state and local government with your account.",
      lga: "Local government",
      state: "State",
      occupation: "What you do",
      screenTitle: "Where you are",
      screenSubtitle: "Nigeria, then your state, then your local government",
      accountTitle: "This one belongs to your account",
      accountBodyUnconfigured:
        "We cannot reach accounts right now. Your state, local government and occupation are kept on your account, so they follow you to every device.",
      accountBodySignedOut:
        "Your state, local government and occupation are kept on your account, so they follow you to every device and decide which places home opens on.",
      statesUnavailable:
        "The state list would not load just now. Refresh the page and it should come back. Nothing you had already saved has changed.",
    },

    /* The on-device notification switches, shown before somebody signs in. */
    notifications: {
      label: "Notifications",
      note: "Kept on this device until you sign in, then they follow your account.",
      push: "Push notifications",
      pushSub: "Booking updates and replies, straight to this device.",
      email: "Email",
      emailSub: "Receipts, confirmations and occasional highlights.",
      sms: "SMS",
      smsSub: "Time-critical booking alerts by text message.",
      whatsapp: "WhatsApp",
      whatsappSub: "Booking confirmations and host replies on WhatsApp.",
    },

    privacy: {
      label: "Privacy",
      note: "Kept on this device. Sign in to choose what your page shows.",
      readReceipts: "Read receipts",
      readReceiptsSub: "Let hosts see when you have read their messages.",
      personalised: "Personalised recommendations",
      personalisedSub: "Use your searches and saves to rank places you will like.",
    },

    search: {
      label: "Search",
      note: "Search opens on your default area, and you can always look anywhere. Every price across Vallo is shown in Naira.",
      defaultArea: "Default area",
      allOfNigeria: "All of Nigeria",
      currency: "Currency",
      mapDistances: "Map distances",
      kilometres: "Kilometres",
      miles: "Miles",
    },

    security: {
      label: "Security",
      signedInOn: "Signed in on",
      thisDevice: "This device",
      /* Browser and platform names are proper nouns and stay as they are; only
         the word joining them is language, which is why this is a whole
         sentence with two slots rather than a hard-coded " on ". */
      deviceOn: "{browser} on {os}",
      unknownBrowser: "Browser",
      unknownOs: "this device",
    },

    /*
     * Where you are signed in. SEC-5.
     *
     * The wording here is doing security work, not decoration, and two lines
     * carry most of it.
     *
     * `caveat` is the honest one. Ending a session stops that device asking for
     * a new key and cannot stop the key it already holds, because that key is a
     * signed token nobody looks up. Saying "signed out" flat would tell
     * somebody whose phone is in a thief's hands that they are safe, and they
     * would not go and change the password, which is the step that actually
     * ends the key everywhere.
     *
     * `deviceUnknownSub` is the other. The device column on an older session
     * recorded our own server rather than anybody's phone, and a screen that
     * asks "do you recognise this?" about a row that was never about the reader
     * is worse than one that admits it does not know.
     */
    /* OPS-12: the member's own data, downloaded as JSON from /api/account/export. */
    dataExport: {
      label: "A copy of your data",
      action: "Download your data",
      sub: "Your account, profile, bookings, agreements, messages you sent and more, as one JSON file.",
      note: "It is made when you ask and holds only your own records. Files you uploaded are listed, not included. For anything it leaves out, contact support.",
      signedOut: "Sign in to download the data held on your account.",
    },

    blocked: {
      rowLabel: "Blocked accounts",
      rowNote: "People you blocked cannot message you or see you, and you cannot see them.",
      rowValueNone: "None",
      rowValueOne: "1 blocked",
      rowValueMany: "{count} blocked",
      screenTitle: "Blocked accounts",
      intro:
        "Nobody on this list can message you, and neither of you sees the other anywhere on Vallo. They were not told when you blocked them, and they will not be told if you unblock them.",
      emptyTitle: "You have not blocked anyone",
      emptyBody:
        "If someone makes you uncomfortable, open their profile or your conversation with them and choose Block. They will appear here.",
      unreadable: "Your blocked list could not be loaded just now. Try again in a moment.",
      signedOut: "Sign in to see the people you have blocked.",
      blockedOn: "Blocked {when}",
      unblock: "Unblock",
      unblocking: "Unblocking",
      unblockConfirm: "Unblock {name}? Your block on them will be lifted.",
      unblockFailed: "That did not work. Please try again.",
      someone: "A Vallo member",
      showingSome: "Showing the {shown} most recent of {count}. Unblock some to see the rest.",
    },

    devices: {
      rowLabel: "Devices and sessions",
      rowNote:
        "Your bookings and payout details sit behind this account. Anything signed in that you do not recognise should be ended here, now.",
      rowNoteSignedOut: "Sign in to see where your account is signed in.",
      rowValueOne: "1 signed in",
      rowValueMany: "{count} signed in",
      rowValueUnknown: "Check",

      screenTitle: "Where you are signed in",
      intro:
        "Every device holding a live sign-in to this account. If one of these is not you, end it and change your password straight after.",
      caveat:
        "Ending a session stops that device from getting a new key. The key it is already holding keeps working until it runs out, so there can be a short gap. If a device is in somebody else's hands, change your password as well: that signs every other device out and makes the old password useless.",

      thisDevice: "This device",
      signedInAt: "Signed in {when}",
      whenNow: "just now",
      whenMinutes: "{count} minutes ago",
      whenToday: "today at {time}",
      whenYesterday: "yesterday at {time}",
      lastSeenAt: "Last used {when}",

      deviceUnknown: "Device not recorded",
      deviceUnknownSub:
        "This sign-in is older than the change that started recording which device it came from.",
      deviceUnrecognised: "Unrecognised device",
      unrecordedGroupOne: "1 older sign-in whose device was not recorded",
      unrecordedGroupMany: "{count} older sign-ins whose device was not recorded",
      unrecordedGroupSub:
        "These started before Vallo recorded which device a sign-in came from, so there is nothing to recognise them by. Sign out everywhere else ends all of them.",
      endEverywhere: "Sign out everywhere, this device included",
      endEverywhereSub: "Ends every session on this account, the one you are using now as well. You will need to sign in again here.",

      endThis: "Sign out this device",
      endCurrent: "Sign out of this browser",
      endOthers: "Sign out everywhere else",
      endOthersSub: "Ends every session except this one. You stay signed in on this device.",
      endOthersNone: "Nothing else is signed in, so there is nothing to end.",
      confirm: "Tap again to confirm",
      working: "Ending it",

      endedOne: "That session is over. The device will have to sign in again.",
      endedOthers: "Every other session is over. Only this one is left.",
      endedNone: "There was nothing else signed in. Nothing changed.",

      unreadable:
        "We could not read your sessions just now. This is not a sign that nothing is signed in, so try again before deciding anything.",
      accountTitle: "Sign in to see your devices",
      accountBodySignedOut: "This list belongs to your account, so it needs you signed in.",
      accountBodyUnconfigured:
        "We cannot reach your devices right now. This is on our side, not yours, and nothing about your account has changed.",
    },

    data: {
      label: "Your data",
      clear: "Clear local data",
      clearAgain: "Tap again to confirm",
      clearSub:
        "Removes your profile name, preferences and saved conversations from this device, then reloads.",
    },

    /* The account-backed groups. `saved` is the tick under the card, and it
       says WHERE the answer went, because that is the whole difference between
       these switches and the on-device ones above. */
    account: {
      label: "Account",
      saved: "Saved to your account",
      unconfiguredNote:
        "We cannot reach accounts right now. Everything you set here is kept on this device.",
      signedIn: "Signed in",
      notSignedIn: "Not signed in",
      signedOutSub:
        "Sign in to keep your profile and preferences with your account instead of this device.",
      unconfiguredSub: "Kept on this device for now.",
      activeOnThisDevice: "Active on this device",
      signingOut: "Signing out",
      deleteAccount: "Delete my account",
      deleteAccountSub:
        "Removes your profile, preferences, saved places and message history for good. This cannot be undone.",
    },

    notify: {
      guest: {
        bookings: "Bookings",
        bookingsSub: "Requests, confirmations and changes to your stays.",
        messages: "Messages",
        messagesSub: "New replies from hosts and agents you are talking to.",
        wallet: "Payments and receipts",
        walletSub:
          "Emails when you pay, when a refund is on its way, your receipts, and decisions on your agreements and Guarantee claims. Anything about your money's safety still appears in the app.",
        marketing: "Ideas and offers",
        marketingSub: "Occasional highlights from around Nigeria. Off by default.",
      },
      host: {
        bookings: "Bookings",
        bookingsSub: "New requests, cancellations and payments on your listings.",
        messages: "Messages",
        messagesSub: "New enquiries from guests about your listings.",
        wallet: "Payments and payouts",
        walletSub:
          "Emails when a renter or guest pays you, and when your share settles to your bank. Anything about your money's safety still appears in the app.",
        marketing: "Ideas and offers",
        marketingSub: "Hosting tips and what is moving in your area. Off by default.",
      },
      hideActivity: "Hide my activity",
      hideActivitySub: "Keep your reviews and recent stays off your public profile.",
      dataSaver: "Data saver",
      dataSaverSub: "Load lighter photos on mobile data. Kinder to a small bundle.",
    },

    /* The deletion flow. Slow on purpose, and honest at every step: this is
       the one control in the app that cannot be undone, and F-17 records what
       the old version cost, which was every person who had ever paid for
       anything being told to email support. The copy never overstates what is
       destroyed and never hides what is kept. */
    delete: {
      title: "Delete account",
      close: "Close",

      /* Step one: what actually happens. Two lists, because there are two
         answers and a person deserves both before they type anything. */
      permanentTitle: "What happens when you do this",
      graceTitle: "You have {days} days to change your mind",
      graceBody:
        "Your account is signed out everywhere and deactivated straight away. Nothing is destroyed for {days} days. We email you a code that puts everything back, and it is the only thing that can.",
      destroyedTitle: "Destroyed after {days} days",
      losesProfile: "Your profile, your photograph and your cover picture.",
      losesContent: "Your posts, comments, stories, saved items, interests and drafts.",
      losesDevices: "Every device you are signed in on, and every notification.",
      losesFiles:
        "Every file you have uploaded, including any host documents. If you were approved as an agent, your identification is kept for five years, as the money laundering rules require, and then destroyed.",
      /* The founder's ruling of 19 September: a future event is cancelled with
         notice to everyone attending, never left with a host who has gone.
         Named here so nobody discovers it afterwards, which is the whole
         reason it is not a blocker. */
      losesEvents:
        "Any event you are hosting that has not happened yet is cancelled, and everybody going is told. Events that have already happened stay, with your name removed.",
      keptTitle: "Kept, with your name removed",
      keepsBookings:
        "Bookings, reservations, agreements, payments and payout records. Nigerian anti-money-laundering rules require us to keep transaction records, so these stay on file with your name, email address and telephone number removed.",
      keepsMessages:
        "Messages you have sent stay in the other person's conversation with an anonymous sender, so their side of the thread still reads.",
      keepsReviews: "Reviews you have written stay on the property, with no author name.",
      talkFirst:
        "If something has gone wrong, talk to us first. Most things can be fixed without losing your history.",
      keep: "Keep my account",

      /* Step two: prove it is you, then type the phrase. */
      confirmTitle: "Confirm it is you",
      passwordLabel: "Your password",
      passwordHint: "The password you sign in with.",
      codeLabel: "The code we emailed you",
      codeHint:
        "You signed up with Google or Apple, so there is no password on this account. We send a code to your email address instead.",
      sendCode: "Email me a code",
      sendingCode: "Sending",
      codeSent: "Sent. Check your email.",
      typeToConfirm: "Type {phrase} to confirm",
      capitals: "Capitals exactly as shown. Anything else will not unlock the button.",
      confirm: "Start the deletion",

      doneTitle: "Your account is deactivated",
      doneBody:
        "You are signed out everywhere and nothing has been destroyed. Check your email for the date and the code that stops it. Taking you back to the home page now.",

      /* The window, seen by somebody who signed back in before the ban bit,
         or from a session that predates it. */
      scheduledTitle: "This account is scheduled for deletion",
      scheduledBody:
        "Everything is destroyed on {date}, which is in {days} days. Until then nothing has gone and you can put it all back.",
      restore: "Restore my account",
      restoring: "Restoring",
      restored: "Your account is back. Nothing was destroyed.",

      /* The preconditions. Each one names what is in the way and carries the
         control that clears it. None of them is a dead end. */
      blockedTitle: "There is still something of yours here",
      blockedBody:
        "Clear these and the delete button unlocks. Nothing here stops you leaving, it just has to be settled first.",
      /* STORE-12 / MON-09: money in a pot, and rent refunds either way. The
         deletion is also re-checked for these on the day it runs. */
      blockerRentRefundsCta: "Talk to support",
      blockerRentRefundsOwed: "You owe {amount} in rent refunds to people who paid you.",
      blockerRentRefundsDue: "{amount} in rent refunds is owed to you.",
      blockerPendingPayouts: "You have {count} refund that has not settled.",
      blockerPendingPayoutsPlural: "You have {count} refunds that have not settled.",
      blockerPendingPayoutsCta: "Open my agreements",
      blockerActiveBookings: "You have {count} booking that is still on.",
      blockerActiveBookingsPlural: "You have {count} bookings that are still on.",
      blockerActiveBookingsCta: "Cancel it",
      blockerActiveReservations: "You have {count} table reservation still to come.",
      blockerActiveReservationsPlural: "You have {count} table reservations still to come.",
      blockerActiveReservationsCta: "Cancel it",
      blockerPublishedListings: "You have {count} listing still published.",
      blockerPublishedListingsPlural: "You have {count} listings still published.",
      blockerPublishedListingsCta: "Unpublish or transfer",
      /* A business may never be orphaned. Two doors, and the link carries
         both: hand it to somebody who accepts it, or close it. Never an
         address to email. */
      blockerOwnedBusinesses: "You run {count} business that is still trading.",
      blockerOwnedBusinessesPlural: "You run {count} businesses that are still trading.",
      blockerOwnedBusinessesCta: "Hand it over or close it",

      unavailable:
        "We cannot check your account right now, so the delete button is not safe to press. Try again in a moment.",
    },

    about: {
      label: "About",
      note: "Preferences kept on this device stay on this device. Only you can see or change your account preferences.",
      help: "Help",
      helpSub: "FAQs, contact us",
      terms: "Terms",
      privacy: "Privacy policy",
      disclaimer: "Disclaimer",
      version: "Version",
      licences: "Open source licences",
    },
  },

  home: {
    /*
     * THE EMPTY SHELF, AND WHO IT SAYS FILLS IT.
     *
     * These four strings were inline English in
     * `components/app/home/HomeScreen.tsx`, which is the dictionary rule broken
     * four times on the one surface every signed-in person lands on. They are
     * keys now and the component reads them.
     *
     * "Somebody" AND NOT "AN AGENT". The neighbouring empty state on search
     * still says "Agents are still listing", on a brief whose entire point is
     * that owners list too. Naming agents on an empty property shelf tells a
     * landlord that filling it is somebody else's job, which is the same
     * message the "Become an agent" door was sending. The action underneath
     * offers him the owner door.
     */
    empty: {
      title: "Nothing to show here yet",
      body: "Nobody has published a property in your city yet. The shelf fills the minute somebody does.",
      action: "List a property",
      free: "Listing is free, and it stays free.",
    },
    greeting: "Welcome back",
    prompt: "Where are you going today?",
    searchPlaceholder: "Search places, hotels, restaurants",
    locationLabel: "Current location",
    recommended: "Recommended for you",
    /* `topExperiences` WAS HERE AND IS DELETED, with `categories.experiences`.
       See the note there: zero `experience` rows live, so "Explore top
       experiences" advertised an empty shelf, and "top" on an empty shelf
       is a second invention on the first. Rule 15, R2 section 1.3. */
    nearby: "Near you",
    /* The in-app home, to the flip render's dimmed home (BUILD_06, F1): the
       search field, the four browse tiles and the city tiles. The fourth tile
       is Land rather than the render's "New Build" because there is no build
       condition filter in the search vocabulary yet, and a tile has to lead
       somewhere real. */
    searchProperties: "Search for properties, cities or locations",
    /* The home field's own prompt, to the founder's target. Shorter than
       `searchProperties` on purpose: at 390 the longer line ran off the end of
       the well and was cut mid-word. */
    searchMarkets: "Search markets or locations",
    browse: {
      buy: "Buy",
      rent: "Rent",
      shortlet: "Shortlet",
      land: "Land",
    },
    popularCities: "Popular Cities",
    /* The nine markets on home, to the founder's target render (BUILD_06, F1).
       Three of the render's names are not here because the search vocabulary
       has no filter behind them: Resorts becomes Villas, Guest Houses becomes
       Apartments and Commercial becomes Offices, each the nearest market this
       catalogue actually holds. See components/app/home/markets.ts. The count
       line is filled from a real count or the tile shows its name alone; it
       never carries the render's "+", which would round a true figure up. */
    markets: {
      label: "Browse by market",
      rent: "Rent",
      buy: "Buy",
      shortlet: "Shortlets",
      hotel: "Hotels",
      villa: "Villas",
      apartment: "Apartments",
      restaurant: "Restaurants",
      office: "Offices",
      land: "Land",
      listingOne: "{count} listing",
      listingMany: "{count} listings",
    },
    featuredCities: "Featured cities",
    viewAllCities: "View all cities",
    /*
     * THE FOR-SALE BAND, AND WHY IT NO LONGER SAYS INVEST (R1 finding A36).
     *
     * This band said "INVEST IN TOMORROW / Discover premium investment
     * opportunities / Explore Investments" while the landing had just dropped
     * its Invest segment on the ground that Vallo sells no investment
     * product. Two surfaces of one product cannot disagree about whether a
     * product exists, and the landing is the one telling the truth: there is
     * no investment offering here, no yield, no return, no projection and no
     * screen that models one. What the band actually shows is a property for
     * sale, so that is what it now says. The key is still called `invest`
     * because `HomeScreen` and `InvestBand` read it by that name and a key is
     * not copy; the words a person reads are all that changed.
     */
    invest: {
      eyebrow: "Buy",
      titleLead: "Property for sale",
      titleAccent: "on Vallo.",
      body: "Homes, land and commercial space to buy, with each lister's checks in plain view.",
      action: "Explore properties for sale",
    },
    /* The assistant's own chrome (BUILD_06, F1): the name pair under the bar,
       the composer, the thinking pill and the four opening prompts. Each
       prompt asks what this catalogue can actually answer: a yearly rent in
       the unit it is quoted in, the move-in total, the power columns and the
       shortlet market. A starter the assistant cannot answer teaches somebody
       it does not work, so nothing here is a mood the catalogue lacks. */
    assistant: {
      title: "AI Assistant",
      sub: "Always here. Ask anything.",
      placeholder: "Type your message",
      thinking: "Thinking...",
      chips: {
        lekki: "Two bedroom in Lekki under 5m a year",
        moveIn: "What will it cost me to move in?",
        generator: "Which places have a generator?",
        shortlets: "Show me shortlets in Victoria Island",
        stay: "A hotel in Victoria Island this weekend",
        table: "Where can I book a table in Ikoyi?",
      },
      /* The self description. It sits over an empty thread, which is the one
         place somebody is deciding what this assistant is for, and until now
         it described a property search on a product that is also hotels,
         shortlets, guest houses and tables (ledger 10.4). */
      emptyTitle: "How can I help today?",
      emptyBody:
        "Ask about somewhere to rent or buy, a hotel or shortlet to stay in, a table to book, and what moving in really costs.",
    },
    aiCard: {
      /*
       * THIS CARD USED TO BE A PICTURE OF ITS OWN WORDS.
       *
       * The banner was a 1536x1024 render with "AI Assistant" and "Your smart
       * travel buddy" painted into the pixels. That is untranslatable by
       * definition: these four locale files could not reach it, so three of
       * our four languages saw English regardless of what they had chosen. It
       * was also invisible to a screen reader, since the image carried alt=""
       * and the only real text in the component was the button.
       *
       * And it said TRAVEL BUDDY, on a platform for renting and buying
       * property, above an assistant whose actual instructions are about
       * move-in costs and land titles.
       *
       * What is here now is what the assistant genuinely does, taken from the
       * rules it actually runs under in app/api/assistant/route.ts, so the
       * three lines below are checkable rather than promotional.
       */
      title: "Ask Vallo AI",
      body: "It searches the same listings you do, so it can only tell you about places that are really on Vallo.",
      action: "Ask the assistant",
      truths: {
        /* Rule 1 of the system prompt: never invent listings, cite only what
           the search tool returned, name each one with its /listing/<id>. */
        listings:
          "It answers from real listings, and links every one it names.",
        /* Rule 4: the rent is rarely the whole number. This is the single most
           useful thing it knows and nothing on the platform said so. */
        costs:
          "It knows what moving in actually costs. Caution deposit, agency fee, legal fee and agreement fee, not just the rent.",
        /* Rule 5: it is not a lawyer and must never say a title is good. A
           product saying what its assistant will refuse to do is worth more
           here than another sentence about how clever it is. */
        title:
          "It will not tell you a land title is good. It says what the listing claims, then sends you to a lawyer.",
      },
    },
    agentCard: {
      title: "Become a Vallo Agent",
      body: "List your properties, manage bookings, earn more and grow your business.",
      action: "Become an agent",
    },
    experienceCategories: {
      beach: "Beach resorts",
      city: "City tours",
      dining: "Fine dining",
      adventure: "Adventure",
      events: "Events",
    },
  },

  agent: {
    standing: {
      DRAFT: "Not sent yet",
      SUBMITTED: "With us for review",
      UNDER_REVIEW: "Being reviewed",
      MORE_INFO_REQUIRED: "We need something more from you",
      APPROVED: "Approved",
      REJECTED: "Not approved",
      SUSPENDED: "Paused, contact support",
    },
    mode: {
      personal: "Personal",
      agent: "Agent workspace",
      switchToAgent: "Switch to the agent workspace",
      switchToPersonal: "Switch to Personal",
      manageSub: "Manage your listings and earnings",
      chooseTitle: "Choose a workspace",
      chooseSub: "Change workspace at any time.",
      personalDesc: "Discover and book amazing places across Nigeria.",
      agentDesc: "Manage your listings, bookings, customers and earnings.",
      verifiedAgent: "Verified Agent",
      noWorkspace: "You are not listing yet",
      applyToList: "Apply to list",
      workspaceLabel: "Your listings",
      notApproved: "Your agent application is still under review.",
    },
    nav: {
      dashboard: "Dashboard",
      money: "Money",
      myListings: "My Listings",
      listApartment: "List Apartment",
      bookings: "Bookings",
      messages: "Inbox",
      reviews: "Reviews",
      earnings: "Earnings",
      analytics: "Analytics",
      verification: "Verification",
      settings: "Settings",
    },
    join: {
      title: "Join the Vallo Agent Community",
      body: "List properties, connect with guests, manage bookings and earn.",
      start: "Start application",
      resume: "Continue application",
      whatYouGet: "What you get",
      /* RULE 15: "thousands" is an invented count, and a count of PEOPLE.
         R2 filed it (`docs/design/audits/R2-content-truth-and-carried-items.md`
         section 1.3) and could not fix it: `agent.join` is not R2's namespace
         and this is an edit rather than an add. The honest version of a claim
         about reach is no claim about size. */
      benefitReach: "Reach guests who chose Vallo",
      benefitTools: "Professional listing and booking tools",
      benefitEarn: "Track earnings and see what you are owed",
    },
    apply: {
      title: "Become an Agent",
      draftSaved: "Draft saved on this device",
      next: "Next",
      back: "Back",
      submit: "Submit application",
      submitting: "Submitting",
      agentType: "Agent type",
      individual: "Individual",
      individualDesc: "You list and manage properties yourself.",
      business: "Business",
      businessDesc: "You represent a registered company or agency.",
      steps: {
        personal: "Personal Information",
        identity: "Identity Verification",
        business: "Business Information",
        documents: "Documents Upload",
        payout: "Bank / Payout Details",
        review: "Review & Submit",
      },
      fields: {
        firstName: "First name",
        lastName: "Last name",
        phone: "Phone number",
        idType: "ID type",
        idNumber: "ID number",
        nin: "National Identification Number (NIN)",
        bvn: "Bank Verification Number (BVN)",
        businessName: "Business name",
        rcNumber: "RC number",
        state: "State",
        city: "City",
        address: "Address",
        bankName: "Bank",
        accountNumber: "Account number",
        accountName: "Account name",
        agreeTerms: "I agree to the Vallo Agent Terms and Payout Policy.",
      },
      documents: {
        title: "Upload your documents",
        body: "A government ID is required. Business agents also upload registration.",
        idFront: "ID card, front",
        idBack: "ID card, back",
        registration: "Business registration",
        upload: "Upload",
        chooseFile: "Choose a file, PNG or JPG or PDF, up to 10MB",
      },
      review: {
        title: "Review and submit",
        body: "Check your details. You can go back to any step to edit.",
        editStep: "Edit",
      },
    },
    status: {
      submittedTitle: "Application submitted",
      submittedBody: "We are reviewing your application. You will be notified once it is approved.",
      status: "Status",
      draft: "Draft",
      pendingReview: "Pending Review",
      underReview: "Under Review",
      moreInfo: "More Information Required",
      approved: "Approved",
      rejected: "Rejected",
      submittedOn: "Submitted on",
      applicationId: "Application ID",
      reviewNote: "Our team typically reviews applications within 24 to 48 hours.",
      backHome: "Back to home",
      enterAgent: "Open the agent workspace",
      signedOutTitle: "Sign in to see your application",
      signedOutBody:
        "Your application and its reference are tied to your account, so we have to know who you are before we can show them.",
      signIn: "Sign in",
      noneTitle: "No application on file",
      noneBody:
        "You have not applied to become an agent yet. It takes about ten minutes and you need one photo ID.",
      startApplication: "Apply to become an agent",
      unconfiguredTitle: "We cannot reach your application right now",
      unconfiguredBody:
        "This is on our side, not yours. Nothing you have submitted is lost. Try again in a few minutes.",
      reviewedOn: "Decided on",
      reviewerNote: "What the reviewer said",
      respond: {
        title: "Answer the reviewer",
        body: "Write what they asked for, add a document if it helps, and send it back. A person reads it again.",
        answerLabel: "Your answer",
        answerHint: "Up to 2,000 characters.",
        attachIdentityTitle: "An identity document",
        attachAddressTitle: "Proof of address",
        attachBody: "Optional. A photo or a PDF, up to 10 MB.",
        send: "Send it back",
        sending: "Sending",
        sent: "Sent back. It is with the reviewer again.",
        needSomething: "Write an answer or add a document before you send it back.",
        notWaiting: "This application is not waiting on you any more. Refresh to see where it stands.",
        failed: "We could not send this just now. Nothing you wrote was lost, so please try again.",
      },
    },
    dashboard: {
      title: "Agent Dashboard",
      subtitle: "Overview of your property business",
      totalEarnings: "Total Earnings",
      totalBookings: "Total Bookings",
      activeListings: "Active Listings",
      occupancyRate: "Occupancy Rate",
      responseRate: "Response Rate",
      earningsOverview: "Earnings Overview",
      recentBookings: "Recent Bookings",
      bookingSources: "Booking Sources",
      listingPerformance: "Listing Performance",
      guestMessages: "Guest Messages",
      quickActions: "Quick Actions",
      addListing: "Add New Listing",
      viewBookings: "View Bookings",
      manageListings: "Manage Listings",
      earningsReport: "Earnings Report",
      thisMonth: "This Month",
      lastMonth: "vs last month",
      views: "Views",
      revenue: "Revenue",
      confirmed: "Confirmed",
      pending: "Pending",
      // The key name is historical. The copy must never call the workspace a
      // sample, a demo or a preview: those words are banned in product copy.
      /* The workspace with nobody in it. Three states and no fourth:
         signed out, signed in without an agent row, and unconfigured.
         The deck of invented figures this replaced is gone. */
      signedOutTitle: "Your listings, in one place",
      signedOutBody:
        "Your earnings, your bookings, your calendar and your listings, all in one place. Sign in to open yours.",
      notAgentTitle: "You are not listing yet",
      notAgentBody:
        "This page fills in the moment you have a place on Vallo. Applying takes about two minutes and a person reads every application.",
      unconfiguredTitle: "We cannot reach your listings right now",
      unconfiguredBody:
        "This is on our side, not yours, and there is nothing to read here until it is fixed. Everything else on Vallo still works.",
      applyCta: "Apply to list",
    },
  },

  /**
   * The agent listing wizard, the listings workspace, the pitch state and the
   * agent's own dashboard tiles.
   *
   * Counts, prices and dates arrive already formatted by the shared formatters,
   * so the templates below only ever carry a placeholder. Placeholders are
   * written `{name}` and filled at the call site; keep every placeholder in a
   * translation, and keep its spelling, or the sentence loses its number.
   */
  agentListings: {
    /**
     * THE WIZARD AS THE GOVERNING RENDERS DRAW IT.
     *
     * `GOVERNING-06`, `-07` and `-08` head every step with a large title and
     * one quiet sentence under it, label the fact rows with the question they
     * are asking, and close the flow on "What happens next". None of that
     * copy existed, because none of it was drawn. Added rather than moved:
     * every key already in this namespace still says what it said.
     */
    drawn: {
      /*
       * The title each step wears, which is the render's own and is NOT the
       * short name in `wizard.steps`. The short name still labels the rail
       * and names the step to a screen reader; these are the words the three
       * governing images print across the top of each screen, and they ask
       * rather than label: "Where is it?" rather than "Location".
       */
      titles: {
        basics: "What are you listing?",
        photos: "Photos and a walkthrough",
        location: "Where is it?",
        amenities: "What else is there?",
        utilities: "Light and water",
        pricing: "The price",
        guestView: "Check it over",
        submit: "Send it for review",
      },
      /* The sentence under each step's title. One line, plain, and it says
         what the step is for rather than selling it. */
      subtitles: {
        basics: "Tell us the type of property, what you want to list it as, and the rooms inside it.",
        photos: "Add clear photos of the property and a short video walkthrough.",
        location: "Tell us the exact location of the property.",
        amenities: "Select all the amenities available at the property.",
        utilities: "Tell us about the power supply, the backup and the water at the property.",
        pricing: "Set the price, and say what a tenant meets at the door.",
        guestView: "Here is how your listing will appear to searchers.",
        submit: "Here is what is still missing, and what happens once you send it.",
      },
      /* The fact rows of `GOVERNING-06` screen three. Each one is a question
         rather than a noun, because the render asks rather than labels. */
      rooms: {
        title: "The rooms",
        toilets: "Toilets",
        parking: "Parking spaces",
        bedroomsAsk: "How many bedrooms?",
        bathroomsAsk: "How many bathrooms?",
        toiletsAsk: "How many toilets?",
        parkingAsk: "How many parking spaces?",
        size: "Size (square metres)",
        sizeAsk: "The floor area, if you know it",
        furnishing: "Furnishing",
        furnishingAsk: "Select furnishing type",
        floor: "Floor",
        floorAsk: "Which floor is it on?",
        floors: "Floors in the building",
        floorsAsk: "How many floors altogether?",
        optional: "Optional",
        notStated: "Not stated",
      },
      /* `GOVERNING-07` screens one and two. */
      supply: {
        power: "Power supply",
        backup: "Backup power",
        backupHours: "Hours of backup on a normal day",
        water: "Water source",
        prepaid: "Prepaid meter",
        prepaidBody: "Say so, because it decides whether a guest can be asked to buy units.",
      },
      /* `GOVERNING-08` screen two, from the agent's side of the same model. */
      tenantPays: {
        title: "What will a tenant actually pay?",
        lede: "This is the breakdown a searcher sees, and who keeps what.",
        empty: "Fill in the costs above and the breakdown a tenant sees appears here.",
      },
      /* `GOVERNING-08` screen three. */
      checkOver: {
        detailsTitle: "Listing details",
        edit: "Edit",
        notSet: "Not set",
        availableNow: "Available now",
        keys: {
          propertyType: "Property type",
          bedrooms: "Bedrooms",
          bathrooms: "Bathrooms",
          size: "Size",
          furnishing: "Furnishing",
          floor: "Floor",
          condition: "Condition",
          availability: "Availability",
        },
      },
      /* `GOVERNING-08` screen four. */
      done: {
        nextTitle: "What happens next",
        one: "We check the details you provided.",
        two: "We verify the documents, if any.",
        three: "You get a notification once it is live.",
      },
      photos: {
        add: "Add photos",
        earlier: "Move this photo earlier",
        later: "Move this photo later",
      },
    },

    wizard: {
      stepsLabel: "Listing steps",
      stepCounter: "Step {current} of {total}",
      stepAria: "Step {number}, {name}",
      saveUnreached:
        "We could not reach Vallo to save this step. Nothing you typed is lost. Check your connection and press Next again.",
      steps: {
        basics: "Basic info",
        photos: "Photos",
        location: "Location",
        amenities: "Amenities",
        utilities: "Light and water",
        pricing: "Pricing",
        guestView: "Guest view",
        submit: "Submit",
      },
      unconfiguredNotice:
        "We cannot reach publishing right now. Keep going: everything you type is kept on this device and will be waiting for you.",
      savedAt: "Saved at {time}",
      saving: "Saving",
      next: "Next",
      back: "Back",
      myListings: "My listings",
    },

    basics: {
      titleLabel: "Listing title",
      titleHint: "What a guest sees first. Name the place and what makes it good.",
      titlePlaceholder: "Bright 2 bedroom flat in Lekki Phase 1",
      propertyTypeLabel: "Property type",
      rentalNote:
        "Rentals are the yearly market: you set the rent per year, guests message you, inspect the property, then pay. There is no nightly booking on a rental.",
      descriptionLabel: "Description",
      descriptionHint: "{words} of {min} words. Describe the rooms, the area and what is nearby.",
      descriptionPlaceholder:
        "Tell guests about the space, the light, the kitchen, the neighbourhood and how to get around.",
      counters: {
        guests: "Guests",
        bedrooms: "Bedrooms",
        beds: "Beds",
        bathrooms: "Bathrooms",
      },
      counterFewer: "One fewer {label}",
      counterMore: "One more {label}",
    },

    propertyTypes: {
      apartment: { label: "Apartment", blurb: "A self-contained flat let by the night." },
      shortlet: { label: "Shortlet", blurb: "A furnished stay for a few nights or weeks." },
      home: { label: "Home", blurb: "A whole house guests book by the night." },
      villa: { label: "Villa", blurb: "A large private home with grounds." },
      hotel: { label: "Hotel", blurb: "Rooms in a managed property." },
      rental: {
        label: "Rental",
        blurb: "A home let on a yearly tenancy. Priced per year, inspected before payment.",
      },
      shop: { label: "Shop", blurb: "Retail space let by the year." },
      office: { label: "Office", blurb: "Workspace let by the year." },
      land: { label: "Land", blurb: "A plot, priced per year of tenure." },
      restaurant: { label: "Restaurant", blurb: "A place to eat, with tables guests reserve. Priced per head." },
    },

    photos: {
      intro:
        "Add at least {min} photos, up to {max}. The first one is the cover, so lead with the wide shot that sells the place.",
      tooNarrow: "Photos need at least {width}px on their longest side so they look sharp on every screen.",
      choose: "Choose photos",
      /* STORE-04: the app's own camera, shown only inside the native app. */
      takePhoto: "Take a photo",
      addMore: "Add more photos",
      uploading: "Uploading",
      progress: "{count} of {min} needed",
      empty: "No photos yet. Daylight, wide angles and a tidy room do most of the work.",
      cover: "Cover",
      makeCover: "Make cover",
      remove: "Remove",
      ceiling: "A listing holds up to {max} photos.",
      notAnImage: "Photos need to be image files, for example JPG or PNG.",
      notPrepared:
        "We could not prepare that photo safely, so it was not uploaded. Try a different photo.",
      uploadFailed: "That photo did not finish uploading. Please try it again.",
      /* The photo gate's refusals, one per cause, each naming what to do. */
      heicUndecodable:
        "This photo is in the HEIC format, which this browser cannot open. On an iPhone, set Camera, Formats to Most Compatible. On Android, turn off High efficiency pictures in the camera's settings. Or share the photo as a JPEG, then add it again.",
      undecodable: "This file could not be opened as a photo. Try exporting it again as a JPEG.",
      uploadTooBig: "That photo is over {max}. Most phones can export a smaller copy.",
      uploadWrongType: "That file type cannot be stored. Use a JPEG, PNG or WebP photo.",
      uploadSignedOut: "Your session has expired, so the photo was not stored. Sign in again, then add it.",
      needsKeys: "We cannot upload photos right now. Everything else you have typed is saved.",
      needsTitle: "Add a title on step one first, then your photos attach to this listing.",
    },

    location: {
      stateLabel: "State",
      statePlaceholder: "Choose a state",
      cityLabel: "City",
      cityPlaceholder: "Lagos",
      areaLabel: "Area",
      areaHint: "The neighbourhood guests search for.",
      areaPlaceholder: "Lekki Phase 1",
      addressLabel: "Street address",
      addressHint: "Kept private until a booking is confirmed or you share it in chat.",
      addressPlaceholder: "12 Admiralty Way",
      landmarkLabel: "Landmark",
      landmarkHint: "Something nearby that makes the place easy to find.",
      landmarkPlaceholder: "Opposite the Lekki roundabout",
    },

    amenities: {
      intro:
        "Choose everything a guest will actually find at the property. Honest lists earn better reviews than long ones.",
      names: {
        wifi: "WiFi",
        ac: "Air conditioning",
        tv: "TV",
        kitchen: "Kitchen",
        parking: "Parking",
        pool: "Swimming pool",
        gym: "Gym",
        security: "Security",
        elevator: "Lift",
        furnished: "Furnished",
        balcony: "Balcony",
        garden: "Garden",
        laundry: "Laundry",
        generator: "Backup power",
        water: "Running water",
      },
    },

    pricing: {
      priceNightLabel: "Price per night",
      priceYearLabel: "Yearly rent",
      priceHint: "Enter the amount in naira, for example 85,000.",
      priceWithPeriod: "{price} {period}",
      priceNightPlaceholder: "85,000",
      priceYearPlaceholder: "2,500,000",
      perNight: "per night",
      perYear: "per year",
      /* Every unit a headline price can be quoted in, keyed by the column's
         own value, plus "sale" for the one that is not a period at all. The
         workspace read a two-case ternary before this existed and told a host
         their asking price was "per night". */
      period: {
        month: "per month",
        quarter: "per quarter",
        year: "per year",
        night: "per night",
        guest: "per head",
        sale: "asking price",
      },
      cleaningLabel: "Cleaning",
      cleaningHint: "Optional. Added once per stay, not per night.",
      cleaningHintSet: "{amount} added once per stay.",
      cleaningPlaceholder: "10,000",
      minStayLabel: "Shortest stay in nights",
      instantTitle: "Instant book",
      instantBody: "Guests book without waiting for you to confirm.",
      rentalNote:
        "Rentals are priced per year. Guests message you inside Vallo, inspect the property, then pay. For your safety, keep every chat and payment inside Vallo.",
    },

    guestView: {
      intro: "This is how your listing appears in search.",
      addPhotos: "Add photos to complete the card",
      rentBadge: "Rent",
      instantBadge: "Instant",
      locationPlaceholder: "Add a location on step three",
      titlePlaceholder: "Your listing title",
      rooms: "{bedrooms} bed, {bathrooms} bath, sleeps {guests}",
      priceToSet: "Price to set",
      descriptionPlaceholder: "Your description appears on the listing page.",
    },

    submit: {
      title: "Ready to send for review",
      body:
        "We check every listing by hand before it reaches guests. Clear that checklist and it goes straight into the queue.",
      action: "Send for review",
      sending: "Sending",
      note: "Reviews take 24 to 48 hours. You hear from us either way.",
      checklist: {
        title: "Title",
        description: "Description of {min} words or more",
        photos: "{min} photos or more, cover first",
        stateCode: "State",
        city: "City",
        area: "Area",
        amenities: "Amenities",
        priceNight: "Price per night",
        priceYear: "Yearly rent",
        rooms: "Rooms and guests",
      },
      needsTitle: "Add a title on step one first, then we can send this listing for review.",
      needsKeys:
        "We cannot send this for review right now. Your work is saved on this device.",
    },

    /**
     * The quality gate, in the agent's language. The same requirements the
     * server enforces at submit, so the checklist and the refusal never phrase
     * one rule two ways.
     */
    gate: {
      titleShort: "Give the listing a title of at least {min} characters.",
      titleLong: "Shorten the title to {max} characters or fewer.",
      description: "Describe the property in at least {min} words. You have {count} so far.",
      propertyType: "Choose what kind of property this is.",
      photos: "Add at least {min} photos. You have {count}.",
      cover: "Choose which photo leads the listing. The first one is the cover.",
      stateCode: "Choose the state the property is in.",
      city: "Enter the city, for example Lagos.",
      area: "Enter the area, for example Lekki Phase 1.",
      amenities: "Choose at least one amenity guests will find.",
      priceNight: "Set the price per night in naira.",
      priceYear: "Set the yearly rent in naira.",
      rent: "Set the rent in naira.",
      bedrooms: "Say how many bedrooms the property has.",
      bathrooms: "Say how many bathrooms the property has.",
      maxGuests: "Say how many guests the property sleeps.",
    },

    submitted: {
      title: "Your listing is with our review team",
      body:
        "We check every listing by hand so guests can trust what they book. Reviews take 24 to 48 hours and you hear from us either way. If anything needs changing we will say exactly what.",
      goToListings: "Go to my listings",
      another: "List another property",
    },

    pitch: {
      title: "List your property on Vallo",
      bodySignedIn:
        "Listing is open to approved agents. The application takes about two minutes and we review within 24 to 48 hours.",
      bodySignedOut:
        "Sign in to your agent account to start a listing, or apply in about two minutes if you are new here.",
      points: {
        verified: {
          title: "A named person behind every listing",
          body:
            "The verified tick appears only once a person here has checked your ID, so it means something to guests.",
        },
        inside: {
          title: "Guests reach you inside Vallo",
          body: "Chats, inspections and payments stay on the platform, where there is a record of them.",
        },
        keep: {
          title: "You keep what you charge",
          body: "Vallo charges you nothing to list. Your price is your price.",
        },
      },
      apply: "Apply to list",
      signIn: "Sign in",
      how: "How listing works",
    },

    workspace: {
      title: "My listings",
      lede: "Every property you have on Vallo, and where each one stands.",
      start: "Start a listing",
      unconfigured:
        "We cannot reach your listings right now. Nothing has been lost, and you can still start one: the wizard keeps your work on this device.",
      emptyTitle: "No listings yet",
      emptyBody:
        "Your first property takes about ten minutes, most of it photos. Start whenever you are ready: drafts are saved as you go.",
      groups: {
        live: { title: "Live", blurb: "Guests can find these in search." },
        review: {
          title: "With our review team",
          blurb: "We check every listing by hand. This takes 24 to 48 hours.",
        },
        attention: {
          title: "Needs your attention",
          blurb: "A change is needed before this can go live.",
        },
        drafts: { title: "Drafts", blurb: "Only you can see these." },
      },
      status: {
        DRAFT: "Draft",
        SUBMITTED: "Submitted",
        UNDER_REVIEW: "Under review",
        MORE_INFO_REQUIRED: "More information needed",
        APPROVED: "Approved",
        PUBLISHED: "Live",
        REJECTED: "Not accepted",
        SUSPENDED: "Suspended",
      },
      photoCount: "{count} photos",
      photoCountOne: "1 photo",
      actions: {
        edit: "Edit",
        submit: "Send for review",
        takeDown: "Take it down",
        delete: "Delete",
      },
      /* Deleting a draft opens no dialogue: the row leaves and offers its
         way back, and nothing reaches the server until that offer runs out. */
      undo: {
        removed: "Draft deleted",
        action: "Undo",
      },
      sheets: {
        keep: "Keep it",
        working: "Working",
        close: "Close",
        submit: {
          title: "Send this listing for review?",
          body:
            "Our team checks the photos, the description and the location. You hear back within 24 to 48 hours, either way.",
          confirm: "Send for review",
        },
        unpublish: {
          title: "Take this listing down?",
          body:
            "It leaves search straight away and returns to your drafts. You can edit it and send it back for review whenever you are ready.",
          confirm: "Take it down",
        },
      },
    },

    dashboard: {
      standing: "{name}, here is where your properties stand today.",
      liveListings: "Live listings",
      withReview: "With review",
      drafts: "Drafts",
      upcomingStays: "Upcoming stays",
      unreadMessages: "Unread messages",
      /* DB2: the count could not be read; never shown as 0. */
      unreadUnknown: "Not known",
      noListings:
        "No properties yet. Your first listing takes about ten minutes, and drafts are saved as you go.",
      noStays: "No stays booked yet. Listings that are live in search are the ones guests can book.",
      stayDates: "{from} to {to}",
    },
  },

  /**
   * The host's bookings console: the surface where a guest's request becomes a
   * stay, or an honest no.
   *
   * Two words carry weight here and are chosen on purpose. A request "holds"
   * nights, because that is literally true: no other guest can take them while
   * it waits. And it "releases itself" after 48 hours, because the database does
   * that on its own and the agent deserves to know before it happens rather than
   * after. The 48 is filled from one constant, so the copy can never quote a
   * window the platform does not keep.
   */
  agentBookings: {
    title: "Bookings",
    lede: "Every request and every stay across your properties.",
    unconfigured:
      "We cannot reach your requests and stays right now. Nothing has been lost.",
    tabsLabel: "Booking groups",
    waitingOn: "{count} waiting on you",
    waitingOnOne: "1 waiting on you",
    groups: {
      requests: {
        title: "Requests",
        blurb:
          "Waiting on your decision. A request holds the nights for {hours} hours, then releases itself.",
      },
      upcoming: { title: "Upcoming", blurb: "Accepted stays still to come." },
      completed: { title: "Completed", blurb: "Stays your guests have finished." },
      cancelled: {
        title: "Cancelled",
        blurb: "Requests you declined, and stays ended by either side.",
      },
    },
    card: {
      dates: "{from} to {to}",
      total: "Total",
      requested: "Requested {date}",
      waiting: "Waiting {duration}",
      waitingNew: "Just arrived",
      releasesIn: "Releases itself in {duration}",
      releasingNow: "Past its {hours} hour hold, so it can release at any moment",
      hours: "{count} hours",
      hoursOne: "1 hour",
      days: "{count} days",
      daysOne: "1 day",
      settled: "Payment settled",
      awaiting: "Payment not settled yet",
      unknown: "Payment status unavailable",
      arriving: "Arriving: {name}",
      arrivingPhone: "Gate number {phone}",
    },
    status: {
      PENDING: "Awaiting your decision",
      CONFIRMED: "Confirmed",
      COMPLETED: "Stay complete",
      NO_SHOW: "Guest never arrived",
      CANCELLED: "Cancelled",
    },
    actions: {
      accept: "Accept",
      decline: "Decline",
      working: "Working",
      back: "Go back",
      close: "Close",
    },
    accept: {
      title: "Accept this request?",
      body:
        "The guest hears straight away and the nights are held on your calendar for them. Check the property is genuinely free before you accept.",
      confirm: "Accept request",
    },
    decline: {
      title: "Decline this request?",
      body:
        "The nights go back on your calendar and the guest is told. Nothing is charged either way.",
      reasonLabel: "Why can you not take these dates?",
      reasonHint: "The guest reads this word for word, so keep it plain and kind.",
      reasonPlaceholder: "The flat is already taken on those nights.",
      suggestionsLabel: "Or start from one of these",
      suggestions: {
        taken: "The flat is already taken on those nights.",
        maintenance: "The property is having work done that week.",
        guests: "The property does not sleep that many guests comfortably.",
      },
      confirm: "Decline request",
    },
    empty: {
      requestsTitle: "Nothing waiting on you",
      requestsBody:
        "No guest is waiting on a decision right now. New requests land here and hold the nights for {hours} hours while you answer.",
      upcomingTitle: "No stays booked yet",
      upcomingBody:
        "Requests you accept appear here with the dates, the guests and the total.",
      completedTitle: "Nothing completed yet",
      completedBody: "A stay moves here the day after your guest checks out.",
      cancelledTitle: "Nothing cancelled",
      cancelledBody:
        "Requests you decline, and stays ended by either side, are kept here for your records.",
      openListings: "Manage my listings",
    },
  },

  /**
   * Earnings, read from the ledger and nowhere else.
   *
   * Every figure on this surface is a sum of settled ledger rows. There is no
   * projection, no running estimate and no "expected" column, which is why the
   * empty state can be written with a straight face: before a payment settles
   * there is genuinely nothing to show, and saying so is the honest design.
   */
  agentEarnings: {
    title: "Earnings",
    lede: "Earnings from your completed stays.",
    unconfigured: "We cannot reach your earnings right now. Nothing has been lost.",
    unavailable:
      "We could not load your earnings just now, so no figure is shown rather than a wrong one. Reload in a moment.",
    totals: {
      yourShare: "Your share, settled",
      guestsPaid: "Guests paid",
      settledStays: "Settled stays",
      thisMonth: "This month",
    },
    byMonth: "By month",
    monthShare: "Your share",
    monthGross: "Guests paid",
    stays: "{count} stays",
    staysOne: "1 stay",
    emptyTitle: "No money has moved yet",
    emptyBody:
      "Every settled payment is written to the ledger and appears here with your share on it. Nothing on this page is estimated, so until a stay settles it stays empty on purpose.",
    emptyAction: "See your bookings",
    howTitle: "How your share is worked out",
    howBody:
      "A settled payment is split two ways: your share and what the payment processor takes. Vallo takes nothing from it. The two always add up to what the guest paid, which is why every line here reconciles.",
  },

  /**
   * Analytics, which is the surface most able to mislead and therefore the one
   * written most carefully.
   *
   * Every sentence here has to survive a host acting on it. Somebody reads this
   * screen and then prices a flat, turns down a guest or borrows against next
   * month, so a figure that is roughly right is not a smaller version of a
   * right figure, it is a wrong one with a friendly face. The copy is built
   * around that: each panel names its own source, the empty states say plainly
   * that there is nothing rather than filling the space, and `notCounted`
   * exists so a host is told what this page cannot see instead of assuming
   * silence means zero.
   */
  agentAnalytics: {
    title: "Analytics",
    lede: "What your properties have actually done, counted from your own records.",
    unconfigured:
      "We cannot reach your figures right now. Nothing has been lost.",
    unavailable: "We could not read this just now, so nothing is shown rather than a wrong figure.",
    emptyTitle: "Nothing to measure yet",
    emptyBody:
      "This page counts requests, stays, settled payments and reviews. It stays empty until one of those has actually happened, because a chart drawn from nothing would tell you about nobody.",
    emptyAction: "Start a listing",

    headline: {
      settled: "Settled to you",
      stays: "Confirmed stays",
      rating: "Guest rating",
      ratingNone: "No reviews yet",
      /* The count sits under the average because they are not separable: 5.0
         from one review and 5.0 from two hundred are different facts, and an
         average shown alone invites the wrong one to be read. */
      ratingFrom: "From {count} reviews",
      ratingFromOne: "From 1 review",
      booked: "Booked, next {nights} nights",
    },

    trend: {
      title: "Settled by month",
      blurb:
        "Each bar is the sum of your share on settled payments that month. A month with nothing in it is drawn at zero, because that is what happened.",
      peak: "Best month so far",
      empty:
        "No payment has settled yet, so there is no trend to draw. This fills in on its own the first time money moves.",
    },

    requests: {
      title: "How requests end up",
      blurb: "Every request your properties have received, by where it stands today.",
      received: "Requests received",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
      waiting: "Waiting on you",
      lapsed: "Unanswered past the hold",
      lapsedNote:
        "A request holds its nights for {hours} hours. These went past that with no answer, which a guest reads as a no.",
      answerTitle: "Your usual time to answer",
      answerBody:
        "The middle value across the {count} requests you answered yourself. Half were quicker, half took longer.",
      answerBodyOne: "Measured across the one request you have answered yourself so far.",
      answerNone:
        "You have not answered a request yourself yet, so there is no time to report. This is not a zero.",
      answerUnavailable: "We could not read your request history just now.",
      empty: "No request has reached your properties yet.",
    },

    listings: {
      title: "Property by property",
      blurb: "Sorted by what has actually settled, so the property earning most is on top.",
      columnListing: "Property",
      columnRequests: "Requests",
      columnConfirmed: "Confirmed",
      columnNights: "Nights",
      columnSettled: "Settled",
      columnRating: "Rating",
      ratingWith: "{rating} from {count} reviews",
      ratingWithOne: "{rating} from 1 review",
      saved: "Saved (signed in)",
      noRating: "No reviews",
      empty: "You have no properties yet, so there is nothing to compare.",
    },

    calendar: {
      title: "Your next {nights} nights",
      body: "Across {count} live properties, that is {offered} nights on offer.",
      bodyOne: "Across your one live property, that is {offered} nights on offer.",
      booked: "Booked",
      blocked: "Closed by you",
      open: "Still open",
      none: "Nothing of yours is live yet, so there are no nights to count.",
      blockedNote:
        "Nights you closed yourself are counted apart from booked nights. They are a choice, not lost business.",
    },

    notCounted: {
      title: "What this page does not count",
      views:
        "Views. Vallo does not count how many people looked at a property, so there is no view figure here and no conversion rate built on one. Publishing either would mean making them up.",
      saves:
        "Saves from guests who are not signed in. A signed-out visitor's saved list stays on their own phone and never reaches us, so the saved figure beside each property counts only guests with an account and is short by an amount nobody can measure. Read it as a floor, not a total.",
      occupancy:
        "Past occupancy as a percentage. Nights sold are counted exactly, but working out what share of your capacity that was needs to know how many properties you had live on each past night, which is not recorded. The next 30 nights are shown instead, because today's live count is a fact.",
    },
  },

  /**
   * The admin console. Staff-only copy, but copy all the same: an operator in
   * Kano works the same queues as an operator in Lagos.
   */

  /*
   * The wallet's own vocabulary.
   *
   * These were two hard-coded English maps in `components/app/wallet/kinds.ts`,
   * read by the ledger, the recent activity strip and the receipt. Money is the
   * one place on this platform where a reader should never have to work out
   * what a word means, and three of the four languages were being handed
   * English.
   *
   * The three escrow labels say what the platform actually does and never use
   * the word escrow, because the terms of service say in bold that we do not
   * hold money in escrow, and a ledger row contradicting the contract is the
   * fault F2-001 was about.
   */
  /**
   * THE APPLICANT'S OWN VERIFICATION SCREEN, WHICH WAS THE LAST ONE ENTIRELY IN
   * ENGLISH.
   *
   * `components/verification/KycStatus.tsx` had these as fifteen `const`s at the
   * foot of its own file, then as a staged block in
   * `components/app/untranslated.ts`. Both were the same fault wearing different
   * clothes: copy that looks like part of a component does not look like copy,
   * so the most-read screen in the supply-side funnel was the one nobody
   * noticed was untranslated. An agent applying to trade on a Nigerian
   * marketplace met their own verification status in English whatever language
   * they had chosen.
   *
   * THE REJECTION AND THE REQUEST ARE THE TWO THAT MATTER. Both are read by
   * somebody who has been stopped from earning, and both carry the reviewer's
   * own words underneath them, so the frame has to be plain enough that the
   * reader does not have to work out whether the platform or the reviewer is
   * speaking.
   *
   * `suspendedFix` says what will NOT work before it says what will, on purpose:
   * somebody whose account is stopped will otherwise spend an afternoon
   * resubmitting documents that cannot lift a suspension.
   *
   * `fixLabel` is a label followed by a sentence. It keeps its colon in English
   * and a translation is free to drop one where the script does not want it.
   */
  verification: {
    status: {
      pendingPill: "In review",
      pendingTitle: "We are checking your documents",
      pendingBody:
        "A person reads every submission by hand. Most decisions come back within one working day, and we email you either way. You can keep drafting listings while you wait.",
      submittedPrefix: "Sent",

      approvedPill: "Verified",
      approvedTitle: "You are verified",
      approvedBody:
        "Your listings can go live, and the verified mark now shows on your profile and beside your name in every conversation.",

      rejectedPill: "Not approved",
      rejectedTitle: "We could not verify this",
      retry: "Send it again",

      moreInfoPill: "Over to you",
      moreInfoTitle: "We need one more thing from you",
      moreInfoContinue: "Send what was asked for",

      suspendedPill: "Stopped",
      suspendedTitle: "This account is stopped",
      suspendedFix:
        "Nothing you send here will lift this, because it is a decision about the account rather than about a document. Talk to our team and they will tell you what it would take.",
      getHelp: "Talk to our team",

      fixLabel: "What to do:",
    },
  },

  admin: {
    console: {
      title: "Admin console",
      navLabel: "Admin console",
      signedIn: "Signed in",
      auditNote:
        "Every decision you make here is written to the audit log with your name against it.",
    },

    nav: {
      overview: { label: "Overview", short: "Overview" },
      flags: { label: "Message flags", short: "Flags" },
      alerts: { label: "Risk alerts", short: "Alerts" },
      reports: { label: "Reports", short: "Reports" },
      applications: { label: "Agent applications", short: "Agents" },
      stops: { label: "Stops", short: "Stops" },
      listings: { label: "Listing review", short: "Listings" },
      bookings: { label: "Stays", short: "Stays" },
      tickets: { label: "Support", short: "Support" },
      social: { label: "District", short: "District" },
      standing: { label: "Standing", short: "Standing" },
      moderation: { label: "Held", short: "Held" },
      reference: { label: "Reference data", short: "Reference" },
      switches: { label: "Switches", short: "Switches" },
    },

    access: {
      /*
       * "The platform keys land" was engineering language on a user-facing
       * surface, and worse, it made an internal deployment detail the
       * operator's problem. An unreachable console is our fault and the copy
       * says so, says nothing is lost, and says what to do.
       */
      unconfiguredTitle: "We cannot reach the console right now",
      unconfiguredBody:
        "This is on our side, not yours. Nothing has been lost. Try again in a few minutes.",
      signedOutTitle: "Staff sign in",
      signedOutBody: "Sign in with your operations account to continue.",
      notAdminTitle: "You do not have console access",
      notAdminBody:
        "This area is for the Vallo operations team. Your account does not carry that role.",
      backToVallo: "Back to Vallo",
      signIn: "Sign in",
      backToYourHome: "Back to your home",
      otherAccount: "Sign in with another account",
    },

    common: {
      waiting: "{count} waiting",
      unavailableTitle: "This queue could not be loaded",
      unavailableBody:
        "The console could not reach the platform data just now, so it is not showing you a queue it cannot vouch for. Reload in a moment.",
      notRecorded: "Not recorded",
      notGiven: "Not given",
      passes: "Passes",
      needsAttention: "Needs attention",
      close: "Close",
      done: "Done",
      notNow: "Not now",
      working: "Working",
      optional: "(optional)",
      notePlaceholder: "They will read this word for word, so keep it specific and kind.",
      inAuditLog: "The decision is in the audit log.",
      noteInAuditLog: "The note is in the audit log.",
      recentlyReviewed: "Recently reviewed",
      recentlyResolved: "Recently resolved",
      recentlyDecided: "Recently decided",
      recentlyClosed: "Recently closed",
      dueIn: "Answer within {hours}h",
      dueSoon: "Answer within the hour",
      overdue: "Late by {hours}h",
      resolvedBy: "Resolved by {who}",
      reviewedBy: "Reviewed by {who}",
      someone: "a colleague",
      status: {
        open: "Open",
        reviewed: "Reviewed",
        reviewing: "In review",
        resolved: "Resolved",
        dismissed: "Dismissed",
        /* V-89: the reporter took it back. */
        withdrawn: "Withdrawn by the reporter",
        pending: "Awaiting reply",
        closed: "Closed",
        DRAFT: "Draft",
        SUBMITTED: "Submitted",
        UNDER_REVIEW: "In review",
        MORE_INFO_REQUIRED: "Changes requested",
        APPROVED: "Approved",
        PUBLISHED: "Live",
        REJECTED: "Not approved",
        SUSPENDED: "Suspended",
        PENDING: "Requested",
        CONFIRMED: "Confirmed",
        COMPLETED: "Completed",
        NO_SHOW: "No show",
        CANCELLED: "Cancelled",
      },

      /*
       * The shared queue frame, for the eighteen console destinations that are
       * not bookings.
       *
       * `t.admin.bookings` already had its own four of these, written when the
       * bookings board was the only queue with a filter on it. Eighteen more
       * queues each owning a private copy of the word "Search" is how a console
       * ends up calling the same control four things, so these are the shared
       * ones and a queue only adds its own where its noun genuinely differs.
       */
      searchLabel: "Search",
      searchPlaceholder: "Search this queue",
      noMatchTitle: "Nothing matched that",
      noMatchBody:
        "No row in this queue matches what you have narrowed to. Clear the filters to see everything again.",
      filters: {
        from: "From",
        to: "To",
        apply: "Apply",
        clear: "Clear",
        status: "Status:",
      },
      /*
       * PER COLUMN, NOT PER VALUE, and that is the whole point of the block.
       *
       * `admin.common.status` is one flat map keyed by the bare value, and in it
       * PENDING reads "Requested", which is right for a booking and wrong for
       * money in flight. An operator on the money screen would have met a
       * confidently mistranslated chip rather than a shouting one, which is
       * worse. Keying by column lets one enum value mean different things in
       * the two places it appears, because it does.
       *
       * `reportTarget`'s mixed case is the schema's, not a typo: `listing` is
       * written by lib/reports/schema.ts; the social kinds were written as
       * POST and SOCIAL_PROFILE until B-7a and are lower case since
       * (lib/social/report-kinds.ts), so both spellings have words.
       *
       * The escrow kinds say where the money is and never who holds it,
       * because the terms say in bold that we hold none.
       */
      columns: {
        /*
         * `transactions.status`, the provider's side of a payment.
         *
         * A SEPARATE vocabulary from `walletEntryStatus`, which is the ledger's
         * side, even though the words land close together: a transaction can be
         * REFUNDED, which a wallet entry cannot, and a wallet entry can be
         * REVERSED, which a transaction cannot. `/admin/payments` was collapsing
         * all four into a ternary, so a REFUNDED row on the payment health desk
         * read "Pending" in the pending colour, which is a false statement about
         * money on the screen that exists to find false statements about money.
         */
        transactionStatus: {
          SUCCESSFUL: "Settled",
          PENDING: "Not settled yet",
          FAILED: "Failed",
          REFUNDED: "Refunded",
        },
        kycReview: {
          pending: "Not reviewed yet",
          approved: "Approved",
          rejected: "Not accepted",
        },
        /*
         * `agent_verification_checks.status`, which is a SEPARATE vocabulary
         * from `kycReview` above and not a synonym for it. The check constraint
         * allows exactly passed, failed and pending, and a rung's `pending`
         * means an automated check has produced something a person has to look
         * at, which is not what a document's `pending` means. Reusing the
         * document words here would tell a reviewer a rung had not been looked
         * at when in fact it is waiting on them.
         */
        kycRung: {
          passed: "Passed",
          failed: "Did not pass",
          pending: "Waiting on a reviewer",
        },
        reportTarget: {
          listing: "A listing",
          /* B-7a: the social kinds are written lower case now
             (lib/social/report-kinds.ts). The upper-case keys stay for rows
             filed before, which the pending B-7 migration lower-cases. */
          post: "A post",
          story_comment: "A comment on a story",
          social_profile: "A profile",
          POST: "A post",
          SOCIAL_PROFILE: "A profile",
        },
        reportCategory: {
          off_platform_payment: "Asked to pay outside Vallo",
          scam: "Looks like a scam",
          unsafe: "Unsafe or threatening",
          not_as_described: "Not as described",
          unavailable: "Not actually available",
          offensive: "Offensive",
          duplicate: "Duplicate",
          other: "Something else",
        },
      },
      /*
       * The tone of a metric tile, in words.
       *
       * A flagged figure is drawn with a left rule in its tone, which survives
       * greyscale, and named here for a screen reader, which sees no rule and
       * no colour at all. These were English constants in `_components/ui.tsx`
       * with a note saying the keys belonged to whoever owned the dictionary,
       * so a Hausa operator using a screen reader heard the one signal that was
       * not visual in a language they had not chosen. F2-064.
       */
      statTone: {
        warning: "needs a look",
        danger: "needs action",
        success: "healthy",
      },
      statusLabel: "Filter by status",
      pager: {
        label: "Queue pages",
        showing: "Showing {from} to {to}",
        previous: "Previous",
        next: "Next",
      },
      searchPlaceholders: {
        agents: "Search by name or business",
        listings: "Search by title or city",
        escrow: "Search by property",
      },
    },

    overview: {
      title: "Operations overview",
      lede:
        "Every trust signal Vallo produces ends here: what the safety scan caught, what members reported, who is waiting to be approved, and what is waiting to go live. Each number is a queue you can clear.",
      /* The queue moved to `/admin/queue` so the console opens on the
         overview. It needs a name of its own: the overview's title is the
         overview's. */
      deskTitle: "Where the work is",
      queueTitle: "The queue",
      queueLink: "Open the queue",
      queueLinkLede: "Everything waiting across the five desks that share a table, newest first.",
      deskLede: "Choose a desk. Every number is a live count from the database, and every one of them is work waiting.",
      queueLede: "Listings, agent applications, reports, support and flagged messages, newest first. Every View opens the desk that decides it.",
      queueClear: "This queue is clear.",
      tiles: {
        moderation: {
          label: "Held content",
          lede: "Posts, stories, comments and bios the safety scan stopped.",
        },
        flags: {
          label: "Open message flags",
          lede: "Payment talk the safety scan caught in a conversation.",
        },
        alerts: { label: "Open risk alerts", lede: "Cases raised for the operations team to work." },
        applications: {
          label: "Agent applications",
          lede: "People waiting on a decision to start listing.",
        },
        listings: {
          label: "Listings in review",
          lede: "Submissions waiting to be checked, approved and published.",
        },
        reports: { label: "Open reports", lede: "Content and accounts members have reported to us." },
        tickets: {
          label: "Support tickets",
          lede: "Questions the assistant could not answer on its own.",
        },
      },
      how: {
        title: "How the console works",
        audit:
          "Every decision writes an audit row carrying your name, the record you touched and the status before and after. The log cannot be edited or deleted by anyone, including you.",
        notify:
          "Approvals and rejections tell the person involved on the platform, so nobody is left guessing what happened to their application or their listing.",
        invisible:
          "The safety scan is invisible outside this console. Nothing in the app tells a member their message was flagged.",
        openSwitches: "Open the switches",
      },
    },

    flags: {
      title: "Message flags",
      lede:
        "A database trigger scans every message for a ten digit account number and for payment talk, then files what it finds here. The sender is never told, so this queue is the only place the scanner shows its work.",
      emptyTitle: "No flags waiting",
      emptyBody:
        "Every flagged message has been reviewed. New ones appear here the moment the scan files them.",
      reason: { account_number: "Account number", payment_keyword: "Payment talk" },
      role: { guest: "Guest", agent: "Agent", unknown: "Participant" },
      // `{fragment}` is replaced by the matched text itself, rendered inline as
      // code, so keep the placeholder where the sentence needs it.
      matched: "The scan matched {fragment} in a message from the {role}.",
      context: "Conversation context",
      flagged: "Flagged",
      reviewed: "Reviewed.",
      clear: "Clear this flag",
      escalate: "Raise a risk alert",
      clearSheet: {
        title: "Clear this flag?",
        body:
          "The scan was right to look, but this conversation is fine. The flag closes and the reviewed decision is written to the audit log with your name against it. Nobody in the conversation is told.",
        confirm: "Yes, clear it",
        successTitle: "Flag cleared",
        successBody: "The queue has been updated and the audit log carries your decision.",
      },
      escalateSheet: {
        title: "Raise a risk alert?",
        body:
          "This closes the flag and opens a high severity risk alert against the message, so the case stays on the alerts queue until someone works it. Nobody in the conversation is told.",
        confirm: "Close the flag and raise an alert",
        successTitle: "Alert raised",
        successBody: "The flag is reviewed and a high severity alert is now open on the alerts queue.",
      },
    },

    alerts: {
      title: "Risk alerts",
      lede:
        "Cases that need a person, not a rule: escalated message flags and anything else the platform judged worth a second look. An alert stays open until somebody records what was done.",
      emptyTitle: "No open alerts",
      emptyBody: "Nothing is waiting. Escalating a message flag opens an alert here.",
      severity: { low: "Low", medium: "Medium", high: "High" },
      severityChip: "{level} severity",
      attachedTo: "Attached to {type} {id}",
      resolvedWhen: "Resolved {when}.",
      resolve: "Mark resolved",
      sheet: {
        title: "Resolve this alert?",
        body:
          "Use this once the case has actually been worked. The alert closes with a timestamp and your note goes into the audit log.",
        confirm: "Yes, resolve it",
        notesLabel: "What was done",
        successTitle: "Alert resolved",
        successBody: "The alert is closed and the audit log carries your note.",
      },
    },

    /**
     * The agent verification ladder. Four rungs in a fixed order; the tier is
     * how many are passed with no gap below them, computed in the database.
     */
    verification: {
      title: "Verification ladder",
      tierLine: "Tier {step} of 4: {name}",
      tierName: {
        "0": "Approved, not yet checked further",
        "1": "Identity verified",
        "2": "Address verified",
        "3": "Payout verified",
        "4": "Fully verified",
      },
      rung: {
        identity: "Identity seen",
        address: "Address confirmed",
        payout: "Bank account in their own name",
        in_person: "Met in person",
      },
      passed: "Passed",
      failed: "Did not pass",
      undecided: "Not checked yet",
      decidedBy: "{who}, {when}",
      pass: "Record as passed",
      fail: "Record as failed",
      blockedBelow: "The rung below this one has not passed yet.",
      sheet: {
        passTitle: "Record this check as passed?",
        failTitle: "Record this check as failed?",
        passBody:
          "The agent's tier is recalculated from the checks that have passed, and they are told when it changes.",
        failBody:
          "This can lower a tier that guests can already see, so say what did not check out. The agent reads your words.",
        confirm: "Record it",
        notesLabel: "What you looked at",
        successTitle: "Check recorded",
        successBody: "The ladder is updated and the decision is in the audit log.",
      },
    },

    reports: {
      title: "Reports",
      lede:
        "What members told us was wrong: a listing, a review, a message or an account. The reporter sees their own report and nothing else, so this queue is where it actually gets answered.",
      emptyTitle: "No open reports",
      emptyBody: "Nothing is waiting on a decision. New reports arrive here as members raise them.",
      reportedBy: "Reported by {reporter} against {type} {id}",
      closedWhen: "Closed {when}.",
      startReview: "Start reviewing",
      resolve: "Resolve",
      dismiss: "Dismiss",
      reviewSheet: {
        title: "Take this report on?",
        body: "It moves to in review so the rest of the team can see somebody has it.",
        confirm: "Yes, I am on it",
        notesLabel: "Note for the audit log",
        successTitle: "Report picked up",
        successBody: "The report now shows as in review.",
      },
      resolveSheet: {
        title: "Resolve this report?",
        body:
          "Use this when action has been taken on the reported content or account. The report closes with a timestamp.",
        confirm: "Yes, resolve it",
        notesLabel: "What was done",
        successTitle: "Report resolved",
        successBody: "The report is closed and your note is in the audit log.",
      },
      dismissSheet: {
        title: "Dismiss this report?",
        body:
          "Use this when there is nothing to act on. The report closes and no action is taken against the reported party.",
        confirm: "Yes, dismiss it",
        notesLabel: "Why it was dismissed",
        successTitle: "Report dismissed",
        successBody: "The report is closed and your note is in the audit log.",
      },
    },

    applications: {
      title: "Agent applications",
      lede:
        "Approving creates the agent profile, grants the agent role so the agent workspace opens, and tells the applicant on the platform. Sending one back asks for exactly what is missing.",
      emptyTitle: "No applications waiting",
      emptyBody:
        "Everyone who applied has had an answer. New applications arrive here the moment they are submitted.",
      individual: "Individual",
      business: "Business",
      nameMissing: "Name not given",
      thisApplicant: "this applicant",
      submittedWhen: "Submitted {when}",
      decidedWhen: "Decided {when}.",
      sections: {
        personal: "1. Personal",
        identity: "2. Identity",
        business: "3. Business",
        documents: "4. Documents",
        payout: "5. Payout",
        review: "6. Review",
      },
      fields: {
        fullName: "Full name",
        phone: "Phone",
        email: "Email",
        address: "Address",
        location: "Location",
        documentType: "Document type",
        documentNumber: "Document number",
        businessName: "Business name",
        rcNumber: "RC number",
        business: "Business",
        uploaded: "Uploaded",
        bank: "Bank",
        accountNumber: "Account number",
        accountName: "Account name",
        terms: "Terms",
        applied: "Applied",
        lastNote: "Last reviewer note",
        applicantAnswer: "Applicant's answer",
        lastReviewed: "Last reviewed",
      },
      asIndividual: "Applying as an individual",
      documentsCount: "{count} documents",
      documentsOne: "1 document",
      documentsNone: "No documents uploaded, so this application cannot be verified yet",
      documentOpen: "Open",
      documentUnavailable: "Link unavailable",
      documentKinds: {
        idFront: "ID, front",
        idBack: "ID, back",
        registration: "CAC registration",
      },
      termsAgreed: "Agreed to the platform terms",
      termsNotAgreed: "Not agreed",
      approve: "Approve",
      requestChanges: "Request changes",
      reject: "Reject",
      approveSheet: {
        title: "Approve {name}?",
        body:
          "This creates their agent profile, grants the agent role so the agent workspace opens for them, and tells them on the platform. It is written to the audit log with your name against it.",
        confirm: "Yes, approve",
        notesLabel: "Note to the applicant",
        successTitle: "Application approved",
        successBody: "Their agent profile is live, the role is granted and they have been notified.",
      },
      changesSheet: {
        title: "Ask for more information?",
        body:
          "The application moves to changes requested and the applicant is told what you need. They can edit and resubmit.",
        confirm: "Send it back",
        notesLabel: "What the applicant must change",
        successTitle: "Sent back to the applicant",
        successBody: "They have been notified and can update their application.",
      },
      rejectSheet: {
        title: "Reject {name}?",
        body:
          "The application closes as not approved and the applicant is told. Say why: it is the only explanation they will get.",
        confirm: "Yes, reject",
        notesLabel: "Reason for the applicant",
        successTitle: "Application rejected",
        successBody: "The applicant has been notified and the decision is in the audit log.",
      },
    },

    listings: {
      title: "Listing review",
      lede:
        "Approve says the submission passes the admission checklist. Publish is the second, separate step that puts it into public search. Sending one back tells the agent exactly which line to fix.",
      emptyTitle: "No listings waiting",
      emptyBody:
        "Every submission has been dealt with. New ones appear here as agents submit them.",
      propertyType: {
        apartment: "Apartment",
        hotel: "Hotel",
        home: "Home",
        villa: "Villa",
        shortlet: "Shortlet",
        rental: "Rental",
        shop: "Shop",
        office: "Office",
        land: "Land",
        restaurant: "Restaurant",
      },
      checklistLines: "{count} checklist lines to look at",
      checklistLineOne: "1 checklist line to look at",
      submittedWhen: "Submitted {when}",
      locationMissing: "Location not given",
      perYear: "per year",
      perNight: "per night",
      photoAlt: "{title}, photo {number}",
      checklistTitle: "Admission checklist",
      checks: {
        photoCount: "Four photos or more",
        cover: "Cover photo set",
        titleCase: "Title in title case",
        place: "Area and city recorded",
        price: "Price recorded in naira",
        rooms: "Bedrooms and bathrooms recorded",
        amenities: "Amenities chosen",
        description: "Description of 40 words or more",
        clean: "No contact or payment details in the text",
      },
      submission: "Submission",
      fields: {
        agent: "Agent",
        capacity: "Capacity",
        address: "Address",
        amenities: "Amenities",
        description: "Description",
        lastNote: "Last reviewer note",
        lastReviewed: "Last reviewed",
      },
      capacity: "{guests} guests, {bedrooms} bedrooms, {beds} beds, {bathrooms} bathrooms",
      amenitiesSelected: "{count} selected",
      liveInSearch: "Live in search.",
      closed: "Closed.",
      approve: "Approve",
      publish: "Publish",
      requestChanges: "Request changes",
      reject: "Reject",
      approveSheet: {
        title: "Approve {title}?",
        body:
          "Approving says the submission passes review. It does not put the listing in front of guests yet: publish is the separate second step, so nothing goes live by accident.",
        confirm: "Yes, approve",
        notesLabel: "Note to the agent",
        successTitle: "Listing approved",
        successBody: "The agent has been told. Publish it when you are ready for guests to see it.",
      },
      publishSheet: {
        title: "Publish {title}?",
        body:
          "This puts the listing into public search immediately, where anyone can find and book it. The agent is told it is live.",
        confirm: "Yes, publish it",
        notesLabel: "Note to the agent",
        successTitle: "Listing is live",
        successBody: "It is now in search and the agent has been notified.",
      },
      changesSheet: {
        title: "Ask the agent for changes?",
        body:
          "The listing moves to changes requested and the agent is told exactly what to fix. Point at the checklist line that failed.",
        confirm: "Send it back",
        notesLabel: "What the agent must change",
        successTitle: "Sent back to the agent",
        successBody: "They have been notified and can update the listing.",
      },
      rejectSheet: {
        title: "Reject {title}?",
        body: "The listing closes as not approved and cannot be booked. The agent is told, so say why.",
        confirm: "Yes, reject",
        notesLabel: "Reason for the agent",
        successTitle: "Listing rejected",
        successBody: "The agent has been notified and the decision is in the audit log.",
      },
    },

    support: {
      title: "Support",
      lede:
        "Escalations carry only the name and email the person gave us. Your reply notifies them on the platform straight away.",
      emptyTitle: "No tickets",
      emptyBody:
        "Nobody has needed to escalate. Tickets arrive here when the assistant cannot answer.",
      generalQuestion: "General question",
      threadCount: "{count} messages in the thread",
      threadCountOne: "1 message in the thread",
      allTickets: "All tickets",
      whoFiled: "Who filed it",
      fields: { name: "Name", email: "Email", account: "Account", filed: "Filed" },
      signedInWhenFiled: "Signed in when they filed it",
      noAccountAttached: "No account attached",
      whatTheyAsked: "What they asked",
      supportSender: "Vallo support",
      waitingOnUs: "Waiting on us",
      noneWaitingHeading: "No tickets waiting on us",
      nothingWaitingTitle: "Nothing waiting",
      nothingWaitingBody: "Every ticket has been answered and closed.",
      reply: {
        label: "Reply to this person",
        placeholder: "Answer plainly and say what happens next.",
        send: "Send reply",
        sending: "Sending",
        sent: "Reply sent. They have been notified on the platform.",
        note: "Sending notifies the ticket owner on the platform.",
      },
      stateLabel: "Ticket state",
      states: {
        open: "Open",
        pending: "Awaiting reply",
        resolved: "Resolved",
        closed: "Closed",
      },
    },

    bookings: {
      title: "Stays",
      lede:
        "Every stay on the platform, and the one place a paid stay can be cancelled and the money returned. The published schedule decides the amount. You choose only why.",
      searchLabel: "Find a stay",
      searchPlaceholder: "Booking reference, or part of a listing title",
      search: "Search",
      clearSearch: "Show everything",
      noMatchTitle: "Nothing matched that",
      noMatchBody:
        "Check the booking reference, or search for part of the listing title instead.",
      emptyTitle: "No stays yet",
      emptyBody:
        "Stays appear here the moment a guest reserves. Nothing on this screen is waiting on you.",
      groups: {
        live: "Live and upcoming",
        past: "Already over",
        cancelled: "Cancelled",
      },
      open: "Open this stay",
      back: "All stays",
      goneTitle: "That stay is not there",
      goneBody: "Go back to the list to see what is there now.",
      settledChip: "{amount} settled",
      unpaidChip: "Nothing paid yet",
      refundedChip: "{amount} returned",
      bookedWhen: "Booked {when}",
      fields: {
        reference: "Reference",
        listing: "Listing",
        host: "Host",
        guest: "Guest",
        arriving: "Person arriving",
        arrivingPhone: "Their number",
        arrivingEmail: "Their email",
        dates: "Dates",
        length: "Length",
        party: "Guests",
        perNight: "Per night",
        cleaning: "Cleaning",
        service: "Service",
        subtotal: "Subtotal",
        total: "Total for the stay",
        settled: "Settled so far",
        returned: "Already returned",
        status: "Status",
      },
      sections: {
        stay: "The stay",
        money: "Money",
        people: "People",
        payments: "Payments",
        history: "History",
        refunds: "Refunds already decided",
      },
      noPayments: "Nobody has paid for this stay yet.",
      noRefunds: "No refund has been decided on this stay.",
      refundLine: "{refund} back to the guest, {retained} kept by the host.",
      decidedBy: "{who}, {when}",
      unnamed: "Not named",
      cancel: "Cancel this stay",
      cancelledAlready: "This stay is cancelled. The decision is in the audit log.",
      pastNote:
        "This stay is over. Cancelling it now would release nights nobody can rebook, so it is not offered here. Refund it through support if something went wrong.",
      reasons: {
        guest_choice: "The guest is cancelling",
        host_cancelled: "The host cancelled",
        not_as_listed: "The place was not what was listed",
        no_access: "The guest could not get in",
      },
      sheet: {
        title: "Cancel this stay?",
        body:
          "The dates reopen straight away, and anything owed is refunded to the card the guest paid with. The amount comes from the published schedule, never from a figure typed here.",
        reasonLabel: "Why is this stay being cancelled",
        working: "Working out what is owed",
        owed: "{refund} goes back to the guest.",
        kept: "{retained} stays with the host.",
        nothingPaid: "Nothing was ever paid for this stay, so no money moves.",
        confirm: "Cancel and refund",
        notesLabel: "What was established",
        successTitle: "Stay cancelled",
        successBody:
          "The nights are back on the calendar, the refund is on its way to the card the guest paid with, and the guest has the amount and the reason in writing.",
      },
    },

    switches: {
      title: "Switches",
      lede:
        "Turn a surface off across Vallo without a deploy, then turn it back on when the incident is over. Nothing is deleted either way.",
      warning:
        "Switching a surface off takes it away from everyone immediately, including people in the middle of using it. Work already saved is kept. Pages pick the change up within about thirty seconds. Every flip is written to the audit log with your name against it.",
      on: "On",
      off: "Off",
      defaultNote: "A switchable Vallo surface.",
      switchingOff: "Switching off: {consequence}",
      lastChanged: "Last changed {when}",
      switchOn: "Switch on",
      switchOff: "Switch off",
      labels: {
        bookings: "Bookings",
        wallet: "Wallet (retired)",
        messaging: "Messaging",
        assistant: "Assistant",
        support: "Support",
        agent_listings: "Agent listings",
        hybrid_hotels: "Partner hotels",
        hybrid_restaurants: "Partner restaurants",
      },
      consequences: {
        bookings: "Guests cannot reserve or cancel a stay. Existing bookings are untouched.",
        wallet: "Retired. Vallo holds no money, so this switch cannot be turned on.",
        messaging:
          "Guests cannot message agents and agents cannot reply. Past threads stay readable.",
        assistant: "The assistant stops answering. People can still search and browse.",
        support: "Support chat stops filing new tickets. Tickets already open stay open.",
        agent_listings: "Agents cannot create or edit a listing. Live listings stay live.",
        hybrid_hotels: "Partner hotel inventory drops out of search. First party stays remain.",
        hybrid_restaurants: "Partner restaurant inventory drops out of search.",
        generic: "This surface disappears for everyone until it is switched back on.",
      },
      sheet: {
        title: "Switch off {label}?",
        body:
          "Everyone loses this part of Vallo straight away, including people in the middle of using it. Nothing already saved is deleted, and switching it back on restores the surface. The change reaches every page within about thirty seconds.",
        confirm: "Yes, switch it off",
        successTitle: "Switched off",
        successBody: "The surface is off for everyone and the change is in the audit log.",
      },
    },

    /*
     * The money desks: money, escrow, supply and payments.
     * English only; the other three locales fall back through
     * `withFallback` until a native speaker writes them. Placeholders in
     * braces are filled by the console. The desk titles are `shell.nav`.
     */
    money: {
      lede: "Track transactions, settlements and reconciliation.",
      noDisplayName: "No display name",
      listingGone: "A listing that is no longer there",
      openBookings: "Open bookings",
      openPayments: "Open payments",
      /* The furniture every money desk draws (`money/_desk`). */
      desk: {
        couldNotBeRead: "Could not be read",
        up: "up",
        down: "down",
        unchanged: "unchanged",
        pagerLabel: "{noun} pages",
        previousPage: "Previous page",
        nextPage: "Next page",
        page: "Page {page}",
        pagerNone: "No {noun}",
        pagerCount: "{first} to {last} of {total} {noun}",
        period: "Period",
        none: "none",
        inTotal: "{total} in total.",
      },
      reconciliation: {
        titleRing: "Reconciliation health",
        titleCheck: "Reconciliation check",
        attention: "Needs a person",
        quiet: "Gone quiet",
        never: "No runs recorded",
        unreadTitle: "The reconciliation history could not be read",
        unreadBody:
          "This panel shows how many of the payment reconciliation runs came back clean and when the last clean one was. The audit log did not answer just now; nothing about the job itself is implied.",
        noRunYet: "The job has not recorded a run yet.",
        cleanOfLast: "Clean in {clean} of the last {runs} recorded runs.",
        cleanInDays: "Clean in {clean} of {runs} runs in the last {days} days.",
        lastRunColon: "Last run: {when}",
        lastRunSentence: "Last run {when}.",
        sharePerCent: "{share} per cent of recorded runs clean",
        lastClean: "Last clean run",
        noneRecorded: "None recorded",
      },
      evidence: {
        facts: {
          viewing_attended: "The inspection happened",
          viewing_missed: "The inspection did not happen",
          keys_received: "The keys were handed over",
          keys_not_received: "The keys were not handed over",
          agreement_signed: "An agreement was signed",
          agreement_not_signed: "No agreement was signed",
          service_delivered: "The work was done",
          service_not_delivered: "The work was not done",
          property_matched_listing: "The property matched the listing",
          property_differed_from_listing: "The property was not what the listing said",
          contacted_on: "Got in touch with the other side",
          no_reply_since: "No reply from the other side since",
          amount_agreed: "The amount agreed",
        },
        aFact: "A fact",
        factOn: "{fact} on {date}",
        factAmount: "{fact}: {amount}",
        sizeBytes: "{size} bytes",
        sizeKb: "{size} KB",
        sizeMb: "{size} MB",
        kindFile: "File",
        kindPdf: "PDF",
        kindImage: "Image",
        payer: "Payer · {name}",
        payee: "Payee · {name}",
        neither: "Neither party · {name}",
        noDisplayName: "no display name",
        label: "Evidence filed on this dispute",
        title: "Evidence filed",
        titleCount: "Evidence filed ({count})",
        unreadTitle: "The evidence could not be read",
        unreadBody:
          "What each side has filed on this dispute. The read did not answer just now, which is not the same as nothing being filed. Reload before ruling.",
        noneTitle: "Nothing has been filed on this dispute",
        noneFills:
          "Every receipt, photograph, message screenshot and dated fact either side files, with who filed it and when.",
        noneCreates:
          "Each side files from their own held payment page. Items appear here as they are filed and cannot be edited or removed.",
        aFile: "A file",
        openFile: "Open file",
        cannotOpen: "Could not be opened just now",
      },
      stuckTitle: "Stuck, and somebody is waiting",
      stuckHint: "{count} pending over half an hour",
      stuckBody:
        "These debits have been PENDING for over half an hour. The money has left a spendable balance and has not arrived anywhere. The stale hold sweeper releases withdrawal holds on a schedule; anything here that is not a withdrawal has not got a sweeper and needs a person.",
      settledLabel: "Settled this week",
      vsSevenDaysBefore: "vs the 7 days before",
      settledNote: "Completed wallet entries, last 7 days",
      failedLabel: "Failed charges",
      failedNote: {
        one: "{count} failed card or top-up charge this week",
        other: "{count} failed card or top-up charges this week",
      },
      failedNoteUnread: "Card and top-up charges that failed this week",
      incomplete:
        "The ledger is larger than this desk reads in one pass, so the figures above are at least these amounts rather than totals.",
      summaryTitle: "Transaction summary",
      last30Days: "Last 30 days",
      moneyIn: "Money in",
      moneyOut: "Money out",
      net: "Net",
      ledgerUnreadTitle: "The ledger could not be read",
      summaryUnreadBody:
        "Money in, money out and the difference over the last 30 days, across every wallet. The read did not answer just now; nothing about the money itself is implied. Reload in a moment.",
      searchLabel: "Find a person, a wallet or a payment",
      searchPlaceholder: "Name, wallet id or reference",
      ledgerTitle: "Ledger",
      ledgerUnreadBody:
        "Every wallet entry, newest first, with the platform float after each one. The read did not answer just now; reload in a moment.",
      matchingFilter: "Matching this filter",
      newestForty: "Newest first, up to forty",
      settled: "Settled",
      settledHintNarrowed: "Across the wallets matching this filter",
      settledHint: "Across the wallets listed below, newest first",
      heldPending: "Held pending",
      heldPendingHint: "Debits that have left a spendable balance and not settled",
      held: "{amount} held",
      disputesTitle: "Disputed holds waiting on a ruling",
      disputesBody:
        "Somebody objected and the money is held until a person rules. Release pays the payee; refund returns it to the payer. Both people are sent your ruling word for word, and the transition is in the audit log. The full desk is at",
      disputeLine: "{payer} paid, {payee} waits",
      thePayer: "the payer",
      thePayee: "the payee",
      rentState: {
        awaiting: "Awaiting payment",
        paid: "Paid",
        no_show: "Did not move in",
        check: "Needs a look",
      },
      rentPeriod: { month: "Monthly", quarter: "Quarterly", year: "Yearly" },
      rentTitle: "Tenancy charges",
      rentUnreadTitle: "Tenancy charges could not be read",
      rentUnreadBody:
        "Every move-in charge by where it stands, and the newest ones. The read did not answer just now; nothing about the charges themselves is implied. Reload in a moment.",
      rentHint: { one: "{count} charge", other: "{count} charges" },
      rentHintPartial: {
        one: "{count} charge, more than one pass reads",
        other: "{count} charges, more than one pass reads",
      },
      rentByState: "Tenancy charges by state",
      rentEnded: "Cancelled or did not move in",
      rentCaption: "The newest tenancy charges",
      opened: "Opened",
      tenancy: "Tenancy",
      moveIn: "Move-in",
      total: "Total",
      state: "State",
      rentNoneTitle: "No tenancy charge yet",
      rentNoneFills:
        "Every move-in charge by where it stands, what is paid and what is awaited, and the newest charges.",
      rentNoneCreates:
        "A charge opens when a tenant starts paying the move-in costs on an inspection the lister accepted.",
      flowTitle: "Money in vs money out",
      flowUnreadBody:
        "Settled money coming into wallets against settled money leaving them, month by month for a year. The read did not answer just now; reload in a moment.",
      flowNoneTitle: "No money has settled yet",
      flowOneMonth: "One month of settled money so far ({month})",
      flowFills: "Settled money into wallets against settled money out, month by month for a year.",
      flowCreates:
        "Every top-up, booking payment, payout and refund that completes adds to it. A line needs a second month, so none is drawn.",
      flowLabel: "Settled money in and out of wallets by month",
      ledgerFoot: "The balance column is the platform float, so it is shown only for the unfiltered ledger.",
      date: "Date",
      description: "Description",
      type: "Type",
      amount: "Amount",
      balance: "Balance",
      ledgerNoneTitle: "No money has moved yet",
      ledgerNoneFills: "Every wallet entry, newest first, with the platform float after each one.",
      ledgerNoneCreates: "A top-up, a booking payment, a payout or a refund writes the first entry.",
      credit: "Credit",
      debit: "Debit",
      entries: "entries",
      refundState: {
        submitted: "Sent back to the card",
        pending: "Not yet sent to the processor",
        failed: "The processor refused it",
        nothing_owed: "Nothing was owed",
      },
      openStay: "Open the stay",
      kept: "{amount} kept",
      refundsTitle: "Refunds",
      refundsBody:
        "Every refund decided on the console, newest first, with where the money is now. A stay is refunded from its own page under the published schedule; open a stay from the Stays queue to decide one. The money goes back to the card or account it came from through Paystack; the state beside each row is what the processor said.",
      returned: "Returned",
      returnedHint: { one: "Across 1 refund on the platform", other: "Across {count} refunds on the platform" },
      notCredited: "Not yet with the processor",
      notCreditedHint: "A refund Paystack has not accepted needs a person to retry it",
      refundsNoneTitle: "No refund has been decided yet",
      refundsNoneFills: "Every refund decided on the console, with where its money is now.",
      refundsNoneCreates: "A stay is refunded from its own page under the published schedule.",
    },


    supply: {
      lede: "More supply. More choice. A stronger marketplace.",
      host: "Host",
      many: { owner: "Owners", agent: "Agents", firm: "Firms", host: "Hosts" },
      noneYet: { owner: "No owners yet", agent: "No agents yet", firm: "No firms yet", host: "No hosts yet" },
      noneYetOutside: {
        owner: "No owners yet outside the examples",
        agent: "No agents yet outside the examples",
        firm: "No firms yet outside the examples",
        host: "No hosts yet outside the examples",
      },
      propertyType: {
        apartment: "Flats",
        home: "Houses",
        villa: "Villas",
        rental: "Rentals",
        shop: "Shops",
        office: "Offices",
      },
      includingExamples: "Including examples",
      examplesLeftOut: "Examples left out",
      byRole: "Supply by role",
      byRoleOf: "Supply by role: {role}",
      accountsInRole: "Accounts on the platform in this role",
      noneWeekAgo: "None a week ago to compare with",
      incomplete: "There are more accounts than this desk reads in one pass, so these counts are at least these numbers.",
      examplesExcluded: {
        one: "{count} example account is left out of every figure on this page. They are seeded so the catalogue is not empty; the Examples desk manages them.",
        other:
          "{count} example accounts are left out of every figure on this page. They are seeded so the catalogue is not empty; the Examples desk manages them.",
      },
      accounts: { one: "{count} account", other: "{count} accounts" },
      unreadTitle: "Supply could not be read",
      unreadTable:
        "Every owner, agent, firm and host with their verification, how many listings they hold, how much has been paid to them and when they joined. The read did not answer just now; reload in a moment.",
      nobodyYet: "Nobody supplies the platform yet",
      nobodyYetOutside: "Nobody supplies the platform yet outside the examples",
      tableFills:
        "Every owner, agent, firm and host, with their verification, live listings, what has been paid to them and when they joined.",
      tableCreates: "An account appears here when its application is approved on the verification desk.",
      openVerification: "Open the verification queue",
      yes: "Yes",
      no: "No",
      accountsNoun: "accounts",
      topAreasTitle: "Top 5 areas by supply",
      unreadAreas: "The five areas with the most live listings and stays, ranked. The read did not answer just now.",
      noLiveTitle: "No live listing yet",
      areasFills: "The five areas with the most live listings and stays, ranked.",
      noLiveCreates: "A listing counts here once it is approved and published.",
      openListingReview: "Open listing review",
      byTypeTitle: "Supply by property type",
      unreadTypes:
        "Live listings split by property type, from houses and flats to hotels and restaurants. The read did not answer just now.",
      byTypeLabel: "Live listings by property type",
      total: "Total",
      typesFills: "Live listings split by property type, from houses and flats to hotels and restaurants.",
      memberState: { pending: "Pending", active: "Active", revoked: "Revoked" },
      rostersTitle: "Firm rosters",
      rostersUnreadTitle: "Firm rosters could not be read",
      rostersUnreadBody:
        "Who works at each firm, pending, active and revoked. The read did not answer just now; reload in a moment.",
      memberships: { one: "{count} membership", other: "{count} memberships" },
      firms: { one: "{count} firm", other: "{count} firms" },
      rostersHint: "{memberships} across {firms}",
      rostersExcluded: ", {count} at example firms left out",
      membershipsByState: "Firm memberships by state",
      agent: "Agent",
      role: "Role",
      state: "State",
      since: "Since",
      noRoster: "No firm has a roster yet",
      noRosterOutside: "No firm has a roster yet outside the examples",
      rosterFills:
        "Every firm's members under its name: pending, active and revoked, the principal first, with the day each was admitted or revoked.",
      rosterCreates:
        "A firm's principal, or platform staff, admits an agent to a firm; each admission and revocation is written to the audit log.",
      openBusinessReview: "Open business review",
      aFirm: "A firm",
      firmNoName: "A firm with no name on record",
      firmCounts: "{pending} pending · {active} active · {revoked} revoked",
      membersOf: "Members of {firm}",
      thisFirm: "this firm",
      principal: "Principal",
      staff: "Staff",
      revokedOn: "Revoked {day}",
      admittedOn: "Admitted {day}",
      growthTitle: "Supply growth by role",
      growthUnreadBody:
        "How many owners, agents, firms and hosts the platform has had at the end of each of the last six months. The read did not answer just now.",
      growthNoneTitle: "No supply to chart yet",
      growthFills:
        "How many owners, agents, firms and hosts the platform has had at the end of each of the last six months.",
      growthCreates: "Each approved application adds an account to its role's line.",
      openApplications: "Open agent applications",
      growthLabel: "Accounts in each supply role at the end of each month",
      name: "Name",
      listings: "Listings",
      verified: "Verified",
      transacted: "Total transacted",
      joined: "Joined",
    },

    payments: {
      lede: "Money coming in, and anything stuck, short or waiting on the provider.",
      healthTitle: "Health",
      healthHint: "Money that is stuck, short, or waiting on the provider",
      shortfall: "Ledger shortfall",
      addsUp: "Every wallet adds up",
      belowZero: { one: "1 wallet is below zero", other: "{count} wallets are below zero" },
      frozen: "Frozen by stuck holds",
      nothingHeld: "Nothing is held past its window",
      olderThan: {
        one: "1 withdrawal older than {minutes} minutes",
        other: "{count} withdrawals older than {minutes} minutes",
      },
      waitingProvider: "Waiting on the provider",
      nothingUnsettled: "Nothing unsettled in thirty days",
      pendingOrFailed: { one: "1 payment pending or failed", other: "{count} payments pending or failed" },
      clearTitle: "The money is where it should be",
      clearFills:
        "No wallet is overdrawn, no withdrawal is held past its window, and the provider has settled everything it was sent in the last thirty days.",
      clearCreates: "An overdrawn wallet, a stuck hold or an unsettled payment appears here the moment one exists.",
      overdrawnTitle: "Overdrawn wallets",
      overdrawnHint:
        "A wallet whose settled entries sum below zero. This is not a delay, it is an arithmetic failure in the ledger, and it has no button here on purpose: an adjusting entry typed into a web form would bury the evidence an engineer needs to find the cause.",
      owner: "Owner",
      wallet: "Wallet",
      balance: "Balance",
      nameNotOnFile: "Name not on file",
      stuckTitle: "Stuck withdrawal holds",
      stuckHint:
        "A withdrawal still marked pending after {minutes} minutes. The money is neither in the owner's spendable balance nor in their bank account.",
      stuckNoneTitle: "No withdrawal is stuck",
      stuckNoneFills: "Every pending hold is inside its window, which means it is on its way rather than frozen.",
      stuckNoneCreates: "A withdrawal still pending after the window appears here with the control to release it.",
      reference: "Reference",
      heldSince: "Held since",
      amount: "Amount",
      waitingHint:
        "Payments the provider has not settled, from the last thirty days. Re-asking the provider is the reconcile job's decision to take, not this screen's.",
      waitingCaption: "Payments waiting on the provider",
      state: "State",
      provider: "Provider",
      started: "Started",
      unknownProvider: "Unknown provider",
      outcome: { succeeded: "Succeeded", initialised: "Started", abandoned: "Abandoned" },
      kpiStarted: "Started",
      kpiStartedNote: "Checkouts and top-ups begun this week",
      kpiSucceededNote: "Paid and settled this week",
      kpiFailedNote: "Refused or reversed this week",
      kpiAbandonedNote: "Started and not finished within a day",
      perDayTitle: "Money in per day",
      unreadTitle: "Payments could not be read",
      unreadCharts: "Every checkout and top-up the platform has started. The read did not answer just now; reload in a moment.",
      perDayHint: "Succeeded, last 30 days",
      perDayNone: "No payment succeeded in thirty days",
      perDayOne: "One day of payments so far",
      perDayFills: "The value of checkouts and top-ups that succeeded each day over the last thirty days.",
      perDayCreates: "Every payment the provider settles adds to its day. A line needs two days, so none is drawn.",
      openMoneyDesk: "Open the money desk",
      perDayLabel: "Succeeded payments per day, last thirty days",
      paymentsRow: "Payments",
      byChannelTitle: "By channel",
      byChannelHint: "Attempts, last 30 days",
      noAttemptTitle: "No payment attempt in thirty days",
      byChannelFills: "Checkouts and top-ups by the channel they were paid through: card, bank transfer, USSD and the rest.",
      byChannelCreates: "The channel is recorded when the provider confirms a top-up.",
      channelIn: "{channel}: {amount} in",
      nothingOnChannel: "Nothing succeeded on any channel in thirty days.",
      endedTitle: "Where payments ended",
      attempts30: { one: "{count} attempt, last 30 days", other: "{count} attempts, last 30 days" },
      endedLabel: "Payment attempts by outcome, last thirty days",
      endedFills: "Where every checkout and top-up ended: succeeded, still in progress, abandoned, failed or refunded.",
      startsOne: "A guest paying for a stay or a person funding their wallet starts one.",
      everyTitle: "Every payment",
      attempts: { one: "{count} attempt", other: "{count} attempts" },
      narrowOutcome: "Narrow the payments",
      narrowKind: "Narrow by kind",
      allOutcomes: "All outcomes",
      allKinds: "Checkouts and top-ups",
      checkouts: "Booking checkouts",
      topups: "Wallet top-ups",
      unreadTable: "Every checkout and top-up with its reference, channel and outcome. The read did not answer just now.",
      kind: "Kind",
      channel: "Channel",
      outcomeColumn: "Outcome",
      noMatchFills: "No payment attempt has that outcome or kind.",
      showEvery: "Show every payment",
      noneTitle: "No payment has been started yet",
      noneFills: "Every booking checkout and wallet top-up, with its reference, channel and where it ended.",
      checkout: "Booking checkout",
      topup: "Wallet top-up",
      paymentsNoun: "payments",
      lookup: {
        title: "Saved cards and bank accounts",
        hint: "Find a person by handle, email address or account id to see what they have saved to pay with or be paid to. Cards show what the processor filed, never a number. Accounts show their last four digits only.",
        field: "Handle, email or account id",
        placeholder: "@handle, name@example.com, or an id",
        submit: "Look up",
        unreadable: "That does not read as a handle, an email address or an account id. Check it and try again.",
        emailOff:
          "Looking a person up by email address is not switched on in this deployment yet. Search by their handle or their account id instead.",
        noMatch: {
          email: "No account matches that address.",
          handle: "No account matches that handle.",
          id: "No account matches that id.",
        },
        savedCards: "Saved cards",
        noCards: "No card has been saved on this account.",
        card: "Card",
        ending: "{what} ending {last4}",
        expires: "Expires {month}/{year}",
        noExpiry: "Expiry not on file",
        isDefault: " · default",
        notChargeable: " · processor says no longer chargeable",
        saved: " · saved ",
        filed: " · filed ",
        removedOn: "Removed {when}",
        bankAccounts: "Bank accounts",
        noAccounts: "No bank account has been filed on this account.",
        termsUnread: "What this person accepted could not be read just now.",
        termsNone:
          "Nothing on file. Acceptances have been recorded since 22 September 2026, so an account opened before then has no receipt to show.",
        acceptedPrivacy: "Accepted the privacy notice, version {version}",
        acceptedTerms: "Accepted the terms, version {version}",
      },
      remove: {
        done: "Removed. The owner has been told, and the reason is in the audit log.",
        open: "Remove at their request",
        question: "Remove {describe} from their account?",
        bodyCard:
          "It comes off their list exactly as if they had removed it themselves. The row is kept for support, the owner is sent a notification saying a member of staff did this, and your reason goes into the audit log. Nothing about the card itself is written anywhere new.",
        bodyAccount:
          "It comes off their list exactly as if they had removed it themselves. The row is kept for support, the owner is sent a notification saying a member of staff did this, and your reason goes into the audit log. Nothing about the account itself is written anywhere new.",
        who: "Who asked, and how",
        placeholder: "For example: owner asked by support ticket 1234 after losing the phone the card was on.",
        confirm: "Remove {describe}",
      },
    },

    /*
     * The console shell, overview, operations and analytics.
     * Additive: nothing above is changed. Placeholders in
     * braces are filled by the console.
     */
    shell: {
      nav: {
        overview: "Overview",
        queue: "Unified queue",
        listings: "Listings",
        supply: "Supply",
        applications: "Applications",
        businesses: "Businesses",
        stops: "Stops",
        kyc: "Verification",
        money: "Money",
        payments: "Payments",
        fees: "Fees",
        escrow: "Escrow",
        bookings: "Bookings",
        moderation: "Moderation",
        flags: "Message flags",
        reports: "Reports",
        social: "Around",
        standing: "Standing",
        tickets: "Support",
        operations: "Operations",
        alerts: "Alerts",
        audit: "Audit log",
        analytics: "Analytics",
        settings: "Settings",
        switches: "Switches",
        reference: "Reference data",
        examples: "Examples",
        allDesks: "All desks",
        allDesksWaiting: "{count} waiting across the desks below",
        closeMenu: "Close the console menu",
        brandHome: "Vallo console overview",
      },
      counts: {
        listings: "listings waiting on a review decision",
        applications: "applications waiting on a decision",
        moderation: "held posts, stories, comments and bios waiting on a decision",
        flags: "flagged messages waiting on a decision",
        reports: "reports open or under review",
        tickets: "support tickets open or pending",
        alerts: "alerts open, waiting on a person",
      },
      bar: {
        search: "Search anything...",
        operator: "Platform Operator",
        owner: "Platform Owner",
      },
      entry: {
        opening: "Opening the overview first.",
        headingTo: "You were heading to",
        continue: "Continue",
      },
      states: {
        unavailableTitle: "This did not load",
        unavailableBody: "{what} could not be read just now. Nothing has changed.",
        unavailableRetry: "The page reads again every minute; reload to try at once.",
        notRecorded: "Not recorded",
        notRecordedYet: "Not recorded yet",
        notReadable: "Not readable by an admin yet",
        unavailable: "Unavailable",
        noChange: "No change",
        viewAll: "View all",
      },
      overview: {
        title: "Console overview",
        pulse: "Platform pulse",
        week: "This week",
        listingsLive: "Listings live",
        signupsToday: "Sign-ups today",
        collectedToday: "Naira transacted today",
        jobsHealthy: "Jobs healthy",
        jobsOf: "{healthy} of {total} jobs",
        liveListings: "Live listings",
        newSupply: "New supply this week",
        collected: "Naira transacted",
        openReviews: "Open reviews",
        vsLastWeek: "vs last week",
        examplesNotCounted: "Examples not counted",
        waitingDecision: "Waiting on a decision",
        chartTitle: "Naira transacted over time",
        supplyTitle: "Supply by type",
        rolesTitle: "New listings per month",
        alertsTitle: "Recent alerts",
        range30: "Last 30 days",
        range90: "Last 90 days",
        range12: "Last 12 months",
        owner: "Owner",
        agent: "Agent",
        firm: "Firm",
        kinds: {
          rent: "Rent",
          buy: "Buy",
          land: "Land",
          hotels: "Hotels",
          shortlets: "Shortlets",
          restaurants: "Restaurants",
        },
        emptyMoneyTitle: "No money collected in this range",
        emptyMoneyFills: "Each successful card or bank payment is counted here on the day it clears.",
        emptyMoneyCreates: "Money arrives when guests book stays and tenants pay rent through Vallo.",
        emptySupplyTitle: "No real supply live yet",
        emptySupplyFills: "Live listings from owners, agents and firms are counted here by type. Example listings are not; they are on the Examples desk.",
        emptySupplyCreates: "Supply arrives when a lister is approved and their listing passes review.",
        emptyRolesTitle: "No real listing created in these months",
        emptyRolesFills: "Each new listing is counted in the month it was made, under Owner, Agent or Firm by who listed it.",
        emptyRolesCreates: "Listings come from owners, agents and firms whose applications were approved.",
        noAlertsTitle: "No alerts raised",
        noAlertsFills: "When a scheduled job, a payment or a safety check needs a person, the alert lands here and on the Alerts desk.",
        noAlertsCreates: "Jobs, the money reconcile and the safety scan raise them on their own.",
      },
      operations: {
        title: "Operations",
        lede: "Monitor jobs, alerts and system health.",
        activeAlerts: "Active alerts",
        onSchedule: "{percent}% on schedule",
        vsWeekAgo: "vs a week ago",
        tabJobs: "Scheduled jobs",
        tabAlerts: "Alerts",
        tabAudit: "Audit log",
        tabNotifications: "Notifications",
        tabInFlight: "In flight",
        jobName: "Job name",
        schedule: "Schedule",
        lastRun: "Last run",
        duration: "Duration",
        status: "Status",
        healthy: "Healthy",
        attention: "Attention",
        failed: "Failed",
        overdue: "Overdue",
        noRunYet: "No run yet",
        databaseJobs: "Database jobs",
        inspections: "Inspections",
        newestRequests: "Newest requests",
        accountDeletions: "Account deletions",
        businessTransfers: "Business transfers",
      },
      analytics: {
        title: "Analytics",
        lede: "Understand demand, supply and performance.",
        totalSearches: "Total searches",
        listingViews: "Listing views",
        successfulBookings: "Successful bookings",
        conversion: "Conversion rate",
        demandSupply: "Demand vs supply",
        topAreas: "Top areas by searches",
        thinAreas: "Areas with fewest listings",
        searchesResults: "Searches vs results returned",
        refusals: "Top common refusals",
        listingsCreated: "Listings created",
        vsPrev30: "vs the 30 days before",
        vsPrev90: "vs the 90 days before",
        vsPrev12: "vs the year before",
        priceChecks: "Price checks",
        checksAnswered: "Checks answered",
        checksLegend: "Price checks",
        answeredLegend: "Answered",
        topAreasChecks: "Top areas by price checks",
        checksVsAnswered: "Price checks vs answered",
        refusalsTitle: "Top common refusals",
        area: "Area",
        checksColumn: "Checks",
        reason: "Reason",
        count: "Count",
        noChecksTitle: "No price check made in this range",
        noChecksFills: "Each price check a person asks for is counted here in the period it was made, beside the listings created.",
        noChecksCreates: "People check a price from a listing, from search or from an area page.",
        noAreasTitle: "No price check with an area yet",
        noAreasFills: "The local governments people ask about most are named here, most first.",
        noRefusalsTitle: "No check refused in this range",
        noRefusalsFills: "When a price check cannot give an honest figure, the reason is counted here: too few comparable listings, prices too far apart, no location and the rest.",
        refusal: {
          no_location: "No location given",
          no_comparables: "No comparable listings",
          too_few_comparables: "Too few comparable listings",
          too_few_sized: "Too few with a stated size",
          wide_dispersion: "Prices too far apart",
          stale: "Comparables too old",
          unsupported_type: "Property type not covered",
          unsupported_period: "Rent period not covered",
          demo_only: "Only example listings nearby",
          unrecorded: "No reason recorded",
        },
      },
      /** Panel and empty-state copy on the shell's desks, keyed by where it appears. */
      text: {
        inflightTheInspections: "The inspections",
        inflightNoInspectionRequestedYet: "No inspection requested yet",
        inflightEveryInspectionIsCountedHere: "Every inspection is counted here by state, from the request to the visit.",
        inflightARenterAsksToView: "A renter asks for an inspection of a listing from its page; the lister confirms, proposes a time or declines.",
        inflightNothingRequestedYet: "Nothing requested yet",
        inflightTheEightNewestInspectionRequests: "The eight newest inspection requests appear here with their listing and state.",
        inflightNotReadableByAnAdmin: "Not readable by an admin yet",
        inflightPeopleWhoAskedToClose: "People who asked to close their account, by state (scheduled, purging), with the date each purge is due.",
        inflightOnlyTheAccountHolderMay: "Only the account holder may read these rows today; Request A12 asks for an admin read. The purge job's own runs are on the Scheduled jobs tab.",
        inflightBusinessesOfferedFromOneOwner: "Businesses offered from one owner to another and waiting on an answer, with when each offer expires.",
        inflightOnlyTheTwoPartiesMay: "Only the two parties may read these rows today; Request A13 asks for an admin read.",
        inflightDatabaseJobsOneByOne: "Database jobs, one by one",
        inflightEachOfTheDatabaseJobs: "Each of the {count} database jobs with its last run, outcome and failures in the last day: {names}.",
        inflightTheDatabaseDoesNotExpose: "The database does not expose its job table to the console; Request A5 asks for an admin read. The Scheduled jobs tab carries their summary.",
        inflightMoneyReconciliationWatch: "Money reconciliation watch",
        inflightTheMoneyReconcileSLast: "The money reconcile's last request, its reply and its verdict, from the watch the database keeps.",
        inflightThatWatchIsNotReadable: "That watch is not readable by an admin; admin-money's request 10 asks for it. The reconcile's runs are on the Scheduled jobs tab.",
        opsAlerts: "Alerts",
        opsTheAuditLog: "The audit log",
        opsNothingRecordedYet: "Nothing recorded yet",
        opsEveryDecisionTakenOnThis: "Every decision taken on this console and every scheduled run is written here with who or what took it.",
        opsTheAlertDesk: "The alert desk",
        opsNoAlertsRaised: "No alerts raised",
        opsAFailedJobAMoney: "A failed job, a money mismatch or a safety check that needs a person raises an alert here.",
        opsTheScheduledJobsTheMoney: "The scheduled jobs, the money reconcile and the safety scan raise them on their own.",
        opsTheScheduledJobRuns: "The scheduled job runs",
        opsRecordedActionsPerDay: "Recorded actions per day",
        opsTheAuditActivity: "The audit activity",
        opsByKind: "By kind",
        opsNothingToGroupYet: "Nothing to group yet",
        opsKindsAppearHereAsActions: "Kinds appear here as actions are recorded.",
        opsLatestEntries: "Latest entries",
        opsEveryDecisionTakenOnThis2: "Every decision taken on this console is written here with the name of whoever took it.",
        opsNotificationsSent: "In-app notifications by kind",
        ovPeopleInAll: "{count} people in all",
        opsPushQueueNow: "Push queue now",
        opsPushOutcomes: "Push outcomes, last {days} days",
        opsPushDeliveries: "Device attempts, last {days} days",
        opsPushRecent: "Newest device attempts",
        opsPushFailures: "Newest failures",
        opsPushState: "State",
        opsPushCount: "Count",
        opsPushOutcome: "Outcome",
        opsPushDevice: "Device",
        opsPushProvider: "Provider",
        opsPushWhen: "When",
        opsPushNoQueueTitle: "No push queued yet",
        opsPushNoQueueFills: "Every push the platform queues is counted here by the state it is in now: waiting, held for quiet hours, sending, retrying, out of attempts or done.",
        opsPushNoQueueCreates: "A push is queued when a notification is written for somebody who has push on for its kind.",
        opsPushNoOutcomesTitle: "No push settled in this window",
        opsPushNoOutcomesFills: "Each settled push is counted by how it ended: delivered, suppressed by a preference, no device, expired, folded into a summary, or given up.",
        opsPushNoDeliveriesTitle: "No device attempt in this window",
        opsPushNoDeliveriesFills: "Each attempt to reach one device is counted by what the provider answered.",
        opsPushNoFailuresTitle: "No failed attempt",
        opsPushNoFailuresFills: "An attempt the provider refused, or that found the device gone, is listed here with the provider's status and error.",
        opsEmailOutbox: "Email outbox",
        opsEmailOutboxWhat: "Every email the platform queues, by status (waiting, sending, sent, failed), with the oldest waiting and the newest failures.",
        opsEmailOutboxRequest: "Admins cannot read the email outbox today (row security is on and no admin policy exists); Request A14 asks for an admin read of the statuses without the payloads.",
        opsNotReadableByAnAdmin: "Not readable by an admin yet",
        opsEveryNotificationThePlatformSends: "Every in-app notification, by kind (booking, message, payments, listing, agent, support, system, social), with how many were read. Push is counted above.",
        opsAdminsCannotReadTheNotifications: "Admins cannot read the in-app notifications table today; Request A6 asks for an admin read of the volumes by kind.",
        opsNoNotificationsSentInThis: "No notifications sent in this window",
        opsEachNotificationThePlatformSends: "Each notification the platform sends is counted here by kind.",
        opsNothingRecordedIn30Days: "Nothing recorded in 30 days",
        opsEachDecisionAndEachScheduled: "Each decision and each scheduled run adds one entry on the day it happens.",
        opsOpenTheAlertDesk: "Open the alert desk",
        opsSearchTheLog: "Search the log",
        anTheAreasPeopleSearchMost: "The areas people search most, fed by every search recorded with its area.",
        anNothingRecordsASearchYet: "Nothing records a search yet; Request A7 asks for a search log.",
        anWhyOwnersAndHostsDecline: "Why owners and hosts decline, fed by a reason chosen from a fixed list at each decline.",
        anTodayADeclineCarriesFree: "Today a decline carries free text or nothing; Request A11 asks for the list.",
        anNewSupplyOverTime: "New supply over time",
        anSupplyByArea: "Supply by area",
        anNoRealListingLiveIn: "No real listing live in any area yet",
        anTheAreasWithTheLeast: "The areas with the least on offer are named here, fewest first, so supply can be sought there.",
        anAreasAppearAsOwnersAgents: "Areas appear as owners, agents and firms list in them.",
        anNotRecordedYet: "Not recorded yet",
        anSearchesAgainstTheSearchesThat: "Searches against the searches that returned results, fed by every search with its result count.",
        anNoRealListingCreatedIn: "No real listing created in this range",
        anTheLineCountsEachNew: "The line counts each new listing from an owner, agent or firm; examples are not counted.",
        anSearchesAreDrawnBesideIt: "Searches are drawn beside it once they are recorded (Request A7).",
        ovTheAlertDesk: "The alert desk",
        ovMoneyCollectedOverTime: "Money collected over time",
        ovSupplyByType: "Supply by type",
        ovNewListingsByListerRole: "New listings by lister role",
      },
      settings: {
        title: "Settings",
        lede: "The platform's own configuration, one desk each.",
      },
    },
  },

  a11y: {
    logoHome: "Vallo home",
    expand: "Expand",
    collapse: "Collapse",
    openMenu: "Open menu",
    verifiedAccount: "Verified account",
    closeMenu: "Close menu",
    languageSwitcher: "Change language",
    favourite: "Save to favourites",
    /* The dock of shortcuts that only exists from lg up. */
    quickAccess: "Quick access",
    /*
     * Whole sentences with slots rather than a label plus a fragment. English
     * puts the count after the noun and drops an "s" at one; not every language
     * here does either, and a component that concatenates cannot know that.
     * `{label}` is the destination's own translated name.
     */
    notificationsUnread: "Notifications, {count} unread",
    unreadOn: "{label}, {count} unread notifications",
    /* DOC-21: a horizontal scroller a keyboard can reach has to be named. */
    photoGallery: "Photographs of {title}",
    /* DOC-21: the navigation landmarks, each named for what it is, so a
       screen reader's landmark list does not offer two called "Primary". */
    railNav: "Main menu",
    dockNav: "Shortcuts",
  },

  /**
   * /inspections: every inspection this person asked for or was asked to show.
   * Added 18 September 2026.
   */
  inspectionsPage: {
    title: "Inspections",
    openTitle: "Open",
    openDescription: "Your move first, then what is booked in, then what is waiting on them.",
    closedTitle: "Closed",
    readFailed:
      "We could not load your inspections just now, so this is not showing you an empty list that might not be true. Nothing has been lost. Try again in a moment.",
  },

  /**
   * The context banner at the top of a conversation. One sentence about the
   * thing the chat is for, and the one or two controls that belong to it.
   * Added 18 September 2026.
   */
  threads: {
    /*
     * The context card above every thread face, named rather than hardcoded.
     *
     * "Rental enquiry" was an English literal in `ThreadContextBanner.tsx` and
     * a second copy of it in `ThreadView.tsx`, at the top of a Hausa, Igbo or
     * Yoruba reader's own conversation, with every sibling string on the same
     * card already translated.
     */
    context: {
      rentalEnquiry: "Rental enquiry",
      stayBooking: "Stay booking",
      tableBooking: "Table booking",
      directMessage: "Direct message",
      viewBooking: "View booking details",
      viewTrips: "View your plans",
      viewProperty: "View the property",
      viewRestaurant: "View the restaurant",
    },
    rental: {
      waitingOnYou: "They asked to inspect this place. Your answer goes to them and to their inspections list.",
      waitingOnThem: "Waiting on {name} to answer.",
      offeredToYou: "{name} offered another time.",
      offeredByYou: "You offered another time. Waiting on {name}.",
      confirmedFor: "Confirmed for {when}.",
      askedFor: "Asked for {when}.",
      accept: "Accept",
      offerAnother: "Offer another time",
      decline: "Decline",
      acceptTime: "Accept this time",
      withdraw: "Withdraw",
      markInspected: "Mark as inspected",
      payRent: "Pay the rent",
      accepted: "Accepted. The inspection is confirmed on both sides.",
      inspected: "Marked as inspected.",
      withdrawn: "Withdrawn.",
      declined: "Declined.",
      declineTitle: "Decline this request?",
      declineBody: "They will see that you declined. The chat stays open, so you can still explain.",
      declineConfirm: "Yes, decline",
      keep: "Keep it",
      proposeTitle: "Offer another time",
      proposeBody: "They can take it in one tap. The time they asked for stays on the record.",
      proposeWhen: "When you can do it (Lagos time)",
      proposeNote: "A line for them, if you want one",
      proposeSend: "Send this time",
      outcomeTitle: "How did it go?",
      outcomeInspected: "I inspected it",
      outcomeDealDone: "Inspected, and we have a deal",
      outcomeNoDeal: "Inspected, no deal",
      outcomeSave: "Save",
    },
    reservation: {
      tableFor: "table for {count}",
      cancel: "Cancel reservation",
      cancelTitle: "Cancel this table?",
      cancelBody: "The restaurant will see it as cancelled straight away. You can always book again.",
      cancelConfirm: "Yes, cancel it",
      keep: "Keep it",
      cancelled: "Cancelled.",
      status: {
        PENDING: "Requested",
        CONFIRMED: "Confirmed",
        CANCELLED: "Cancelled",
        COMPLETED: "Completed",
        NO_SHOW: "No show",
      },
    },
    booking: {
      label: "Your stay",
      reserved: "Reserved",
      paid: "Paid",
      arrival: "Arrival day",
      completed: "Completed",
      cancelled: "This stay was cancelled.",
    },
  },

  /**
   * /wallet/send: a whole page for sending to another Vallo wallet.
   * Added 18 September 2026.
   */

  /**
   * /wallet/receive: your handle, your address, a request to share.
   * Added 18 September 2026.
   */

  /**
   * /settings/payments: "Payment methods". Cards you pay with, accounts you
   * are paid into. Added 18 September 2026.
   */
  paymentsPage: {
    title: "Payment methods",
    lede: "The cards you pay with and the accounts you are paid into. Nothing here is charged without you.",
    settingsRow: "Payment methods",
    settingsRowSub: "Cards and bank accounts",
    signInTitle: "Sign in to see your payment methods",
    signInBody: "Cards and bank accounts belong to an account, so this screen needs yours.",
    readFailed: "We could not load this just now. Nothing has changed. Try again in a moment.",
    loading: "Loading payment methods",
    keep: "Keep it",
    tryAgain: "Try again",
    cardsLabel: "Cards",
    cardsNote: "Your card number never touches Vallo. The processor keeps it and hands us a token for next time.",
    cardsEmptyTitle: "No card saved yet",
    cardsEmptyBody: "Save one and paying next time is one tap. Your card number never touches Vallo.",
    addCard: "Add a card",
    /* B-6: the amount and where it goes, said before the tap. The webhook
       refunds every card-setup charge in full; Vallo keeps none of it. */
    addCardSub: "We charge ₦100 to check the card and return it to the same card in full. The card is saved for next time.",
    adding: "Opening the secure card window. Nothing has been charged yet.",
    defaultLabel: "Default",
    expires: "Expires {when}",
    expired: "Expired",
    noLongerUsable: "Can no longer be charged",
    cardSheetTitle: "This card",
    makeDefault: "Use as default",
    removeCard: "Remove this card",
    removeCardBody: "It is forgotten here and cannot be charged by Vallo again. Your bank is not involved.",
    removeCardConfirm: "Yes, remove it",
    banksLabel: "Bank accounts",
    banksNote: "Where a Vallo Guarantee payout is sent if a claim is approved. We confirm the name with the bank before saving anything.",
    banksNoteBeforePayouts:
      "Withdrawal to a bank is not available yet. An account saved here is where withdrawals will go once bank payouts open. We confirm the name with the bank before saving anything.",
    accountsEmptyTitle: "No bank account yet",
    accountsEmptyBody: "Add the account your share of a payment, or an approved Guarantee claim, should reach. The first one becomes your default.",
    addAccount: "Add a bank account",
    defaultPayouts: "Default for payouts",
    accountSheetTitle: "This account",
    makeDefaultAccount: "Use for payouts",
    removeAccount: "Remove this account",
    removeAccountBody: "Payments and Guarantee payouts can no longer go here. Nothing already sent is affected.",
    removeAccountConfirm: "Yes, remove it",
    addSheetTitle: "Add a bank account",
    pickBank: "Bank",
    searchBanks: "Search banks",
    banksLoading: "Loading the bank list",
    banksFailed: "We could not load the bank list. Try again in a moment.",
    noBankMatch: "No bank by that name.",
    changeBank: "Change bank",
    accountNumber: "Account number",
    accountNumberHint: "Ten digits. We show the name on the account before anything is saved.",
    checkName: "Confirm the name",
    checking: "Checking with the bank",
    isThisYou: "Is this you?",
    confirmsBelongs: "{bank} says this account belongs to",
    yesSave: "Yes, save this account",
    notMe: "Not me, change the number",
    saving: "Saving",
    blockTitle: "Payment Methods",
    blockSub: "Manage your cards and bank accounts.",
    add: "Add",
    addTitle: "Add a payment method",
    cardWord: "{brand} Card",
    verified: "Verified",
    accountsNote: "The bank confirmed the name on this account before it was saved.",
    blockEmpty: "No card or bank account saved yet. Add a card and paying is one tap.",
    blockEmptyBeforePayouts: "No card or bank account saved yet. Add a card and paying is one tap.",
  },

  /**
   * /stay/[id]: the stay detail showcase. Rooms as rows, rates behind them,
   * the total as the headline. Added 18 September 2026.
   */
  stayDetail: {
    /* UX-08: the in-page date form on a stay. */
    datesTitle: "Your dates",
    datesSubmit: "Show prices for these dates",
    aboutTitle: "About this place",
    roomsTitle: "Rooms",
    roomsDescription: "Tap a room to see its rates and what each one includes.",
    theDetails: "The details",
    amenitiesTitle: "What is here",
    policyTitle: "Cancellation",
    houseRulesTitle: "House rules",
    checkIn: "Check in from",
    checkOut: "Check out by",
    rating: "Stars",
    from: "From",
    perNight: "a night",
    totalLabel: "Total",
    totalFor: "Total for {count} nights",
    everythingIncluded: "Everything included. This is what you pay.",
    guests: "{count} guests",
    changeDates: "Change",
    pickDates: "Pick your dates",
    pickDatesTitle: "Pick your dates for a total",
    pickDatesBody: "Rates change by night, so the total arrives with the dates. Nothing is held until you reserve.",
    pickDatesForTotal: "Pick your dates to see the total.",
    sleeps: "Sleeps {count}",
    tooSmall: "Too small for your party",
    seeRates: "See rates for {room}",
    seeRooms: "See rooms",
    reserve: "Reserve",
    noRate: "No rate yet",
    noRatesYet: "This room has no rates loaded yet. Try another room, or message the property.",
    roomTypes: "{count} room types",
    roomTypesOne: "1 room type",
    noRoomsYet: "The rooms for this property are still being loaded.",
    minStay: "This rate needs at least {count} nights.",
    maxStay: "This rate covers at most {count} nights.",
    freeUntil: "Free to cancel until {hours} hours before you arrive. Refunds go back to the card you paid with.",
    meal: {
      roomOnly: "Room only",
      breakfast: "Breakfast included",
      halfBoard: "Breakfast and dinner included",
      fullBoard: "All meals included",
    },
    category: {
      single: "Single",
      double: "Double",
      twin: "Twin",
      suite: "Suite",
      family: "Family room",
      dorm: "Shared room",
    },
  },

  /**
   * /restaurant/[id]: the dedicated restaurant surface, where the reservation
   * is the page. Added 18 September 2026.
   */
  restaurantPage: {
    fallbackTitle: "Restaurant",
    /* The restaurant face on the one detail anatomy, added 19 September 2026.
       Every one of these labels a column the venue filled in
       itself; a venue that filled none of them draws none of them. */
    aboutTitle: "About this restaurant",
    cuisine: "Cuisine",
    dressCode: "Dress code",
    covers: "Seats {count}",
    parking: "Parking",
    backupPower: "Backup power",
    outdoor: "Outdoor seating",
    menu: "See the menu",
    openNowTitle: "Open now",
    perHead: "a head, typically",
    reserveTitle: "Hold a table",
    reserveBody: "Pick a time and the restaurant answers. Nothing is charged to hold a table.",
    hoursTitle: "Opening hours",
    /* The hours we do not have, said plainly. Never a guessed "open now": a
       badge this page cannot stand behind sends somebody across Lagos to a
       locked door. */
    hoursUnknown:
      "This restaurant has not published its hours on Vallo yet, so we do not show whether the kitchen is open right now rather than guess at it.",
    hoursAsk: "Ask them directly and the answer stays in your messages.",
    message: "Message the restaurant",
    gettingThereTitle: "Getting there",
    threadLine:
      "Your reservation and everything said about it stay in one conversation, so the table you booked and the thread about it never disagree.",
    loading: "Loading this restaurant",
  },

  /**
   * The catalogue and stays surfaces: the property card, the
   * results shelf and its filter sheet, the listing detail, the move-in
   * ledger, stays home and the stay detail. Added 18 September 2026.
   */
  catalogue: {
    card: {
      forRent: "For rent",
      forSale: "For sale",
      perNight: "Per night",
      perHead: "Per head",
      perYear: "/year",
      perMonth: "/month",
      perQuarter: "/quarter",
      night: "/night",
      head: "/head",
      moveIn: "to move in",
      rent: "Rent",
      sqm: "m²",
      noPhotos: "No photographs yet",
      example: "Example",
    },
    shelf: {
      searchPlaceholder: "Area, city or landmark",
      search: "Search",
      filters: "Filters",
      anyMarket: "Any market",
      marketRent: "Rent",
      marketBuy: "Buy",
      beds: "{count}+ bed",
      bedsAny: "Beds",
      price: "Price",
      more: "More",
      found: "{count} properties found",
      foundOne: "1 property found",
      foundNone: "No properties found",
      /* The link under the first 24 results that draws the next ones. */
      showMore: "Show {count} more",
      sort: "Sort",
      sortRecommended: "Recommended",
      sortTopRated: "Top rated",
      sortPriceAsc: "Price, low to high",
      sortPriceDesc: "Price, high to low",
    },
    filters: {
      title: "Filters",
      close: "Close filters",
      clear: "Clear",
      propertyType: "Property type",
      all: "All",
      market: "Market",
      priceRange: "Price range",
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      any: "Any",
      amenities: "Amenities",
      lightAndWater: "Light and water",
      backupPower: "Backup power",
      bandA: "Band A feeder",
      water: "Where the water comes from",
      verifiedOnly: "Verified only",
      trust: "Booking and trust",
      location: "Location",
      locationPlaceholder: "Area, city or landmark",
      sortBy: "Sort by",
      reset: "Reset",
      apply: "Apply ({count})",
      applyNone: "No matches yet",
      noUpperLimit: "No upper limit",
    },
    detail: {
      verifiedListing: "Verified listing",
      moveInTotal: "Move-in total",
      moveInFrom: "Move-in from",
      moveInInfo: "Rent plus every fee the agent named, added up.",
      overview: "Overview",
      amenities: "Amenities",
      location: "Location",
      reviews: "Reviews",
      description: "Property description",
      readMore: "Read more",
      showLess: "Show less",
      livingRooms: "{count} living rooms",
      parking: "Parking",
      generator: "Backup power",
      more: "More",
      agent: "Listed by",
      agentRole: "Agent on Vallo",
      verifiedAgent: "Verified agent",
      message: "Message",
      share: "Share",
      calculateBreakdown: "Calculate breakdown",
      breakdownShort: "Breakdown",
      bookInspection: "Book inspection",
      checkAvailability: "Check availability",
      seeAll: "See all",
      photos: "{count} photos",
      morePhotos: "+{count}",
      /** The detail anatomy of B047A0CE, added 19 September 2026. */
      aboutThisProperty: "About this property",
      verifiedHost: "Verified host",
      selectDate: "Select date",
      bookNow: "Book now",
    },
    ledger: {
      title: "Move-in cost",
      lede: "A clear breakdown of every cost before you move in.",
      breakdown: "Cost breakdown",
      total: "Total move-in cost",
      namedSoFar: "Named so far",
      statedNote: "Stated by the agent. Anything not listed here is not part of their quote, so ask before you pay.",
      summedNote: "The agent has not given one total, so this is the sum of the parts they named. There may be more; ask before you pay.",
      areaComparison: "Area comparison",
      averageInArea: "Average rent nearby",
      lowerThanAverage: "{percent}% below the area average",
      higherThanAverage: "{percent}% above the area average",
      aboutAverage: "About the area average",
      comparedWith: "Against {count} other rentals in {area}",
      proceed: "Proceed to booking",
      proceedPay: "Pay the rent",
      bookInspection: "Book an inspection",
      inspectFirst: "Payment opens once your inspection is accepted.",
      payAfter: "Pay only after inspection",
      verified: "Verified listing",
      insideVallo: "Everything inside Vallo",
      notFound: "That listing is no longer available.",
      notRental: "Only a home to rent has a move-in cost.",
    },
    /**
     * A TENANCY IS NOT A STAY, so it has its own words. Added 19 September
     * 2026 when rent charges stopped being dropped from
     * /bookings. Nothing here counts nights or guests, and nothing here says
     * check in: a tenancy has a move-in day and a rent period.
     */
    /**
     * The trips hub (/bookings). Added 19 September 2026: the
     * screen shipped with its tabs, its three empty states, its controls and
     * its explainer as English literals inside the component, so three of the
     * four languages this platform ships in read the record of their own
     * paid stays in English.
     */
    bookings: {
      statusLabel: "Booking status",
      upcoming: "Upcoming",
      completed: "Completed",
      cancelled: "Cancelled",
      findPlace: "Find a place",
      payNow: "Pay now",
      cancel: "Cancel",
      leaveReview: "Leave a review",
      yourReview: "Your review",
      viewDetails: "View details",
      total: "total",
      arriving: "Arriving: {name}",
      unavailableTitle: "We could not load your stays",
      unavailableBody:
        "Something on our side did not answer just now. Nothing has changed about your bookings. Reload the page and they should come straight back.",
      signedOutTitle: "Sign in to see your stays",
      signedOutBody:
        "Every stay you book is tied to your account, so we only ever show you your own. Sign in and anything booked with this account appears here.",
      signIn: "Sign in",
      findStay: "Find somewhere to stay",
      /* The two halves of the record, each saying where the other half is
         (R3 finding F-08). Written as one sentence and a link rather than a
         second navigation block. */
      openBookings: "Open Bookings",
      /* One booking's own page, which a shared card opens (R2 finding R2-2).
         "Not yours" and "not there" say the same thing on purpose: naming the
         difference would confirm to somebody guessing that a booking exists. */
      detailMissingTitle: "That booking is not here",
      detailMissingBody:
        "It may belong to another account, or it may have been cancelled and removed. Open your bookings to see what is there now.",
      howTitle: "How booking works",
      step1Title: "Choose your dates",
      step1Body: "Pick check-in and check-out on a live calendar.",
      step2Title: "Confirm and pay",
      step2Body: "Payment in naira through Paystack. You are never charged early.",
      step3Title: "Enjoy your stay",
      step3Body: "Check-in details arrive right here and by email.",
    },
    tenancy: {
      section: "Your tenancies",
      sectionLine: "Rent you have started paying for on Vallo.",
      moveIn: "Move in {date}",
      period: "{period} rent",
      total: "Move-in total",
      pay: "Pay the rent",
      due: "Rent due",
      settled: "Rent paid",
      view: "View property",
    },
    stays: {
      title: "Stays",
      lede: "Hotels, apartments, guest houses, resorts and more.",
      wherePlaceholder: "Where are you going?",
      search: "Search stays",
      filters: "Filters",
      hotels: "Hotels",
      apartments: "Apartments",
      resorts: "Resorts",
      guestHouses: "Guest houses",
      serviced: "Serviced apartments",
      featured: "Featured stays",
      seeAll: "See all",
      perNight: "per night",
      reviews: "({count} reviews)",
      results: "{count} stays",
      resultsOne: "1 stay",
      resultsNone: "No stays match yet",
      nearMissed: "We did not recognise \"{term}\", so these results are not measured from it.",
      checkIn: "Check in",
      checkOut: "Check out",
      guests: "Guests",
      pickDate: "Pick a date",
      rating: "Rating",
      anyRating: "Any",
      roomType: "Room type",
      breakfast: "Breakfast included",
      freeCancellation: "Free cancellation",
      verified: "Verified only",
      nearLandmark: "Near a landmark",
      withinKm: "Within {km} km",
      sortDistance: "Nearest first",
      propertyType: "Property type",
      aboutThisStay: "About this stay",
      bookThisStay: "Book this stay",
      seeRooms: "See rooms",
      roomsTitle: "Rooms",
    },
  },

  /**
   * TRACK H: what a tenant will actually pay.
   *
   * The cost block on the listing detail page and the
   * move-in sort in search read every word from here. The honesty rule is in
   * the copy itself: a cost nobody declared says so in words, because zero is
   * a claim and silence is not the same claim.
   */
  moveIn: {
    title: "What you will actually pay",
    lede: "Every cost this lister has declared, and every one they have not.",
    rent: "Rent",
    agencyFee: "Agency fee",
    legalFee: "Legal fee",
    agreementFee: "Agreement fee",
    cautionDeposit: "Caution deposit",
    cautionBasis: "refundable",
    serviceCharge: "Service charge",
    keptByLister: "Paid to the landlord",
    keptByAgent: "Paid to the agent",
    keptByEstate: "Paid to the estate",
    notDeclared: "Not declared",
    noAgencyFee: "No agency fee",
    noAgencyFeeNote:
      "This lister has declared no agency fee. Vallo does not cap anybody's fee. It publishes it.",
    totalStated: "Total to move in",
    totalFrom: "Move in from",
    statedNote:
      "The figure the lister says you need at the door, rent included. Anything not listed here is not part of their quote, so ask before you pay.",
    summedNote:
      "The lister has not given one total, so this is the sum of the parts they named. There may be more, so ask before you pay.",
    undeclaredOne:
      "One cost above has not been declared. It is not in the total, and you may still be asked for it.",
    undeclaredMany:
      "{count} of the costs above have not been declared. They are not in the total, and you may still be asked for them.",
    sortMoveIn: "Move-in cost: low to high",
    basisPrice: "Sorted on the headline price",
    basisMoveIn: "Sorted on the total move-in cost",
  },

  /**
   * WHAT A BUYER ACTUALLY PAYS: the sale side's twin of `moveIn`.
   *
   * The same honesty rule, with a much bigger number attached. Every cost a
   * buyer meets is named whether or not the lister declared it; an undeclared
   * one carries the words and never a figure; a declared zero says so in
   * words, because "no agency fee" is a promise and "we did not say" is not
   * the same promise.
   *
   * THE ASKING PRICE IS ONE OF THE PARTS HERE, which is the one thing that
   * differs from the tenancy side. A move-in total sits beside the rent; a
   * purchase total includes the price, because that is what a buyer has to
   * find.
   *
   * NOTHING HERE STATES A PERCENTAGE. Agency and legal are conventionally
   * five per cent each and the statutory charges run to several per cent
   * more, but a rate that is usually five per cent is not five per cent, so
   * the lister states what they charge and this dictionary never guesses.
   */
  purchase: {
    title: "What it will cost you to buy",
    lede: "Every cost this lister has declared, and every one they have not.",
    askingPrice: "Asking price",
    agencyFee: "Agency fee",
    legalFee: "Legal fee",
    governorsConsent: "Governor's consent",
    consentBasis: "a transfer is not valid without it",
    stampDuty: "Stamp duty",
    surveyRegistration: "Survey and registration",
    keptBySeller: "Paid to the seller",
    keptByAgent: "Paid to the agent",
    keptByState: "Paid to the state",
    notDeclared: "Not declared",
    noAgencyFee: "No agency fee",
    noAgencyFeeNote:
      "This lister has declared no agency fee. Vallo does not cap anybody's fee. It publishes it.",
    totalStated: "Total to buy",
    totalFrom: "Buy from",
    statedNote:
      "The figure the lister says you need to own it, the asking price included. Anything not listed here is not part of their quote, so ask before you pay.",
    summedNote:
      "The lister has not given one total, so this is the sum of the parts they named. There may be more, so ask before you pay.",
    undeclaredOne:
      "One cost above has not been declared. It is not in the total, and you may still be asked for it.",
    undeclaredMany:
      "{count} of the costs above have not been declared. They are not in the total, and you may still be asked for them.",
    statutoryNote:
      "Governor's consent, stamp duty and registration are paid to the state. Nobody on Vallo can waive them or take a share of them.",
  },

  /**
   * TRACK P: the two home pages and the dock, rebuilt to GOVERNING-01 and
   * GOVERNING-09.
   *
   * The greeting, the name and the location are NOT here: they are the
   * reader's own facts and come from the account, not from a dictionary.
   * Everything the page says about itself does.
   */
  directHome: {
    heroTitle: "Find your next home",
    heroLede: "Rent, buy or sell property across Nigeria.",
    heroSearch: "Search by location, property type",
    filters: "Filters",
    featured: "Featured properties",
    parkingOne: "1 parking",
    parkingMany: "{count} parking",
    buy: "Buy",
    rent: "Rent",
    /* The home's four doors are one short word each (the founder, 25
       September 2026: Buy, Rent, Pay, List). "Pay" opens Agreements, where
       payment opens once an agreement is approved; the tile promises nothing
       beyond the word. */
    manage: "List",
    pay: "Pay",
    invest: "Invest",
    investNote: "Properties presented for their yield. Vallo sells no investment product.",
    stays: {
      heroTitle: "Great stays. Better experiences.",
      heroLede: "Hotels, shortlets and restaurants across Nigeria.",
      heroSearch: "Where do you want to go?",
      featured: "Featured stays",
      hotels: "Hotels",
      hotelsNote: "Comfortable stays",
      shortlets: "Shortlets",
      shortletsNote: "Feels like home",
      restaurants: "Restaurants",
      restaurantsNote: "Great food",
      nearby: "Local talk",
      nearbyNote: "What people say",
    },
    dock: {
      /* The raised centre slot. The sheet it opens is B1's; this is the word
         under the object in GOVERNING-01. */
      switchProfile: "Switch",
    },
  },
  /**
   * TRACK N: the code a person reads out over the phone.
   *
   * A published listing carries `VL-` plus six characters from an alphabet
   * with no 0, O, 1, I, L or U, because those are the characters a person
   * gets wrong reading a code down a Nigerian phone line. The database issues
   * it at the moment the listing goes live and never at draft, so a listing
   * that is still in review genuinely has none and the copy here says so
   * rather than drawing an empty box.
   */
  listingReference: {
    /** Above the one result a typed code found. GOVERNING-12 screen four. */
    foundById: "Found by listing ID",
    /** A well formed code that names nothing live. */
    noneCarry: "No listing carries that code. These are the ordinary results for what you typed.",
    /** The right shape, carrying a character we never mint. */
    impossible:
      "That code has a character we do not use. Our codes never contain zero, one, I, L, O or U.",
    label: "Listing ID",
    /**
     * `yours` and `explain` are written and NOT YET DRAWN ANYWHERE, and that
     * is recorded rather than left for somebody to discover. They are the
     * heading and the sentence of the panel GOVERNING-08 screen four draws on
     * the SENT FOR REVIEW screen, which cannot ship there because the code
     * does not exist until the listing is published. They are the copy for
     * the "your listing is live" surface nobody has built. Deleting them
     * would only mean writing them again.
     */
    yours: "Your listing ID",
    copy: "Copy ID",
    copied: "Copied",
    explain: "Anyone can find this listing by typing this ID into search.",
    /** Said where there is no code yet, which is every listing in review. */
    issuedWhenLive: "You will get a notification, and your listing ID, once it is live.",
  },

  /*
   * THE STRINGS THAT WERE WRITTEN IN ENGLISH INSIDE A FOUR LOCALE PRODUCT.
   *
   * `docs/research/UI_UNIQUENESS_AND_ADMIN_RESEARCH.md` section 2.9 counted
   * seventeen user visible English literals sitting in TSX. They are gathered
   * here rather than spread into `social`, `nav`, `admin` and `stays`, because
   * one namespace added at the end is a change that a concurrent edit
   * elsewhere in this file cannot silently swallow.
   *
   * `QueueFilters.tsx:141` already states the principle these close:
   * "A control that is half translated is worse than one that is not, because
   * the half that is translated is the half that tells the reader the rest is a
   * bug."
   *
   * THIS NAMESPACE IS ENGLISH ONLY AND THAT IS DELIBERATE. `withFallback`
   * already serves English to `ha`, `ig` and `yo` for any key they do not
   * carry, so nothing here is missing at runtime in any locale. Copying the
   * English sentences INTO the three translation files would make the key
   * completeness count go up while the product still read in English, which is
   * the exact defect that survey found: around fifty five full English
   * sentences already sit inside each of those three dictionaries and are the
   * reason a 97 per cent complete locale still renders a mixed language screen.
   * A translation is written by somebody who speaks the language, and until
   * then the honest state is the fallback.
   */
  uiCommon: {
    /** The area chip on a post card. `{area}` is a place name from the database. */
    around: "Around {area}",

    theme: {
      toLight: "Switch to light mode",
      toDark: "Switch to dark mode",
      light: "Light mode",
      dark: "Dark mode",
    },

    /** The inbox's three tabs. */
    inbox: {
      all: "All",
      primary: "Primary",
      requests: "Requests",
      /** Names the tablist itself, which had no name a screen reader could use. */
      filterLabel: "Filter conversations",
    },

    /** Stay facilities that had no dictionary entry beside four that did. */
    facilities: {
      wifi: "Wi-Fi",
      airConditioning: "Air conditioning",
      parking: "Parking",
    },

    /**
     * The operations console's own chrome. `app/admin/_components/nav.ts:22`
     * records that its English was a stopgap taken because this file belonged
     * to another owner; this is the key set that ends the stopgap.
     */
    console: {
      title: "Operations Console",
      short: "Admin",
      notifications: "Notifications",
      filterByStatus: "Filter by status",
      allStatuses: "All",
      table: {
        id: "ID",
        type: "Type",
        titleOrUser: "Title / user",
        status: "Status",
        submitted: "Submitted",
        action: "Action",
        view: "View",
      },
      /** The footer line on every console page. Rule 14: the brand is Vallo. */
      consoleName: "Vallo Operations Console",
    },

    /**
     * The console's charts. Every one of these names a real read; there is no
     * label here for a chart that does not exist, because a legend for a
     * missing series is an invented number with a caption.
     */
    charts: {
      actionsPerDay: "Actions per day",
      actionsByKind: "Actions by kind",
      actionsByActor: "Busiest actors",
      /** The folded tail of a bar chart. A ninth series is never a new colour:
          it is this row, and its count is the real sum of what it folded. */
      everythingElse: "Everything else",
      noData: "Nothing recorded in this window yet.",
      /** Said on a chart whose read is capped, so the shape is true and the
          total is a floor. See `money-queries.ts` RECENT_LIMIT. */
      cappedWindow: "This chart draws the most recent {count} entries only.",
      /** The axis of a daily series. `{count}` is the number of days drawn. */
      lastDays: "Last {count} days",
    },
  },
  /*
   * THE SUPPLY SIDE: the switch profile sheet, and the add a workspace
   * chooser behind it.
   *
   * `apps/web/src/lib/supply/roles.ts` is the machine readable source of
   * truth for the STRUCTURE: which roles exist, which order the doors come
   * in, what each one proves and on which subject. This is the same thing in
   * four languages, keyed by the same ids, so a surface reads the ids from
   * there and the words from here and neither holds a second copy of the
   * other.
   *
   * No statutory figure, penalty or percentage appears anywhere in this
   * namespace. The LASRERA and tenancy numbers wait on a lawyer's
   * confirmation, so what ships is the behaviour, which needs no
   * citation.
   */
  supply: {
    switchTitle: "Your workspaces",
    switchTrigger: "Workspace",
    personal: "Personal",
    personalMeaning: "Use Vallo for your personal needs",
    addTitle: "Add a workspace",
    addMeaning: "Owner, agent or firm; hotel, shortlet or restaurant",
    current: "Current",
    empty:
      "You have no workspaces yet. Add one to list property or take bookings.",
    kinds: {
      owner: "List your own properties",
      agent: "Act for property owners",
      firm: "Registered real estate firm",
      host: "Take bookings on Vallo Stays",
      console: "Operations console",
    },
    /* Text, never colour alone. Three of these four are bad news and a reader
       who cannot see colour must get the same news. */
    standings: {
      /* APPROVED in the database, and nothing else. `GOVERNING-01` screen two
         draws this mark on the Owner row. */
      active: "Verified",
      draft: "Not finished",
      pending: "Pending review",
      refused: "Not approved",
      suspended: "Suspended",
    },
    chooser: {
      title: "Add a workspace",
      sub: "Choose what you want to do on Vallo. Each workspace gets its own tools and its own checks.",
      overviewTitle: "What we will ask you for",
      overviewSub: "We need a few details to verify your workspace and get you set up.",
      continueLabel: "Continue",
      back: "Back",
      chooseAgain: "Choose a different one",
      howLongTitle: "How long it takes",
      selected: "Selected",
      /* UX-05: both groups are always shown; the current side's comes first. */
      groupProperty: "Property: to rent or to sell",
      groupStays: "Stays and tables: by the night or by the table",
    },
    doors: {
      owner: {
        title: "I own the property",
        blurb: "List it yourself. No agency fee.",
        needs: [
          "Your name, phone number and where you live",
          "A government issued ID, or your NIN",
          "Whatever you hold on the property, and there is an honest answer if you hold nothing",
          "A Nigerian bank account in your own name",
        ],
        howLong: "About five minutes.",
      },
      agent: {
        title: "I am an agent",
        blurb: "You act for owners and charge a fee.",
        needs: [
          "Your name, phone number and where you live",
          "A government issued ID, or your NIN",
          "Proof of your address, dated within three months",
          "Your fees, in the open, where a tenant can read them",
          "A Nigerian bank account in your own name",
        ],
        howLong: "About ten minutes.",
      },
      firm: {
        title: "We are a registered firm",
        blurb: "An agency with staff and a CAC number.",
        needs: [
          "Everything an agent gives us, about you",
          "The registered name and RC number, as the CAC holds them",
          "The CAC certificate",
          "Something showing you work there, unless a colleague here admits you",
        ],
        howLong: "About fifteen minutes, and less if your firm is already on Vallo.",
      },
      hotel: {
        title: "We are a hotel",
        blurb: "Rooms, rates and a front desk.",
        needs: [
          "Who you are, and a government issued ID",
          "The hotel's registered name and CAC number",
          "Your rooms, your rates and your cancellation terms",
          "Photographs of the place",
        ],
        howLong: "About fifteen minutes.",
      },
      shortlet: {
        title: "I run a shortlet",
        blurb: "One place or a few, let by the night.",
        needs: [
          "Who you are, and a government issued ID",
          "Where the place is, and what is in it",
          "Your nightly rate and your house rules",
          "Photographs of the place",
        ],
        howLong: "About ten minutes.",
      },
      restaurant: {
        title: "We are a restaurant",
        blurb: "Tables, hours and a menu.",
        needs: [
          "Who you are, and a government issued ID",
          "The restaurant's registered name and CAC number",
          "Your tables, your hours and your cuisine",
          "Photographs of the place",
        ],
        howLong: "About ten minutes.",
      },
    },
    /*
     * THE THREE REGISTRATION FORMS, `GOVERNING-03`, `04` AND `05`.
     *
     * `apps/web/src/lib/supply/registration.ts` holds the STRUCTURE: which
     * screens each form has, which answers each question accepts, and what the
     * server will refuse. This is the same thing in words, keyed by the same
     * ids, so neither file holds a second copy of the other.
     *
     * NO PERCENTAGE, NO NAIRA FIGURE AND NO STATUTORY CLAIM APPEARS HERE.
     * `registration.test.ts` fails if one does. LASRERA is named once, as the
     * name of a field somebody may fill in, and the copy beside it says what
     * the field is for and never what the law requires or what ignoring it
     * costs: the register was unreachable from this build and every claim
     * about it is unconfirmed, so a lawyer rules before any of it is printed.
     */
    register: {
      back: "Back",
      continue: "Continue",
      submit: "Finish",
      submitting: "Filing",
      stepOf: "Step {step} of {total}",
      optional: "Optional",
      notDeclared: "Not declared",
      whatNext: "What happens next",
      filedAs: "Filed as {reference}",
      aPersonReads: "A person reads this and we will tell you the moment it comes back.",
      documentsMissed:
        "Your application is filed, but the files did not attach. Contact us with that reference and we will add them.",
      trackIt: "See how it stands",
      backHome: "Back to home",
      reviewDays: "Usually two working days",
      reviewDaysFirm: "Usually three working days",
      addFile: "Choose a file",
      replaceFile: "Choose a different file",
      uploading: "Uploading",
      fileReady: "Ready to send",
      fileTooBig: "That file is over 10MB. Please choose a smaller photo or PDF.",
      fileFailed: "That upload did not go through. Please try again.",
      signInFirst: "Please sign in before uploading, so the file is filed to your account.",
      owner: {
        title: "Register as an owner",
        you: {
          title: "About you",
          sub: "Tell us a bit about yourself.",
          name: "Full name",
          phone: "Phone number",
          nin: "National identity number (NIN)",
          ninHint: "Eleven digits. You can add it later if you do not have it to hand.",
          assurance: "A person at Vallo reads your application, and every listing, before anything is published.",
        },
        where: {
          title: "Where do you own?",
          sub: "The state and the local government are enough for now.",
          area: "Area or neighbourhood",
          areaHint: "The exact spot on the map belongs to the property itself, and you set it when you list.",
        },
        proof: {
          title: "Proof of ownership",
          sub: "Choose what you hold on the property.",
          docs: {
            certificate_of_occupancy: "Certificate of Occupancy",
            deed_of_assignment: "Deed of assignment",
            governors_consent: "Governor's consent",
            survey_plan: "Survey plan",
            utility_bill: "Utility bill in your name",
            none: "I have none of these",
          },
          stillListTitle: "You can still list",
          stillListBody:
            "That is a normal answer in Nigeria and it does not stop you listing. Your listing goes live the same way; it just will not carry the ownership mark until you can show us something.",
        },
        done: {
          title: "Your owner registration is filed",
          sub: "Nobody has looked at it yet, and this screen will not pretend otherwise.",
          nextOne: "A person reads what you sent.",
          nextTwo: "We write to you with the answer, whichever way it goes.",
          nextThree: "Your listings open the moment it is approved.",
          markPending: "You chose a document, so your listing can carry the ownership mark once we have seen it.",
          markNone: "Your listing will not carry the ownership mark, and nothing else about it changes.",
        },
      },
      agent: {
        title: "Register as an agent",
        you: {
          title: "About you",
          sub: "Tell us a little about yourself.",
          name: "Full name",
          phone: "Phone number",
          experience: "How long have you been working as an agent?",
          bands: {
            under_1: "Under a year",
            "1_2": "One to two years",
            "3_5": "Three to five years",
            "6_10": "Six to ten years",
            over_10: "Over ten years",
            unstated: "I would rather not say",
          },
          assurance:
            "Agents are checked harder than owners, because you are handling somebody else's property.",
        },
        identity: {
          title: "Prove who you are",
          sub: "Send a photo of your ID and one of your face, then add your National Identity Number.",
          idTitle: "A photo of your ID",
          idBody: "National ID, driver's licence or international passport.",
          selfieTitle: "A photo of your face",
          selfieBody: "Clear, well lit, and taken now rather than found.",
          nin: "National identity number (NIN)",
          ninPlaceholder: "e.g. 12345678901",
          ninHint: "Eleven digits.",
        },
        fees: {
          title: "Your fees, in the open",
          sub: "Set what you charge. Every client sees it before they ever ring you.",
          agency: "Agency fee",
          agencyMeaning: "What you charge the landlord.",
          legal: "Legal fee",
          legalMeaning: "What you charge for the legal work.",
          less: "Less",
          more: "More",
          exampleLabel: "Try it on a rent of",
          exampleHint: "Change this to any rent you work with. It is only a worked example and it is not saved.",
          totalLead: "On that rent, a tenant pays",
          totalTrail: "to move in",
          partRent: "Rent",
          partAgency: "Agency fee",
          partLegal: "Legal fee",
          perListing:
            "The caution deposit, the service charge and the agreement fee belong to a property, so they are set on the listing and they are not in this figure.",
          weTakeNone: "Vallo takes none of this. We only show it.",
        },
        done: {
          title: "We are checking your details",
          sub: "Here is what happens next.",
          nextOne: "We check who you are.",
          nextTwo: "We confirm that you work as an agent.",
          nextThree: "We may write to you for one more thing.",
        },
      },
      firm: {
        title: "Register a firm",
        details: {
          title: "Your firm",
          sub: "Tell us about the registered company and where it works from.",
          name: "Registered company name",
          namePlaceholder: "As the CAC holds it",
          rc: "RC number",
          /* THE FORMAT AS AN EXAMPLE, WHICH `GOVERNING-05` DRAWS IN THE
             WELL. The CAC prefixes its numbers RC and that is a format
             rather than a claim about the law, which is the line this
             namespace draws. THERE IS DELIBERATELY NO LASRERA EXAMPLE:
             the render draws one, that register was unreachable from this
             build, and an invented reference would be this platform
             asserting a format it has never seen. */
          rcPlaceholder: "e.g. RC 1234567",
          office: "Office address",
          officePlaceholder: "Enter your office address",
          lasrera: "LASRERA registration number",
          lasreraHint:
            "Give it if you have one. A renter looking for a firm that holds one will be able to find you by it.",
          yourName: "Your own full name",
        },
        association: {
          title: "Prove you work here",
          sub: "Choose how you would like to show that you work with this firm.",
          letterTitle: "Upload a letter from your principal",
          letterBody: "On the firm's paper, naming you and your position, and signed.",
          principalTitle: "Have your principal confirm you",
          principalBody: "We write to them and they say yes or no.",
          principalEmail: "Your principal's email address",
        },
        team: {
          title: "Your team",
          sub: "Add the colleagues who will work on Vallo. You can do this later instead.",
          name: "Their name",
          email: "Their email address",
          add: "Add this person",
          remove: "Remove",
          none: "Nobody added yet, and that is fine. You can invite your colleagues once the firm is approved.",
          each: "Each person is checked on their own. Your firm's standing does not pass to them.",
        },
        done: {
          title: "Your firm is under review",
          sub: "Here is what we are checking.",
          nextOne: "The company registration.",
          nextTwo: "Your own role in the firm.",
          nextThree: "Everybody you added.",
        },
      },
    },
  },

  /**
   * The consented departure.
   *
   * Vallo does not send anybody anywhere without saying where. The one place
   * a user-supplied link genuinely has to leave the platform is somebody's
   * own profile link, because "one place people can find you" is the whole
   * feature. It gains this sheet instead of being a one tap jump out of a
   * property marketplace into an origin nobody has checked.
   */
  offPlatform: {
    title: "This link leaves Vallo",
    body: "It goes to {host}. That is not ours and we have not checked what is on it.",
    copy: "Copy the link",
    copied: "Copied",
    open: "Open it anyway",
    close: "Close",
  },

  priceCheck: priceCheckEn,
  /* Track M: the cinematic landing bands. */
  reel: reelEn,
  shape: shapeEn,
  frontDoor: frontDoorEn,
  landingRooms: landingRoomsEn,
  afterTheGate: afterTheGateEn,
  cryptoPay: cryptoPayEn,
  trustVisible: trustVisibleEn,

  landlord: landlordEn,

  trustDoors: trustDoorsEn,
  arrivalCheck: arrivalCheckEn,

  platform: platformEn,

  compliance: complianceEn,
  complianceStr: complianceStrEn,
  complianceThreshold: complianceThresholdEn,
  compliancePep: compliancePepEn,
  complianceRisk: complianceRiskEn,
  complianceBeneficialOwnership: complianceBeneficialOwnershipEn,

  passcode: passcodeEn,

  /*
   * THE SUCCESS SHEET (components/ui/SuccessSheet.tsx, docs/SUCCESS_MOMENTS.md).
   *
   * One title and one line per moment, and the line says what is now true,
   * never more. A request is "requested" or "sent", never "booked"; a review
   * is "in review", never "approved"; money is "paid" only after the server
   * settled it against this exact booking. A pending or unknown payment never
   * reaches these strings: it keeps the "Confirming your payment" sheet.
   */
  success: {
    continue: "Continue",
    close: "Close",
    detail: {
      amount: "Amount",
      reference: "Reference",
      when: "When",
      for: "For",
    },
    moments: {
      stayPaid: { title: "Stay paid", body: "Your payment is in and these dates are confirmed." },
      stayPaidRecorded: {
        title: "Stay paid",
        body: "Your payment is recorded against this stay. Everything about it is under your stays.",
      },
      rentPaid: {
        title: "Rent paid",
        body: "The move-in total is paid and recorded. Arrange the keys with the agent in your thread.",
      },
      sharePaid: {
        title: "Your share is paid",
        body: "Your part of the move-in is recorded. The move-in completes when every share is in.",
      },
      moveInPaid: {
        title: "Move-in paid in full",
        body: "The last share is in, so the whole move-in total is paid.",
      },
      cryptoPaid: {
        title: "Crypto payment received",
        body: "The charge is settled. Your receipt is on this page.",
      },
      inspectionRequested: {
        title: "Inspection requested",
        body: "Whoever listed it can confirm your time or offer another. Their answer shows under Inspections.",
      },
      inspectionBooked: {
        title: "Inspection booked",
        body: "Your viewing is set for {when}. It is in your plans.",
      },
      inspectionReportSubmitted: {
        title: "Inspection report submitted",
        body: "It is now the record of what you saw at the property.",
      },
      inspectionRecorded: {
        title: "Inspection recorded",
        body: "The outcome is saved on this inspection.",
      },
      agreementDrawn: {
        title: "Agreement drawn up",
        body: "Read the terms and confirm them. Payment opens once both of you confirm and Vallo approves it.",
      },
      agreementConfirmed: {
        title: "Terms confirmed",
        body: "We will tell you when the other side confirms too.",
      },
      agreementInReview: {
        title: "Your agreement is in review",
        body: "Both of you have confirmed. Vallo reviews it next, and payment opens once it is approved.",
      },
      agreementApprovedRenter: {
        title: "Agreement approved",
        body: "Vallo has approved these terms, so you can pay the move-in total now.",
      },
      agreementApprovedOwner: {
        title: "Agreement approved",
        body: "Vallo has approved these terms. The renter can pay the move-in total now.",
      },
      claimFiled: {
        title: "Claim filed",
        body: "Your Guarantee claim is with the team. Its status shows on this agreement.",
      },
      refundRequested: {
        title: "Refund requested",
        body: "Your request is dated and with the team. Every step of it shows on this booking.",
      },
      listingSubmitted: {
        title: "Your listing is in review",
        body: "A person at Vallo reads it before it goes live. We will tell you the moment it is decided.",
      },
      listingApproved: {
        title: "Your listing passed review",
        body: "It goes live in search once it is published.",
      },
      listingLive: {
        title: "Your listing is live",
        body: "It is in search now, so people can find it.",
      },
      agentApplied: {
        title: "Application sent",
        body: "Your agent application is in review. We will tell you when it is decided.",
      },
      hostApplied: {
        title: "Application sent",
        body: "Your host application is in review. We will tell you when it is decided.",
      },
      registrationFiled: {
        title: "Application sent",
        body: "It is filed under {reference}. You can follow it from your profile.",
      },
      kycSubmitted: {
        title: "Documents sent",
        body: "A person at Vallo reviews them, usually within one working day.",
      },
      identityMatched: {
        title: "Identity matched",
        body: "Your identity was matched with NIMC. The next step is your address.",
      },
      verificationApproved: {
        title: "Documents approved",
        body: "A reviewer approved your documents, and your account moved up a level.",
      },
      agentApproved: {
        title: "Application approved",
        body: "A reviewer approved your agent application, so you can start listing now.",
      },
      hostApproved: {
        title: "Business approved",
        body: "A reviewer approved {name}. Guests see it once it is published.",
      },
      hostLive: {
        title: "Your business is live",
        body: "{name} is published, so guests can find it now.",
      },
      ticketFiled: {
        title: "Message sent to support",
        body: "Your reference is {reference}. Replies land in your support messages.",
      },
      contactSent: {
        title: "Message sent",
        body: "Your reference is {reference}. We reply to the email address you gave.",
      },
      reportFiled: { title: "Report received", body: "{promise}" },
      stayRequested: {
        title: "Booking requested",
        body: "The agent confirms your dates personally. Pay now to hold them, or later from your bookings.",
      },
      stayHeld: {
        title: "Dates held",
        body: "Your dates are held. Paying now confirms the stay straight away.",
      },
      tableRequested: {
        title: "Table request sent",
        body: "The restaurant confirms or declines it, and the answer shows in your bookings.",
      },
      reviewPosted: {
        title: "Review posted",
        body: "Your review is on the listing now, and the agent has been told.",
      },
      tenancyReviewSent: {
        title: "Review sent",
        body: "Thank you. What you told us helps the next renter know what to expect.",
      },
      bankAccountAdded: {
        title: "Bank account added",
        body: "It is saved on your account and ready to use.",
      },
      /* B-6. Opens only when `confirmCardSetup` verified the ₦100 check with
         Paystack for this person and filed the card. The ₦100 is refunded to
         the card by the webhook, so the line says so and promises no date. */
      cardSaved: {
        title: "Card saved",
        body: "It is ready for your next payment. The ₦100 check goes back to the same card, and your bank may take a few working days to show it.",
      },
      payoutAccountAdded: {
        title: "Payout account added",
        body: "It is saved, and your earnings can be paid into it.",
      },
      accountCreated: { title: "Welcome to Vallo", body: "Your account is ready." },
      emailVerified: { title: "Email confirmed", body: "Your email address is confirmed on this account." },
      passwordChanged: {
        title: "Password changed",
        body: "Your new password is set. Use it the next time you sign in.",
      },
      passcodeSet: { title: "Passcode set", body: "It unlocks Vallo on this device from now on." },
      passcodeChanged: { title: "Passcode changed", body: "Use your new passcode to unlock Vallo on this device." },
    },
  },

};

/**
 * Note the absence of `as const`. Widening the values to `string` is
 * deliberate: with literal types every translation would have to equal the
 * English text to typecheck. The shape is still enforced, so a missing or
 * misspelled key remains a compile error.
 */
export type Dictionary = typeof en;
