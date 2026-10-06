/**
 * Session 3's copy for home, search, stays, restaurants, price, areas and saved (W2).
 *
 * One module per owner so nine agents can add strings without editing en.ts
 * at the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. Money sentences never live
 * here; they come from `lib/money/copy.ts` (Session 2).
 *
 * One sub-object per surface, so the agents working each surface add lines
 * inside their own block and never edit the same line twice.
 */
export const experienceDiscoverEn = {
  /** The discovery empty state: the object, the honest reason, the demand capture. */
  empty: {
    /* The one capture every empty shelf shares: a brief that listers answer
       with a real listing. The words are the brief's own (frontDoor.briefs). */
    captureLead: "Tell us what you need and listers who have it answer with a listing.",
  },
  home: {
    /* The lead figure: the account's own saved spaces, never a zero. */
    savedCaption: "On your shortlist",
    savedUnitOne: "space saved",
    savedUnitMany: "spaces saved",
    savedOpen: "Open your shortlist",
    savedCompare: "Compare two side by side",
    /* The space types row, ordered by what the person said they came for. */
    typesTitle: "Browse by space",
    typesForYou: "Spaces for you",
    typesLabel: "Space types",
    typesMine: "You said",
    typesEdit: "Change",
    types: {
      rental: "Rentals",
      apartment: "Apartments",
      home: "Houses",
      villa: "Villas",
      land: "Land",
      shop: "Shops",
      office: "Offices",
    },
    featuredForYou: "The kinds you said you came for come first. Search or filter and the order is everybody's.",
  },
  search: {
    noMatchTitle: "No spaces matched",
    noMatchBody: "Your filters are narrower than what is listed right now. Widen them and the results come straight back.",
    noWordsTitle: "Nothing matches those words",
    noWordsBody: "Nothing listed matches what you typed yet. Try a neighbourhood, a city or a state.",
    emptyTitle: "Nothing listed here yet",
    emptyBody: "Owners and agents are still listing. A space appears here the minute it goes live, with nothing to wait for on your side.",
    clearFilters: "Clear filters",
    clearSearch: "Clear this search",
    listYourPlace: "List your place",
    howItWorks: "How Vallo works",
    waiting: "{count} {noun} waiting without them",
    intentNote: "{kinds} first, because that is what you said you came for. Search or filter and this stops.",
  },
  stays: {
    /* The area figure hero, drawn only once its read exists (W2-R3). */
    areaCaption: "Listed in {place}",
    staysOne: "stay",
    staysMany: "stays",
    fromNight: "From",
  },
  price: {
    /* The area figure and chart (`AreaAskingChart`): every figure is the read's own. */
    chart: {
      segmentsLabel: "Property type",
      middleCaption: "Middle asking price, {what}",
      middleWhat: "{bedrooms} bedroom {type}",
      studioWhat: "studio {type}",
      range: "The middle half ask between {low} and {high}.",
      basis: "From {count} listings.",
      basisOne: "From {count} listing.",
      chartLabel: "Middle asking price by size, {type}",
      chartSummary: "One bar per size; a hatched bar is a size with too few listings to publish a range.",
      periodHead: "Size",
      valueHead: "Middle asking price",
      thinCell: "Too few to say",
      thinNote: "A hatched bar is a size we hold too few listings of to publish a range. We do not guess.",
      studioTick: "Studio",
      bedTick: "{bedrooms} bed",
    },
  },
  map: {
    /* The listing with no pin, and the empty viewport (B-27). */
    noPinOne: "{count} place has no pin yet",
    noPinMany: "{count} places have no pin yet",
    noPinList: "See them in the list",
    emptyTitle: "No places here",
    emptyArea: "No place sits inside this part of the map. Zoom out or show every place.",
    emptySearch: "This search matched no place we can put on the map.",
    emptyAction: "Show every place",
  },
  saved: {
    /* The head-to-head of north star 15.3: two of your own saved spaces. */
    pickTwo: "Choose two of your saved spaces to set side by side.",
    pickSwap: "Two at a time. The first one you chose made way.",
    lower: "Lower",
    emptyTitle: "Nothing saved yet",
    emptyBody: "Tap the heart on any card and it waits for you here, ready to compare side by side.",
    hydratingTitle: "Bringing your saves together",
    hydratingBody: "Places you hearted on this device are being matched to your account. This takes a moment.",
    emptyAction: "Find a place",
    captureLead: "Keep a search instead, and we tell you when something new fits it.",
    capture: "Your saved searches",
    /* The header link to /saved/searches, and the page title (Round 3 sweep, C3). */
    searchesLink: "Saved searches",
    searchesRetry: "Try again",
    /* One saved search on the board (SavedSearchBoard), moved out of the
       component (Round 3 sweep, C3). `{date}` is when it was saved. */
    board: {
      savedOn: "Saved {date}",
      namedFromFilters: ". Named from its filters.",
      alertsOn: "We will tell you when a new place matches this.",
      alertsOff: "Alerts off. The search is still saved.",
      nameNeeded: "Give this search a name.",
      renamed: "Renamed",
      nameLabel: "Name this search",
      saveName: "Save name",
      cancel: "Cancel",
      alertLabel: "Tell me about new matches",
      rename: "Rename",
      removeConfirm: "Remove it",
      keep: "Keep",
      remove: "Remove",
    },
    /* Saved searches, whose empty face is its most-seen face. */
    searchesSignedOutTitle: "Sign in to keep a search",
    searchesSignedOutBody: "A saved search belongs to an account, so it follows you between your phone and your laptop and nobody else can see what you are looking for.",
    searchesSignIn: "Sign in",
    searchesBrowse: "Browse without an account",
    searchesEmptyTitle: "Keep a search and we will watch it",
    searchesEmptyBody: "Filter the results down to the place you want, then save that search. It waits here under the name you give it, and we tell you when something new fits it.",
    searchesStart: "Start a search",
    searchesPlaces: "Your saved places",
  },
};
