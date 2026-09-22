/**
 * PRICE CHECK, in English. What property near here is ASKING, and the refusal
 * when we cannot say.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS ITS OWN FILE RATHER THAN A BLOCK INSIDE `en.ts`.
 *
 * `en.ts` is 4,900 lines and three workers write to it in the same hour. The
 * ledger records that two agents have already collided there once and that the
 * second silently overwrote the first's finished work; this namespace was lost
 * to exactly that once while it was being written. A separate module reduces
 * the footprint in the contested file to one import and one line, which is the
 * smallest surface a namespace can have while still being part of the
 * dictionary.
 *
 * ---------------------------------------------------------------------------
 * THE WORD "VALUATION" DOES NOT APPEAR HERE AND MAY NOT.
 *
 * Vallo is not a registered estate surveyor and valuer, and under the Estate
 * Surveyors and Valuers Act the offence is using any name, title, addition or
 * description IMPLYING authorisation to practise: the offence is in the
 * implication, not in the arithmetic. `apps/web/scripts/check-valuation-words.mjs`
 * fails the build if the word reaches this file.
 *
 * The standing disclaimer is the one permitted use and it lives in
 * `apps/web/src/lib/price-check/disclaimer.ts` rather than here, deliberately.
 * It is ONE WORDING on every surface, and a disclaimer translated four times is
 * four disclaimers, three of which no lawyer has read. That is a real gap and
 * it is named rather than hidden: a Hausa speaker currently reads the
 * disclaimer in English, and closing that needs a lawyer and a translator
 * together rather than a translator alone.
 *
 * The nouns to reach for: an ASKING PRICE RANGE, what it is based on, how sure
 * we are, area prices. Never a value, never a worth.
 *
 * ---------------------------------------------------------------------------
 * THE REFUSALS ARE THE PRODUCT, NOT THE ERROR PATH.
 *
 * On the day this ships the gate refuses one hundred per cent of per property
 * checks, because all 64 listings on this platform are examples and
 * `is_demo = false` sits inside the comparables predicate. So these nine
 * screens ARE the feature for as long as it takes real supply to arrive, and
 * each one says what the situation is, makes clear the fault is not the
 * reader's, and leaves them somewhere to go.
 *
 * ---------------------------------------------------------------------------
 * THE OTHER THREE LOCALES INHERIT THIS THROUGH `withFallback`, AND THAT IS THE
 * HONEST STATE RATHER THAN AN OVERSIGHT.
 *
 * Declaring these keys in `yo.ts`, `ha.ts` and `ig.ts` with the English text is
 * precisely what `apps/web/src/lib/i18n/locale-completeness.ts` exists to
 * refuse: it raises a locale's apparent coverage while the screen still reads
 * in English. An untranslated key is a copy gap for a speaker to close, and it
 * is recorded as one here rather than papered over.
 */
