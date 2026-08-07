import type { CountForms } from "../plural";

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
export const en = {
  counts,

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
    label: "What RentMe is",
    skip: "Skip",
    start: "Let me in",
    goTo: "Go to card {n}",
    one: {
      title: "Everywhere, in one place",
      body:
        "Homes to rent, hotels for the weekend, restaurants and experiences. All of Nigeria, all thirty-six states, one search.",
    },
    two: {
      title: "Nobody pays a fee to us",
      body:
        "Not you, not the host. What you see is what you pay, to the kobo, and a verified badge only ever means we checked it ourselves.",
    },
    three: {
      title: "Message first, pay when you are sure",
      body:
        "Talk to the host, inspect the place, then pay on the platform. Never send money to anybody outside RentMe.",
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
    perNight: "per night",
    night: "night",
    year: "year",
    reviews: "reviews",
    verified: "Verified",
    skipToContent: "Skip to content",
    /* Shared by every row that has no answer yet: "Not set" appearing three
       different ways down one screen reads as three different states. */
    notSet: "Not set",
  },

  nav: {
    home: "Home",
    hotels: "Hotels",
    apartments: "Apartments",
    homes: "Homes",
    rent: "Rent",
    restaurants: "Restaurants",
    experiences: "Experiences",
    services: "Services",
    properties: "Properties",
    bookings: "Bookings",
    messages: "Inbox",
    wallet: "Wallet",
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
    agentMode: "Agent Mode",
    consoleLabel: "Console",
    workspacesLabel: "Workspaces",
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
    feedName: "RentMe feed",
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
    back: "Back",
    verified: "Verified agent",
    verifiedTitle: "A verified RentMe agent",
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
    trustScore: "Trust score",
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
    hero: {
      line1: "Find it.",
      line2: "Rent it.",
      line3: "Love it.",
      subtitle:
        "Your all-in-one platform for homes, hotels, restaurants, experiences and more.",
      searchPlaceholder: "Where do you want to go?",
      searchLabel: "Search destinations across Nigeria",
      popularLabel: "Popular right now",
    },
    vision: {
      overline: "Our vision",
      title: "Nigeria at your fingertips. Africa next.",
      body: "RentMe is building the trusted home for discovery, stays, food and experiences across Nigeria, and then the continent. One account, one wallet, one assistant, made for how Africa actually moves.",
      missionOverline: "Our mission",
      missionTitle: "Make finding and booking anything effortless and safe.",
      missionBody: "Verified places, honest prices in naira, real reviews, and an assistant that understands what you want. From Lagos to every corner of the country.",
      points: {
        verified: { title: "Verified first", body: "Every listing and agent is checked before it goes live." },
        naira: { title: "Priced in naira", body: "Clear totals, no surprises, no hidden charges." },
        everywhere: { title: "All 36 states", body: "Nationwide from day one, not just the big cities." },
        assistant: { title: "AI that helps", body: "Ask in plain words and get real places back." },
      },
    },
    stats: {
      hotels: "Hotels",
      apartments: "Apartments",
      restaurants: "Restaurants",
    },
    features: {
      ai: { title: "AI Assistant", body: "Smart help, 24/7" },
      verified: { title: "Verified Listings", body: "Trusted and secure" },
      prices: { title: "Best Prices", body: "Save more" },
      booking: { title: "Easy Booking", body: "Fast and simple" },
    },
    trust: {
      multiLanguage: { title: "Multi-language", body: "EN / YO / HA / IG" },
      secure: { title: "Secure & Trusted", body: "Your safety is our priority" },
      ai: { title: "AI Powered", body: "Smarter experiences" },
      africa: { title: "Made for Africa", body: "Built with love ❤️" },
      stores: { title: "Available on", body: "App Store & Play Store" },
    },
    categories: {
      title: "Everything, in one place",
      subtitle: "Five ways to discover Nigeria. One account, one wallet, one assistant.",
    },
    cta: {
      title: "Ready to find your next place?",
      subtitle: "Join thousands discovering stays, food and experiences across Nigeria.",
      action: "Get started free",
      secondary: "See how it works",
    },
    footer: {
      tagline: "Find it. Rent it. Love it. Around Nigeria.",
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
      docs: "Docs",
      becomeAgent: "Become an agent",
    },
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
    fullNameLabel: "Full name",
    fullNamePlaceholder: "Your name",
    forgotPassword: "Forgot password?",
    noAccount: "Do not have an account?",
    haveAccount: "Already have an account?",
    termsNotice: "By continuing you agree to our Terms and Privacy Policy.",
    providerUnavailable: "This sign in method is not configured yet.",
    backToHome: "Back to home",
    otherWays: "Other ways to continue",
    resetTitle: "Reset your password",
    resetLead: "Type the email address on your account and we will send you a link to set a new password.",
    resetSend: "Send the reset link",
    resetSentLead: "Check your inbox.",
    resetNotArrived: "Nothing after a few minutes? Look in spam, and check the address you typed. You can ask again from the sign-in screen.",
    resetExpiredTitle: "That link has expired",
    resetExpiredLead: "A reset link lasts an hour and works once. Ask for a new one and open it on the same device.",
    newPasswordTitle: "Choose a new password",
    newPasswordLead: "Pick something you have not used here before. You will be signed in as soon as it is saved.",
    newPasswordLabel: "New password",
    newPasswordSave: "Save and sign in",
    confirmPasswordLabel: "Confirm password",
    confirmPasswordPlaceholder: "Repeat your password",
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
      "Accounts switch on the moment the platform keys land. What you are here for is kept on your account, so it follows you to every device.",
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
        "This is the city home opens on. Your occupation comes from the platform's own list of 749, so it can be searched on.",
      noteUnset: "Set these and home opens where you are.",
      noteSignedOut: "Sign in to keep your state and local government with your account.",
      lga: "Local government",
      state: "State",
      occupation: "What you do",
      screenTitle: "Where you are",
      screenSubtitle: "Nigeria, then your state, then your local government",
      accountTitle: "This one belongs to your account",
      accountBodyUnconfigured:
        "Accounts switch on the moment the platform keys land. Your state, local government and occupation are kept on your account, so they follow you to every device.",
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
      note: "Who can see me covers your name and reviews on listings.",
      whoCanSeeMe: "Who can see me",
      everyone: "Everyone",
      onlyMe: "Only me",
      readReceipts: "Read receipts",
      readReceiptsSub: "Let hosts see when you have read their messages.",
      personalised: "Personalised recommendations",
      personalisedSub: "Use your searches and saves to rank places you will like.",
    },

    search: {
      label: "Search",
      note: "Search opens on your default area, and you can always look anywhere. Every price across RentMe is shown in Naira.",
      defaultArea: "Default area",
      allOfNigeria: "All of Nigeria",
      currency: "Currency",
      mapDistances: "Map distances",
      kilometres: "Kilometres",
      miles: "Miles",
    },

    security: {
      label: "Security",
      signOutNote:
        "This is your only session, so there is nothing else to sign out. Once accounts launch, this control ends every session on every device at once.",
      appLock: "Biometric app lock",
      appLockSub:
        "Ask for fingerprint or face unlock when the app opens, on devices that support it.",
      signedInOn: "Signed in on",
      thisDevice: "This device",
      /* Browser and platform names are proper nouns and stay as they are; only
         the word joining them is language, which is why this is a whole
         sentence with two slots rather than a hard-coded " on ". */
      deviceOn: "{browser} on {os}",
      unknownBrowser: "Browser",
      unknownOs: "this device",
      signOutEverywhere: "Sign out everywhere",
    },

    data: {
      label: "Your data",
      exportNote:
        "Right now everything RentMe knows about you lives in this browser, and nothing has left this device. Full data export ships with the launch release.",
      download: "Download my data",
      downloadSub: "A copy of everything RentMe holds about you.",
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
        "Accounts switch on the moment the platform keys land. Everything you set here is kept on this device until then.",
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
        bookingsSub: "Requests, confirmations and changes to your trips.",
        messages: "Messages",
        messagesSub: "New replies from hosts and agents you are talking to.",
        wallet: "Wallet",
        walletSub:
          "Emails about money in and money out. Anything putting money at risk still appears in the app.",
        marketing: "Ideas and offers",
        marketingSub: "Occasional highlights from around Nigeria. Off by default.",
      },
      host: {
        bookings: "Bookings",
        bookingsSub: "New requests, cancellations and payments on your listings.",
        messages: "Messages",
        messagesSub: "New enquiries from guests about your listings.",
        wallet: "Earnings and payouts",
        walletSub:
          "Emails about money in and money out. Anything putting money at risk still appears in the app.",
        marketing: "Ideas and offers",
        marketingSub: "Hosting tips and what is moving in your area. Off by default.",
      },
      hideActivity: "Hide my activity",
      hideActivitySub: "Keep your reviews and recent stays off your public profile.",
      dataSaver: "Data saver",
      dataSaverSub: "Load lighter photos on mobile data. Kinder to a small bundle.",
    },

    /* The two-step drawer. Slow on purpose: this is the one control in the app
       that cannot be undone. */
    delete: {
      title: "Delete account",
      close: "Close",
      doneTitle: "Your account is deleted",
      doneBody:
        "Everything tied to it has gone with it and you have been signed out. Taking you back to the home page now. You are welcome to start again any time.",
      permanentTitle: "This is permanent",
      losesProfile: "Your profile, photo and preferences are removed.",
      losesContent: "Your saved places, messages and reviews go with them.",
      keepsBookings:
        "Bookings already made stay on record with the host, as the law requires, but are no longer linked to you here.",
      talkFirst:
        "If something has gone wrong, talk to us first. Most things can be fixed without losing your history.",
      keep: "Keep my account",
      typeToConfirm: "Type {phrase} to confirm",
      capitals: "Capitals exactly as shown. Anything else will not unlock the button.",
      confirm: "Delete for good",
    },

    about: {
      label: "About",
      note: "Preferences kept on this device stay on this device. Account preferences are protected with row level security, so only you can read or change your own row.",
      help: "Help",
      helpSub: "Get an answer from a person",
      terms: "Terms",
      privacy: "Privacy policy",
      version: "Version",
      licences: "Open source licences",
    },
  },

  home: {
    greeting: "Welcome back",
    prompt: "Where are you going today?",
    searchPlaceholder: "Search places, hotels, restaurants",
    locationLabel: "Current location",
    recommended: "Recommended for you",
    topExperiences: "Explore top experiences",
    nearby: "Near you",
    aiCard: {
      title: "RentMe AI",
      body: "Your smart travel buddy. Ask for anything, in plain words.",
      action: "Ask the assistant",
      samplePrompt: "2 bedroom in Lekki under 300k with a pool",
    },
    agentCard: {
      title: "Become a RentMe Agent",
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
    mode: {
      personal: "Personal Mode",
      agent: "Agent Mode",
      switchToAgent: "Switch to Agent Mode",
      switchToPersonal: "Switch to Personal Mode",
      manageSub: "Manage your listings and earnings",
      chooseTitle: "Choose your mode",
      chooseSub: "Switch between modes anytime",
      personalDesc: "Discover and book amazing places across Nigeria.",
      agentDesc: "Manage your listings, bookings, customers and earnings.",
      verifiedAgent: "Verified Agent",
      visitor: "Not signed in as an agent",
      signInToWorkspace: "Sign in",
      workspaceLabel: "Agent workspace",
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
      title: "Join the RentMe Agent Community",
      body: "List properties, connect with verified guests, manage bookings and earn.",
      start: "Start application",
      resume: "Continue application",
      whatYouGet: "What you get",
      benefitReach: "Reach thousands of verified guests",
      benefitTools: "Professional listing and booking tools",
      benefitEarn: "Track earnings and get paid securely",
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
        agreeTerms: "I agree to the RentMe Agent Terms and Payout Policy.",
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
      enterAgent: "Enter Agent Mode",
      signedOutTitle: "Sign in to see your application",
      signedOutBody:
        "Your application and its reference are tied to your account, so we have to know who you are before we can show them.",
      signIn: "Sign in",
      noneTitle: "No application on file",
      noneBody:
        "You have not applied to become an agent yet. It takes about ten minutes and you need one photo ID.",
      startApplication: "Apply to become an agent",
      unconfiguredTitle: "Applications are not open here yet",
      unconfiguredBody:
        "This page shows your real application the moment the platform keys land. Nothing you have submitted is lost in the meantime.",
      reviewedOn: "Decided on",
      reviewerNote: "What the reviewer said",
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
      signedOutTitle: "The workspace for people who list",
      signedOutBody:
        "Your earnings, your bookings, your calendar and your listings, all in one place. Sign in to open yours.",
      notAgentTitle: "You are not listing yet",
      notAgentBody:
        "This workspace fills in the moment you have a place on RentMe. Applying takes about two minutes and a person reads every application.",
      unconfiguredTitle: "The workspace is not connected yet",
      unconfiguredBody:
        "This platform is not holding its keys, so there is nothing to read here. Everything else on RentMe still works.",
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
    wizard: {
      stepsLabel: "Listing steps",
      stepCounter: "Step {current} of {total}",
      stepAria: "Step {number}, {name}",
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
        "Publishing switches on the moment the platform keys land. Keep going: everything you type is kept on this device and will be waiting for you.",
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
      tooNarrow: "Photos must be at least {width}px wide so they look sharp on every screen.",
      choose: "Choose photos",
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
      needsKeys: "Photos upload once the platform keys land. Everything else you have typed is saved.",
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
      cleaningLabel: "Cleaning",
      cleaningHint: "Optional. Added once per stay, not per night.",
      cleaningHintSet: "{amount} added once per stay.",
      cleaningPlaceholder: "10,000",
      minStayLabel: "Shortest stay in nights",
      instantTitle: "Instant book",
      instantBody: "Guests book without waiting for you to confirm.",
      rentalNote:
        "Rentals are priced per year. Guests message you inside RentMe, inspect the property, then pay. For your safety, keep every chat and payment inside RentMe.",
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
        "Sending for review switches on the moment the platform keys land. Your work is saved on this device.",
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
      title: "List your property on RentMe",
      bodySignedIn:
        "Listing is open to approved agents. The application takes about two minutes and we review within 24 to 48 hours.",
      bodySignedOut:
        "Sign in to your agent account to start a listing, or apply in about two minutes if you are new here.",
      points: {
        verified: {
          title: "Verified supply only",
          body:
            "Every listing is checked by hand, so the badge on your property means something to guests.",
        },
        inside: {
          title: "Guests reach you inside RentMe",
          body: "Chats, inspections and payments stay on the platform, where they are protected.",
        },
        keep: {
          title: "You keep what you charge",
          body: "RentMe charges you nothing to list. Your price is your price.",
        },
      },
      apply: "Become an agent",
      signIn: "Sign in",
      how: "How listing works",
    },

    workspace: {
      title: "My listings",
      lede: "Every property you have on RentMe, and where each one stands.",
      start: "Start a listing",
      unconfigured:
        "Your listings appear here the moment the platform keys land. You can start building one now: the wizard keeps your work on this device until then.",
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
      "Your requests and stays appear here the moment the platform keys land. Nothing is lost in the meantime.",
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
    lede: "What has settled from your stays, taken straight from the ledger.",
    unconfigured: "Your earnings appear here the moment the platform keys land.",
    unavailable:
      "We could not read the ledger just now, so no figure is shown rather than a wrong one. Reload in a moment.",
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
      "A settled payment is split three ways: your share, the platform's share and what the payment processor takes. The three always add up to what the guest paid, which is why every line here reconciles.",
  },

  /**
   * The admin console. Staff-only copy, but copy all the same: an operator in
   * Kano works the same queues as an operator in Lagos.
   */
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
      unconfiguredTitle: "The console is not open yet",
      unconfiguredBody:
        "The console switches on the moment the platform keys land. Nothing is lost in the meantime.",
      signedOutTitle: "Staff sign in",
      signedOutBody: "Sign in with your operations account to continue.",
      notAdminTitle: "You do not have console access",
      notAdminBody:
        "This area is for the RentMe operations team. Your account does not carry that role.",
      backToRentMe: "Back to RentMe",
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
        CANCELLED: "Cancelled",
      },
    },

    overview: {
      title: "Operations overview",
      lede:
        "Every trust signal RentMe produces ends here: what the safety scan caught, what members reported, who is waiting to be approved, and what is waiting to go live. Each number is a queue you can clear.",
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
        "Approving creates the agent profile, grants the agent role so Agent Mode opens, and tells the applicant on the platform. Sending one back asks for exactly what is missing.",
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
          "This creates their agent profile, grants the agent role so Agent Mode opens for them, and tells them on the platform. It is written to the audit log with your name against it.",
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
      supportSender: "RentMe support",
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
          "The dates reopen straight away, and anything owed goes to the guest wallet in the same transaction. The amount comes from the published schedule, never from a figure typed here.",
        reasonLabel: "Why is this stay being cancelled",
        working: "Working out what is owed",
        owed: "{refund} goes back to the guest.",
        kept: "{retained} stays with the host.",
        nothingPaid: "Nothing was ever paid for this stay, so no money moves.",
        confirm: "Cancel and refund",
        notesLabel: "What was established",
        successTitle: "Stay cancelled",
        successBody:
          "The nights are back on the calendar, the money is in the guest wallet, and the guest has the amount and the reason in writing.",
      },
    },

    switches: {
      title: "Switches",
      lede:
        "Turn a surface off across RentMe without a deploy, then turn it back on when the incident is over. Nothing is deleted either way.",
      warning:
        "Switching a surface off takes it away from everyone immediately, including people in the middle of using it. Work already saved is kept. Pages pick the change up within about thirty seconds. Every flip is written to the audit log with your name against it.",
      on: "On",
      off: "Off",
      defaultNote: "A switchable RentMe surface.",
      switchingOff: "Switching off: {consequence}",
      lastChanged: "Last changed {when}",
      switchOn: "Switch on",
      switchOff: "Switch off",
      labels: {
        bookings: "Bookings",
        wallet: "Wallet",
        messaging: "Messaging",
        assistant: "Assistant",
        support: "Support",
        agent_listings: "Agent listings",
        hybrid_hotels: "Partner hotels",
        hybrid_restaurants: "Partner restaurants",
      },
      consequences: {
        bookings: "Guests cannot reserve or cancel a stay. Existing bookings are untouched.",
        wallet: "Funding, withdrawals and transfers stop. Balances and history are untouched.",
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
          "Everyone loses this part of RentMe straight away, including people in the middle of using it. Nothing already saved is deleted, and switching it back on restores the surface. The change reaches every page within about thirty seconds.",
        confirm: "Yes, switch it off",
        successTitle: "Switched off",
        successBody: "The surface is off for everyone and the change is in the audit log.",
      },
    },
  },

  a11y: {
    logoHome: "RentMe home",
    expand: "Expand",
    collapse: "Collapse",
    openMenu: "Open menu",
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
  },
};

/**
 * Note the absence of `as const`. Widening the values to `string` is
 * deliberate: with literal types every translation would have to equal the
 * English text to typecheck. The shape is still enforced, so a missing or
 * misspelled key remains a compile error.
 */
export type Dictionary = typeof en;
