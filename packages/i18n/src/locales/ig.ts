import type { Dictionary } from "./en";

/**
 * Igbo.
 *
 * NEEDS NATIVE REVIEW BEFORE LAUNCH. Functional and uses the dotted vowels
 * (ị, ọ, ụ) correctly, but marketing copy should be rewritten by a native
 * speaker rather than translated literally. Tracked in KNOWN_GAPS.md.
 */
export const ig: Dictionary = {
  meta: { localeName: "Igbo", localeNativeName: "Igbo", dir: "ltr" },

  /*
   * The three cards on the way in, shown once, straight after a confirmed
   * sign-up. Three sentences about what this place is: what is on it, what it
   * costs, and the one rule that keeps somebody's money safe. That last card
   * is not marketing, it is the messaging trust rule stated before anybody has
   * a chance to break it.
   */
  welcomeCards: {
    label: "Gịnị bụ RentMe",
    skip: "Wufee",
    start: "Hapụ m banye",
    goTo: "Gaa na kaadị {n}",
    one: {
      title: "Ebe niile, n'otu ebe",
      body:
        "Ụlọ mgbazinye, họtel maka ngwụcha izu, ụlọ oriri na ahụmahụ. Naịjịrịa niile, steeti iri atọ na isii niile, otu ọchụchọ.",
    },
    two: {
      title: "Ọ dịghị onye na-akwụ anyị ụgwọ ọrụ",
      body:
        "Ọ bụghị gị, ọ bụghị onye nwe ụlọ. Ihe ị hụrụ bụ ihe ị ga-akwụ, ruo kobo, akara nkwenye pụtakwara na anyị onwe anyị lere ya anya.",
    },
    three: {
      title: "Ziga ozi bụ ụzọ, kwụọ ụgwọ mgbe obi siri gị ike",
      body:
        "Gwa onye nwe ụlọ okwu, lelee ebe ahụ, wee kwụọ ụgwọ na ikpo okwu a. Ezigala mmadụ ọ bụla ego na mpụga RentMe.",
    },
  },

  common: {
    search: "Chọọ",
    signIn: "Banye",
    signUp: "Debanye aha",
    signOut: "Pụọ",
    viewAll: "Lee ha niile",
    seeAll: "Lee ha niile",
    back: "Laghachi",
    next: "Osote",
    continue: "Gaa n'ihu",
    loading: "Na-ebu",
    perNight: "kwa abalị",
    night: "abalị",
    year: "afọ",
    reviews: "nyocha",
    verified: "Enyochala",
    skipToContent: "Wụga na ọdịnaya",
    notSet: "Edobeghị ya",
  },

  nav: {
    home: "Ụlọ",
    hotels: "Họtel",
    apartments: "Ụlọ obibi",
    homes: "Ebe obibi",
    rent: "Mgbazinye ụlọ",
    restaurants: "Ụlọ oriri",
    experiences: "Ahụmahụ",
    services: "Ọrụ",
    properties: "Ihe onwunwe",
    bookings: "Ndebe",
    messages: "Igbe Ozi",
    wallet: "Akpa ego",
    aiAssistant: "Onye enyemaka AI",
    profile: "Profaịlụ",
    settings: "Ntọala",
    explore: "Chọgharịa",
    saved: "Echekwara",
    around: "Ógbè",
    feed: "Akụkọ ógbè",
    map: "Maapụ",
    primaryLabel: "Isi",
    accountLabel: "Akaụntụ",
    notifications: "Ọkwa",
    places: "Ebe",
    people: "Ndị mmadụ",
    agentMode: "Ọnọdụ Onye nnọchi",
    consoleLabel: "Njikwa",
    workspacesLabel: "Ebe ọrụ",
  },

  social: {
    feedName: "Akụkọ RentMe",
    tabForYou: "Maka gị",
    tabFollowing: "Ndị ị na-eso",
    tabNew: "Ọhụrụ",
    tabsLabel: "Akụkọ ole ka a ga-agụ",
    feedSettings: "Ntọala akụkọ",
    filters: "Nzacha",
    emptyFollowing: "Ị sonyebeghị ebe ọ bụla. Họrọ ndị ị maara, nke a ga-abụ akụkọ gị.",
    emptyFollowingSignedOut: "Ndị ị na-eso na-egosi ebe ndị ị sonyeere. Banye ma họrọ ole na ole.",
    emptyNew: "E kwubeghị ihe ọhụrụ ọ bụla n'ebe mepere emepe.",
    settingsLede: "Ebe akụkọ a si bịa, na ihe o kwere igosi gị.",
    manage: "Jikwaa ebe",
    allPlaces: "Ebe gị niile",
    pickPlaces: "Họrọ ebe gị",
    switcherLabel: "Ebe ole ka a ga-agụ",
    openPlacePage: "Mepee ebe a na peeji nke ya",
    browsingOpen:
      "Ị sonyebeghị n'ebe ọ bụla, ya mere nke a bụ ebe emeghere kacha ju eju, ọ bụghị nke gị. Họrọ ndị ị maara, ọ ga-aghọ akụkọ gị.",
    browsingOpenSignedOut:
      "Nke a bụ ebe emeghere kacha ju eju. Banye, họrọ ndị ị maara, ọ ga-aghọ akụkọ gị.",
    emptyJoined:
      "Ọ dịbeghị ihe a kwuru n'ebe gị. Ihe ị ga-ede ga-abụ ihe mbụ onye ọ bụla bịara ga-agụ.",
    emptyAnywhere:
      "Ọ dịbeghị ihe a kwuru n'ebe ọ bụla emeghere. Ọ dịghị ihe zoro ezo, ọ dịghịkwa ihe furu efu: Ógbè dị ọhụrụ otu a.",
  },

  socialProfile: {
    back: "Laghachi",
    verified: "Onye nnọchiteanya enyochara",
    verifiedTitle: "Onye nnọchiteanya RentMe enyochara",
    moderatorShort: "NLEKỌTA",
    moderatorOf: "Ọ na-elekọta {place}",
    pidginWelcome: "Pidgin nabatara",
    follow: "Soro",
    followingAction: "Na-eso",
    followAria: "Soro @{handle}",
    unfollowAria: "Ị na-eso @{handle}. Pịa ka ị kwụsị iso.",
    followers: "Ndị na-eso",
    following: "Ọ na-eso",
    posts: "Ederede",
    joined: "Ọ sonyere na {month}",
    editProfile: "Dezie profaịlụ",
    trustScore: "Akara ntụkwasị obi",
    completedDeals: "Azụmahịa emechara",
    responseTime: "Oge nzaghachi",
    tabsLabel: "Ihe @{handle} nwere na peeji ya",
    tabPosts: "Ederede",
    tabReplies: "Nzaghachi",
    tabMedia: "Foto",
    tabActivity: "Ọrụ",
    tabProperties: "Ụlọ",
    tabStories: "Akụkọ",
    tabReviews: "Nyocha",
  },

  landing: {
    navHome: "Ụlọ",
    hero: {
      line1: "Chọta ya.",
      line2: "Debe ya.",
      line3: "Bie ya.",
      subtitle:
        "Ebe gị otu maka ụlọ, họtel, ụlọ oriri, ahụmahụ na ihe ndị ọzọ.",
      searchPlaceholder: "Ebee ka ị chọrọ ịga?",
      searchLabel: "Chọọ ebe na Naịjirịa niile",
      popularLabel: "Ewu ewu ugbu a",
    },
    vision: {
      overline: "Ọhụụ anyị",
      title: "Naịjịrịa n'aka gị. Afrịka na-esote.",
      body: "RentMe na-ewu ụlọ a pụrụ ịtụkwasị obi maka nchọpụta, ebe obibi, nri na ahụmịhe n'ofe Naịjịrịa, wee bụrụ kọntinent ahụ. Otu akaụntụ, otu obere akpa ego, otu onye enyemaka.",
      missionOverline: "Ebumnuche anyị",
      missionTitle: "Mee ka ịchọta na idebe ihe ọ bụla dị mfe ma dị mma.",
      missionBody: "Ebe akwadoro, ọnụahịa ziri ezi na naira, nyocha ziri ezi, na onye enyemaka nke ghọtara ihe ị chọrọ.",
      points: {
        verified: { title: "Nkwenye mbụ", body: "A na-enyocha ndepụta na onye nnọchiteanya ọ bụla tupu ọ pụta." },
        naira: { title: "Ọnụahịa na naira", body: "Mkpokọta doro anya, enweghị ihe ijuanya ma ọ bụ ego zoro ezo." },
        everywhere: { title: "Steeti 36 niile", body: "Na mba niile site n'ụbọchị mbụ." },
        assistant: { title: "AI na-enye aka", body: "Jụọ n'asụsụ dị mfe ma nweta ebe ndị dị adị." },
      },
    },
    stats: {
      hotels: "Họtel",
      apartments: "Ụlọ obibi",
      restaurants: "Ụlọ oriri",
    },
    features: {
      ai: { title: "Onye enyemaka AI", body: "Enyemaka amamihe, awa 24" },
      verified: { title: "Ndepụta enyochara", body: "Ntụkwasị obi na nchekwa" },
      prices: { title: "Ọnụahịa kacha mma", body: "Chekwaa karịa" },
      booking: { title: "Ndebe dị mfe", body: "Ngwa ngwa na mfe" },
    },
    trust: {
      multiLanguage: { title: "Asụsụ dị iche iche", body: "EN / YO / HA / IG" },
      secure: { title: "Nchekwa & Ntụkwasị Obi", body: "Nchekwa gị bụ ihe mbụ" },
      ai: { title: "Ike AI", body: "Ahụmahụ amamihe" },
      africa: { title: "Emere maka Afrika", body: "Ewuru ya na ịhụnanya ❤️" },
      stores: { title: "Dị na", body: "App Store & Play Store" },
    },
    categories: {
      title: "Ihe niile, n'otu ebe",
      subtitle: "Ụzọ ise ịchọpụta Naịjirịa. Otu akaụntụ, otu akpa ego.",
    },
    cta: {
      title: "Ị dịla njikere ịchọta ebe ọzọ gị?",
      subtitle: "Sonye na ọtụtụ puku na-achọpụta ebe obibi, nri na ahụmahụ.",
      action: "Malite n'efu",
      secondary: "Lee ka ọ si arụ ọrụ",
    },
    footer: {
      tagline: "Chọta ya. Debe ya. Bie ya. Na Naịjirịa.",
      rights: "Ikike niile echekwabara.",
      product: "Ngwaahịa",
      company: "Ụlọ ọrụ",
      support: "Nkwado",
      legal: "Iwu",
      about: "Banyere anyị",
      careers: "Ọrụ",
      help: "Ebe enyemaka",
      contact: "Kpọtụrụ anyị",
      privacy: "Nzuzo",
      terms: "Usoro",
      docs: "Akwụkwọ ntuziaka",
      becomeAgent: "Bụrụ onye nnọchiteanya",
    },
  },

  auth: {
    welcomeBack: "Nnọọ ọzọ",
    signInToContinue: "Banye ka ị gaa n'ihu",
    createAccount: "Mepụta akaụntụ gị",
    signUpToStart: "Malite ịchọpụta n'ime otu nkeji",
    orContinue: "ma ọ bụ jiri",
    continueWithEmail: "Jiri Email gaa n'ihu",
    continueWithGoogle: "Jiri Google gaa n'ihu",
    continueWithApple: "Jiri Apple gaa n'ihu",
    continueWithX: "Jiri X gaa n'ihu",
    orDivider: "ma ọ bụ",
    emailLabel: "Adreesị email",
    emailPlaceholder: "gi@ihe-atu.com",
    passwordLabel: "Okwuntughe",
    passwordPlaceholder: "Opekempe mkpụrụedemede asatọ",
    fullNameLabel: "Aha zuru ezu",
    fullNamePlaceholder: "Aha gị",
    forgotPassword: "Ichefuru okwuntughe?",
    noAccount: "Ị nweghị akaụntụ?",
    haveAccount: "Ị nweela akaụntụ?",
    termsNotice: "Site n'ịga n'ihu ị kwenyere na Usoro na Iwu Nzuzo anyị.",
    providerUnavailable: "Edobeghị ụzọ nbanye a.",
    backToHome: "Laghachi n'ụlọ",
    otherWays: "Ụzọ ndị ọzọ ị ga-esi gaa n'ihu",
    resetTitle: "Tọgharịa okwuntughe gị",
    resetLead: "Pịnye adreesị email dị na akaụntụ gị, anyị ga-ezitere gị njikọ iji hazie okwuntughe ọhụrụ.",
    resetSend: "Zipu njikọ nrụzi",
    resetSentLead: "Lelee igbe email gị.",
    resetNotArrived: "Ọ bịaghị mgbe nkeji ole na ole gasịrị? Lelee na spam, ma lelee adreesị i pịnyere. Ị nwere ike ịrịọ ọzọ site na ihuenyo nbanye.",
    resetExpiredTitle: "Njikọ ahụ agwụla",
    resetExpiredLead: "Njikọ nrụzi na-adị otu awa, ọ na-arụkwa ọrụ otu ugboro. Rịọ nke ọhụrụ ma mepee ya n'otu ngwaọrụ ahụ.",
    newPasswordTitle: "Họrọ okwuntughe ọhụrụ",
    newPasswordLead: "Họrọ nke ị na-ejibeghị ebe a. A ga-abanye gị ozugbo echekwara ya.",
    newPasswordLabel: "Okwuntughe ọhụrụ",
    newPasswordSave: "Chekwaa ma banye",
    confirmPasswordLabel: "Kwado okwuntughe",
    confirmPasswordPlaceholder: "Pịghachi okwuntughe gị",
  },

  signUp: {
    groups: {
      identity: "Onye ị bụ",
      credentials: "Otú ị si abanye",
      place: "Ebe ị bi, na ihe ị na-eme",
      discovery: "Otú ị si chọta anyị",
    },
    stepOf: "{current} nke {total}",
    optional: "Nhọrọ",
    firstNameLabel: "Aha mbụ",
    firstNamePlaceholder: "Ada",
    surnameLabel: "Aha ezinụlọ",
    surnamePlaceholder: "Okafor",
    nicknameLabel: "Aha ọzọ",
    nicknamePlaceholder: "Ihe ndị enyi gị na-akpọ gị",
    passwordMismatch: "Okwuntughe abụọ ahụ adabaghị ibe ha.",
    strength: {
      weak: "Adịghị ike",
      fair: "Nke etiti",
      good: "Dị mma",
      strong: "Siri ike",
    },
    showPassword: "Gosi okwuntughe",
    hidePassword: "Zoo okwuntughe",
    placeNote:
      "Ọchịchị ime obodo gị na-ekpebi ebe ndị ihuenyo ụlọ gị ga-emeghe na ha. Ị nwere ike ịgbanwe ha abụọ na ntọala ma emesịa.",
    hearAboutLabel: "Ebee ka ị nụrụ maka anyị",
    hearAboutPlaceholder: "Họrọ otu",
    hearAbout: {
      instagram: "Instagram",
      tiktok: "TikTok",
      x: "X",
      friendOrFamily: "Enyi ma ọ bụ ezinụlọ",
      googleSearch: "Nchọta Google",
      other: "Ihe ọzọ",
    },
    referralLabel: "Koodu ntụzi",
    referralPlaceholder: "Tinye koodu gị",
  },

  pickers: {
    clear: "Hichapụ",
    close: "Mechie",
    search: "Chọọ",
    clearSearch: "Hichapụ nchọta",
    loading: "Na-ebu ndepụta ahụ.",
    emptyTitle: "Ọ dịghị ihe dabara na nke ahụ",
    emptyUnreachable:
      "Anyị enweghị ike ibu ndepụta ahụ ugbu a. Mechie nke a ma nwaa ọzọ obere oge.",
    emptySearch: "Nwaa okwu dị mkpụmkpụ, ma ọ bụ akụkụ aha ahụ.",

    countryLabel: "Obodo",
    countryName: "Naịjirịa",
    countryOnly: "Sọọsọ ya, ugbu a",

    stateLabel: "Steeti",
    statePlaceholder: "Họrọ steeti gị",
    stateSearch: "Chọọ steeti 37",

    lgaLabel: "Ọchịchị ime obodo",
    lgaPlaceholder: "Họrọ ọchịchị ime obodo gị",
    lgaLocked: "Buru ụzọ họrọ steeti",
    lgaDisabledHint: "Steeti gị na-ekpebi ọchịchị ime obodo ndị dị na ndepụta a.",
    searchIn: "Chọọ {place}",

    occupationLabel: "Ihe ị na-eme",
    occupationHint:
      "Ndị a na-ahụkarị dị n'elu, ndị fọdụrụ ka ekewara n'ụdị ọrụ. Achọghị m ikwu dị na ndepụta ahụ, ọ bụkwa azịza ezi okwu.",
    occupationPlaceholder: "Họrọ ọrụ gị",
    occupationSearch: "Chọọ ọrụ 749",
    commonOccupations: "Ndị a na-ahụkarị na Naịjirịa",
  },

  interests: {
    markets: {
      apartment: "Ụlọ obibi",
      hotel: "Họtel",
      home: "Ebe obibi",
      villa: "Villa",
      shortlet: "Shortlet",
      rental: "Mgbazinye",
      shop: "Ụlọ ahịa",
      office: "Ọfịs",
      land: "Ala",
    },
    tune: {
      open: "Gbanwee ihe na-ebu ụzọ",
      title: "Gịnị kwesịrị ibu ụzọ?",
      explain:
        "Nke a na-agbanwe naanị usoro nsonaazụ ị na-akpachaghị onwe gị. Ọ dịghị ihe a na-ezochi, ọchụchọ ma ọ bụ nzacha ọ bụla ị hazichara na-emeri mgbe niile.",
      more: "Chọrọ ihe dị ka nke a",
      less: "Ọ bụghị maka m",
      close: "Mechie",
      standingOn: "{market} na-ebu ụzọ ugbu a.",
      standingOff: "{market} anaghị ebu ụzọ ugbu a.",
      movedUp: "{market} arịgoola elu.",
      alreadyUp: "{market} ebuburu ụzọ, ya mere ọ dịghị ihe gbanwere.",
      steppedBack: "{market} agaghị ebu ụzọ ọzọ.",
      alreadyBack: "{market} anaghị ebu ụzọ na mbụ, ya mere ọ dịghị ihe gbanwere.",
    },
      hints: {
      apartment: "Ịnọ abalị n'ụlọ dị elu",
      hotel: "Ọnụ ụlọ, akwụ ụgwọ kwa abalị",
      home: "Ụlọ dum maka obibi gị",
      villa: "Ebe buru ibu nke onwe gị",
      shortlet: "Abalị ole na ole ruo izu ole na ole",
      rental: "Ebe obibi, kwa afọ",
      shop: "Ebe ahịa, kwa afọ",
      office: "Ebe ọrụ, kwa afọ",
      land: "Ala ị ga-azụ ma ọ bụ gbaziri",
    },
    accountTitle: "Nke a bụ nke akaụntụ gị",
    accountBodySignedOut: "Ihe ị bịara maka ya ka echekwara na akaụntụ gị, ya mere ọ na-eso gị na ngwaọrụ ọ bụla ma na-ekpebi ihe anyị ga-ebu ụzọ gosi gị.",
    accountBodyUnconfigured: "Akaụntụ ga-amalite ozugbo igodo ikpo okwu rutere. Ihe ị bịara maka ya ka echekwara na akaụntụ gị, ya mere ọ na-eso gị na ngwaọrụ ọ bụla.",
    question: "Gịnị ka ị bịara maka ya?",
    note: "Nke a na-agbanwe naanị ihe anyị bu ụzọ gosi. Nchọta ma ọ bụ nzacha ọ bụla ị hazichara na-emeri mgbe niile.",
    noteFirstRun: " Ị nwere ike ịgbanwe ya ma emesịa na Ntọala.",
    save: "Chekwaa ihe m bịara maka ya",
    skip: "Wụfee",
    savedNothing: "Echekwara. Ị kwughị ihe ọ bụla kpọmkwem, ya mere ọ dịghị ihe e buliri elu karịa ibe ya.",
    savedSomething: "Echekwara. Nke a bụ ihe anyị ga-ebu ụzọ gosi gị.",
    screenTitle: "Ihe ị bịara maka ya",
    screenSubtitle: "Họrọ ka ọ masịrị gị, ma ọ bụ ghara ịhọrọ ihe ọ bụla",
    rowLabel: "Ihe ị na-achọ",
    rowNote: "Nke a na-ekpebi naanị ihe anyị bu ụzọ gosi gị. Nchọta ọ bụla ị hazichara na-emeri mgbe niile.",
    rowNoteSignedOut: "Banye ka nke a nọrọ na akaụntụ gị, ka o soro gị na ngwaọrụ ọ bụla.",
    rowNothing: "Ọ dịghị ihe kpọmkwem",
    rowNotAsked: "Azabeghị ya",
},

  settings: {
    appearance: {
      label: "Ọdịdị",
      note: "Echekwara ya na ngwaọrụ a. Ọchịchịrị bụ nhọrọ mbụ e mere.",
      theme: "Agba ihuenyo",
      themeSystem: "Nke ngwaọrụ",
      themeLight: "Ìhè",
      themeDark: "Ọchịchịrị",
      textSize: "Ogo mkpụrụedemede",
      textSmall: "Obere",
      textMedium: "Etiti",
      textLarge: "Buru ibu",
      reduceMotion: "Belata mmegharị",
      reduceMotionSub: "Ọ na-eme ka mmegharị mbata na nke mmetụ dajụọ n'ebe niile n'ime ngwa a.",
      lessData: "Jiri data dị ntakịrị",
      lessDataSub:
        "Ọ na-egbochi ngwa a ibu ebe tupu i mepee ya, ọ na-arịọkwa maka foto ndị dị nta.",
    },

    language: {
      label: "Asụsụ",
      appLanguage: "Asụsụ ngwa",
    },

    place: {
      label: "Ebe ị nọ",
      noteSet:
        "Nke a bụ obodo peeji ụlọ ga-emepe na ya. Ọrụ gị si na ndepụta ikpo okwu a nke 749, ya mere enwere ike ịchọ ya.",
      noteUnset: "Hazie ndị a ka peeji ụlọ mepee ebe ị nọ.",
      noteSignedOut: "Banye ka steeti gị na ọchịchị ime obodo gị nọrọ na akaụntụ gị.",
      lga: "Ọchịchị ime obodo",
      state: "Steeti",
      occupation: "Ihe ị na-eme",
      screenTitle: "Ebe ị nọ",
      screenSubtitle: "Naịjirịa, mgbe ahụ steeti gị, mgbe ahụ ọchịchị ime obodo gị",
      accountTitle: "Nke a bụ nke akaụntụ gị",
      accountBodyUnconfigured:
        "Akaụntụ ga-amalite ozugbo igodo ikpo okwu rutere. Echekwara steeti gị, ọchịchị ime obodo gị na ọrụ gị na akaụntụ gị, ya mere ha na-eso gị na ngwaọrụ ọ bụla.",
      accountBodySignedOut:
        "Echekwara steeti gị, ọchịchị ime obodo gị na ọrụ gị na akaụntụ gị, ya mere ha na-eso gị na ngwaọrụ ọ bụla ma na-ekpebi ebe peeji ụlọ ga-emepe na ya.",
      statesUnavailable:
        "Ndepụta steeti abụghị ibu ugbu a. Megharịa peeji a, ọ ga-alọta. Ọ dịghị ihe i chekwaralarị gbanwere.",
    },

    notifications: {
      label: "Ọkwa",
      note: "Echekwara ha na ngwaọrụ a ruo mgbe ị banyere, mgbe ahụ ha ga-eso akaụntụ gị.",
      push: "Ọkwa ozugbo",
      pushSub: "Mmelite ndebe na nzaghachi, ozugbo na ngwaọrụ a.",
      email: "Email",
      emailSub: "Akwụkwọ nnata, nkwenye na ozi ndị pụrụ iche mgbe ụfọdụ.",
      sms: "SMS",
      smsSub: "Ọkwa ndebe ngwa ngwa site na ozi ekwentị.",
      whatsapp: "WhatsApp",
      whatsappSub: "Nkwenye ndebe na nzaghachi onye nwe ụlọ na WhatsApp.",
    },

    privacy: {
      label: "Nzuzo",
      note: "Onye nwere ike ịhụ m metụtara aha gị na nyocha gị n'elu ihe ndepụta.",
      whoCanSeeMe: "Onye nwere ike ịhụ m",
      everyone: "Onye ọ bụla",
      onlyMe: "Naanị m",
      readReceipts: "Akara ọgụgụ",
      readReceiptsSub: "Mee ka ndị nwe ụlọ hụ mgbe ị gụrụ ozi ha.",
      personalised: "Ndụmọdụ dabara gị",
      personalisedSub: "Jiri nchọta gị na ndebe gị hazie ebe ndị ga-amasị gị.",
    },

    search: {
      label: "Nchọta",
      note: "Nchọta na-emepe na mpaghara mbụ gị, ị nwekwara ike ile ebe ọ bụla mgbe ọ bụla. A na-egosi ọnụahịa niile na RentMe na Naira.",
      defaultArea: "Mpaghara mbụ",
      allOfNigeria: "Naịjirịa dum",
      currency: "Ego",
      mapDistances: "Ebe dị anya na maapụ",
      kilometres: "Kilomita",
      miles: "Maịl",
    },

    security: {
      label: "Nchekwa",
      // NATIVE REVIEW: `nnọkọ` KEPT. Yorùbá and Hausa both had to drop their
      // word for "session" here, but Igbo does not: `nnọkọ` is the ordinary
      // Igbo term for a session in the sense of a sitting that runs and then
      // ends, it is what Igbo broadcasting uses, and unlike Hausa `zama` it
      // collides with nothing else in this dictionary.
      signOutNote:
        "Nke a bụ naanị nnọkọ gị, ya mere ọ dịghị nke ọzọ ị ga-apụ na ya. Ozugbo akaụntụ malitere, ihe njikwa a ga-akwụsị nnọkọ ọ bụla na ngwaọrụ ọ bụla n'otu mgbe.",
      // NATIVE REVIEW: was `site n'ahụ`, "through the body". Names the two
      // methods, matching the sub-line and what the phone itself calls them.
      appLock: "Mkpọchi ngwa site na mkpịsị aka ma ọ bụ ihu",
      appLockSub:
        "Rịọ maka mkpịsị aka ma ọ bụ ihu mgbe ngwa a mepere, na ngwaọrụ ndị kwadoro ya.",
      signedInOn: "Ị banyere na",
      thisDevice: "Ngwaọrụ a",
      deviceOn: "{browser} na {os}",
      unknownBrowser: "Ihe nchọgharị",
      unknownOs: "ngwaọrụ a",
      signOutEverywhere: "Pụọ n'ebe niile",
    },

    data: {
      label: "Data gị",
      exportNote:
        "Ugbu a ihe niile RentMe maara banyere gị nọ n'ime ihe nchọgharị a, ọ dịghịkwa ihe hapụrụ ngwaọrụ a. Mbupụ data zuru oke ga-abịa na mwepụta mmalite.",
      download: "Budata data m",
      downloadSub: "Otu ndetu nke ihe niile RentMe ji banyere gị.",
      clear: "Hichapụ data ngwaọrụ a",
      clearAgain: "Pịa ọzọ iji kwado",
      clearSub:
        "Ọ na-ewepụ aha profaịlụ gị, ntọala gị na mkparịta ụka echekwara na ngwaọrụ a, mgbe ahụ ọ megharịa peeji ahụ.",
    },

    account: {
      label: "Akaụntụ",
      saved: "Echekwara ya na akaụntụ gị",
      unconfiguredNote:
        "Akaụntụ ga-amalite ozugbo igodo ikpo okwu rutere. Ihe niile ị hazicharala ebe a ka echekwara na ngwaọrụ a ruo mgbe ahụ.",
      signedIn: "Ị banyere",
      notSignedIn: "Ị banyeghị",
      signedOutSub: "Banye ka profaịlụ gị na ntọala gị nọrọ na akaụntụ gị kama ịnọ na ngwaọrụ a.",
      unconfiguredSub: "Echekwara ya na ngwaọrụ a ugbu a.",
      activeOnThisDevice: "Ọ na-arụ ọrụ na ngwaọrụ a",
      signingOut: "Na-apụ",
      deleteAccount: "Hichapụ akaụntụ m",
      deleteAccountSub:
        "Ọ na-ewepụ profaịlụ gị, ntọala gị, ebe ndị i chekwara na akụkọ ozi gị kpamkpam. Enweghị ike ịtụgharị nke a.",
    },

    notify: {
      guest: {
        bookings: "Ndebe",
        bookingsSub: "Arịrịọ, nkwenye na mgbanwe na njem gị.",
        messages: "Ozi",
        messagesSub: "Nzaghachi ọhụrụ site n'aka ndị nwe ụlọ na ndị nnọchiteanya ị na-agwa okwu.",
        wallet: "Akpa ego",
        walletSub:
          "Email banyere ego batara na ego pụrụ. Ihe ọ bụla na-etinye ego n'ihe ize ndụ ka na-apụta n'ime ngwa a.",
        marketing: "Echiche na onyinye",
        marketingSub: "Ozi pụrụ iche site na gburugburu Naịjirịa mgbe ụfọdụ. Ọ gbanyụrụ na mbụ.",
      },
      host: {
        bookings: "Ndebe",
        bookingsSub: "Arịrịọ ọhụrụ, nkagbu na ịkwụ ụgwọ n'elu ihe ndepụta gị.",
        messages: "Ozi",
        messagesSub: "Ajụjụ ọhụrụ site n'aka ndị ọbịa banyere ihe ndepụta gị.",
        wallet: "Ego na ụgwọ a na-akwụ",
        walletSub:
          "Email banyere ego batara na ego pụrụ. Ihe ọ bụla na-etinye ego n'ihe ize ndụ ka na-apụta n'ime ngwa a.",
        marketing: "Echiche na onyinye",
        marketingSub: "Ndụmọdụ nnabata ọbịa na ihe na-eme na mpaghara gị. Ọ gbanyụrụ na mbụ.",
      },
      hideActivity: "Zoo ihe m na-eme",
      hideActivitySub: "Mee ka nyocha gị na obibi gị nso nso a ghara ịpụta na profaịlụ ọha gị.",
      // NATIVE REVIEW: was `Onye nchekwa data`. `Onye` makes it a PERSON, "the
      // one who guards data", which is not what a switch is. Worse, `nchekwa`
      // is `settings.security.label` two groups up this same screen, so the
      // row read as "data security" - a switch that loads smaller photos
      // claiming to protect your data is a wrong promise, not a clumsy one.
      // `Mbelata ojiji data`, "cutting down data use", says what it does.
      dataSaver: "Mbelata ojiji data",
      dataSaverSub: "Buru foto ndị dị mfe na data ekwentị. Ọ dị mma maka obere bundulu.",
    },

    delete: {
      title: "Hichapụ akaụntụ",
      close: "Mechie",
      doneTitle: "Ehichapụla akaụntụ gị",
      doneBody:
        "Ihe niile jikọrọ ya esorola ya laa, e mekwara ka ị pụọ. Anyị na-akpọghachi gị na peeji ụlọ ugbu a. Ị nwere ike ịmalitegharị mgbe ọ bụla.",
      permanentTitle: "Nke a bụ ebighị ebi",
      losesProfile: "A na-ewepụ profaịlụ gị, foto gị na ntọala gị.",
      losesContent: "Ebe ndị i chekwara, ozi gị na nyocha gị ga-eso ha laa.",
      keepsBookings:
        "Ndebe e mereworị ga-anọgide na ndekọ onye nwe ụlọ, dị ka iwu chọrọ, mana ha ejikọtaghịkwa gị ebe a ọzọ.",
      talkFirst:
        "Ọ bụrụ na ihe emebiela, buru ụzọ gwa anyị okwu. Enwere ike idozi ọtụtụ ihe n'atụfughị akụkọ gị.",
      keep: "Hapụ akaụntụ m",
      typeToConfirm: "Pịnye {phrase} iji kwado",
      capitals: "Mkpụrụedemede ukwu kpọmkwem ka e gosiri. Ihe ọzọ agaghị emeghe bọtịnụ ahụ.",
      confirm: "Hichapụ kpamkpam",
    },

    about: {
      label: "Banyere",
      // NATIVE REVIEW: "row level security" kept in English, it names the
      // database feature the way "audit log" does. `nchekwa ọkwa ahịrị` was a
      // calque, and it reused `nchekwa`, which is already the Security group's
      // own label further up this same screen.
      note: "Ntọala echekwara na ngwaọrụ a na-anọgide na ngwaọrụ a. E ji row level security echedo ntọala akaụntụ, ya mere naanị gị nwere ike ịgụ ma ọ bụ gbanwee nke gị.",
      help: "Enyemaka",
      helpSub: "Nweta azịza site n'aka mmadụ",
      terms: "Usoro",
      privacy: "Amụma nzuzo",
      version: "Ụdị",
      licences: "Ikike isi mmalite mepere emepe",
    },
  },

  home: {
    greeting: "Nnọọ ọzọ",
    prompt: "Ebee ka ị na-aga taa?",
    searchPlaceholder: "Chọọ ebe, họtel, ụlọ oriri",
    locationLabel: "Ebe ị nọ",
    recommended: "Atụrụ aro maka gị",
    topExperiences: "Chọpụta ahụmahụ kacha mma",
    nearby: "Nso gị",
    aiCard: {
      title: "RentMe AI",
      body: "Enyi njem gị maara ihe. Jụọ ihe ọ bụla n'okwu dị mfe.",
      action: "Jụọ onye enyemaka",
      samplePrompt: "Ụlọ ime abụọ na Lekki n'okpuru 300k nwere ọdọ mmiri",
    },
    agentCard: {
      title: "Bụrụ Onye Nnọchiteanya RentMe",
      body: "Depụta ihe onwunwe gị, jikwaa ndebe, nweta karịa ma zụlite azụmahịa gị.",
      action: "Bụrụ onye nnọchiteanya",
    },
    experienceCategories: {
      beach: "Ebe izu ike n'akụkụ oke osimiri",
      city: "Njem obodo",
      dining: "Nri dị elu",
      adventure: "Njem ọhụụ",
      events: "Mmemme",
    },
  },

  agent: {
    mode: {
      personal: "Ọnọdụ Onwe",
      agent: "Ọnọdụ Onye Nnọchi",
      switchToAgent: "Gbanwee na Ọnọdụ Onye Nnọchi",
      switchToPersonal: "Gbanwee na Ọnọdụ Onwe",
      manageSub: "Jikwaa ndepụta na ego gị",
      chooseTitle: "Họrọ ọnọdụ gị",
      chooseSub: "Gbanwee n'etiti ọnọdụ mgbe ọ bụla",
      personalDesc: "Chọpụta ma debe ebe magburu onwe ha na Naịjirịa.",
      agentDesc: "Jikwaa ndepụta, ndebe, ndị ahịa na ego gị.",
      verifiedAgent: "Onye Nnọchi Enyochara",
      visitor: "Ị banyeghị dịka onye nnọchi",
      signInToWorkspace: "Banye",
      workspaceLabel: "Ebe ọrụ onye nnọchi",
      notApproved: "A ka na-enyocha arịrịọ onye nnọchi gị.",
    },
    nav: {
      dashboard: "Dashboard",
      money: "Ego",
      myListings: "Ndepụta M",
      listApartment: "Depụta Ụlọ",
      bookings: "Ndebe",
      messages: "Igbe Ozi",
      reviews: "Nyocha",
      earnings: "Ego",
      analytics: "Nyocha data",
      verification: "Nkwenye",
      settings: "Ntọala",
    },
    join: {
      title: "Sonye na Obodo Ndị Nnọchi RentMe",
      body: "Depụta ihe onwunwe, jikọọ na ndị ọbịa enyochara, jikwaa ndebe ma nweta ego.",
      start: "Malite arịrịọ",
      resume: "Gaa n'ihu na arịrịọ",
      whatYouGet: "Ihe ị na-enweta",
      benefitReach: "Ruo ọtụtụ puku ndị ọbịa enyochara",
      benefitTools: "Ngwaọrụ ndepụta na ndebe ọkachamara",
      benefitEarn: "Soro ego ma nweta ụgwọ n'enweghị nsogbu",
    },
    apply: {
      title: "Bụrụ Onye Nnọchi",
      draftSaved: "Echekwara akwụkwọ mbụ na ngwaọrụ a",
      next: "Osote",
      back: "Laghachi",
      submit: "Zipu arịrịọ",
      submitting: "Na-eziga",
      agentType: "Ụdị onye nnọchi",
      individual: "Otu onye",
      individualDesc: "Ọ bụ gị onwe gị na-edepụta ma na-ejikwa ihe onwunwe.",
      business: "Azụmahịa",
      businessDesc: "Ị na-anọchite ụlọ ọrụ edebanyere aha.",
      steps: {
        personal: "Ozi Onwe",
        identity: "Nkwenye Njirimara",
        business: "Ozi Azụmahịa",
        documents: "Nbulite Akwụkwọ",
        payout: "Nkọwa Ụlọ akụ / Ụgwọ",
        review: "Nyochaa & Zipu",
      },
      fields: {
        firstName: "Aha mbụ",
        lastName: "Aha ikpeazụ",
        phone: "Nọmba ekwentị",
        idType: "Ụdị njirimara",
        idNumber: "Nọmba njirimara",
        nin: "Nọmba Njirimara Mba (NIN)",
        bvn: "Nọmba Nkwenye Ụlọ akụ (BVN)",
        businessName: "Aha azụmahịa",
        rcNumber: "Nọmba RC",
        state: "Steeti",
        city: "Obodo",
        address: "Adreesị",
        bankName: "Ụlọ akụ",
        accountNumber: "Nọmba akaụntụ",
        accountName: "Aha akaụntụ",
        agreeTerms: "Ekwenyere m na Usoro Onye Nnọchi RentMe na Iwu Ụgwọ.",
      },
      documents: {
        title: "Bulite akwụkwọ gị",
        body: "Njirimara gọọmentị dị mkpa. Ndị nnọchi azụmahịa na-ebulitekwa ndebanye aha.",
        idFront: "Kaadị njirimara, ihu",
        idBack: "Kaadị njirimara, azụ",
        registration: "Ndebanye aha azụmahịa",
        upload: "Bulite",
        chooseFile: "Họrọ faịlụ, PNG ma ọ bụ JPG ma ọ bụ PDF, ruo 10MB",
      },
      review: {
        title: "Nyochaa ma zipu",
        body: "Lelee nkọwa gị. Ị nwere ike ịlaghachi na nzọụkwụ ọ bụla idezi.",
        editStep: "Dezie",
      },
    },
    status: {
      submittedTitle: "Ezigala arịrịọ",
      submittedBody: "Anyị na-enyocha arịrịọ gị. A ga-agwa gị mgbe akwadoro ya.",
      status: "Ọnọdụ",
      draft: "Akwụkwọ mbụ",
      pendingReview: "Na-echere Nyocha",
      underReview: "A na-enyocha",
      moreInfo: "Achọrọ Ozi Ọzọ",
      approved: "Akwadoro",
      rejected: "Ajụrụ",
      submittedOn: "Ezigara na",
      applicationId: "ID arịrịọ",
      reviewNote: "Ndị otu anyị na-enyocha arịrịọ n'ime awa 24 ruo 48.",
      backHome: "Laghachi n'ụlọ",
      enterAgent: "Banye Ọnọdụ Onye Nnọchi",
      signedOutTitle: "Banye ka ị hụ arịrịọ gị",
      signedOutBody:
        "Arịrịọ gị na nọmba ya jikọtara na akaụntụ gị, yabụ anyị ga-amara onye ị bụ tupu anyị egosi ha.",
      signIn: "Banye",
      noneTitle: "Enweghị arịrịọ edeturu",
      noneBody:
        "Ị tinyebeghị arịrịọ ịbụ onye nnọchi. Ọ na-ewe ihe dịka nkeji iri, ị ga-achọkwa otu njirimara foto.",
      startApplication: "Tinye arịrịọ ịbụ onye nnọchi",
      unconfiguredTitle: "Emeghebeghị arịrịọ ebe a",
      unconfiguredBody:
        "Ibe a ga-egosi ezigbo arịrịọ gị ozugbo igodo ikpo okwu rutere. Ọ dịghị ihe i zigara ga-efunahụ gị.",
      reviewedOn: "Kpebiri na",
      reviewerNote: "Ihe onye nyocha kwuru",
    },
    dashboard: {
      title: "Dashboard Onye Nnọchi",
      subtitle: "Nchịkọta azụmahịa ihe onwunwe gị",
      totalEarnings: "Ego Niile",
      totalBookings: "Ndebe Niile",
      activeListings: "Ndepụta Na-arụ Ọrụ",
      occupancyRate: "Ọnụọgụ Obibi",
      responseRate: "Ọnụọgụ Nzaghachi",
      earningsOverview: "Nchịkọta Ego",
      recentBookings: "Ndebe Nso nso a",
      bookingSources: "Isi mmalite Ndebe",
      listingPerformance: "Arụmọrụ Ndepụta",
      guestMessages: "Ozi Ọbịa",
      quickActions: "Omume Ngwa ngwa",
      addListing: "Tinye Ndepụta Ọhụrụ",
      viewBookings: "Lee Ndebe",
      manageListings: "Jikwaa Ndepụta",
      earningsReport: "Akụkọ Ego",
      thisMonth: "Ọnwa a",
      lastMonth: "ma e jiri ya tụnyere ọnwa gara aga",
      views: "Nlele",
      revenue: "Ego mbata",
      confirmed: "Akwadoro",
      pending: "Na-echere",
      /* The workspace with nobody in it. Three states and no fourth:
         signed out, signed in without an agent row, and unconfigured.
         The deck of invented figures this replaced is gone. */
      signedOutTitle: "Ebe ọrụ maka ndị na-edepụta ụlọ",
      signedOutBody:
        "Ego i nwetara, ndebanye aha gị, kalenda gị na ụlọ gị, ha niile n'otu ebe. Banye ka i mepee nke gị.",
      notAgentTitle: "Ị depụtabeghị ụlọ ọ bụla",
      notAgentBody:
        "Ebe ọrụ a ga-ejupụta ozugbo i nwere ebe na RentMe. Ịrịọ na-ewe ihe dịka nkeji abụọ, mmadụ na-agụkwa arịrịọ ọ bụla.",
      unconfiguredTitle: "Ejikọtabeghị ebe ọrụ a",
      unconfiguredBody:
        "Ikpo okwu a ejighị igodo ya, ya mere ọ dịghị ihe a ga-agụ ebe a. Ihe niile ọzọ dị na RentMe ka na-arụ ọrụ.",
      applyCta: "Rịọ ka i depụta ụlọ",
    },
  },

  agentListings: {
    wizard: {
      stepsLabel: "Nzọụkwụ ndepụta",
      stepCounter: "Nzọụkwụ {current} nke {total}",
      stepAria: "Nzọụkwụ {number}, {name}",
      steps: {
        basics: "Ozi bụ isi",
        photos: "Foto",
        location: "Ebe",
        // NATIVE REVIEW: "amenities" has no settled Igbo term, this reads as
        // "things the house has".
        amenities: "Ihe ndị dị n'ụlọ",
        utilities: "Ọkụ na mmiri",
        pricing: "Ọnụahịa",
        guestView: "Ka ọbịa na-ahụ ya",
        submit: "Izipu",
      },
      unconfiguredNotice:
        "Ibipụta ga-amalite ozugbo igodo ikpo okwu rutere. Gaa n'ihu: ihe niile ị na-ede ka echekwara na ngwaọrụ a, ọ ga-echere gị.",
      savedAt: "Echekwara na {time}",
      saving: "Na-echekwa",
      next: "Osote",
      back: "Laghachi",
      myListings: "Ndepụta m",
    },

    basics: {
      titleLabel: "Isiokwu ndepụta",
      titleHint: "Ihe ọbịa na-ahụ mbụ. Kpọọ aha ebe ahụ na ihe mere ọ dị mma.",
      titlePlaceholder: "Ụlọ ime abụọ na-enwu gbaa na Lekki Phase 1",
      propertyTypeLabel: "Ụdị ihe onwunwe",
      rentalNote:
        "Mgbazinye bụ ahịa afọ: ị na-ekpebi ụgwọ ụlọ kwa afọ, ndị ọbịa na-ezitere gị ozi, ha na-eleta ụlọ, mgbe ahụ ha na-akwụ ụgwọ. Enweghị ndebe abalị n'elu mgbazinye.",
      descriptionLabel: "Nkọwa",
      descriptionHint: "Okwu {words} nke {min}. Kọwaa ọnụ ụlọ, mpaghara na ihe dị nso.",
      descriptionPlaceholder:
        "Gwa ndị ọbịa gbasara ebe ahụ, ìhè ya, kichin, agbataobi na otu ha ga-esi gaghachi.",
      counters: {
        guests: "Ọbịa",
        bedrooms: "Ọnụ ụlọ ihi ụra",
        beds: "Akwa",
        bathrooms: "Ụlọ ịsa ahụ",
      },
      counterFewer: "Wepụ otu {label}",
      counterMore: "Tinye otu {label}",
    },

    propertyTypes: {
      apartment: {
        label: "Ụlọ obibi",
        blurb: "Ụlọ zuru onwe ya nke a na-agbazinye kwa abalị.",
      },
      shortlet: {
        label: "Shortlet",
        blurb: "Ebe obibi nwere ngwongwo maka abalị ole na ole ma ọ bụ izu ole na ole.",
      },
      home: { label: "Ebe obibi", blurb: "Ụlọ zuru ezu nke ndị ọbịa na-edebe kwa abalị." },
      villa: { label: "Villa", blurb: "Nnukwu ụlọ nkeonwe nwere ogige." },
      hotel: { label: "Họtel", blurb: "Ọnụ ụlọ n'ime ihe onwunwe a na-elekọta." },
      rental: {
        label: "Mgbazinye",
        blurb: "Ụlọ a na-agbazinye kwa afọ. Ọnụahịa ya bụ nke afọ, a na-eleta ya tupu ịkwụ ụgwọ.",
      },
      shop: { label: "Ụlọ ahịa", blurb: "Ebe ịre ahịa a na-agbazite kwa afọ." },
      office: { label: "Ọfịs", blurb: "Ebe ọrụ a na-agbazite kwa afọ." },
      land: { label: "Ala", blurb: "Otu ala, ọnụahịa ya bụ nke afọ." },
    },

    photos: {
      intro:
        "Tinye opekempe foto {min}, ruo {max}. Nke mbụ bụ foto mkpuchi, ya mere jiri foto sara mbara nke na-ere ebe ahụ malite.",
      tooNarrow: "Foto ga-esara opekempe {width}px ka ha pụta ìhè n'ihu ngwaọrụ ọ bụla.",
      choose: "Họrọ foto",
      addMore: "Tinye foto ọzọ",
      uploading: "Na-ebugo",
      progress: "{count} nke {min} achọrọ",
      empty: "Enweghị foto ugbu a. Ìhè ehihie, foto sara mbara na ọnụ ụlọ dị ọcha na-arụ ọrụ ahụ.",
      cover: "Mkpuchi",
      makeCover: "Mee ya mkpuchi",
      remove: "Wepụ",
      ceiling: "Ndepụta otu na-anagide foto {max} naanị.",
      notAnImage: "Foto ga-abụ faịlụ onyonyo, dịka JPG ma ọ bụ PNG.",
      notPrepared:
        "Anyị enweghị ike ịkwadebe foto ahụ n'enweghị nsogbu, ya mere anyị ebugoghị ya. Nwaa foto ọzọ.",
      uploadFailed: "Foto ahụ emechaghị ibugo. Biko nwaa ya ọzọ.",
      needsKeys:
        "Foto ga-ebugo ozugbo igodo ikpo okwu rutere. Ihe ọzọ niile ị deworo ka echekwara.",
      needsTitle: "Tinye isiokwu na nzọụkwụ mbụ, mgbe ahụ foto gị ga-ejikọ na ndepụta a.",
    },

    location: {
      stateLabel: "Steeti",
      statePlaceholder: "Họrọ steeti",
      cityLabel: "Obodo",
      cityPlaceholder: "Lagos",
      areaLabel: "Mpaghara",
      areaHint: "Agbataobi ndị ọbịa na-achọ.",
      areaPlaceholder: "Lekki Phase 1",
      addressLabel: "Adreesị okporo ámá",
      addressHint: "A na-ezobe ya ruo mgbe akwadoro ndebe ma ọ bụ mgbe ị kekọrọ ya na nkata.",
      addressPlaceholder: "12 Admiralty Way",
      landmarkLabel: "Ihe àmà ebe",
      landmarkHint: "Ihe dị nso nke na-eme ka ebe ahụ dị mfe ịchọta.",
      landmarkPlaceholder: "N'ihu okirikiri Lekki",
    },

    amenities: {
      intro:
        "Họrọ ihe niile ọbịa ga-ahụ n'ụlọ ahụ n'ezie. Ndepụta eziokwu na-enweta nyocha ka mma karịa ndepụta ogologo.",
      names: {
        wifi: "WiFi",
        ac: "Igwe jụrụ oyi",
        tv: "TV",
        kitchen: "Kichin",
        parking: "Ebe ndọba ụgbọala",
        pool: "Ọdọ mmiri igwu",
        gym: "Ebe mmega ahụ",
        security: "Nchekwa",
        elevator: "Lifti",
        furnished: "Nwere ngwongwo",
        balcony: "Balkoni",
        garden: "Ogige",
        laundry: "Ebe ịsa ákwà",
        generator: "Ọkụ ndabere",
        water: "Mmiri na-asọ",
      },
    },

    pricing: {
      priceNightLabel: "Ọnụahịa kwa abalị",
      priceYearLabel: "Ụgwọ ụlọ kwa afọ",
      priceHint: "Tinye ego ahụ na naira, dịka 85,000.",
      priceWithPeriod: "{price} {period}",
      priceNightPlaceholder: "85,000",
      priceYearPlaceholder: "2,500,000",
      perNight: "kwa abalị",
      perYear: "kwa afọ",
      cleaningLabel: "Nhicha",
      cleaningHint: "Nhọrọ. A na-atụkwasị ya otu ugboro maka obibi, ọ bụghị kwa abalị.",
      cleaningHintSet: "{amount} nke a tụkwasịrị otu ugboro maka obibi.",
      cleaningPlaceholder: "10,000",
      minStayLabel: "Abalị obibi kachasị nta",
      instantTitle: "Ndebe ozugbo",
      instantBody: "Ndị ọbịa na-edebe n'echereghị nkwenye gị.",
      rentalNote:
        "A na-ekpebi ọnụahịa mgbazinye kwa afọ. Ndị ọbịa na-ezitere gị ozi n'ime RentMe, ha na-eleta ụlọ, mgbe ahụ ha na-akwụ ụgwọ. Maka nchekwa gị, hapụ nkata na ịkwụ ụgwọ niile n'ime RentMe.",
    },

    guestView: {
      intro: "Otu a ka ndepụta gị na-apụta na nchọta.",
      addPhotos: "Tinye foto ka kaadị ahụ zuo",
      rentBadge: "Mgbazinye",
      instantBadge: "Ozugbo",
      locationPlaceholder: "Tinye ebe na nzọụkwụ nke atọ",
      titlePlaceholder: "Isiokwu ndepụta gị",
      rooms: "Ọnụ ụlọ ihi ụra {bedrooms}, ụlọ ịsa ahụ {bathrooms}, ọ na-anagide ọbịa {guests}",
      priceToSet: "Ọnụahịa ka a ga-ekpebi",
      descriptionPlaceholder: "Nkọwa gị ga-apụta na peeji ndepụta.",
    },

    submit: {
      title: "Ọ dị njikere maka izipu nyocha",
      body:
        "Anyị na-enyocha ndepụta ọ bụla n'aka tupu ọ rute ndị ọbịa. Zuo ndepụta nlele a, ọ ga-abanye ahịrị ozugbo.",
      action: "Zipu maka nyocha",
      sending: "Na-eziga",
      note: "Nyocha na-ewe awa 24 ruo 48. Anyị ga-agwa gị ma ọ bụrụ otu ma ọ bụ ibe.",
      checklist: {
        title: "Isiokwu",
        description: "Nkọwa nke okwu {min} ma ọ bụ karịa",
        photos: "Foto {min} ma ọ bụ karịa, mkpuchi na mbụ",
        stateCode: "Steeti",
        city: "Obodo",
        area: "Mpaghara",
        amenities: "Ihe ndị dị n'ụlọ",
        priceNight: "Ọnụahịa kwa abalị",
        priceYear: "Ụgwọ ụlọ kwa afọ",
        rooms: "Ọnụ ụlọ na ọbịa",
      },
      needsTitle: "Tinye isiokwu na nzọụkwụ mbụ, mgbe ahụ anyị nwere ike izipu ndepụta a maka nyocha.",
      needsKeys:
        "Izipu maka nyocha ga-amalite ozugbo igodo ikpo okwu rutere. Ọrụ gị ka echekwara na ngwaọrụ a.",
    },

    gate: {
      titleShort: "Nye ndepụta ahụ isiokwu nke opekempe mkpụrụedemede {min}.",
      titleLong: "Belata isiokwu ahụ ruo mkpụrụedemede {max} ma ọ bụ nke dị nta.",
      description: "Kọwaa ihe onwunwe ahụ na opekempe okwu {min}. Ị nwere {count} ugbu a.",
      propertyType: "Họrọ ụdị ihe onwunwe nke a bụ.",
      photos: "Tinye opekempe foto {min}. Ị nwere {count}.",
      cover: "Họrọ foto ga-ebute ụzọ na ndepụta ahụ. Nke mbụ bụ mkpuchi.",
      stateCode: "Họrọ steeti ihe onwunwe ahụ dị.",
      city: "Tinye obodo, dịka Lagos.",
      area: "Tinye mpaghara, dịka Lekki Phase 1.",
      amenities: "Họrọ opekempe otu ihe ndị ọbịa ga-ahụ.",
      priceNight: "Kpebie ọnụahịa kwa abalị na naira.",
      priceYear: "Kpebie ụgwọ ụlọ kwa afọ na naira.",
      bedrooms: "Kwuo ọnụ ụlọ ihi ụra ole ihe onwunwe ahụ nwere.",
      bathrooms: "Kwuo ụlọ ịsa ahụ ole ihe onwunwe ahụ nwere.",
      maxGuests: "Kwuo ọbịa ole ihe onwunwe ahụ na-anagide.",
    },

    submitted: {
      title: "Ndepụta gị dị n'aka ndị otu nyocha anyị",
      body:
        "Anyị na-enyocha ndepụta ọ bụla n'aka ka ndị ọbịa tụkwasị obi n'ihe ha na-edebe. Nyocha na-ewe awa 24 ruo 48, anyị ga-agwa gị ma ọ bụrụ otu ma ọ bụ ibe. Ọ bụrụ na ihe ọ bụla chọrọ mgbanwe, anyị ga-akọwa kpọmkwem ihe ọ bụ.",
      goToListings: "Gaa na ndepụta m",
      another: "Depụta ihe onwunwe ọzọ",
    },

    pitch: {
      title: "Depụta ihe onwunwe gị na RentMe",
      bodySignedIn:
        "Ndepụta mepere ndị nnọchi akwadoro. Arịrịọ ahụ na-ewe ihe dịka nkeji abụọ, anyị na-enyocha n'ime awa 24 ruo 48.",
      bodySignedOut:
        "Banye n'akaụntụ onye nnọchi gị ka ị malite ndepụta, ma ọ bụ rịọ n'ime ihe dịka nkeji abụọ ma ọ bụrụ na ị bụ ọhụrụ ebe a.",
      points: {
        verified: {
          title: "Naanị ihe onwunwe enyochara",
          body:
            "A na-enyocha ndepụta ọ bụla n'aka, ya mere akara dị n'ihe onwunwe gị pụtara ihe nye ndị ọbịa.",
        },
        inside: {
          title: "Ndị ọbịa na-erute gị n'ime RentMe",
          body: "Nkata, nleta ụlọ na ịkwụ ụgwọ na-anọ n'ikpo okwu, ebe a na-echekwa ha.",
        },
        keep: {
          title: "Ị na-ewere ihe ị kwuru",
          body: "RentMe anaghị anara gị ihe ọ bụla maka idepụta. Ọnụahịa gị bụ ọnụahịa gị.",
        },
      },
      apply: "Bụrụ onye nnọchiteanya",
      signIn: "Banye",
      how: "Otu ndepụta si arụ ọrụ",
    },

    workspace: {
      title: "Ndepụta m",
      lede: "Ihe onwunwe niile ị nwere na RentMe, na ebe nke ọ bụla guzo.",
      start: "Malite ndepụta",
      unconfigured:
        "Ndepụta gị ga-apụta ebe a ozugbo igodo ikpo okwu rutere. Ị nwere ike ịmalite iwu otu ugbu a: onye ndu ndepụta na-echekwa ọrụ gị na ngwaọrụ a ruo mgbe ahụ.",
      emptyTitle: "Enweghị ndepụta ugbu a",
      emptyBody:
        "Ihe onwunwe mbụ gị na-ewe ihe dịka nkeji iri, foto bụ ihe ka ukwuu na ya. Malite mgbe ọ bụla ị dị njikere: a na-echekwa akwụkwọ mbụ ka ị na-aga.",
      groups: {
        live: { title: "Na-arụ ọrụ", blurb: "Ndị ọbịa nwere ike ịchọta ndị a na nchọta." },
        review: {
          title: "N'aka ndị otu nyocha anyị",
          blurb: "Anyị na-enyocha ndepụta ọ bụla n'aka. Nke a na-ewe awa 24 ruo 48.",
        },
        attention: {
          title: "Ọ chọrọ nlebara anya gị",
          blurb: "Achọrọ mgbanwe tupu nke a rụọ ọrụ.",
        },
        drafts: { title: "Akwụkwọ mbụ", blurb: "Naanị gị nwere ike ịhụ ndị a." },
      },
      status: {
        DRAFT: "Akwụkwọ mbụ",
        SUBMITTED: "Ezigala ya",
        UNDER_REVIEW: "A na-enyocha ya",
        MORE_INFO_REQUIRED: "Achọrọ ozi ọzọ",
        APPROVED: "Akwadoro",
        PUBLISHED: "Na-arụ ọrụ",
        REJECTED: "A nabataghị ya",
        SUSPENDED: "Akwụsịtụrụ ya",
      },
      photoCount: "Foto {count}",
      photoCountOne: "Foto otu",
      actions: {
        edit: "Dezie",
        submit: "Zipu maka nyocha",
        takeDown: "Wepụ ya",
        delete: "Hichapụ",
      },
      /* Deleting a draft opens no dialogue: the row leaves and offers its
         way back, and nothing reaches the server until that offer runs out. */
      undo: {
        removed: "Ehichapụla nkọwa a",
        action: "Weghachi",
      },
      sheets: {
        keep: "Hapụ ya",
        working: "Na-arụ ọrụ",
        close: "Mechie",
        submit: {
          title: "Zipu ndepụta a maka nyocha?",
          body:
            "Ndị otu anyị na-enyocha foto, nkọwa na ebe ahụ. Ị ga-anụ site n'aka anyị n'ime awa 24 ruo 48, ma ọ bụrụ otu ma ọ bụ ibe.",
          confirm: "Zipu maka nyocha",
        },
        unpublish: {
          title: "Wepụ ndepụta a?",
          body:
            "Ọ na-apụ na nchọta ozugbo ma laghachi na akwụkwọ mbụ gị. Ị nwere ike idezi ya ma zipu ya maka nyocha mgbe ọ bụla ị dị njikere.",
          confirm: "Wepụ ya",
        },
      },
    },

    dashboard: {
      standing: "{name}, lee ebe ihe onwunwe gị guzo taa.",
      liveListings: "Ndepụta na-arụ ọrụ",
      withReview: "N'aka nyocha",
      drafts: "Akwụkwọ mbụ",
      upcomingStays: "Obibi na-abịa",
      unreadMessages: "Ozi a gụghị",
      noListings:
        "Enweghị ihe onwunwe ugbu a. Ndepụta mbụ gị na-ewe ihe dịka nkeji iri, a na-echekwakwa akwụkwọ mbụ ka ị na-aga.",
      noStays:
        "Edebeghị obibi ọ bụla ugbu a. Ndepụta na-arụ ọrụ na nchọta bụ ndị ọbịa nwere ike idebe.",
      stayDates: "{from} ruo {to}",
    },
  },

  agentBookings: {
    title: "Ndebe",
    lede: "Arịrịọ ọ bụla na obibi ọ bụla n'ihe onwunwe gị niile.",
    unconfigured:
      "Arịrịọ gị na obibi gị ga-apụta ebe a ozugbo igodo nke ikpo okwu rutere. Ọ dịghị ihe furu efu n'etiti oge ahụ.",
    tabsLabel: "Ụdị ndebe",
    waitingOn: "{count} na-eche gị",
    waitingOnOne: "Otu na-eche gị",
    groups: {
      requests: {
        title: "Arịrịọ",
        blurb:
          "Na-eche mkpebi gị. Arịrịọ na-ejide abalị ruo elekere {hours}, mgbe ahụ ọ na-atọhapụ onwe ya.",
      },
      upcoming: { title: "Na-abịa", blurb: "Obibi ị nabatara nke na-abịabeghị." },
      completed: { title: "Emechara", blurb: "Obibi ndị ọbịa gị gwụchara." },
      cancelled: {
        title: "Akagburu",
        blurb: "Arịrịọ ị jụrụ, na obibi nke akụkụ ọ bụla kwụsịrị.",
      },
    },
    card: {
      dates: "{from} ruo {to}",
      nights: "Abalị {count}",
      nightsOne: "Otu abalị",
      guests: "Ọbịa {count}",
      guestsOne: "Otu ọbịa",
      composition: "Ndị okenye {adults}, ụmụaka {children}",
      total: "Mkpokọta",
      requested: "Arịọrọ ya {date}",
      waiting: "Na-eche {duration}",
      waitingNew: "Ka rutere",
      releasesIn: "Ọ ga-atọhapụ onwe ya n'ime {duration}",
      releasingNow: "Ọ gafere ijide elekere {hours} ya, ya mere ọ nwere ike tọhapụ mgbe ọ bụla",
      hours: "Elekere {count}",
      hoursOne: "Otu elekere",
      days: "Ụbọchị {count}",
      daysOne: "Otu ụbọchị",
      settled: "Ego abanyela",
      awaiting: "Ego abanyebeghị",
      unknown: "Enweghị ike ịkọ ọnọdụ ego ugbu a",
      arriving: "Onye na-abịa: {name}",
      arrivingPhone: "Nọmba ọnụ ụzọ {phone}",
    },
    status: {
      PENDING: "Na-eche mkpebi gị",
      CONFIRMED: "Akwadoro ya",
      CANCELLED: "Akagburu",
    },
    actions: {
      accept: "Nabata",
      decline: "Jụ",
      working: "Na-arụ ọrụ",
      back: "Laghachi azụ",
      close: "Mechie",
    },
    accept: {
      title: "Ị nabata arịrịọ a?",
      body:
        "Ọbịa ahụ na-anụ ozugbo, a na-ejidekwa abalị ndị ahụ na kalenda gị maka ya. Lelee na ihe onwunwe ahụ nwere ohere n'ezie tupu ị nabata.",
      confirm: "Nabata arịrịọ",
    },
    decline: {
      title: "Ị jụ arịrịọ a?",
      body:
        "Abalị ndị ahụ na-alaghachi na kalenda gị ma a gwa ọbịa ahụ. Ọ dịghị ego a napụrụ onye ọ bụla.",
      reasonLabel: "Gịnị mere na ị pụghị inabata ụbọchị ndị a?",
      reasonHint: "Ọbịa ahụ na-agụ nke a okwu site n'okwu, ya mere mee ka ọ dị mfe ma dị obiọma.",
      reasonPlaceholder: "E werela ụlọ ahụ n'abalị ndị ahụ.",
      suggestionsLabel: "Ma ọ bụ malite site n'otu n'ime ndị a",
      suggestions: {
        taken: "E werela ụlọ ahụ n'abalị ndị ahụ.",
        maintenance: "A na-arụ ọrụ nrụzi n'ihe onwunwe ahụ n'izu ahụ.",
        guests: "Ihe onwunwe ahụ enweghị ike ịnabata ọbịa ndị dị otú ahụ n'udo.",
      },
      confirm: "Jụ arịrịọ",
    },
    empty: {
      requestsTitle: "Ọ dịghị ihe na-eche gị",
      requestsBody:
        "Ọ dịghị ọbịa na-eche mkpebi ugbu a. Arịrịọ ọhụrụ na-arute ebe a ma na-ejide abalị ruo elekere {hours} ka ị na-aza.",
      upcomingTitle: "Edebeghị obibi ọ bụla ugbu a",
      upcomingBody:
        "Arịrịọ ị nabatara ga-apụta ebe a ya na ụbọchị, ọbịa na mkpokọta ego.",
      completedTitle: "Ọ dịghị ihe emechara ugbu a",
      completedBody: "Obibi na-akwaga ebe a n'echi ụbọchị ọbịa gị si pụọ.",
      cancelledTitle: "Ọ dịghị ihe akagburu",
      cancelledBody:
        "Arịrịọ ị jụrụ, na obibi nke akụkụ ọ bụla kwụsịrị, na-anọ ebe a maka ndekọ gị.",
      openListings: "Jikwaa ndepụta m",
    },
  },

  agentEarnings: {
    title: "Ego",
    lede: "Ihe abanyela site n'obibi gị, kpọmkwem site n'akwụkwọ ndekọ ego.",
    unconfigured: "Ego gị ga-apụta ebe a ozugbo igodo nke ikpo okwu rutere.",
    unavailable:
      "Anyị enweghị ike ịgụ akwụkwọ ndekọ ego ugbu a, ya mere anaghị egosi ọnụọgụ ọ bụla kama igosi nke na-ezighị ezi. Megharịa ibe a n'ime nkeji.",
    totals: {
      yourShare: "Òkè gị nke abanyela",
      guestsPaid: "Ihe ndị ọbịa kwụrụ",
      settledStays: "Obibi nke ego ha abanyela",
      thisMonth: "Ọnwa a",
    },
    byMonth: "Kwa ọnwa",
    monthShare: "Òkè gị",
    monthGross: "Ihe ndị ọbịa kwụrụ",
    stays: "Obibi {count}",
    staysOne: "Otu obibi",
    emptyTitle: "Ego ọ bụla emegharịbeghị",
    emptyBody:
      "A na-ede ego ọ bụla abanyela n'akwụkwọ ndekọ ma ọ na-apụta ebe a ya na òkè gị. Ọ dịghị ihe a na-atụ atụ n'ibe a, ya mere ruo mgbe obibi kwụrụ ụgwọ, ọ na-anọ efu ya na nzube.",
    emptyAction: "Lee ndebe gị",
    howTitle: "Otú a na-agbakọ òkè gị",
    howBody:
      // NATIVE REVIEW: "processor" kept in English, it names the payment company.
      "A na-kewa ego abanyela ụzọ atọ: òkè gị, òkè ikpo okwu, na ihe processor nke ịkwụ ụgwọ na-ewere. Atọ ahụ na-agbakọ mgbe niile ruo ihe ọbịa kwụrụ, nke ahụ bụ ihe mere ahịrị ọ bụla ebe a na-adaba.",
  },

  admin: {
    console: {
      // NATIVE REVIEW: "console" kept in English the way Nigerian staff say it.
      title: "Console nchịkwa",
      navLabel: "Console nchịkwa",
      signedIn: "Abanyela",
      // NATIVE REVIEW: "audit log" kept in English, it is a compliance term.
      auditNote: "A na-ede mkpebi ọ bụla ị mere ebe a n'ime audit log ya na aha gị na ya.",
    },

    nav: {
      overview: { label: "Nchịkọta", short: "Nchịkọta" },
      // NATIVE REVIEW: "flag" kept in English, it is the safety scan's own term.
      flags: { label: "Flag ozi", short: "Flag" },
      alerts: { label: "Ọkwa ihe egwu", short: "Ọkwa" },
      reports: { label: "Mkpesa", short: "Mkpesa" },
      applications: { label: "Arịrịọ onye nnọchi", short: "Ndị nnọchi" },
      stops: { label: "Nkwụsị", short: "Nkwụsị" },
      listings: { label: "Nyocha ndepụta", short: "Ndepụta" },
      bookings: { label: "Ọnọdụ ọbịa", short: "Ọnọdụ" },
      tickets: { label: "Nkwado", short: "Nkwado" },
      // NATIVE REVIEW: "switch" kept in English, it names a control staff use.
      social: { label: "Ógbè", short: "Ógbè" },
      standing: { label: "Ọnọdụ", short: "Ọnọdụ" },
      moderation: { label: "Ejidere", short: "Ejidere" },
      reference: { label: "Data ntụaka", short: "Ntụaka" },
      switches: { label: "Switch", short: "Switch" },
    },

    access: {
      unconfiguredTitle: "Console emepeghị ugbu a",
      unconfiguredBody:
        "Console ga-amalite ozugbo igodo ikpo okwu rutere. Ọ dịghị ihe furu efu n'etiti.",
      signedOutTitle: "Nbanye ndị ọrụ",
      signedOutBody: "Jiri akaụntụ ọrụ gị banye ka ị gaa n'ihu.",
      notAdminTitle: "Ị nweghị ohere ịbanye console",
      notAdminBody: "Ebe a bụ maka ndị otu ọrụ RentMe. Akaụntụ gị anaghị ebu ọkwa ahụ.",
      backToRentMe: "Laghachi na RentMe",
      signIn: "Banye",
      backToYourHome: "Laghachi n'ụlọ gị",
      otherAccount: "Jiri akaụntụ ọzọ banye",
    },

    common: {
      waiting: "{count} na-echere",
      unavailableTitle: "Enweghị ike ibute ahịrị a",
      unavailableBody:
        "Console enweghị ike iru data ikpo okwu ugbu a, ya mere ọ naghị egosi gị ahịrị nke ọ na-enweghị ike ịkwado. Bugharịa ya n'oge na-adịghị anya.",
      notRecorded: "Edekọghị ya",
      notGiven: "E nyeghị ya",
      passes: "Ọ gafere",
      needsAttention: "Ọ chọrọ nlebara anya",
      close: "Mechie",
      done: "Emechara",
      notNow: "Ọ bụghị ugbu a",
      working: "Na-arụ ọrụ",
      optional: "(nhọrọ)",
      notePlaceholder: "Ha ga-agụ ya okwu maka okwu, ya mere mee ya nke doro anya na obiọma.",
      // NATIVE REVIEW: "audit log" kept in English, it is a compliance term.
      inAuditLog: "Mkpebi ahụ dị n'ime audit log.",
      // NATIVE REVIEW: "audit log" kept in English, it is a compliance term.
      noteInAuditLog: "Ndetu ahụ dị n'ime audit log.",
      recentlyReviewed: "Enyochara nso nso a",
      recentlyResolved: "Edozirila nso nso a",
      recentlyDecided: "Ekpebiri nso nso a",
      recentlyClosed: "Emechiri nso nso a",
      dueIn: "Zaa n'ime awa {hours}",
      dueSoon: "Zaa n'ime otu awa",
      overdue: "O gafeela awa {hours}",
      resolvedBy: "{who} dozirila ya",
      reviewedBy: "{who} nyochara ya",
      someone: "onye ọrụ ibe",
      status: {
        open: "Emepere",
        reviewed: "Enyochara",
        reviewing: "A na-enyocha",
        resolved: "Edozirila",
        dismissed: "Ewepụrụ ya",
        pending: "Na-echere nzaghachi",
        closed: "Emechiri",
        DRAFT: "Akwụkwọ mbụ",
        SUBMITTED: "Ezigala ya",
        UNDER_REVIEW: "A na-enyocha",
        MORE_INFO_REQUIRED: "Arịọrọ mgbanwe",
        APPROVED: "Akwadoro",
        PUBLISHED: "Na-arụ ọrụ",
        REJECTED: "Akwadoghị ya",
        SUSPENDED: "Akwụsịtụrụ ya",
        PENDING: "A rịọrọ",
        CONFIRMED: "E kwadoro",
        CANCELLED: "Akagbuola",
      },
    },

    overview: {
      title: "Nchịkọta ọrụ",
      lede:
        "Akara ntụkwasị obi ọ bụla RentMe na-emepụta na-akwụsị ebe a: ihe nyocha nchekwa jidere, ihe ndị òtù kpesara, onye na-echere nkwado, na ihe na-echere ịmalite ọrụ. Ọnụọgụ ọ bụla bụ ahịrị ị nwere ike ikpocha.",
      queueClear: "Ahịrị a dị ọcha.",
      tiles: {
        moderation: {
          label: "Ọdịnaya ejidere",
          lede: "Post, akụkọ, nkọwa na profaịlụ nke nyocha nchekwa kwụsịrị.",
        },
        // NATIVE REVIEW: "flag" kept in English, it is the safety scan's own term.
        flags: {
          label: "Flag ozi mepere",
          lede: "Okwu ego nke nyocha nchekwa jidere n'ime nkata.",
        },
        alerts: {
          label: "Ọkwa ihe egwu mepere",
          lede: "Okwu ndị e welitere maka ndị otu ọrụ ka ha rụọ.",
        },
        applications: {
          label: "Arịrịọ onye nnọchi",
          lede: "Ndị na-echere mkpebi ka ha malite idepụta.",
        },
        listings: {
          label: "Ndepụta nọ na nyocha",
          lede: "Ihe ezigara na-echere nlele, nkwado na mbipụta.",
        },
        reports: {
          label: "Mkpesa mepere",
          lede: "Ọdịnaya na akaụntụ ndị òtù kpesara anyị.",
        },
        tickets: {
          label: "Tiketi nkwado",
          lede: "Ajụjụ onye enyemaka enweghị ike ịza n'onwe ya.",
        },
      },
      how: {
        title: "Otu console si arụ ọrụ",
        // NATIVE REVIEW: "audit" kept in English, it is a compliance term.
        audit:
          "Mkpebi ọ bụla na-ede ahịrị audit nke bu aha gị, ihe ndekọ ị metụrụ na ọnọdụ ya tupu na mgbe emechara. Ọ dịghị onye nwere ike idezi ma ọ bụ ihichapụ log ahụ, gụnyere gị.",
        notify:
          "Nkwado na ajụjụ na-agwa onye ọ metụtara n'ikpo okwu, ka onye ọ bụla ghara ịnọ na-eche ihe mere arịrịọ ya ma ọ bụ ndepụta ya.",
        invisible:
          "Nyocha nchekwa apụtaghị ìhè ebe ọ bụla ma e wezụga console a. Ọ dịghị ihe dị na ngwa ahụ na-agwa onye òtù na e welitere ozi ya.",
        openSwitches: "Mepee switch",
      },
    },

    flags: {
      // NATIVE REVIEW: "flag" kept in English throughout this queue.
      title: "Flag ozi",
      lede:
        "Ihe kpaliri na data na-enyocha ozi ọ bụla maka nọmba akaụntụ nwere ọnụọgụ iri na maka okwu ego, wee tinye ihe ọ chọtara ebe a. A naghị agwa onye zitere ya mgbe ọ bụla, ya mere ahịrị a bụ naanị ebe nyocha ahụ na-egosi ọrụ ya.",
      emptyTitle: "Enweghị flag na-echere",
      emptyBody:
        "Enyochala ozi ọ bụla e welitere. Ndị ọhụrụ na-apụta ebe a ozugbo nyocha ahụ tinyere ha.",
      reason: { account_number: "Nọmba akaụntụ", payment_keyword: "Okwu ego" },
      role: { guest: "Ọbịa", agent: "Onye nnọchi", unknown: "Onye sonyere" },
      matched: "Nyocha ahụ jidere {fragment} n'ime ozi si n'aka {role}.",
      context: "Ọnọdụ nkata",
      flagged: "E welitere ya",
      reviewed: "Enyochara ya.",
      clear: "Kpochapụ flag a",
      escalate: "Welite ọkwa ihe egwu",
      clearSheet: {
        title: "Kpochapụ flag a?",
        body:
          "Nyocha ahụ mere nke ọma ilele, mana nkata a dị mma. Flag ahụ ga-emechi, a ga-edekwa mkpebi ahụ n'ime audit log ya na aha gị na ya. A naghị agwa onye ọ bụla nọ na nkata ahụ.",
        confirm: "Ee, kpochapụ ya",
        successTitle: "Ekpochapụrụ flag",
        successBody: "Emelitere ahịrị ahụ, audit log bukwara mkpebi gị.",
      },
      escalateSheet: {
        title: "Welite ọkwa ihe egwu?",
        body:
          "Nke a na-emechi flag ahụ ma mepee ọkwa ihe egwu dị elu megide ozi ahụ, ka okwu ahụ nọrọ n'ahịrị ọkwa ruo mgbe mmadụ rụrụ ya. A naghị agwa onye ọ bụla nọ na nkata ahụ.",
        confirm: "Mechie flag ma welite ọkwa",
        successTitle: "E welitere ọkwa",
        successBody: "Enyochara flag ahụ, ọkwa dị elu mepekwara ugbu a n'ahịrị ọkwa.",
      },
    },

    alerts: {
      title: "Ọkwa ihe egwu",
      lede:
        "Okwu ndị chọrọ mmadụ, ọ bụghị iwu: flag ozi e welitere na ihe ọ bụla ọzọ ikpo okwu chere na ọ kwesịrị nlele nke abụọ. Ọkwa na-anọ na mepere ruo mgbe mmadụ dere ihe e mere.",
      emptyTitle: "Enweghị ọkwa mepere",
      emptyBody: "Ọ dịghị ihe na-echere. Iwelite flag ozi na-emepe ọkwa ebe a.",
      severity: { low: "Ala", medium: "Etiti", high: "Elu" },
      severityChip: "Ịdị njọ {level}",
      attachedTo: "Ejikọtara ya na {type} {id}",
      resolvedWhen: "Edozirila {when}.",
      resolve: "Kaa ya na edozirila",
      sheet: {
        title: "Dozie ọkwa a?",
        body:
          "Jiri nke a mgbe a rụchara okwu ahụ n'ezie. Ọkwa ahụ ga-emechi ya na oge, ndetu gị ga-abanye n'ime audit log.",
        confirm: "Ee, dozie ya",
        notesLabel: "Ihe e mere",
        successTitle: "Edozirila ọkwa",
        successBody: "Emechiri ọkwa ahụ, audit log bukwara ndetu gị.",
      },
    },

    verification: {
      title: "Ọkwa nkwenye",
      tierLine: "Ọkwa {step} n'ime 4: {name}",
      tierName: {
        "0": "Anabatara ya, enyochabeghị ya karịa",
        "1": "Enyochala njirimara ya",
        "2": "Enyochala adreesi ya",
        "3": "Enyochala akaụntụ ụgwọ ya",
        "4": "Enyochala ya kpamkpam",
      },
      rung: {
        identity: "Ahụrụ njirimara",
        address: "Ekwenyere adreesi",
        payout: "Akaụntụ ụlọ akụ n'aha ya",
        in_person: "Ezutere ya ihu na ihu",
      },
      passed: "Ọ gafere",
      failed: "Ọ gafeghị",
      undecided: "Enyochabeghị ya",
      decidedBy: "{who}, {when}",
      pass: "Dee ya na ọ gafere",
      fail: "Dee ya na ọ gafeghị",
      blockedBelow: "Ọkwa dị n'okpuru nke a agafebeghị.",
      sheet: {
        passTitle: "Dee nyocha a dị ka nke gafere?",
        failTitle: "Dee nyocha a dị ka nke gafeghị?",
        passBody:
          "A na-agbakọ ọkwa onye nnọchiteanya site na nyocha ndị gafere, a na-agwakwa ya mgbe ọ gbanwere.",
        failBody:
          "Nke a nwere ike ibelata ọkwa ndị ọbịa na-ahụ ugbu a, ya mere kwuo ihe na-adịghị mma. Onye nnọchiteanya ga-agụ okwu gị.",
        confirm: "Dee ya",
        notesLabel: "Ihe ị lere anya",
        successTitle: "Edepụtala nyocha ahụ",
        successBody: "Emelitela ọkwa ahụ, mkpebi ahụ dịkwa na ndekọ nyocha.",
      },
    },

    reports: {
      title: "Mkpesa",
      lede:
        "Ihe ndị òtù gwara anyị na ọ ezighị ezi: ndepụta, nyocha, ozi ma ọ bụ akaụntụ. Onye kpesara na-ahụ naanị mkpesa nke ya, ya mere ahịrị a bụ ebe a na-aza ya n'ezie.",
      emptyTitle: "Enweghị mkpesa mepere",
      emptyBody: "Ọ dịghị ihe na-echere mkpebi. Mkpesa ọhụrụ na-abịa ebe a ka ndị òtù na-eweta ha.",
      reportedBy: "{reporter} kpesara megide {type} {id}",
      closedWhen: "Emechiri {when}.",
      startReview: "Malite nyocha",
      resolve: "Dozie",
      dismiss: "Wepụ ya",
      reviewSheet: {
        title: "Were mkpesa a n'aka?",
        body: "Ọ na-agafe na nyocha ka ndị otu fọdụrụ hụ na mmadụ ji ya.",
        confirm: "Ee, m ji ya",
        notesLabel: "Ndetu maka audit log",
        successTitle: "E weere mkpesa",
        successBody: "Mkpesa ahụ na-egosi ugbu a na a na-enyocha ya.",
      },
      resolveSheet: {
        title: "Dozie mkpesa a?",
        body:
          "Jiri nke a mgbe e mere ihe gbasara ọdịnaya ma ọ bụ akaụntụ e kpesara. Mkpesa ahụ ga-emechi ya na oge.",
        confirm: "Ee, dozie ya",
        notesLabel: "Ihe e mere",
        successTitle: "Edozirila mkpesa",
        successBody: "Emechiri mkpesa ahụ, ndetu gị dịkwa n'ime audit log.",
      },
      dismissSheet: {
        title: "Wepụ mkpesa a?",
        body:
          "Jiri nke a mgbe ọ dịghị ihe ị ga-eme. Mkpesa ahụ ga-emechi, a naghị eme ihe ọ bụla megide onye e kpesara.",
        confirm: "Ee, wepụ ya",
        notesLabel: "Ihe mere e wepụrụ ya",
        successTitle: "Ewepụrụ mkpesa",
        successBody: "Emechiri mkpesa ahụ, ndetu gị dịkwa n'ime audit log.",
      },
    },

    applications: {
      title: "Arịrịọ onye nnọchi",
      lede:
        "Ịkwado na-emepụta profaịlụ onye nnọchi, na-enye ọkwa onye nnọchi ka Ọnọdụ Onye Nnọchi mepee, ma na-agwa onye rịọrọ ya n'ikpo okwu. Izighachi otu na-arịọ kpọmkwem ihe na-efu.",
      emptyTitle: "Enweghị arịrịọ na-echere",
      emptyBody:
        "Onye ọ bụla rịọrọ enwetala nzaghachi. Arịrịọ ọhụrụ na-abịa ebe a ozugbo e zigara ha.",
      individual: "Otu onye",
      business: "Azụmahịa",
      nameMissing: "E nyeghị aha",
      thisApplicant: "onye a rịọrọ",
      submittedWhen: "Ezigara {when}",
      decidedWhen: "Ekpebiri {when}.",
      sections: {
        personal: "1. Nke onwe",
        identity: "2. Njirimara",
        business: "3. Azụmahịa",
        documents: "4. Akwụkwọ",
        payout: "5. Ụgwọ",
        review: "6. Nyocha",
      },
      fields: {
        fullName: "Aha zuru ezu",
        phone: "Ekwentị",
        email: "Email",
        address: "Adreesị",
        location: "Ebe",
        documentType: "Ụdị akwụkwọ",
        documentNumber: "Nọmba akwụkwọ",
        businessName: "Aha azụmahịa",
        rcNumber: "Nọmba RC",
        business: "Azụmahịa",
        uploaded: "Ebugoro",
        bank: "Ụlọ akụ",
        accountNumber: "Nọmba akaụntụ",
        accountName: "Aha akaụntụ",
        terms: "Usoro",
        applied: "Ọ rịọrọ",
        lastNote: "Ndetu onye nyocha ikpeazụ",
        lastReviewed: "Nyocha ikpeazụ",
      },
      asIndividual: "Ọ na-arịọ dịka otu onye",
      documentsCount: "Akwụkwọ {count}",
      documentsOne: "Akwụkwọ otu",
      documentsNone: "Ebugoteghị akwụkwọ ọ bụla, ya mere enweghị ike ịkwado ngwa a ugbu a",
      documentOpen: "Mepee",
      documentUnavailable: "Njikọ adịghị",
      documentKinds: {
        idFront: "Njirimara, ihu",
        idBack: "Njirimara, azụ",
        registration: "Ndebanye aha CAC",
      },
      // NATIVE REVIEW: legal wording, "terms" of the platform.
      termsAgreed: "O kwenyere na usoro ikpo okwu",
      termsNotAgreed: "O kwenyeghị",
      approve: "Kwado",
      requestChanges: "Rịọ mgbanwe",
      reject: "Jụ",
      approveSheet: {
        title: "Kwado {name}?",
        body:
          "Nke a na-emepụta profaịlụ onye nnọchi ha, na-enye ha ọkwa onye nnọchi ka Ọnọdụ Onye Nnọchi mepee maka ha, ma na-agwa ha n'ikpo okwu. A na-ede ya n'ime audit log ya na aha gị na ya.",
        confirm: "Ee, kwado",
        notesLabel: "Ndetu nye onye rịọrọ",
        successTitle: "Akwadoro arịrịọ",
        successBody: "Profaịlụ onye nnọchi ha na-arụ ọrụ, e nyere ọkwa ahụ, a gwakwara ha.",
      },
      changesSheet: {
        title: "Rịọ ozi ọzọ?",
        body:
          "Arịrịọ ahụ na-agafe na mgbanwe arịọrọ, a ga-agwa onye rịọrọ ihe ị chọrọ. Ha nwere ike idezi ma zipu ya ọzọ.",
        confirm: "Zighachi ya",
        notesLabel: "Ihe onye rịọrọ ga-agbanwe",
        successTitle: "Ezighachiri ya nye onye rịọrọ",
        successBody: "A gwara ha, ha nwekwara ike imelite arịrịọ ha.",
      },
      rejectSheet: {
        title: "Jụ {name}?",
        body:
          "Arịrịọ ahụ ga-emechi dịka nke akwadoghị, a ga-agwakwa onye rịọrọ. Kwuo ihe kpatara ya: ọ bụ naanị nkọwa ha ga-enweta.",
        confirm: "Ee, jụ ya",
        notesLabel: "Ihe kpatara ya nye onye rịọrọ",
        successTitle: "Ajụrụ arịrịọ",
        successBody: "A gwara onye rịọrọ, mkpebi ahụ dịkwa n'ime audit log.",
      },
    },

    listings: {
      title: "Nyocha ndepụta",
      lede:
        "Ịkwado na-ekwu na ihe ezigara gafere ndepụta nlele nnabata. Ibipụta bụ nzọụkwụ nke abụọ, nke dị iche, nke na-etinye ya na nchọta ọha. Izighachi otu na-agwa onye nnọchi kpọmkwem ahịrị ọ ga-edozi.",
      emptyTitle: "Enweghị ndepụta na-echere",
      emptyBody: "E lekọtara ihe ezigara niile. Ndị ọhụrụ na-apụta ebe a ka ndị nnọchi na-ezipu ha.",
      propertyType: {
        apartment: "Ụlọ obibi",
        hotel: "Họtel",
        home: "Ebe obibi",
        villa: "Villa",
        shortlet: "Shortlet",
        rental: "Mgbazinye",
        shop: "Ụlọ ahịa",
        office: "Ọfịs",
        land: "Ala",
      },
      checklistLines: "Ahịrị nlele {count} ka a ga-elele",
      checklistLineOne: "Ahịrị nlele otu ka a ga-elele",
      submittedWhen: "Ezigara {when}",
      locationMissing: "E nyeghị ebe",
      perYear: "kwa afọ",
      perNight: "kwa abalị",
      photoAlt: "{title}, foto {number}",
      checklistTitle: "Ndepụta nlele nnabata",
      checks: {
        photoCount: "Foto anọ ma ọ bụ karịa",
        cover: "Edobere foto mkpuchi",
        titleCase: "Isiokwu nwere mkpụrụedemede ziri ezi",
        place: "Edekọrọ mpaghara na obodo",
        price: "Edekọrọ ọnụahịa na naira",
        rooms: "Edekọrọ ọnụ ụlọ ihi ụra na ụlọ ịsa ahụ",
        amenities: "Ahọrọla ihe ndị dị n'ụlọ",
        description: "Nkọwa nke okwu 40 ma ọ bụ karịa",
        clean: "Enweghị nọmba kọntaktị ma ọ bụ ego n'ime ederede ahụ",
      },
      submission: "Ihe ezigara",
      fields: {
        agent: "Onye nnọchi",
        capacity: "Ole ọ na-anagide",
        address: "Adreesị",
        amenities: "Ihe ndị dị n'ụlọ",
        description: "Nkọwa",
        lastNote: "Ndetu onye nyocha ikpeazụ",
        lastReviewed: "Nyocha ikpeazụ",
      },
      capacity: "Ọbịa {guests}, ọnụ ụlọ ihi ụra {bedrooms}, akwa {beds}, ụlọ ịsa ahụ {bathrooms}",
      amenitiesSelected: "{count} ahọrọla",
      liveInSearch: "Ọ na-arụ ọrụ na nchọta.",
      closed: "Emechiri.",
      approve: "Kwado",
      publish: "Bipụta",
      requestChanges: "Rịọ mgbanwe",
      reject: "Jụ",
      approveSheet: {
        title: "Kwado {title}?",
        body:
          "Ịkwado na-ekwu na ihe ezigara gafere nyocha. Ọ tinyeghị ndepụta ahụ n'ihu ndị ọbịa: ibipụta bụ nzọụkwụ nke abụọ dị iche, ka ihe ọ bụla ghara ịmalite ọrụ na mberede.",
        confirm: "Ee, kwado",
        notesLabel: "Ndetu nye onye nnọchi",
        successTitle: "Akwadoro ndepụta",
        successBody: "A gwara onye nnọchi ahụ. Bipụta ya mgbe ị dị njikere ka ndị ọbịa hụ ya.",
      },
      publishSheet: {
        title: "Bipụta {title}?",
        body:
          "Nke a na-etinye ndepụta ahụ na nchọta ọha ozugbo, ebe onye ọ bụla nwere ike ịchọta ma debe ya. A na-agwa onye nnọchi ahụ na ọ na-arụ ọrụ.",
        confirm: "Ee, bipụta ya",
        notesLabel: "Ndetu nye onye nnọchi",
        successTitle: "Ndepụta na-arụ ọrụ",
        successBody: "Ọ dị na nchọta ugbu a, a gwakwara onye nnọchi ahụ.",
      },
      changesSheet: {
        title: "Rịọ onye nnọchi maka mgbanwe?",
        body:
          "Ndepụta ahụ na-agafe na mgbanwe arịọrọ, a ga-agwa onye nnọchi kpọmkwem ihe ọ ga-edozi. Rụtụ aka n'ahịrị nlele nke dara.",
        confirm: "Zighachi ya",
        notesLabel: "Ihe onye nnọchi ga-agbanwe",
        successTitle: "Ezighachiri ya nye onye nnọchi",
        successBody: "A gwara ha, ha nwekwara ike imelite ndepụta ahụ.",
      },
      rejectSheet: {
        title: "Jụ {title}?",
        body: "Ndepụta ahụ ga-emechi dịka nke akwadoghị, enweghị ike idebe ya. A na-agwa onye nnọchi ahụ, ya mere kwuo ihe kpatara ya.",
        confirm: "Ee, jụ ya",
        notesLabel: "Ihe kpatara ya nye onye nnọchi",
        successTitle: "Ajụrụ ndepụta",
        successBody: "A gwara onye nnọchi ahụ, mkpebi ahụ dịkwa n'ime audit log.",
      },
    },

    support: {
      title: "Nkwado",
      lede:
        "Ihe e welitere na-ebu naanị aha na email onye ahụ nyere anyị. Nzaghachi gị na-agwa ha n'ikpo okwu ozugbo.",
      emptyTitle: "Enweghị tiketi",
      emptyBody: "Ọ dịghị onye chọrọ iwelite okwu. Tiketi na-abịa ebe a mgbe onye enyemaka enweghị ike ịza.",
      generalQuestion: "Ajụjụ n'ozuzu",
      threadCount: "Ozi {count} n'ime eriri ahụ",
      threadCountOne: "Ozi otu n'ime eriri ahụ",
      allTickets: "Tiketi niile",
      whoFiled: "Onye tinyere ya",
      fields: { name: "Aha", email: "Email", account: "Akaụntụ", filed: "Etinyere" },
      signedInWhenFiled: "Ọ banyere mgbe o tinyere ya",
      noAccountAttached: "Enweghị akaụntụ ejikọtara",
      whatTheyAsked: "Ihe ha jụrụ",
      supportSender: "Nkwado RentMe",
      waitingOnUs: "Ọ na-echere anyị",
      noneWaitingHeading: "Enweghị tiketi na-echere anyị",
      nothingWaitingTitle: "Ọ dịghị ihe na-echere",
      nothingWaitingBody: "Azara tiketi ọ bụla ma mechie ya.",
      reply: {
        label: "Zaghachi onye a",
        placeholder: "Zaa n'ụzọ doro anya ma kwuo ihe na-esote.",
        send: "Zipu nzaghachi",
        sending: "Na-eziga",
        sent: "Ezigara nzaghachi. A gwara ha n'ikpo okwu.",
        note: "Izipu na-agwa onye nwe tiketi ahụ n'ikpo okwu.",
      },
      stateLabel: "Ọnọdụ tiketi",
      states: {
        open: "Emepere",
        pending: "Na-echere nzaghachi",
        resolved: "Edozirila",
        closed: "Emechiri",
      },
    },

    bookings: {
      title: "Ọnọdụ ọbịa",
      lede:
        "Ọnọdụ ọ bụla dị na paltfọm a, na otu ebe a pụrụ ịkagbu ọnọdụ a kwụrụ ụgwọ ya ma weghachi ego ahụ. Ndepụta anyị bipụtara na-ekpebi ego ahụ. Ị na-ahọrọ naanị ihe kpatara ya.",
      searchLabel: "Chọta ọnọdụ",
      searchPlaceholder: "Nrụtụaka ndebe, ma ọ bụ akụkụ aha ndepụta",
      search: "Chọọ",
      clearSearch: "Gosi ihe niile",
      noMatchTitle: "Ọ dịghị ihe dabara na nke ahụ",
      noMatchBody: "Lelee nrụtụaka ndebe, ma ọ bụ chọọ akụkụ aha ndepụta kama.",
      emptyTitle: "Enweghị ọnọdụ ọ bụla ugbu a",
      emptyBody:
        "Ọnọdụ na-apụta ebe a ozugbo ọbịa debere. Ọ dịghị ihe na-eche gị na peeji a.",
      groups: {
        live: "Nke na-aga na nke na-abịa",
        past: "Agafeela",
        cancelled: "Akagbuola",
      },
      open: "Mepee ọnọdụ a",
      back: "Ọnọdụ niile",
      goneTitle: "Ọnọdụ ahụ adịghị ebe ahụ",
      goneBody: "Laghachi na ndepụta ka ị hụ ihe dị ebe ahụ ugbu a.",
      nights: "Abalị {count}",
      nightsOne: "Abalị 1",
      party: "Ndị okenye {adults}, ụmụaka {children}",
      partyAdultsOnly: "Ndị okenye {adults}",
      settledChip: "A kwụrụ {amount}",
      unpaidChip: "A kwụbeghị ihe ọ bụla",
      refundedChip: "E weghachiri {amount}",
      bookedWhen: "E debere {when}",
      fields: {
        reference: "Nrụtụaka",
        listing: "Ndepụta",
        host: "Onye nwe ụlọ",
        guest: "Ọbịa",
        arriving: "Onye na-abịa",
        arrivingPhone: "Nọmba ha",
        arrivingEmail: "Ozi ịntanetị ha",
        dates: "Ụbọchị",
        length: "Ogologo",
        party: "Ndị ọbịa",
        perNight: "Kwa abalị",
        cleaning: "Nhicha",
        service: "Ọrụ",
        subtotal: "Obere ngụkọta",
        total: "Ngụkọta maka ọnọdụ ahụ",
        settled: "A kwụrụ ruo ugbu a",
        returned: "E weghachiriworị",
        status: "Ọnọdụ",
      },
      sections: {
        stay: "Ọnọdụ ahụ",
        money: "Ego",
        people: "Ndị mmadụ",
        payments: "Ịkwụ ụgwọ",
        history: "Akụkọ ihe mere eme",
        refunds: "Nweghachi ego e kpebiworị",
      },
      noPayments: "Ọ dịghị onye kwụrụ ụgwọ maka ọnọdụ a.",
      noRefunds: "E kpebighị nweghachi ego ọ bụla na ọnọdụ a.",
      refundLine: "{refund} laghachi na ọbịa, {retained} nọgidere na onye nwe ụlọ.",
      decidedBy: "{who}, {when}",
      unnamed: "Enweghị aha",
      cancel: "Kagbuo ọnọdụ a",
      cancelledAlready: "Akagbuola ọnọdụ a. Mkpebi ahụ dị na audit log.",
      pastNote:
        "Ọnọdụ a agwụla. Ịkagbu ya ugbu a ga-atọhapụ abalị ọ dịghị onye ga-edebe ọzọ, ya mere anyị anaghị enye ya ebe a. Weghachi ego site na nkwado ma ọ bụrụ na ihe adịghị mma.",
      reasons: {
        guest_choice: "Ọbịa na-akagbu ya",
        host_cancelled: "Onye nwe ụlọ kagburu ya",
        not_as_listed: "Ebe ahụ abụghị ihe e depụtara",
        no_access: "Ọbịa enweghị ike ịbanye",
      },
      sheet: {
        title: "Kagbuo ọnọdụ a?",
        body:
          "Ụbọchị ndị ahụ ga-emeghe ozugbo, ihe ọ bụla a ji ha ga-abanye n'obere akpa ego ọbịa n'otu azụmahịa ahụ. Ego ahụ si na ndepụta e bipụtara, ọ bụghị site na nọmba e dere ebe a.",
        reasonLabel: "Gịnị mere e ji akagbu ọnọdụ a",
        working: "Na-agbakọ ihe a ji ha",
        owed: "{refund} ga-alaghachi na ọbịa.",
        kept: "{retained} ga-anọgide na onye nwe ụlọ.",
        nothingPaid: "A kwụbeghị ihe ọ bụla maka ọnọdụ a, ya mere ọ dịghị ego na-akwaga.",
        confirm: "Kagbuo ma weghachi ego",
        notesLabel: "Ihe e kwadoro",
        successTitle: "Akagbuola ọnọdụ ahụ",
        successBody:
          "Abalị ndị ahụ alaghachila na kalenda, ego ahụ dị n'akpa ego ọbịa, ọbịa nwekwara ego ahụ na ihe kpatara ya n'ederede.",
      },
    },

    switches: {
      // NATIVE REVIEW: "switch" kept in English throughout this surface.
      title: "Switch",
      lede:
        "Gbanyụọ akụkụ n'ofe RentMe n'enweghị mbipụta ọhụrụ, wee gbanye ya ọzọ mgbe nsogbu ahụ gwụchara. Ọ dịghị ihe e hichapụrụ ma ọ bụrụ otu ma ọ bụ ibe.",
      warning:
        "Ịgbanyụ akụkụ na-ewepụ ya n'aka onye ọ bụla ozugbo, gụnyere ndị nọ n'etiti iji ya. A na-echekwa ọrụ echekwaralarị. Peeji na-ewere mgbanwe ahụ n'ime ihe dịka sekọnd iri atọ. A na-ede ntụgharị ọ bụla n'ime audit log ya na aha gị na ya.",
      on: "Ọ gbanyere",
      off: "Ọ gbanyụrụ",
      defaultNote: "Akụkụ RentMe a pụrụ ịgbanyụ.",
      switchingOff: "Ịgbanyụ ya: {consequence}",
      lastChanged: "Mgbanwe ikpeazụ {when}",
      switchOn: "Gbanye",
      switchOff: "Gbanyụọ",
      labels: {
        bookings: "Ndebe",
        wallet: "Akpa ego",
        messaging: "Ozi",
        assistant: "Onye enyemaka",
        support: "Nkwado",
        agent_listings: "Ndepụta ndị nnọchi",
        hybrid_hotels: "Họtel ndị mmekọ",
        hybrid_restaurants: "Ụlọ oriri ndị mmekọ",
      },
      consequences: {
        bookings: "Ndị ọbịa enweghị ike idebe ma ọ bụ kagbuo obibi. Ndebe dị adị anaghị emetụta.",
        wallet: "Itinye ego, iwepụ ego na ibufe ego na-akwụsị. Ego dị na akụkọ ihe mere eme anaghị emetụta.",
        messaging:
          "Ndị ọbịa enweghị ike izitere ndị nnọchi ozi, ndị nnọchi enweghịkwa ike ịzaghachi. Eriri gara aga ka a na-agụ.",
        assistant: "Onye enyemaka na-akwụsị ịza. Ndị mmadụ nwere ike ịchọ ma leba anya.",
        support: "Nkata nkwado na-akwụsị itinye tiketi ọhụrụ. Tiketi mepere na-anọ mepere.",
        agent_listings: "Ndị nnọchi enweghị ike imepụta ma ọ bụ dezie ndepụta. Ndepụta na-arụ ọrụ na-aga n'ihu.",
        hybrid_hotels: "Họtel ndị mmekọ na-apụ na nchọta. Ebe obibi nke anyị na-anọ.",
        hybrid_restaurants: "Ụlọ oriri ndị mmekọ na-apụ na nchọta.",
        generic: "Akụkụ a ga-apụ n'anya onye ọ bụla ruo mgbe a gbanyere ya ọzọ.",
      },
      sheet: {
        title: "Gbanyụọ {label}?",
        body:
          "Onye ọ bụla ga-atụfu akụkụ RentMe a ozugbo, gụnyere ndị nọ n'etiti iji ya. A naghị ehichapụ ihe echekwaralarị, ịgbanye ya ọzọ na-eweghachi akụkụ ahụ. Mgbanwe ahụ na-eru peeji ọ bụla n'ime ihe dịka sekọnd iri atọ.",
        confirm: "Ee, gbanyụọ ya",
        successTitle: "Agbanyụrụ ya",
        successBody: "Akụkụ ahụ gbanyụrụ maka onye ọ bụla, mgbanwe ahụ dịkwa n'ime audit log.",
      },
    },
  },

  a11y: {
    logoHome: "Ụlọ RentMe",
    expand: "Mepee",
    collapse: "Mechie",
    openMenu: "Mepee menu",
    closeMenu: "Mechie menu",
    languageSwitcher: "Gbanwee asụsụ",
    favourite: "Chekwaa na ndị masịrị gị",
    quickAccess: "Nnweta ngwa ngwa",
    notificationsUnread: "Ọkwa, {count} a gụghị agụ",
    unreadOn: "{label}, ọkwa {count} a gụghị agụ",
  },
};