export const priceCheckEn = {
  title: "Price Check",
  lead: "What are properties near here asking?",
  intro:
    "Tell us where and what, and we will tell you what similar properties near there are currently advertised for. If we do not have enough to be sure, we will say so rather than guess.",

  ladder: {
    heading: "Where is it?",
    state: "State",
    statePlaceholder: "Choose a state",
    lga: "Local government",
    lgaPlaceholder: "Choose a local government",
    lgaLoading: "Loading local governments",
    lgaNeedsState: "Choose a state first",
    area: "Area or estate",
    areaPlaceholder: "Start typing, or write your own",
    areaHint:
      "We only hold the names agents have typed on listings, so write yours if it is not there.",
    areaSuggestionCount: "{count} listings",
    pin: "Drop the pin",
    pinHelp: "Drag the pin to the building. We only use this to find nearby properties.",
    pinPlaced: "Pin placed",
    pinMissing: "No pin yet",
    pinOutsideNigeria: "That is outside Nigeria. Drag the pin back onto the map.",
    pinUse: "Use this spot",
    hint: "Anything else that helps",
    hintPlaceholder: "The estate name, or the nearest landmark",
    hintHelp:
      "For your own recall while you are on this screen. We do not store it, we do not read it, and nobody else sees it.",
    mapUnavailable: "The map cannot load right now. You can still read the area prices below.",
  },

  subject: {
    heading: "What is it?",
    type: "Property type",
    apartment: "Flat",
    home: "House",
    shop: "Shop",
    office: "Office",
    intent: "Are you asking about",
    rent: "Rent",
    sale: "Sale",
    period: "Rent period",
    periodYear: "A year",
    periodMonth: "A month",
    periodQuarter: "Three months",
    bedrooms: "Bedrooms",
    bathrooms: "Bathrooms",
    size: "Size in square metres",
    sizeHint: "If you know it. Leave it blank if you do not, and we will not guess.",
    submit: "Check the price",
    checking: "Checking",
    fromListing: "Filled in from this listing. Change anything that is wrong.",
  },

  result: {
    askingRange: "Asking price range",
    perYear: "a year",
    perProperty: "for a property like this",
    perSqm: "per square metre",
    basis: "Based on {count} listings within {radius} m, published in the last {months} months.",
    confidence: "How sure we are",
    confidenceLow: "not very",
    confidenceMedium: "fairly",
    confidenceHigh: "quite",
    confidenceExplain: "How we work that out",
    confidenceBody:
      "Four things decide it and the worst one wins: how many properties we found, how much they disagreed on price, how old their listings are, and how far we had to look. Nobody at Vallo can set it.",
    sizedShortfall:
      "We can tell you what nearby properties are asking. We cannot tell you a price per square metre, because most listings near here do not state a size.",
    comparablesHeading: "What it is based on",
    distanceAway: "{metres} m away",
    listedAgo: "Listed {months} months ago",
    listedRecently: "Listed this month",
    spreadHeading: "What each one is asking",
    /* NOT A REFUSAL AND IT MUST NOT READ LIKE ONE. Every refusal code is a
       claim about our data; this is a statement about us. It says the fault is
       ours, that nothing they entered was lost, and it offers no next action,
       because there is nothing they can do and pretending otherwise would be
       worse than saying so. */
    unreachableTitle: "We cannot check prices right now",
    unreachableBody:
      "This is on our side, not yours, and it is not a statement about what is near you. Nothing you entered has been lost. Try again in a few minutes.",
  },

  refusals: {
    noLocation: {
      title: "We could not place this address on the map",
      body: "Without a location we cannot find anything to compare it to. There is no address lookup for Nigeria we would trust, so a pin is how we do it.",
    },
    noComparables: {
      title: "We have nothing published near here yet",
      body: "There is nothing near this spot for us to compare against. We are not going to guess.",
    },
    tooFewComparables: {
      title: "We found {count} properties near here",
      body: "That is not enough to give a figure we would stand behind. Five is our minimum. Here is what we did find, as nearby listings and not as an estimate.",
    },
    tooFewSized: {
      title: "We cannot give you a price per square metre",
      body: "Most listings near here do not state a size, so a per square metre figure would come from too few of them to mean anything.",
    },
    wideDispersion: {
      title: "The properties near here disagree with each other too much",
      body: "A useful figure needs them to agree more than this. Here is what they are asking, spread out, so you can see the disagreement yourself.",
    },
    stale: {
      title: "The nearest listings are over a year old",
      body: "Naira prices have moved since. We would rather say nothing than repeat an old figure.",
    },
    unsupportedType: {
      title: "We do not price this kind of property",
      body: "Land is priced by plot, title and access, and two plots on the same street can be worth very different amounts. Hotels and restaurants are priced per night and per cover. More listings would not change that.",
    },
    unsupportedPeriod: {
      title: "We work in annual rents",
      body: "This is a shorter let, and multiplying a monthly rent by twelve assumes twelve months of occupancy nobody promised.",
    },
    demoOnly: {
      title: "Everything we hold near here is an example listing",
      body: "They are there to show how the platform works, not to be priced. We will not build a figure from examples.",
    },
  },

  actions: {
    dropPin: "Drop a pin",
    areaReport: "See area prices",
    notifyMe: "Tell me when you can answer",
    notifyMeSignedOut: "Sign in to be told when we can answer",
    showNearby: "Show what we found",
    registeredFirm: "Find a registered firm",
    changePeriod: "Ask about an annual rent",
    listIt: "List it on Vallo",
    seeSimilar: "See similar nearby",
    share: "Share the area card",
    startOver: "Start again",
  },

  notify: {
    heading: "Tell me when you can answer",
    body: "We will tell you the moment there are enough listings near here to answer. We are not going to guess in the meantime.",
    signedOutBody:
      "This arrives in your Vallo notifications, so you will need an account. We do not send emails for it.",
    saved: "Saved. We will tell you when we can answer.",
    alreadySaved: "You are already watching this spot.",
    failed: "We could not save that just now. Nothing was lost, so try again in a moment.",
  },

  area: {
    heading: "Area prices",
    subheading: "What properties here are currently asking",
    askingFor: "{bedrooms} bedroom {type}",
    studioFor: "Studio {type}",
    basis: "From {count} listings, published between {from} and {to}.",
    perSqm: "{amount} per square metre",
    perSqmCoverage: "from the {sized} of {count} listings here that state a size",
    noPerSqm: "No per square metre figure: too few listings here state a size.",
    emptyTitle: "No area prices for here yet",
    emptyBody:
      "We need at least three real listings of the same kind in one area before we will publish a range. We are not going to guess.",
    demoOnlyTitle: "Everything we hold here is an example listing",
    demoOnlyBody: "They are there to show how the platform works, not to be priced.",
    unreachableTitle: "We cannot read the listings right now",
    unreachableBody:
      "This is on our side, not yours, and it is not a statement about what is here. Try again in a few minutes.",
  },

  facts: {
    heading: "Power and water around here",
    /* The claim this panel makes is small and it is true: this is what the
       listings we hold in this area say about themselves. It is not a survey of
       the neighbourhood, and the copy never lets it sound like one. Nobody else
       in this market collects these facts structurally, which is why the panel
       carries stage one on a day when every price answer refuses. */
    basis:
      "From the {count} listings we hold here. This is what they say about themselves, not a survey of the area.",
    grid: "Mains power",
    backup: "Backup power",
    water: "Water",
    prepaid: "Prepaid meter",
    estate: "Gated estate",
    ofListings: "{count} of {total}",
    mostCommon: "Most say {value}",
    gridBandA: "Band A",
    gridMostlyOn: "Mostly on",
    gridPatchy: "Patchy",
    gridRarely: "Rarely on",
    gridNone: "None",
    backupNone: "None",
    backupGenerator: "Generator",
    backupInverter: "Inverter",
    backupSolar: "Solar",
    backupGeneratorInverter: "Generator and inverter",
    waterTreatedMains: "Treated mains",
    waterBorehole: "Borehole",
    waterPumpedStorage: "Pumped storage",
    waterTanker: "Tanker",
    waterNone: "None",
    empty: "No listings here state their power or water yet.",
  },

  share: {
    heading: "Share these area prices",
    /* THE SHARE RULE IS ABSOLUTE AND THE COPY SAYS SO OUT LOUD, because a
       person who wants to send their own address somewhere deserves to be told
       why the product will not, rather than to find the option missing and
       assume it was forgotten. */
    body: "The card names the area and the type of property. It never names an address, not even yours.",
    why: "Why not my address?",
    whyBody:
      "An address beside a naira figure is a useful document to the wrong person, and a card gets forwarded far past the people it was sent to. Whoever lives there is the one at risk and they were never asked. If you want a specific property seen, publish it as a listing.",
    cardLine: "{bedrooms} bedroom {type} in {area} are asking {low} to {high}",
    copy: "Copy the link",
    copied: "Copied",
  },
};
