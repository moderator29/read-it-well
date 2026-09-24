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
  /** V-75: one noun, workspace, for who you are being. */
  workspace: {
    short: { owner: "Ow", agent: "Ag", firm: "Fm", host: "St", console: "Op" },
    propertyGroup: "Property",
    staysGroup: "Stays",
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
  /** V-76: Bookings, Trips and Inspections are one dated list called Plans. */
  plans: {
    title: "Plans",
    lede: "Everything you have lined up, in the order it happens.",
    filterLabel: "Show plans for",
    filterAll: "All",
    filterProperty: "Property",
    filterStays: "Stays",
    comingUp: "Coming up",
    today: "Today",
    thisWeek: "This week",
    later: "Later",
    nothingAhead: "Nothing is booked in ahead of you. What you have done before is below.",
    kinds: {
      inspection: "Inspection",
      tenancy: "Move-in",
      stay: "Stay",
      table: "Table",
    },
    inspectionFallback: "A property no longer listed",
    propertyTitle: "Property",
    staysTitle: "Stays",
    tenanciesTitle: "Tenancies",
    emptyTitle: "Nothing planned yet",
    emptyAll: "Inspections, move-ins, stays and tables all land here, in the order they happen.",
    emptyProperty: "Ask to inspect a property from its page and it lands here, with the answer beside it.",
    emptyStays: "Book a stay or a table and it lands here, dated, with what you can still do about it.",
    findPlace: "Find a place",
    findStay: "Find a stay",
  },
  /** V-26: the shelf's market chip when the rent market is chosen. */
  market: {
    rent: "Rent",
  },
  /** V-73: each listing's week, stage by stage, and one fix. */
  funnel: {
    title: "How each listing did this week",
    blurb: "Seven days, beside the middle figure for similar homes in the same city.",
    stage: "Stage",
    yours: "Yours",
    similar: "Similar",
    tooFew: "Too few",
    stages: {
      seen: "Seen in results",
      opened: "Opened",
      saved: "Saved",
      enquired: "Enquired",
      booked: "Viewing booked",
      viewed: "Viewed",
    },
    noMedian: "Fewer than three similar homes are live in this city, so there is nothing fair to compare with yet.",
    fixLabel: "One thing to do:",
    fixes: {
      "not-seen": "Nobody was shown this in results this week. Check the price, the area and the property type are filled in, so it answers the searches renters make.",
      "not-opened": "Seen by {seen} people and opened by none. Put a daylight photo of the main room first and name the area in the title.",
      "not-saved": "Opened by {opened} people and saved by none. It has {photos} photos; add the kitchen, the bathroom and the view from the gate.",
      "no-enquiry": "Opened by {opened} people and nobody asked about it. State the total to move in, so a renter can see the whole cost before they write.",
      "no-viewing": "{enquired} people asked and nobody booked a viewing. Reply with a day and a time they can come and see it.",
    },
    empty: "Publish a listing and its week appears here: who saw it, who opened it, and what happened next.",
    howCounted:
      "Seen and opened count different signed-in people, once each per day. Example listings and your own visits are never counted. Nobody's name is kept.",
    viewsCounted:
      "Views are counted per listing above: different signed-in people who saw or opened it, once each per day, with no names kept. There is still no conversion rate, because a rate over a week this young would be noise.",
  },
  /** V-65: on the Rent market the budget is the cash at the door. */
  cash: {
    budgetTitle: "How much can you move in with?",
    budgetBasis:
      "Budget is the total to move in: rent, fees, caution and service charge, with every year of rent the lister asks for up front.",
    oneYearAtMost: "One year upfront at most",
    upfrontMonth: "One month upfront",
    upfrontMonths: "{n} months upfront",
    upfrontYear: "One year upfront",
    upfrontYears: "{n} years upfront",
    atDoor: "{amount} at the door with all the rent asked up front",
  },
  /** V-68: what the service charge buys, and the word Serviced, derived. */
  service: {
    title: "What the service charge covers",
    serviced: "Serviced",
    servicedMeaning: "Power, water and security are all covered by the service charge.",
    covers: {
      diesel: "Generator diesel and maintenance",
      water: "Water treatment",
      security: "Security guards",
      estate_dues: "Estate dues",
      waste: "Rubbish collection",
      cleaning: "Cleaning of shared areas",
      lift: "Lift",
    },
    coversNone: "The lister says it covers none of these.",
    fixed: "A fixed sum",
    reconciled: "Estimated, then balanced at year end",
    estateTypes: {
      gated_estate: "Gated estate with controlled entry",
      gated_compound: "Gated compound with a gateman",
      open_street: "On an open street",
    },
    wizardTitle: "The service charge and the gate",
    wizardHint:
      "Say what the service charge pays for. Vallo calls a home Serviced only when it covers diesel, water and security, whatever the title says.",
    coversLabel: "What does the service charge cover?",
    reconciledLabel: "How is it charged?",
    estateLabel: "What kind of gate is it behind?",
    unanswered: "Not answered",
    filterTitle: "Service and the gate",
    filterServiced: "Serviced: power, water and security covered",
    filterGated: "Gated estate with controlled entry",
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
