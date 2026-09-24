/**
 * THE PRODUCT'S OWN SHAPE, in English: the wall that names what you asked
 * for, the age of a listing, the facts of a compound, and the other small
 * words that come with deleting a second shelf.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS ITS OWN FILE. The same reason `price-check.en.ts` gives: `en.ts`
 * is written by several workers in the same hour, and a namespace kept in a
 * module costs that file one import and one line. Other locales inherit these
 * through `withFallback`, and declaring the English text in `yo.ts`, `ha.ts`
 * or `ig.ts` would be the coverage lie `locale-completeness.ts` refuses. An
 * untranslated key is a copy gap for a speaker to close.
 *
 * British spelling, no dashes as punctuation, and nothing here asserts
 * anything the code cannot show.
 */
export const shapeEn = {
  /** V-18: the account choice for somebody stopped on the way somewhere. */
  wall: {
    create: "Create an account",
    signIn: "Sign in",
    searchPlace: "to see homes in {place}",
    searchQuoted: "to search for “{term}”",
    searchAny: "to see what is listed",
    listing: "to open this listing",
    stay: "to open this stay",
    other: "to open that page",
    body: "Everything inside Vallo is for members. New accounts are free.",
  },
  /** V-22: how old a listing is, on the card and the page. */
  listed: {
    today: "Listed today",
    yesterday: "Listed yesterday",
    days: "Listed {n} days ago",
    stale: "Listed in {month}, not confirmed since",
    basis: "Newest first, by the day each listing went live.",
    newMark: "New",
    newMarkLabel: "New since your last visit",
  },
  /** The shelf's sort names, keyed by `SortKey` (V-22 added Newest). */
  sorts: {
    recommended: "Recommended",
    newest: "Newest",
    "price-asc": "Price: low to high",
    "price-desc": "Price: high to low",
    "move-in-asc": "Move-in cost: low to high",
  },
  /** V-26: the card's own words that moved from the deleted `/rent` shelf. */
  card: {
    messageAgent: "Message agent",
  },
  /** V-64: a member's page publishes only what the member turned on. */
  profile: {
    showOccupation: "Show my occupation on my page",
    showOccupationSub: "Off by default. When it is off, only you see it.",
    showHomeTown: "Show my home town on my page",
    showHomeTownSub: "Off by default. When it is off, only you see it.",
    privateNote: "Only you can see your occupation and home town here.",
    privateNoteLink: "Choose what your page shows",
  },
  /** V-26: the shelf's market chip when the rent market is chosen. */
  market: {
    rent: "Rent",
  },
  /** V-28: the compound's five answers, as the page, the wizard and the drawer say them. */
  compound: {
    title: "The compound",
    lede: "What the lister says about the compound this home is in.",
    parkingInside: "Parking inside the compound",
    parkingStreet: "Street parking",
    parkingNone: "No parking",
    flatsOne: "The only home in the compound",
    flatsMany: "{n} homes share the compound",
    landlordOnSite: "Landlord lives in the compound",
    landlordElsewhere: "Landlord lives elsewhere",
    wastePsp: "Rubbish collected by PSP",
    wasteEstate: "Rubbish collected by the estate",
    wasteNone: "No rubbish collection",
    carAccess: "A car can get into the compound",
    noCarAccess: "No car access into the compound",
    wizardHint:
      "The five questions every renter asks at the gate. All optional: leave one unanswered and the listing says nothing about it.",
    parkingLabel: "Where does a car park?",
    parkingOptionInside: "Inside the compound",
    parkingOptionStreet: "On the street",
    parkingOptionNone: "Nowhere",
    flatsLabel: "How many homes share the compound?",
    landlordLabel: "Does the landlord live in the compound?",
    wasteLabel: "How does rubbish leave?",
    wasteOptionPsp: "PSP collection",
    wasteOptionEstate: "The estate collects it",
    wasteOptionNone: "No collection",
    carLabel: "Can a car get into the compound?",
    yes: "Yes",
    no: "No",
    unanswered: "Not answered",
    filterLandlordAway: "Landlord lives elsewhere",
    filterParkingInside: "Parking inside the compound",
  },
};
