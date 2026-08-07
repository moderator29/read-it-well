import type { Dictionary } from "./en";

/**
 * Hausa.
 *
 * NEEDS NATIVE REVIEW BEFORE LAUNCH. Functional and correctly uses the hooked
 * letters (ɓ, ɗ, ƙ, ƴ), but marketing copy should be rewritten by a native
 * speaker rather than translated literally. Tracked in KNOWN_GAPS.md.
 */
export const ha: Dictionary = {
  meta: { localeName: "Hausa", localeNativeName: "Hausa", dir: "ltr" },

  /*
   * The three cards on the way in, shown once, straight after a confirmed
   * sign-up. Three sentences about what this place is: what is on it, what it
   * costs, and the one rule that keeps somebody's money safe. That last card
   * is not marketing, it is the messaging trust rule stated before anybody has
   * a chance to break it.
   */
  welcomeCards: {
    label: "Menene RentMe",
    skip: "Tsallake",
    start: "Bari in shiga",
    goTo: "Je katin {n}",
    one: {
      title: "Ko'ina, a wuri guda",
      body:
        "Gidajen haya, otal na karshen mako, gidajen abinci da abubuwan ji. Duk Najeriya, duk jihohi talatin da shida, bincike guda.",
    },
    two: {
      title: "Babu wanda ke biyan mu kudin sabis",
      body:
        "Ba kai ba, ba mai gidan ba. Abin da ka gani shi ne abin da za ka biya, har kwabo, alamar tabbaci kuma tana nufin mu da kanmu mun duba shi.",
    },
    three: {
      title: "Ka fara aika saƙo, ka biya sa'ad da ka tabbata",
      body:
        "Ka yi magana da mai gidan, ka duba wurin, sannan ka biya a dandalin. Kada ka taɓa aika kudi ga kowa a wajen RentMe.",
    },
  },

  common: {
    search: "Nema",
    signIn: "Shiga",
    signUp: "Yi rajista",
    signOut: "Fita",
    viewAll: "Duba duka",
    seeAll: "Duba duka",
    back: "Koma",
    next: "Na gaba",
    continue: "Ci gaba",
    loading: "Ana ɗaukowa",
    perNight: "kowane dare",
    night: "dare",
    year: "shekara",
    reviews: "sharhi",
    verified: "An tabbatar",
    skipToContent: "Tsallake zuwa abun ciki",
    notSet: "Ba a saita ba",
  },

  nav: {
    home: "Gida",
    hotels: "Otal",
    apartments: "Gidaje",
    homes: "Muhalli",
    rent: "Hayar gida",
    restaurants: "Gidan abinci",
    experiences: "Kwarewa",
    services: "Ayyuka",
    properties: "Kadarori",
    bookings: "Ajiye",
    messages: "Akwatin Saƙo",
    wallet: "Walat",
    aiAssistant: "Mataimakin AI",
    profile: "Bayanan martaba",
    settings: "Saituna",
    explore: "Bincika",
    saved: "An ajiye",
    around: "Yanki",
    feed: "Labarai",
    map: "Taswira",
    primaryLabel: "Na farko",
    accountLabel: "Asusu",
    notifications: "Sanarwa",
    places: "Wurare",
    people: "Mutane",
    agentMode: "Yanayin Wakili",
    consoleLabel: "Kwamiti",
    workspacesLabel: "Wuraren aiki",
  },

  social: {
    feedName: "Labaran RentMe",
    tabForYou: "A gare ka",
    tabFollowing: "Waɗanda kake bi",
    tabNew: "Sabo",
    tabsLabel: "Wane labari za a karanta",
    feedSettings: "Saitin labarai",
    filters: "Tacewa",
    emptyFollowing: "Ba ka shiga wani wuri ba tukuna. Zaɓi waɗanda ka sani, wannan kuma ya zama labaranka.",
    emptyFollowingSignedOut: "Waɗanda kake bi yana nuna wuraren da ka shiga. Shiga ka zaɓi kaɗan.",
    emptyNew: "Ba a faɗi wani sabon abu a wani buɗaɗɗen wuri ba tukuna.",
    settingsLede: "Inda wannan labarin ya fito, da abin da aka yarda ya nuna maka.",
    manage: "Sarrafa wurare",
    allPlaces: "Duk wuraren ka",
    pickPlaces: "Zaɓi wuraren ka",
    switcherLabel: "Wadanne wurare za a karanta",
    openPlacePage: "Buɗe wannan wuri a shafinsa",
    browsingOpen:
      "Ba ka shiga wani wuri ba tukuna, don haka wannan shi ne wuraren da suka fi cunkoso, ba naka ba. Zaɓi wadanda ka sani, sai ya zama naka.",
    browsingOpenSignedOut:
      "Wannan shi ne wuraren da suka fi cunkoso. Shiga, zaɓi wadanda ka sani, sai ya zama naka.",
    emptyJoined:
      "Ba a faɗi komai a wuraren ka ba tukuna. Abin da ka rubuta shi ne abu na farko da duk wanda ya iso zai karanta.",
    emptyAnywhere:
      "Ba a faɗi komai a ko'ina da aka buɗe ba tukuna. Ba a ɓoye komai kuma babu abin da ya ɓace: Yanki sabo ne haka.",
  },

  socialProfile: {
    back: "Koma",
    verified: "Wakili da aka tabbatar",
    verifiedTitle: "Wakilin RentMe da aka tabbatar",
    moderatorShort: "MAI KULA",
    moderatorOf: "Yana kula da {place}",
    pidginWelcome: "Ana maraba da Pidgin",
    follow: "Bi",
    followingAction: "Kana bi",
    followAria: "Bi @{handle}",
    unfollowAria: "Kana bin @{handle}. Danna don daina bi.",
    followers: "Masu bi",
    following: "Yana bi",
    posts: "Saƙonni",
    joined: "Ya shiga a {month}",
    editProfile: "Gyara bayanan martaba",
    trustScore: "Makin amana",
    completedDeals: "Cinikin da aka kammala",
    responseTime: "Lokacin amsa",
    tabsLabel: "Abin da @{handle} ke da shi a shafinsa",
    tabPosts: "Saƙonni",
    tabReplies: "Amsoshi",
    tabMedia: "Hotuna",
    tabActivity: "Ayyuka",
    tabProperties: "Gidaje",
    tabStories: "Labarai",
    tabReviews: "Sharhi",
  },

  landing: {
    navHome: "Gida",
    hero: {
      line1: "Nemo shi.",
      line2: "Ajiye shi.",
      line3: "Rayu da shi.",
      subtitle:
        "Dandalinka guda ɗaya na gidaje, otal, gidan abinci, kwarewa da ƙari.",
      searchPlaceholder: "Ina kake son zuwa?",
      searchLabel: "Nemi wurare a faɗin Najeriya",
      popularLabel: "Sanannu yanzu",
    },
    vision: {
      overline: "Hangen nesanmu",
      title: "Najeriya a tafin hannunka. Afirka na gaba.",
      body: "RentMe na gina amintaccen gida don ganowa, wuraren zama, abinci da abubuwan more rayuwa a duk faɗin Najeriya, sannan nahiyar. Asusu ɗaya, jakar kuɗi ɗaya, mataimaki ɗaya.",
      missionOverline: "Manufarmu",
      missionTitle: "Sa neman da yin rijistar komai ya zama mai sauƙi da aminci.",
      missionBody: "Wuraren da aka tabbatar, farashi na gaskiya da naira, sharhi na gaskiya, da mataimaki mai fahimtar abin da kake so.",
      points: {
        verified: { title: "Tabbatarwa da farko", body: "Ana duba kowace jeri da wakili kafin ya fito." },
        naira: { title: "Farashi da naira", body: "Jimillar da ta bayyana, babu abin mamaki ko ɓoyayyen kuɗi." },
        everywhere: { title: "Dukkan jihohi 36", body: "Ko'ina a ƙasar tun rana ta farko." },
        assistant: { title: "AI mai taimako", body: "Ka tambaya cikin sauƙin harshe ka sami wuraren gaske." },
      },
    },
    stats: {
      hotels: "Otal",
      apartments: "Gidaje",
      restaurants: "Gidan abinci",
    },
    features: {
      ai: { title: "Mataimakin AI", body: "Taimako mai wayo, awa 24" },
      verified: { title: "Jerin da aka tabbatar", body: "Amintacce kuma tsaro" },
      prices: { title: "Farashi mafi kyau", body: "Ka ƙara tanadi" },
      booking: { title: "Ajiye cikin sauƙi", body: "Da sauri kuma sauƙi" },
    },
    trust: {
      multiLanguage: { title: "Harsuna da yawa", body: "EN / YO / HA / IG" },
      secure: { title: "Tsaro & Aminci", body: "Tsaronka shi ne fifikonmu" },
      ai: { title: "Ƙarfin AI", body: "Kwarewa mai wayo" },
      africa: { title: "An yi don Afirka", body: "An gina da so ❤️" },
      stores: { title: "Ana samu a", body: "App Store & Play Store" },
    },
    categories: {
      title: "Komai, a wuri guda",
      subtitle: "Hanyoyi biyar na gano Najeriya. Asusu guda, walat guda.",
    },
    cta: {
      title: "A shirye kake ka samu wuri na gaba?",
      subtitle: "Ka haɗu da dubbai da ke gano masauki, abinci da kwarewa.",
      action: "Fara kyauta",
      secondary: "Duba yadda yake aiki",
    },
    footer: {
      tagline: "Nemo shi. Ajiye shi. Rayu da shi. A Najeriya.",
      rights: "An kiyaye duk haƙƙoƙi.",
      product: "Samfur",
      company: "Kamfani",
      support: "Tallafi",
      legal: "Doka",
      about: "Game da mu",
      careers: "Ayyuka",
      help: "Cibiyar taimako",
      contact: "Tuntuɓe mu",
      privacy: "Sirri",
      terms: "Sharuɗɗa",
      docs: "Takardu",
      becomeAgent: "Zama wakili",
    },
  },

  auth: {
    welcomeBack: "Barka da dawowa",
    signInToContinue: "Shiga don ci gaba",
    createAccount: "Ƙirƙiri asusunka",
    signUpToStart: "Fara ganowa cikin ƙasa da minti ɗaya",
    orContinue: "ko ci gaba da",
    continueWithEmail: "Ci gaba da Imel",
    continueWithGoogle: "Ci gaba da Google",
    continueWithApple: "Ci gaba da Apple",
    continueWithX: "Ci gaba da X",
    orDivider: "ko",
    emailLabel: "Adireshin imel",
    emailPlaceholder: "kai@misali.com",
    passwordLabel: "Kalmar sirri",
    passwordPlaceholder: "Aƙalla haruffa takwas",
    fullNameLabel: "Cikakken suna",
    fullNamePlaceholder: "Sunanka",
    forgotPassword: "Ka manta kalmar sirri?",
    noAccount: "Ba ka da asusu?",
    haveAccount: "Kana da asusu?",
    termsNotice: "Ta ci gaba ka yarda da Sharuɗɗanmu da Manufar Sirri.",
    providerUnavailable: "Wannan hanyar shiga ba a saita ta ba tukuna.",
    backToHome: "Koma gida",
    otherWays: "Sauran hanyoyin ci gaba",
    resetTitle: "Sake saita kalmar sirrinka",
    resetLead: "Rubuta adireshin imel ɗin da ke kan asusunka, za mu aiko maka da hanyar saita sabuwar kalmar sirri.",
    resetSend: "Aika hanyar sakewa",
    resetSentLead: "Duba akwatin imel ɗinka.",
    resetNotArrived: "Bai zo ba bayan ƴan mintuna? Duba cikin spam, sannan ka duba adireshin da ka rubuta. Kana iya sake nema daga shafin shiga.",
    resetExpiredTitle: "Wannan hanyar ta ƙare",
    resetExpiredLead: "Hanyar sakewa tana ɗaukar awa ɗaya kuma tana aiki sau ɗaya. Nemi sabuwa ka buɗe ta a na'ura ɗaya.",
    newPasswordTitle: "Zaɓi sabuwar kalmar sirri",
    newPasswordLead: "Zaɓi wadda ba ka taɓa amfani da ita a nan ba. Za ka shiga da zarar an adana ta.",
    newPasswordLabel: "Sabuwar kalmar sirri",
    newPasswordSave: "Adana ka shiga",
    confirmPasswordLabel: "Tabbatar da kalmar sirri",
    confirmPasswordPlaceholder: "Sake rubuta kalmar sirrinka",
  },

  signUp: {
    groups: {
      identity: "Wane ne kai",
      credentials: "Yadda kake shiga",
      place: "Inda kake zama, da abin da kake yi",
      discovery: "Yadda ka same mu",
    },
    stepOf: "{current} daga {total}",
    optional: "Ba dole ba",
    firstNameLabel: "Sunan farko",
    firstNamePlaceholder: "Amina",
    surnameLabel: "Sunan iyali",
    surnamePlaceholder: "Sani",
    nicknameLabel: "Laƙabi",
    nicknamePlaceholder: "Abin da abokai suke kiranka",
    passwordMismatch: "Kalmomin sirri biyu ba su yi daidai ba.",
    strength: {
      weak: "Rauni",
      fair: "Matsakaici",
      good: "Mai kyau",
      strong: "Mai ƙarfi",
    },
    showPassword: "Nuna kalmar sirri",
    hidePassword: "Ɓoye kalmar sirri",
    placeNote:
      "Ƙaramar hukumarka ce ke tantance wuraren da allon gidanka zai buɗe a kansu. Ana iya sauya duka biyun a saituna daga baya.",
    hearAboutLabel: "Ina ka ji labarinmu",
    hearAboutPlaceholder: "Zaɓi ɗaya",
    hearAbout: {
      instagram: "Instagram",
      tiktok: "TikTok",
      x: "X",
      friendOrFamily: "Aboki ko dangi",
      googleSearch: "Binciken Google",
      other: "Wani abu dabam",
    },
    referralLabel: "Lambar gayyata",
    referralPlaceholder: "Shigar da lambarka",
  },

  pickers: {
    clear: "Share",
    close: "Rufe",
    search: "Nema",
    clearSearch: "Share neman",
    loading: "Ana ɗaukar jerin.",
    emptyTitle: "Babu abin da ya yi daidai da haka",
    emptyUnreachable:
      "Ba mu iya ɗaukar jerin a yanzu ba. Rufe wannan ka sake gwadawa bayan ɗan lokaci.",
    emptySearch: "Gwada gajeriyar kalma, ko wani sashe na sunan.",

    countryLabel: "Ƙasa",
    countryName: "Najeriya",
    countryOnly: "Ita kaɗai ce, a yanzu",

    stateLabel: "Jiha",
    statePlaceholder: "Zaɓi jiharka",
    stateSearch: "Nemi jihohi 37",

    lgaLabel: "Ƙaramar hukuma",
    lgaPlaceholder: "Zaɓi ƙaramar hukumarka",
    lgaLocked: "Fara zaɓen jiha",
    lgaDisabledHint: "Jiharka ce ke tantance ƙananan hukumomin da ke wannan jerin.",
    searchIn: "Nemi {place}",

    occupationLabel: "Abin da kake yi",
    occupationHint:
      "Waɗanda suka fi yawa suna sama, sauran kuma an haɗa su bisa fanni. Ba na so in faɗa yana cikin jerin, kuma amsa ce ta gaske.",
    occupationPlaceholder: "Zaɓi sana'arka",
    occupationSearch: "Nemi sana'o'i 749",
    commonOccupations: "Waɗanda suka zama ruwan dare a Najeriya",
  },

  interests: {
    markets: {
      apartment: "Gidaje masu ɗaki",
      hotel: "Otal-otal",
      home: "Muhallai",
      villa: "Villa",
      shortlet: "Shortlet",
      rental: "Haya",
      shop: "Shaguna",
      office: "Ofisoshi",
      land: "Filaye",
    },
    tune: {
      open: "Canja abin da ke zuwa gaba",
      title: "Me ya kamata ya zo gaba?",
      explain:
        "Wannan yana canja tsarin sakamakon da ba ka tace da kanka ba kawai. Ba a ɓoye kome, kuma duk binciken ko tacewar da kai ka saita ita ce ta fi ƙarfi.",
      more: "Ƙara irin wannan",
      less: "Ba nawa ba ne",
      close: "Rufe",
      standingOn: "{market} suna zuwa gaba yanzu.",
      standingOff: "{market} ba sa zuwa gaba yanzu.",
      movedUp: "{market} sun hau gaba.",
      alreadyUp: "{market} sun riga sun kasance a gaba, don haka babu abin da ya canja.",
      steppedBack: "{market} ba za su ƙara zuwa gaba ba.",
      alreadyBack: "{market} ba sa zuwa gaba tun farko, don haka babu abin da ya canja.",
    },
      hints: {
      apartment: "Kwanan dare a cikin ɗaki",
      hotel: "Ɗakuna, ana biya kowane dare",
      home: "Gida gaba ɗaya don zamanka",
      villa: "Manyan wurare masu zaman kansu",
      shortlet: "Kwanaki kaɗan zuwa makonni kaɗan",
      rental: "Wurin zama, na shekara",
      shop: "Wurin kasuwanci, na shekara",
      office: "Wurin aiki, na shekara",
      land: "Filaye don saya ko haya",
    },
    accountTitle: "Wannan na asusunka ne",
    accountBodySignedOut: "Abin da ka zo nema ana ajiye shi a asusunka, don haka yana bin ka zuwa kowace na'ura kuma yana yanke shawarar abin da za mu fara nuna maka.",
    accountBodyUnconfigured: "Asusun zai fara aiki da zarar makullan dandalin sun iso. Abin da ka zo nema ana ajiye shi a asusunka, don haka yana bin ka zuwa kowace na'ura.",
    question: "Me ka zo nema?",
    note: "Wannan yana canza abin da muke fara nunawa kawai. Duk wani bincike ko tacewa da kai ka saita koyaushe shi ne ya fi ƙarfi.",
    noteFirstRun: " Kana iya canza shi daga baya a cikin Saiti.",
    save: "Ajiye abin da na zo nema",
    skip: "Tsallake",
    savedNothing: "An ajiye. Ba ka faɗi wani abu na musamman ba, don haka ba a ɗaga kome sama da wani ba.",
    savedSomething: "An ajiye. Wannan shi ne abin da za mu fara nuna maka.",
    screenTitle: "Abin da ka zo nema",
    screenSubtitle: "Zaɓi kamar yadda kake so, ko kada ka zaɓi kome",
    rowLabel: "Abin da kake nema",
    rowNote: "Wannan yana yanke shawarar abin da muke fara nuna maka kawai. Duk binciken da kai ka saita koyaushe shi ne ya fi ƙarfi.",
    rowNoteSignedOut: "Shiga don ajiye wannan a asusunka, don ya bi ka zuwa kowace na'ura.",
    rowNothing: "Babu wani abu na musamman",
    rowNotAsked: "Ba a amsa ba tukuna",
},

  settings: {
    appearance: {
      label: "Kamanni",
      note: "Ana ajiye shi a wannan na'urar. Duhu shi ne tsohon zaɓi da aka tsara.",
      theme: "Launin allo",
      themeSystem: "Na na'ura",
      themeLight: "Haske",
      themeDark: "Duhu",
      textSize: "Girman rubutu",
      textSmall: "Ƙarami",
      textMedium: "Matsakaici",
      textLarge: "Babba",
      reduceMotion: "Rage motsi",
      reduceMotionSub: "Yana kwantar da motsin shigowa da na taɓawa a duk faɗin manhajar.",
      lessData: "Yi amfani da ƙarancin data",
      lessDataSub:
        "Yana hana manhajar ɗaukar wuri kafin ka buɗe shi, kuma yana neman ƙananan hotuna.",
    },

    language: {
      label: "Harshe",
      appLanguage: "Harshen manhaja",
    },

    place: {
      label: "Inda kake",
      noteSet:
        "Wannan ita ce birnin da shafin gida zai buɗe a kai. Sana'arka ta fito daga jerin dandalin na 749, don haka ana iya neman ta.",
      noteUnset: "Saita waɗannan sai shafin gida ya buɗe inda kake.",
      noteSignedOut: "Shiga don ajiye jiharka da ƙaramar hukumarka a asusunka.",
      lga: "Ƙaramar hukuma",
      state: "Jiha",
      occupation: "Abin da kake yi",
      screenTitle: "Inda kake",
      screenSubtitle: "Najeriya, sannan jiharka, sannan ƙaramar hukumarka",
      accountTitle: "Wannan na asusunka ne",
      accountBodyUnconfigured:
        "Asusun zai fara aiki da zarar makullan dandalin sun iso. Ana ajiye jiharka, ƙaramar hukumarka da sana'arka a asusunka, don haka suna bin ka zuwa kowace na'ura.",
      accountBodySignedOut:
        "Ana ajiye jiharka, ƙaramar hukumarka da sana'arka a asusunka, don haka suna bin ka zuwa kowace na'ura kuma su ne ke yanke shawarar wuraren da shafin gida zai buɗe a kai.",
      statesUnavailable:
        "Jerin jihohin bai ɗauku ba a yanzu. Sabunta shafin sai ya dawo. Babu abin da ka riga ka ajiye da ya canja.",
    },

    notifications: {
      label: "Sanarwa",
      note: "Ana ajiye su a wannan na'urar har sai ka shiga, sannan su bi asusunka.",
      push: "Sanarwar kai tsaye",
      pushSub: "Sabuntawar ajiye da amsoshi, kai tsaye zuwa wannan na'urar.",
      email: "Imel",
      emailSub: "Rasidi, tabbatarwa da wasu muhimman labarai lokaci zuwa lokaci.",
      sms: "SMS",
      smsSub: "Faɗakarwar ajiye mai gaggawa ta saƙon waya.",
      whatsapp: "WhatsApp",
      whatsappSub: "Tabbatar da ajiye da amsoshin mai gida a WhatsApp.",
    },

    privacy: {
      label: "Sirri",
      note: "Wa zai iya ganina ya shafi sunanka da sharhinka a kan kadarori.",
      whoCanSeeMe: "Wa zai iya ganina",
      everyone: "Kowa",
      onlyMe: "Ni kaɗai",
      readReceipts: "Alamar karantawa",
      readReceiptsSub: "Bari masu gida su ga lokacin da ka karanta saƙonninsu.",
      personalised: "Shawarwarin da suka dace da kai",
      personalisedSub: "Yi amfani da bincikenka da ajiyenka wajen jera wuraren da za su burge ka.",
    },

    search: {
      label: "Bincike",
      note: "Bincike yana buɗewa a yankinka na asali, kuma kana iya dubawa ko'ina koyaushe. Ana nuna kowane farashi a RentMe da Naira.",
      defaultArea: "Yankin asali",
      allOfNigeria: "Duk Najeriya",
      currency: "Kuɗi",
      mapDistances: "Nisa a taswira",
      kilometres: "Kilomita",
      miles: "Mil",
    },

    security: {
      label: "Tsaro",
      // NATIVE REVIEW: "session" was `zama`, which in this very dictionary is
      // the word for a guest's STAY at a property (`bookings`, `agentBookings`
      // and the admin stays queue all use it). One word for two unrelated
      // things on the same product is worse than clunky. Said in plain Hausa
      // now: the device you are signed in on. `shiga` is `common.signIn`.
      signOutNote:
        "Wannan ita ce na'urar da ka shiga a kanta kaɗai, don haka babu wani wurin fita. Da zarar asusun sun fara aiki, wannan maɓallin zai fitar da kai a kowace na'ura lokaci ɗaya.",
      // NATIVE REVIEW: was `da jiki`, "with the body". Names the two methods.
      appLock: "Kulle manhaja da yatsa ko fuska",
      appLockSub:
        "Nemi yatsa ko fuska duk lokacin da manhajar ta buɗe, a na'urorin da suka goyi bayan hakan.",
      signedInOn: "Ka shiga a kan",
      thisDevice: "Wannan na'urar",
      deviceOn: "{browser} a kan {os}",
      unknownBrowser: "Burauza",
      unknownOs: "wannan na'urar",
      signOutEverywhere: "Fita ko'ina",
    },

    data: {
      label: "Bayananka",
      exportNote:
        "A yanzu duk abin da RentMe ya sani game da kai yana cikin wannan burauzar, kuma babu abin da ya bar wannan na'urar. Cikakken fitar da bayanai zai zo tare da sakin ƙaddamarwa.",
      download: "Sauke bayanaina",
      downloadSub: "Kwafin duk abin da RentMe ke riƙe game da kai.",
      clear: "Share bayanan na'urar",
      clearAgain: "Sake danna don tabbatarwa",
      clearSub:
        "Yana cire sunan bayananka, saitunanka da tattaunawar da aka ajiye daga wannan na'urar, sannan ya sabunta shafin.",
    },

    account: {
      label: "Asusu",
      saved: "An ajiye a asusunka",
      unconfiguredNote:
        "Asusun zai fara aiki da zarar makullan dandalin sun iso. Duk abin da ka saita a nan ana ajiye shi a wannan na'urar har sai lokacin.",
      signedIn: "Ka shiga",
      notSignedIn: "Ba ka shiga ba",
      signedOutSub: "Shiga don ajiye bayananka da saitunanka a asusunka maimakon wannan na'urar.",
      unconfiguredSub: "Ana ajiye shi a wannan na'urar a yanzu.",
      activeOnThisDevice: "Yana aiki a wannan na'urar",
      signingOut: "Ana fita",
      deleteAccount: "Share asusuna",
      deleteAccountSub:
        "Yana cire bayananka, saitunanka, wuraren da ka ajiye da tarihin saƙonninka gaba ɗaya. Ba za a iya mayar da wannan ba.",
    },

    notify: {
      guest: {
        bookings: "Ajiye",
        bookingsSub: "Buƙatu, tabbatarwa da canje-canje ga tafiyarka.",
        messages: "Saƙonni",
        messagesSub: "Sabbin amsoshi daga masu gida da wakilan da kake magana da su.",
        wallet: "Walat",
        walletSub:
          "Imel game da kuɗin shigowa da na fita. Duk abin da ke sanya kuɗi cikin haɗari yana bayyana a cikin manhajar duk da haka.",
        marketing: "Shawarwari da tayi",
        marketingSub: "Muhimman labarai daga sassan Najeriya lokaci zuwa lokaci. A kashe yake tun farko.",
      },
      host: {
        bookings: "Ajiye",
        bookingsSub: "Sabbin buƙatu, sokewa da biyan kuɗi a kan kadarorinka.",
        messages: "Saƙonni",
        messagesSub: "Sabbin tambayoyi daga baƙi game da kadarorinka.",
        wallet: "Kuɗin shiga da biya",
        walletSub:
          "Imel game da kuɗin shigowa da na fita. Duk abin da ke sanya kuɗi cikin haɗari yana bayyana a cikin manhajar duk da haka.",
        marketing: "Shawarwari da tayi",
        marketingSub: "Shawarwarin karɓar baƙi da abin da ke faruwa a yankinka. A kashe yake tun farko.",
      },
      hideActivity: "Ɓoye ayyukana",
      hideActivitySub: "Kiyaye sharhinka da zamanka na baya-bayan nan daga bayananka na jama'a.",
      dataSaver: "Mai tsimin data",
      dataSaverSub: "Ɗauki hotuna masu sauƙi a kan data ta waya. Ya fi dacewa da ƙaramin bundel.",
    },

    delete: {
      title: "Share asusu",
      close: "Rufe",
      doneTitle: "An share asusunka",
      doneBody:
        "Duk abin da ke haɗe da shi ya tafi tare da shi kuma an fitar da kai. Muna komar da kai shafin gida yanzu. Kana da maraba ka sake farawa kowane lokaci.",
      permanentTitle: "Wannan na dindindin ne",
      losesProfile: "An cire bayananka, hotonka da saitunanka.",
      losesContent: "Wuraren da ka ajiye, saƙonninka da sharhinka za su tafi tare da su.",
      keepsBookings:
        "Ajiyen da aka riga aka yi zai kasance a rikodin mai gida, kamar yadda doka ta buƙata, amma ba a haɗa shi da kai a nan kuma.",
      talkFirst:
        "Idan wani abu ya lalace, fara magana da mu. Ana iya gyara yawancin abubuwa ba tare da rasa tarihinka ba.",
      keep: "Bar asusuna",
      typeToConfirm: "Rubuta {phrase} don tabbatarwa",
      capitals: "Manyan baƙaƙe daidai kamar yadda aka nuna. Wani abu daban ba zai buɗe maɓallin ba.",
      confirm: "Share gaba ɗaya",
    },

    about: {
      label: "Game da",
      // NATIVE REVIEW: "row level security" kept in English, it names the
      // database feature the way "audit log" does. `tsaron matakin layi` was a
      // calque, and `layi` is not the Hausa for a database row, so it was less
      // recognisable than the English term it replaced.
      note: "Saitunan da aka ajiye a wannan na'urar suna nan a wannan na'urar. Ana kare saitunan asusu da row level security, don haka kai kaɗai za ka iya karanta ko canja naka.",
      help: "Taimako",
      helpSub: "Sami amsa daga mutum",
      terms: "Sharuɗɗa",
      privacy: "Manufar sirri",
      version: "Sigar",
      licences: "Lasisin buɗaɗɗen tushe",
    },
  },

  home: {
    greeting: "Barka da dawowa",
    prompt: "Ina za ka je yau?",
    searchPlaceholder: "Nemi wurare, otal, gidan abinci",
    locationLabel: "Wurin da kake",
    recommended: "An ba da shawara gare ka",
    topExperiences: "Bincika manyan kwarewa",
    nearby: "Kusa da kai",
    aiCard: {
      title: "RentMe AI",
      body: "Abokin tafiyarka mai wayo. Ka tambaya da harshe mai sauƙi.",
      action: "Tambayi mataimaki",
      samplePrompt: "Ɗaki biyu a Lekki ƙasa da 300k mai wurin ninkaya",
    },
    agentCard: {
      title: "Zama Wakilin RentMe",
      body: "Jera kadarorinka, sarrafa ajiye, ka ƙara samu kuma ka haɓaka kasuwancinka.",
      action: "Zama wakili",
    },
    experienceCategories: {
      beach: "Wuraren shakatawa na bakin teku",
      city: "Yawon birni",
      dining: "Cin abinci na musamman",
      adventure: "Kasada",
      events: "Abubuwan da ke faruwa",
    },
  },

  agent: {
    mode: {
      personal: "Yanayin Kai",
      agent: "Yanayin Wakili",
      switchToAgent: "Canja zuwa Yanayin Wakili",
      switchToPersonal: "Canja zuwa Yanayin Kai",
      manageSub: "Sarrafa jerin ka da samun kudi",
      chooseTitle: "Zabi yanayin ka",
      chooseSub: "Canja tsakanin yanayi kowane lokaci",
      personalDesc: "Gano da yin ajiyar wurare masu ban sha'awa a Najeriya.",
      agentDesc: "Sarrafa jeri, ajiye, abokan ciniki da samun kudi.",
      verifiedAgent: "Wakilin da aka tabbatar",
      visitor: "Ba ka shiga a matsayin wakili ba",
      signInToWorkspace: "Shiga",
      workspaceLabel: "Wurin aikin wakili",
      notApproved: "Ana ci gaba da nazarin bukatar wakilcin ka.",
    },
    nav: {
      dashboard: "Dashboard",
      money: "Kudi",
      myListings: "Jerina",
      listApartment: "Jera Gida",
      bookings: "Ajiye",
      messages: "Akwatin Sako",
      reviews: "Sharhi",
      earnings: "Samun kudi",
      analytics: "Nazari",
      verification: "Tabbatarwa",
      settings: "Saituna",
    },
    join: {
      title: "Shiga Al'ummar Wakilan RentMe",
      body: "Jera kadarori, hada da bakin da aka tabbatar, sarrafa ajiye ka samu kudi.",
      start: "Fara bukata",
      resume: "Ci gaba da bukata",
      whatYouGet: "Abin da za ka samu",
      benefitReach: "Kai ga dubban bakin da aka tabbatar",
      benefitTools: "Kayan aikin jeri da ajiye na kwararru",
      benefitEarn: "Bi diddigin kudi ka samu biya cikin aminci",
    },
    apply: {
      title: "Zama Wakili",
      draftSaved: "An ajiye daftari a wannan na'urar",
      next: "Na gaba",
      back: "Koma",
      submit: "Aika bukata",
      submitting: "Ana aikawa",
      agentType: "Nau'in wakili",
      individual: "Mutum daya",
      individualDesc: "Kai da kanka kake jerawa da sarrafa kadarori.",
      business: "Kasuwanci",
      businessDesc: "Kana wakiltar kamfani da aka yi rajista.",
      steps: {
        personal: "Bayanan Kai",
        identity: "Tabbatar da Shaida",
        business: "Bayanan Kasuwanci",
        documents: "Loda Takardu",
        payout: "Bayanan Banki / Biya",
        review: "Duba & Aikawa",
      },
      fields: {
        firstName: "Sunan farko",
        lastName: "Sunan mahaifi",
        phone: "Lambar waya",
        idType: "Nau'in shaida",
        idNumber: "Lambar shaida",
        nin: "Lambar Shaida ta Kasa (NIN)",
        bvn: "Lambar Tabbatar da Banki (BVN)",
        businessName: "Sunan kasuwanci",
        rcNumber: "Lambar RC (na zabi)",
        state: "Jiha",
        city: "Birni",
        address: "Adireshi",
        bankName: "Banki",
        accountNumber: "Lambar asusu",
        accountName: "Sunan asusu",
        agreeTerms: "Na yarda da Sharuddan Wakilcin RentMe da Manufar Biya.",
      },
      documents: {
        title: "Loda takardun ka",
        body: "Shaidar gwamnati wajaba ce. Wakilan kasuwanci suna loda rajista kuma.",
        idFront: "Katin shaida, gaba",
        idBack: "Katin shaida, baya",
        registration: "Rajistar kasuwanci",
        upload: "Loda",
        chooseFile: "Zabi fayil, PNG ko JPG ko PDF, har 5MB",
      },
      review: {
        title: "Duba ka aika",
        body: "Duba bayanan ka. Kana iya komawa kowane mataki don gyara.",
        editStep: "Gyara",
      },
    },
    status: {
      submittedTitle: "An aika bukata",
      submittedBody: "Muna nazarin bukatar ka. Za a sanar da kai idan an amince.",
      status: "Matsayi",
      draft: "Daftari",
      pendingReview: "Ana Jiran Nazari",
      underReview: "Ana Nazari",
      moreInfo: "Ana Bukatar Karin Bayani",
      approved: "An amince",
      rejected: "An ki",
      submittedOn: "An aika a",
      applicationId: "ID bukata",
      reviewNote: "Kungiyar mu na nazarin bukatu cikin sa'o'i 24 zuwa 48.",
      backHome: "Koma gida",
      enterAgent: "Shiga Yanayin Wakili",
      signedOutTitle: "Shiga don ganin takardar neman ka",
      signedOutBody:
        "Takardar neman ka da lambarta suna haɗe da asusunka, don haka dole mu san ko wanene kai kafin mu nuna su.",
      signIn: "Shiga",
      noneTitle: "Babu takardar neman a rubuce",
      noneBody:
        "Ba ka nemi zama wakili ba tukuna. Yana ɗaukar kusan minti goma, kuma kana buƙatar shaidar hoto ɗaya.",
      startApplication: "Nemi zama wakili",
      unconfiguredTitle: "Ba a buɗe neman ba a nan tukuna",
      unconfiguredBody:
        "Wannan shafin zai nuna takardar neman ka ta gaskiya lokacin da makullan dandamali suka iso. Babu abin da ka aika da zai ɓace.",
      reviewedOn: "An yanke shawara a",
      reviewerNote: "Abin da mai dubawa ya ce",
    },
    dashboard: {
      title: "Dashboard na Wakili",
      subtitle: "Takaitaccen kasuwancin kadarorin ka",
      totalEarnings: "Jimillar Kudi",
      totalBookings: "Jimillar Ajiye",
      activeListings: "Jeri Masu Aiki",
      occupancyRate: "Adadin Zama",
      responseRate: "Adadin Amsa",
      earningsOverview: "Takaitaccen Kudi",
      recentBookings: "Ajiye na Baya-bayan nan",
      bookingSources: "Tushen Ajiye",
      listingPerformance: "Aikin Jeri",
      guestMessages: "Sakonnin Baki",
      quickActions: "Ayyuka Masu Sauri",
      addListing: "Kara Sabon Jeri",
      viewBookings: "Duba Ajiye",
      manageListings: "Sarrafa Jeri",
      earningsReport: "Rahoton Kudi",
      thisMonth: "Wannan Watan",
      lastMonth: "idan aka kwatanta da watan da ya gabata",
      views: "Kallo",
      revenue: "Kudin shiga",
      confirmed: "An tabbatar",
      pending: "Ana jira",
      /* The workspace with nobody in it. Three states and no fourth:
         signed out, signed in without an agent row, and unconfigured.
         The deck of invented figures this replaced is gone. */
      signedOutTitle: "Wurin aiki ga masu saka gidaje",
      signedOutBody:
        "Kudin shigarka, ajiyeyyun kwanakinka, kalandarka da gidajenka, duk a wuri guda. Shiga don buɗe naka.",
      notAgentTitle: "Ba ka saka gida ba tukuna",
      notAgentBody:
        "Wannan wurin aiki zai cika lokacin da ka sami gida a RentMe. Nema yana ɗaukar kusan minti biyu kuma mutum yana karanta kowace buƙata.",
      unconfiguredTitle: "Ba a haɗa wurin aiki ba tukuna",
      unconfiguredBody:
        "Wannan dandalin bai riƙe makullansa ba, don haka babu abin karantawa a nan. Sauran abubuwan RentMe suna aiki.",
      applyCta: "Nemi ka saka gida",
    },
  },

  agentListings: {
    wizard: {
      stepsLabel: "Matakan jeri",
      stepCounter: "Mataki {current} cikin {total}",
      stepAria: "Mataki {number}, {name}",
      steps: {
        basics: "Bayanan farko",
        photos: "Hotuna",
        location: "Wuri",
        amenities: "Kayan more rayuwa",
        utilities: "Wuta da ruwa",
        pricing: "Farashi",
        guestView: "Yadda baƙo ke gani",
        submit: "Aikawa",
      },
      unconfiguredNotice:
        "Bugawa zai fara aiki daidai lokacin da mabuɗan dandalin suka iso. Ci gaba: duk abin da ka rubuta yana ajiye a wannan na'urar, zai jira ka.",
      savedAt: "An ajiye da {time}",
      saving: "Ana ajiyewa",
      next: "Na gaba",
      back: "Koma",
      myListings: "Jerina",
    },

    basics: {
      titleLabel: "Taken jeri",
      titleHint: "Abin da baƙo ke fara gani. Ka ba wurin suna da abin da ya sa ya yi kyau.",
      titlePlaceholder: "Gida mai ɗaki biyu mai haske a Lekki Phase 1",
      propertyTypeLabel: "Nau'in kadara",
      rentalNote:
        "Haya kasuwar shekara ce: kai ka sa kuɗin haya na shekara, baƙi su tuntuɓe ka, su duba gidan, sannan su biya. Babu ajiyar dare a kan haya.",
      descriptionLabel: "Bayani",
      descriptionHint: "Kalmomi {words} cikin {min}. Ka bayyana ɗakuna, yankin da abin da ke kusa.",
      descriptionPlaceholder:
        "Ka gaya wa baƙi game da wurin, hasken sa, kicin, unguwar da yadda za su yi zirga-zirga.",
      counters: {
        guests: "Baƙi",
        bedrooms: "Ɗakunan kwana",
        beds: "Gadaje",
        bathrooms: "Ɗakunan wanka",
      },
      counterFewer: "Rage {label} ɗaya",
      counterMore: "Ƙara {label} ɗaya",
    },

    propertyTypes: {
      apartment: {
        label: "Gida mai ɗaki",
        blurb: "Gidan da ya cika da kansa, ana hayarsa kowane dare.",
      },
      shortlet: {
        label: "Shortlet",
        blurb: "Wurin zama mai kayan gida na 'yan kwanaki ko makonni.",
      },
      home: { label: "Muhalli", blurb: "Cikakken gida da baƙi ke ajiye kowane dare." },
      villa: { label: "Villa", blurb: "Babban gida na kai kaɗai da filin sa." },
      hotel: { label: "Otal", blurb: "Ɗakuna cikin kadarar da ake sarrafa." },
      rental: {
        label: "Haya",
        blurb: "Gidan da ake haya na shekara. Farashi na shekara, ana duba kafin biya.",
      },
      shop: { label: "Shago", blurb: "Wurin kasuwanci da ake haya na shekara." },
      office: { label: "Ofis", blurb: "Wurin aiki da ake haya na shekara." },
      land: { label: "Fili", blurb: "Fili, farashinsa na shekara." },
    },

    photos: {
      intro:
        "Ka ƙara aƙalla hotuna {min}, har zuwa {max}. Na farko shi ne hoton gaba, don haka ka fara da hoto mai faɗi da ke sayar da wurin.",
      tooNarrow: "Hotuna dole su kai faɗin {width}px domin su bayyana sarai a kowace na'ura.",
      choose: "Zaɓi hotuna",
      addMore: "Ƙara ƙarin hotuna",
      uploading: "Ana lodawa",
      progress: "{count} cikin {min} da ake buƙata",
      empty: "Babu hoto tukuna. Hasken rana, faɗin hoto da ɗaki mai tsafta suna yin aikin.",
      cover: "Hoton gaba",
      makeCover: "Mai da shi hoton gaba",
      remove: "Cire",
      ceiling: "Jeri ɗaya yana ɗaukar hotuna {max} kacal.",
      notAnImage: "Hotuna dole su zama fayilolin hoto, misali JPG ko PNG.",
      notPrepared:
        "Ba mu iya shirya wannan hoton lafiya ba, don haka ba a loda shi ba. Ka gwada wani hoto.",
      uploadFailed: "Wannan hoton bai gama lodawa ba. Don Allah ka sake gwadawa.",
      needsKeys:
        "Hotuna za su loda idan mabuɗan dandalin suka iso. Duk sauran abin da ka rubuta na ajiye.",
      needsTitle: "Ka sa take a mataki na ɗaya tukuna, sannan hotunanka za su haɗu da wannan jeri.",
    },

    location: {
      stateLabel: "Jiha",
      statePlaceholder: "Zaɓi jiha",
      cityLabel: "Birni",
      cityPlaceholder: "Lagos",
      areaLabel: "Yanki",
      areaHint: "Unguwar da baƙi ke nema.",
      areaPlaceholder: "Lekki Phase 1",
      addressLabel: "Adireshin titi",
      addressHint: "Ana ɓoye shi har sai an tabbatar da ajiye ko kai ka raba shi cikin hira.",
      addressPlaceholder: "12 Admiralty Way",
      landmarkLabel: "Alamar wuri",
      landmarkHint: "Wani abu kusa da ke sa wurin ya zama mai sauƙin samu.",
      landmarkPlaceholder: "Gaban zoben Lekki",
    },

    amenities: {
      intro:
        "Ka zaɓi duk abin da baƙo zai samu a gidan da gaske. Jerin gaskiya yana samun sharhi mai kyau fiye da jeri mai tsawo.",
      names: {
        wifi: "WiFi",
        ac: "Na'urar sanyaya iska",
        tv: "TV",
        kitchen: "Kicin",
        parking: "Wurin ajiye mota",
        pool: "Wurin ninkaya",
        gym: "Wurin motsa jiki",
        security: "Tsaro",
        elevator: "Lif",
        furnished: "Da kayan gida",
        balcony: "Baranda",
        garden: "Lambu",
        laundry: "Wurin wanki",
        generator: "Wutar madadin",
        water: "Ruwa mai gudana",
      },
    },

    pricing: {
      priceNightLabel: "Farashin kowane dare",
      priceYearLabel: "Kuɗin haya na shekara",
      priceHint: "Ka shigar da adadin da naira, misali 85,000.",
      priceWithPeriod: "{price} {period}",
      priceNightPlaceholder: "85,000",
      priceYearPlaceholder: "2,500,000",
      perNight: "kowane dare",
      perYear: "kowace shekara",
      cleaningLabel: "Tsaftace",
      cleaningHint: "Na zabi. Ana ƙara shi sau ɗaya ga zaman, ba kowane dare ba.",
      cleaningHintSet: "{amount} da aka ƙara sau ɗaya ga zaman.",
      cleaningPlaceholder: "10,000",
      minStayLabel: "Mafi ƙarancin daren zama",
      instantTitle: "Ajiye nan take",
      instantBody: "Baƙi za su ajiye ba tare da jiran tabbatarwarka ba.",
      rentalNote:
        "Ana sa farashin haya na shekara. Baƙi za su tuntuɓe ka cikin RentMe, su duba gidan, sannan su biya. Domin tsaronka, ka bar kowace hira da kowane biya cikin RentMe.",
    },

    guestView: {
      intro: "Haka jerinka ke bayyana cikin bincike.",
      addPhotos: "Ka ƙara hotuna don kammala katin",
      rentBadge: "Haya",
      instantBadge: "Nan take",
      locationPlaceholder: "Ka ƙara wuri a mataki na uku",
      titlePlaceholder: "Taken jerinka",
      rooms: "Ɗakin kwana {bedrooms}, ɗakin wanka {bathrooms}, yana ɗaukar baƙi {guests}",
      priceToSet: "Farashin da za a sa",
      descriptionPlaceholder: "Bayaninka zai bayyana a shafin jeri.",
    },

    submit: {
      title: "A shirye don aikawa nazari",
      body:
        "Muna duba kowane jeri da hannu kafin ya isa ga baƙi. Ka cika wannan jerin dubawa, sai ya shiga layi kai tsaye.",
      action: "Aika don nazari",
      sending: "Ana aikawa",
      note: "Nazari yana ɗaukar sa'o'i 24 zuwa 48. Za mu sanar da kai ko ta yaya.",
      checklist: {
        title: "Take",
        description: "Bayani na kalmomi {min} ko fiye",
        photos: "Hotuna {min} ko fiye, hoton gaba na farko",
        stateCode: "Jiha",
        city: "Birni",
        area: "Yanki",
        amenities: "Kayan more rayuwa",
        priceNight: "Farashin kowane dare",
        priceYear: "Kuɗin haya na shekara",
        rooms: "Ɗakuna da baƙi",
      },
      needsTitle: "Ka sa take a mataki na ɗaya tukuna, sannan za mu iya aika wannan jeri don nazari.",
      needsKeys:
        "Aikawa don nazari zai fara aiki daidai lokacin da mabuɗan dandalin suka iso. Aikinka na ajiye a wannan na'urar.",
    },

    gate: {
      titleShort: "Ka ba jerin take na aƙalla haruffa {min}.",
      titleLong: "Ka rage taken zuwa haruffa {max} ko ƙasa.",
      description: "Ka bayyana kadarar da aƙalla kalmomi {min}. Kana da {count} yanzu.",
      propertyType: "Ka zaɓi irin kadarar da wannan yake.",
      photos: "Ka ƙara aƙalla hotuna {min}. Kana da {count}.",
      cover: "Ka zaɓi hoton da zai jagoranci jerin. Na farko shi ne hoton gaba.",
      stateCode: "Ka zaɓi jihar da kadarar take.",
      city: "Ka shigar da birni, misali Lagos.",
      area: "Ka shigar da yanki, misali Lekki Phase 1.",
      amenities: "Ka zaɓi aƙalla kaya ɗaya da baƙi za su samu.",
      priceNight: "Ka sa farashin kowane dare da naira.",
      priceYear: "Ka sa kuɗin haya na shekara da naira.",
      bedrooms: "Ka faɗi ɗakunan kwana nawa kadarar take da su.",
      bathrooms: "Ka faɗi ɗakunan wanka nawa kadarar take da su.",
      maxGuests: "Ka faɗi baƙi nawa kadarar ke ɗauka.",
    },

    submitted: {
      title: "Jerinka na hannun ƙungiyar nazarinmu",
      body:
        "Muna duba kowane jeri da hannu domin baƙi su amince da abin da suke ajiye. Nazari yana ɗaukar sa'o'i 24 zuwa 48 kuma za mu sanar da kai ko ta yaya. Idan wani abu na buƙatar canji, za mu faɗi ainihin abin.",
      goToListings: "Je zuwa jerina",
      another: "Jera wata kadara",
    },

    pitch: {
      title: "Jera kadararka a RentMe",
      bodySignedIn:
        "Jeri na buɗe ga wakilan da aka amince da su. Bukatar tana ɗaukar kusan minti biyu, muna nazari cikin sa'o'i 24 zuwa 48.",
      bodySignedOut:
        "Ka shiga asusun wakilcinka don fara jeri, ko ka nemi cikin kusan minti biyu idan sabo ne ka nan.",
      points: {
        verified: {
          title: "Kadarar da aka tabbatar kaɗai",
          body:
            "Ana duba kowane jeri da hannu, don haka alamar da ke kan kadararka na nufin wani abu ga baƙi.",
        },
        inside: {
          title: "Baƙi na iso gare ka cikin RentMe",
          body: "Hira, dubawa da biya duk suna cikin dandalin, inda ake kare su.",
        },
        keep: {
          title: "Kai ke riƙe abin da ka sa",
          body: "RentMe ba ya karɓar ko sisi a hannunka don jeri. Farashinka nasa ne.",
        },
      },
      apply: "Zama wakili",
      signIn: "Shiga",
      how: "Yadda jeri ke aiki",
    },

    workspace: {
      title: "Jerina",
      lede: "Duk kadarar da kake da ita a RentMe, da inda kowacce ta tsaya.",
      start: "Fara jeri",
      unconfigured:
        "Jerinka zai bayyana nan daidai lokacin da mabuɗan dandalin suka iso. Kana iya fara gina ɗaya yanzu: mai jeri yana ajiye aikinka a wannan na'urar har sai lokacin.",
      emptyTitle: "Babu jeri tukuna",
      emptyBody:
        "Kadarar farko tana ɗaukar kusan minti goma, mafi yawansa hotuna. Ka fara duk lokacin da ka shirya: ana ajiye daftari yayin da kake tafiya.",
      groups: {
        live: { title: "Yana aiki", blurb: "Baƙi na iya samun waɗannan cikin bincike." },
        review: {
          title: "Hannun ƙungiyar nazarinmu",
          blurb: "Muna duba kowane jeri da hannu. Wannan yana ɗaukar sa'o'i 24 zuwa 48.",
        },
        attention: {
          title: "Yana buƙatar hankalinka",
          blurb: "Ana buƙatar canji kafin wannan ya fara aiki.",
        },
        drafts: { title: "Daftari", blurb: "Kai kaɗai kake ganin waɗannan." },
      },
      status: {
        DRAFT: "Daftari",
        SUBMITTED: "An aika",
        UNDER_REVIEW: "Ana nazari",
        MORE_INFO_REQUIRED: "Ana buƙatar ƙarin bayani",
        APPROVED: "An amince",
        PUBLISHED: "Yana aiki",
        REJECTED: "Ba a karɓa ba",
        SUSPENDED: "An dakatar",
      },
      photoCount: "Hotuna {count}",
      photoCountOne: "Hoto ɗaya",
      actions: {
        edit: "Gyara",
        submit: "Aika don nazari",
        takeDown: "Cire shi",
        delete: "Share",
      },
      /* Deleting a draft opens no dialogue: the row leaves and offers its
         way back, and nothing reaches the server until that offer runs out. */
      undo: {
        removed: "An share daftarin",
        action: "Mayar da shi",
      },
      sheets: {
        keep: "Bar shi haka",
        working: "Ana aiki",
        close: "Rufe",
        submit: {
          title: "A aika wannan jeri don nazari?",
          body:
            "Ƙungiyarmu tana duba hotuna, bayani da wurin. Za ka ji daga gare mu cikin sa'o'i 24 zuwa 48, ko ta yaya.",
          confirm: "Aika don nazari",
        },
        unpublish: {
          title: "A cire wannan jeri?",
          body:
            "Zai bar bincike nan take ya koma daftarinka. Kana iya gyara shi ka sake aika don nazari duk lokacin da ka shirya.",
          confirm: "Cire shi",
        },
      },
    },

    dashboard: {
      standing: "{name}, ga inda kadarorinka suka tsaya yau.",
      liveListings: "Jeri masu aiki",
      withReview: "Hannun nazari",
      drafts: "Daftari",
      upcomingStays: "Zaman da ke tafe",
      unreadMessages: "Saƙonnin da ba a karanta",
      noListings:
        "Babu kadara tukuna. Jerinka na farko yana ɗaukar kusan minti goma, kuma ana ajiye daftari yayin da kake tafiya.",
      noStays:
        "Ba a ajiye wani zama tukuna. Jerin da ke aiki cikin bincike su ne baƙi ke iya ajiyewa.",
      stayDates: "{from} zuwa {to}",
    },
  },

  agentBookings: {
    title: "Ajiye",
    lede: "Kowane buƙata da kowane zama a kan kadarorinka.",
    unconfigured:
      "Buƙatunka da zamanka za su bayyana a nan da zarar maɓallan dandalin suka iso. Babu abin da ya ɓace a tsakani.",
    tabsLabel: "Rukunan ajiye",
    waitingOn: "{count} suna jiran ka",
    waitingOnOne: "Ɗaya yana jiran ka",
    groups: {
      requests: {
        title: "Buƙatu",
        blurb:
          "Suna jiran shawararka. Buƙata tana riƙe darare na awa {hours}, sannan ta saki kanta.",
      },
      upcoming: { title: "Masu zuwa", blurb: "Zaman da ka karɓa waɗanda ba su zo ba tukuna." },
      completed: { title: "An kammala", blurb: "Zaman da baƙinka suka gama." },
      cancelled: {
        title: "An soke",
        blurb: "Buƙatun da ka ƙi, da zaman da kowanne ɓangare ya kawo ƙarshe.",
      },
    },
    card: {
      dates: "{from} zuwa {to}",
      nights: "Darare {count}",
      nightsOne: "Dare ɗaya",
      guests: "Baƙi {count}",
      guestsOne: "Baƙo ɗaya",
      composition: "Manya {adults}, yara {children}",
      total: "Jimilla",
      requested: "An buƙata {date}",
      waiting: "Yana jira {duration}",
      waitingNew: "Sabon isowa",
      releasesIn: "Zai saki kansa cikin {duration}",
      releasingNow: "Ya wuce riƙon awa {hours}, don haka zai iya sakewa kowane lokaci",
      hours: "Awa {count}",
      hoursOne: "Awa ɗaya",
      days: "Kwana {count}",
      daysOne: "Kwana ɗaya",
      settled: "Kuɗin ya shiga",
      awaiting: "Kuɗin bai shiga ba tukuna",
      unknown: "Ba a iya sanin matsayin kuɗin yanzu",
      arriving: "Mai zuwa: {name}",
      arrivingPhone: "Lambar ƙofa {phone}",
    },
    status: {
      PENDING: "Yana jiran shawararka",
      CONFIRMED: "An tabbatar",
      CANCELLED: "An soke",
    },
    actions: {
      accept: "Karɓa",
      decline: "Ƙi",
      working: "Ana aiki",
      back: "Koma baya",
      close: "Rufe",
    },
    accept: {
      title: "Ka karɓi wannan buƙata?",
      body:
        "Baƙon zai ji nan take, kuma za a riƙe dararen a kalandarka gare shi. Tabbatar kadarar tana da sauƙi da gaske kafin ka karɓa.",
      confirm: "Karɓi buƙatar",
    },
    decline: {
      title: "Ka ƙi wannan buƙata?",
      body:
        "Dararen za su koma kalandarka kuma za a sanar da baƙon. Ba a cajin kowa ko ta yaya.",
      reasonLabel: "Me ya sa ba za ka iya karɓar waɗannan kwanakin ba?",
      reasonHint: "Baƙon zai karanta wannan kalma da kalma, don haka ka sa shi sauƙi da kirki.",
      reasonPlaceholder: "An riga an ɗauki gidan a waɗannan dararen.",
      suggestionsLabel: "Ko fara daga ɗaya daga cikin waɗannan",
      suggestions: {
        taken: "An riga an ɗauki gidan a waɗannan dararen.",
        maintenance: "Ana yin gyara a kadarar a wannan makon.",
        guests: "Kadarar ba ta iya ɗaukar baƙi da yawa haka a cikin nutsuwa.",
      },
      confirm: "Ƙi buƙatar",
    },
    empty: {
      requestsTitle: "Babu abin da ke jiran ka",
      requestsBody:
        "Babu baƙo da ke jiran shawara yanzu. Sabbin buƙatu za su sauka a nan kuma za su riƙe dararen na awa {hours} yayin da kake amsa.",
      upcomingTitle: "Ba a ajiye wani zama tukuna",
      upcomingBody:
        "Buƙatun da ka karɓa za su bayyana a nan tare da kwanakin, baƙin da jimillar.",
      completedTitle: "Babu abin da aka kammala tukuna",
      completedBody: "Zama yana matsawa nan washegari bayan baƙonka ya fita.",
      cancelledTitle: "Babu abin da aka soke",
      cancelledBody:
        "Buƙatun da ka ƙi, da zaman da kowanne ɓangare ya kawo ƙarshe, suna nan don tarihinka.",
      openListings: "Sarrafa jerina",
    },
  },

  agentEarnings: {
    title: "Samun kudi",
    lede: "Abin da ya shiga daga zamanka, kai tsaye daga littafin lissafi.",
    unconfigured: "Kuɗin da ka samu zai bayyana a nan da zarar maɓallan dandalin suka iso.",
    unavailable:
      "Ba mu iya karanta littafin lissafi yanzu ba, don haka ba a nuna wani adadi maimakon nuna wanda ba daidai ba. Sake buɗe shafin cikin ɗan lokaci.",
    totals: {
      yourShare: "Rabonka da ya shiga",
      guestsPaid: "Abin da baƙi suka biya",
      settledStays: "Zaman da kuɗinsu ya shiga",
      thisMonth: "Wannan watan",
    },
    byMonth: "Kowane wata",
    monthShare: "Rabonka",
    monthGross: "Abin da baƙi suka biya",
    stays: "Zama {count}",
    staysOne: "Zama ɗaya",
    emptyTitle: "Babu kuɗin da ya motsa tukuna",
    emptyBody:
      "Kowane kuɗin da ya shiga ana rubuta shi a littafin lissafi kuma yana bayyana a nan tare da rabonka. Ba a ƙididdige komai a wannan shafin, don haka har sai wani zama ya shiga, zai zauna babu komai da gangan.",
    emptyAction: "Duba ajiyenka",
    howTitle: "Yadda ake aiki da rabonka",
    howBody:
      // NATIVE REVIEW: "processor" kept in English, it names the payment company.
      "Ana raba kuɗin da ya shiga hanya uku: rabonka, rabon dandalin, da abin da processor na biyan kuɗi ya ɗauka. Ukun kullum suna haɗuwa zuwa abin da baƙon ya biya, shi ya sa kowane layi a nan yana daidaita.",
  },

  admin: {
    console: {
      // NATIVE REVIEW: "console" kept in English the way Nigerian staff say it.
      title: "Console na masu gudanarwa",
      navLabel: "Console na masu gudanarwa",
      signedIn: "An shiga",
      // NATIVE REVIEW: "audit log" kept in English, it is a compliance term.
      auditNote: "Ana rubuta kowane hukuncin da ka yanke nan a audit log da sunanka a kansa.",
    },

    nav: {
      overview: { label: "Taƙaitawa", short: "Taƙaitawa" },
      // NATIVE REVIEW: "flag" kept in English, it is the safety scan's own term.
      flags: { label: "Flag na saƙonni", short: "Flag" },
      alerts: { label: "Faɗakarwar haɗari", short: "Faɗakarwa" },
      reports: { label: "Ƙorafi", short: "Ƙorafi" },
      applications: { label: "Bukatun wakilci", short: "Wakilai" },
      stops: { label: "Dakatarwa", short: "Dakatarwa" },
      listings: { label: "Nazarin jeri", short: "Jeri" },
      bookings: { label: "Zaman baƙi", short: "Zama" },
      tickets: { label: "Tallafi", short: "Tallafi" },
      // NATIVE REVIEW: "switch" kept in English, it names a control staff use.
      social: { label: "Yanki", short: "Yanki" },
      standing: { label: "Matsayi", short: "Matsayi" },
      moderation: { label: "An riƙe", short: "An riƙe" },
      reference: { label: "Bayanan tunani", short: "Tunani" },
      switches: { label: "Switch", short: "Switch" },
    },

    access: {
      unconfiguredTitle: "Console bai buɗe ba tukuna",
      unconfiguredBody:
        "Console zai fara aiki daidai lokacin da mabuɗan dandalin suka iso. Ba a rasa komai a tsakani.",
      signedOutTitle: "Shigar ma'aikata",
      signedOutBody: "Ka shiga da asusun aikinka don ci gaba.",
      notAdminTitle: "Ba ka da damar shiga console",
      notAdminBody: "Wannan wurin na ƙungiyar aikin RentMe ne. Asusunka ba ya ɗauke da wannan matsayi.",
      backToRentMe: "Koma RentMe",
      signIn: "Shiga",
      backToYourHome: "Koma gidanka",
      otherAccount: "Shiga da wani asusu",
    },

    common: {
      waiting: "{count} na jira",
      unavailableTitle: "Ba a iya loda wannan layi ba",
      unavailableBody:
        "Console bai iya kai ga bayanan dandalin yanzu ba, don haka ba ya nuna maka layin da ba zai iya tabbatar da shi ba. Ka sake lodawa cikin ɗan lokaci.",
      notRecorded: "Ba a rubuta ba",
      notGiven: "Ba a bayar ba",
      passes: "Ya wuce",
      needsAttention: "Yana buƙatar hankali",
      close: "Rufe",
      done: "An gama",
      notNow: "Ba yanzu",
      working: "Ana aiki",
      optional: "(na zabi)",
      notePlaceholder: "Za su karanta shi kalma bayan kalma, don haka ka yi shi keɓaɓɓe da kirki.",
      // NATIVE REVIEW: "audit log" kept in English, it is a compliance term.
      inAuditLog: "Hukuncin yana cikin audit log.",
      // NATIVE REVIEW: "audit log" kept in English, it is a compliance term.
      noteInAuditLog: "Bayanin yana cikin audit log.",
      recentlyReviewed: "Waɗanda aka yi nazari kwanan nan",
      recentlyResolved: "Waɗanda aka warware kwanan nan",
      recentlyDecided: "Waɗanda aka yanke kwanan nan",
      recentlyClosed: "Waɗanda aka rufe kwanan nan",
      dueIn: "A amsa cikin sa'o'i {hours}",
      dueSoon: "A amsa cikin sa'a guda",
      overdue: "Ya makara da sa'o'i {hours}",
      resolvedBy: "{who} ya warware shi",
      reviewedBy: "{who} ya duba shi",
      someone: "wani abokin aiki",
      status: {
        open: "A buɗe",
        reviewed: "An yi nazari",
        reviewing: "Ana nazari",
        resolved: "An warware",
        dismissed: "An yar da shi",
        pending: "Ana jiran amsa",
        closed: "An rufe",
        DRAFT: "Daftari",
        SUBMITTED: "An aika",
        UNDER_REVIEW: "Ana nazari",
        MORE_INFO_REQUIRED: "An nemi canji",
        APPROVED: "An amince",
        PUBLISHED: "Yana aiki",
        REJECTED: "Ba a amince ba",
        SUSPENDED: "An dakatar",
        PENDING: "An nema",
        CONFIRMED: "An tabbatar",
        CANCELLED: "An soke",
      },
    },

    overview: {
      title: "Taƙaitawar aiki",
      lede:
        "Kowace alamar amincin da RentMe ke samarwa tana ƙarewa nan: abin da binciken tsaro ya kama, abin da mambobi suka ƙorafta, wanda ke jiran amincewa, da abin da ke jiran fara aiki. Kowace lamba layi ce da za ka iya kammalawa.",
      queueClear: "Wannan layin babu abu.",
      tiles: {
        moderation: {
          label: "Abun da aka riƙe",
          lede: "Saƙonni, labarai, sharhi da bayanan mutum da binciken tsaro ya tsayar.",
        },
        // NATIVE REVIEW: "flag" kept in English, it is the safety scan's own term.
        flags: {
          label: "Flag na saƙonni a buɗe",
          lede: "Maganar kuɗi da binciken tsaro ya kama cikin hira.",
        },
        alerts: {
          label: "Faɗakarwar haɗari a buɗe",
          lede: "Al'amuran da aka ɗaga wa ƙungiyar aiki don su yi aiki a kansu.",
        },
        applications: {
          label: "Bukatun wakilci",
          lede: "Mutanen da ke jiran hukunci don fara jeri.",
        },
        listings: {
          label: "Jerin da ke nazari",
          lede: "Abubuwan da aka aika suna jiran dubawa, amincewa da bugawa.",
        },
        reports: {
          label: "Ƙorafi a buɗe",
          lede: "Abun ciki da asusun da mambobi suka ƙorafta mana.",
        },
        tickets: {
          label: "Tikitin tallafi",
          lede: "Tambayoyin da mataimaki bai iya amsa da kansa ba.",
        },
      },
      how: {
        title: "Yadda console ke aiki",
        // NATIVE REVIEW: "audit" kept in English, it is a compliance term.
        audit:
          "Kowane hukunci yana rubuta layin audit mai ɗauke da sunanka, bayanin da ka taɓa da matsayinsa kafin da bayan. Ba wanda zai iya gyara ko share log, har da kai.",
        notify:
          "Amincewa da ƙi suna sanar da wanda abin ya shafa a dandalin, don kada wani ya zauna cikin shakkar abin da ya faru da bukatarsa ko jerinsa.",
        invisible:
          "Binciken tsaro ba ya bayyana a wani wuri sai wannan console. Babu abin da ke gaya wa mamba cewa an ɗaga saƙonsa.",
        openSwitches: "Buɗe switch",
      },
    },

    flags: {
      // NATIVE REVIEW: "flag" kept in English throughout this queue.
      title: "Flag na saƙonni",
      lede:
        "Wani abu a cikin bayanan yana bincika kowane saƙo don lambar asusu mai lambobi goma da maganar kuɗi, sannan yana ajiye abin da ya samu nan. Ba a taɓa gaya wa mai aikawa ba, don haka wannan layin shi ne kawai wurin da binciken ke nuna aikinsa.",
      emptyTitle: "Babu flag da ke jira",
      emptyBody:
        "An yi nazarin kowane saƙon da aka ɗaga. Sababbi za su bayyana nan daidai lokacin da binciken ya ajiye su.",
      reason: { account_number: "Lambar asusu", payment_keyword: "Maganar kuɗi" },
      role: { guest: "Baƙo", agent: "Wakili", unknown: "Mai halarta" },
      matched: "Binciken ya kama {fragment} cikin saƙo daga {role}.",
      context: "Yanayin hirar",
      flagged: "An ɗaga",
      reviewed: "An yi nazari.",
      clear: "Kammala wannan flag",
      escalate: "Ɗaga faɗakarwar haɗari",
      clearSheet: {
        title: "A kammala wannan flag?",
        body:
          "Binciken ya yi daidai da ya duba, amma wannan hirar tana lafiya. Flag zai rufe kuma za a rubuta hukuncin a audit log da sunanka a kansa. Ba a gaya wa kowa cikin hirar ba.",
        confirm: "Ee, ka kammala shi",
        successTitle: "An kammala flag",
        successBody: "An sabunta layin kuma audit log na ɗauke da hukuncinka.",
      },
      escalateSheet: {
        title: "A ɗaga faɗakarwar haɗari?",
        body:
          "Wannan yana rufe flag kuma yana buɗe faɗakarwar haɗari mai tsanani a kan saƙon, don al'amarin ya zauna a layin faɗakarwa har sai wani ya yi aiki a kansa. Ba a gaya wa kowa cikin hirar ba.",
        confirm: "Rufe flag ka ɗaga faɗakarwa",
        successTitle: "An ɗaga faɗakarwa",
        successBody: "An yi nazarin flag kuma faɗakarwa mai tsanani na buɗe a layin faɗakarwa yanzu.",
      },
    },

    alerts: {
      title: "Faɗakarwar haɗari",
      lede:
        "Al'amuran da ke buƙatar mutum, ba doka ba: flag na saƙonni da aka ɗaga da duk abin da dandalin ya ga ya cancanci duba na biyu. Faɗakarwa tana zama a buɗe har sai wani ya rubuta abin da aka yi.",
      emptyTitle: "Babu faɗakarwa a buɗe",
      emptyBody: "Babu abin da ke jira. Ɗaga flag na saƙo yana buɗe faɗakarwa nan.",
      severity: { low: "Ƙasa", medium: "Matsakaici", high: "Sama" },
      severityChip: "Tsanani {level}",
      attachedTo: "An haɗa da {type} {id}",
      resolvedWhen: "An warware {when}.",
      resolve: "Yi alama an warware",
      sheet: {
        title: "A warware wannan faɗakarwa?",
        body:
          "Ka yi amfani da wannan bayan an yi aiki a kan al'amarin da gaske. Faɗakarwa za ta rufe da lokaci kuma bayaninka zai shiga audit log.",
        confirm: "Ee, ka warware shi",
        notesLabel: "Abin da aka yi",
        successTitle: "An warware faɗakarwa",
        successBody: "An rufe faɗakarwa kuma audit log na ɗauke da bayaninka.",
      },
    },

    verification: {
      title: "Matakan tabbatarwa",
      tierLine: "Mataki {step} cikin 4: {name}",
      tierName: {
        "0": "An amince, ba a kara bincike ba tukuna",
        "1": "An tabbatar da shaidar mutum",
        "2": "An tabbatar da adireshi",
        "3": "An tabbatar da asusun biya",
        "4": "An tabbatar gaba daya",
      },
      rung: {
        identity: "An ga shaidar mutum",
        address: "An tabbatar da adireshi",
        payout: "Asusun banki a sunansa",
        in_person: "An hadu da shi ido da ido",
      },
      passed: "Ya wuce",
      failed: "Bai wuce ba",
      undecided: "Ba a duba ba tukuna",
      decidedBy: "{who}, {when}",
      pass: "Rubuta ya wuce",
      fail: "Rubuta bai wuce ba",
      blockedBelow: "Matakin da ke kasa da wannan bai wuce ba tukuna.",
      sheet: {
        passTitle: "A rubuta wannan dubawa a matsayin da ya wuce?",
        failTitle: "A rubuta wannan dubawa a matsayin da bai wuce ba?",
        passBody:
          "Ana sake lissafin matakin wakilin daga duban da suka wuce, kuma ana sanar da shi idan ya canza.",
        failBody:
          "Wannan na iya rage matakin da baki ke gani, don haka a fadi abin da bai yi daidai ba. Wakilin zai karanta maganarka.",
        confirm: "A rubuta shi",
        notesLabel: "Abin da ka duba",
        successTitle: "An rubuta duban",
        successBody: "An sabunta matakan kuma shawarar tana cikin littafin bincike.",
      },
    },

    reports: {
      title: "Ƙorafi",
      lede:
        "Abin da mambobi suka gaya mana bai yi daidai ba: jeri, sharhi, saƙo ko asusu. Mai ƙorafi na ganin ƙorafinsa kaɗai, don haka wannan layin shi ne inda ake amsa shi da gaske.",
      emptyTitle: "Babu ƙorafi a buɗe",
      emptyBody: "Babu abin da ke jiran hukunci. Sababbin ƙorafi na iso nan yayin da mambobi ke ɗaga su.",
      reportedBy: "{reporter} ya ƙorafta a kan {type} {id}",
      closedWhen: "An rufe {when}.",
      startReview: "Fara nazari",
      resolve: "Warware",
      dismiss: "Yar da shi",
      reviewSheet: {
        title: "Ka ɗauki wannan ƙorafi?",
        body: "Zai koma cikin nazari don sauran ƙungiyar su gani wani ya ɗauka.",
        confirm: "Ee, ina kansa",
        notesLabel: "Bayani don audit log",
        successTitle: "An ɗauki ƙorafi",
        successBody: "Ƙorafin yanzu yana nunawa cikin nazari.",
      },
      resolveSheet: {
        title: "A warware wannan ƙorafi?",
        body:
          "Ka yi amfani da wannan idan an ɗauki mataki a kan abun cikin ko asusun da aka ƙorafta. Ƙorafin zai rufe da lokaci.",
        confirm: "Ee, ka warware shi",
        notesLabel: "Abin da aka yi",
        successTitle: "An warware ƙorafi",
        successBody: "An rufe ƙorafin kuma bayaninka na cikin audit log.",
      },
      dismissSheet: {
        title: "A yar da wannan ƙorafi?",
        body:
          "Ka yi amfani da wannan idan babu abin da za a yi. Ƙorafin zai rufe kuma ba a ɗaukar mataki a kan wanda aka ƙorafta.",
        confirm: "Ee, ka yar da shi",
        notesLabel: "Dalilin yar da shi",
        successTitle: "An yar da ƙorafi",
        successBody: "An rufe ƙorafin kuma bayaninka na cikin audit log.",
      },
    },

    applications: {
      title: "Bukatun wakilci",
      lede:
        "Amincewa yana ƙirƙirar bayanan wakilcin, yana ba da matsayin wakili don Yanayin Wakili ya buɗe, kuma yana sanar da mai bukata a dandalin. Mayar da ɗaya yana neman ainihin abin da ya ɓace.",
      emptyTitle: "Babu bukata da ke jira",
      emptyBody:
        "Duk wanda ya nemi ya sami amsa. Sababbin bukatu na iso nan daidai lokacin da aka aika su.",
      individual: "Mutum ɗaya",
      business: "Kasuwanci",
      nameMissing: "Ba a bayar da suna ba",
      thisApplicant: "wannan mai bukata",
      submittedWhen: "An aika {when}",
      decidedWhen: "An yanke {when}.",
      sections: {
        personal: "1. Na kai",
        identity: "2. Shaida",
        business: "3. Kasuwanci",
        documents: "4. Takardu",
        payout: "5. Biya",
        review: "6. Nazari",
      },
      fields: {
        fullName: "Cikakken suna",
        phone: "Waya",
        email: "Imel",
        address: "Adireshi",
        location: "Wuri",
        documentType: "Nau'in takarda",
        documentNumber: "Lambar takarda",
        businessName: "Sunan kasuwanci",
        rcNumber: "Lambar RC",
        business: "Kasuwanci",
        uploaded: "An loda",
        bank: "Banki",
        accountNumber: "Lambar asusu",
        accountName: "Sunan asusu",
        terms: "Sharuɗɗa",
        applied: "Ya nemi",
        lastNote: "Bayanin mai nazari na ƙarshe",
        lastReviewed: "Nazari na ƙarshe",
      },
      asIndividual: "Yana nema a matsayin mutum ɗaya",
      documentsCount: "Takardu {count}",
      documentsOne: "Takarda ɗaya",
      documentsNone: "Ba a loda takardu ba, don haka ba za a iya tabbatar da wannan buƙatar ba tukuna",
      documentOpen: "Buɗe",
      documentUnavailable: "Hanyar bata samu",
      documentKinds: {
        idFront: "Shaida, gaba",
        idBack: "Shaida, baya",
        registration: "Rajistar CAC",
      },
      // NATIVE REVIEW: legal wording, "terms" of the platform.
      termsAgreed: "Ya yarda da sharuɗɗan dandalin",
      termsNotAgreed: "Bai yarda ba",
      approve: "Amince",
      requestChanges: "Nemi canji",
      reject: "Ƙi",
      approveSheet: {
        title: "A amince da {name}?",
        body:
          "Wannan yana ƙirƙirar bayanan wakilcinsu, yana ba su matsayin wakili don Yanayin Wakili ya buɗe gare su, kuma yana gaya musu a dandalin. Ana rubuta shi a audit log da sunanka a kansa.",
        confirm: "Ee, ka amince",
        notesLabel: "Bayani ga mai bukata",
        successTitle: "An amince da bukata",
        successBody: "Bayanan wakilcinsu na aiki, an ba da matsayin kuma an sanar da su.",
      },
      changesSheet: {
        title: "A nemi ƙarin bayani?",
        body:
          "Bukatar za ta koma canjin da aka nema kuma za a gaya wa mai bukata abin da kake buƙata. Za su iya gyara su sake aikawa.",
        confirm: "Mayar da shi",
        notesLabel: "Abin da mai bukata dole ya canja",
        successTitle: "An mayar wa mai bukata",
        successBody: "An sanar da su kuma za su iya sabunta bukatarsu.",
      },
      rejectSheet: {
        title: "A ƙi {name}?",
        body:
          "Bukatar za ta rufe a matsayin ba a amince ba kuma za a gaya wa mai bukata. Ka faɗi dalili: shi ne kawai bayanin da za su samu.",
        confirm: "Ee, ka ƙi",
        notesLabel: "Dalili ga mai bukata",
        successTitle: "An ƙi bukata",
        successBody: "An sanar da mai bukata kuma hukuncin na cikin audit log.",
      },
    },

    listings: {
      title: "Nazarin jeri",
      lede:
        "Amincewa na nufin abin da aka aika ya cika jerin shigar. Bugawa shi ne mataki na biyu, daban, wanda ke saka shi cikin bincike na kowa. Mayar da ɗaya yana gaya wa wakili ainihin layin da zai gyara.",
      emptyTitle: "Babu jeri da ke jira",
      emptyBody: "An kula da kowane abin da aka aika. Sababbi za su bayyana nan yayin da wakilai ke aika su.",
      propertyType: {
        apartment: "Gida mai ɗaki",
        hotel: "Otal",
        home: "Muhalli",
        villa: "Villa",
        shortlet: "Shortlet",
        rental: "Haya",
        shop: "Shago",
        office: "Ofis",
        land: "Fili",
      },
      checklistLines: "Layukan jerin dubawa {count} da za a duba",
      checklistLineOne: "Layin jerin dubawa ɗaya da za a duba",
      submittedWhen: "An aika {when}",
      locationMissing: "Ba a bayar da wuri ba",
      perYear: "kowace shekara",
      perNight: "kowane dare",
      photoAlt: "{title}, hoto {number}",
      checklistTitle: "Jerin dubawar shiga",
      checks: {
        photoCount: "Hotuna huɗu ko fiye",
        cover: "An sa hoton gaba",
        titleCase: "Take da manyan haruffa daidai",
        place: "An rubuta yanki da birni",
        price: "An rubuta farashi da naira",
        rooms: "An rubuta ɗakunan kwana da wanka",
        amenities: "An zaɓi kayan more rayuwa",
        description: "Bayani na kalmomi 40 ko fiye",
        clean: "Babu lambar tuntuɓa ko biya cikin rubutun",
      },
      submission: "Abin da aka aika",
      fields: {
        agent: "Wakili",
        capacity: "Yawan da yake ɗauka",
        address: "Adireshi",
        amenities: "Kayan more rayuwa",
        description: "Bayani",
        lastNote: "Bayanin mai nazari na ƙarshe",
        lastReviewed: "Nazari na ƙarshe",
      },
      capacity: "Baƙi {guests}, ɗakunan kwana {bedrooms}, gadaje {beds}, ɗakunan wanka {bathrooms}",
      amenitiesSelected: "{count} da aka zaɓa",
      liveInSearch: "Yana aiki cikin bincike.",
      closed: "An rufe.",
      approve: "Amince",
      publish: "Buga",
      requestChanges: "Nemi canji",
      reject: "Ƙi",
      approveSheet: {
        title: "A amince da {title}?",
        body:
          "Amincewa na nufin abin da aka aika ya wuce nazari. Bai riga ya sa jerin gaban baƙi ba: bugawa shi ne mataki na biyu daban, don kada wani abu ya fara aiki ba tare da niyya ba.",
        confirm: "Ee, ka amince",
        notesLabel: "Bayani ga wakili",
        successTitle: "An amince da jeri",
        successBody: "An gaya wa wakilin. Ka buga shi idan ka shirya baƙi su gani.",
      },
      publishSheet: {
        title: "A buga {title}?",
        body:
          "Wannan yana saka jerin cikin bincike na kowa nan take, inda kowa zai iya samu ya ajiye. Ana gaya wa wakilin cewa yana aiki.",
        confirm: "Ee, ka buga shi",
        notesLabel: "Bayani ga wakili",
        successTitle: "Jerin yana aiki",
        successBody: "Yanzu yana cikin bincike kuma an sanar da wakilin.",
      },
      changesSheet: {
        title: "A nemi canji daga wakili?",
        body:
          "Jerin zai koma canjin da aka nema kuma za a gaya wa wakilin ainihin abin da zai gyara. Ka nuna layin jerin dubawa da bai cika ba.",
        confirm: "Mayar da shi",
        notesLabel: "Abin da wakili dole ya canja",
        successTitle: "An mayar wa wakilin",
        successBody: "An sanar da su kuma za su iya sabunta jerin.",
      },
      rejectSheet: {
        title: "A ƙi {title}?",
        body: "Jerin zai rufe a matsayin ba a amince ba kuma ba za a iya ajiye shi ba. Ana gaya wa wakilin, don haka ka faɗi dalili.",
        confirm: "Ee, ka ƙi",
        notesLabel: "Dalili ga wakili",
        successTitle: "An ƙi jeri",
        successBody: "An sanar da wakilin kuma hukuncin na cikin audit log.",
      },
    },

    support: {
      title: "Tallafi",
      lede:
        "Abubuwan da aka ɗaga suna ɗauke da suna da imel kaɗai da mutumin ya ba mu. Amsarka tana sanar da su a dandalin nan take.",
      emptyTitle: "Babu tikiti",
      emptyBody: "Ba wanda ya buƙaci ɗagawa. Tikiti na iso nan idan mataimaki bai iya amsa ba.",
      generalQuestion: "Tambaya ta gama gari",
      threadCount: "Saƙonni {count} cikin zaren",
      threadCountOne: "Saƙo ɗaya cikin zaren",
      allTickets: "Duk tikiti",
      whoFiled: "Wanda ya shigar da shi",
      fields: { name: "Suna", email: "Imel", account: "Asusu", filed: "An shigar" },
      signedInWhenFiled: "Ya shiga lokacin da ya shigar da shi",
      noAccountAttached: "Babu asusun da aka haɗa",
      whatTheyAsked: "Abin da suka tambaya",
      supportSender: "Tallafin RentMe",
      waitingOnUs: "Yana jiran mu",
      noneWaitingHeading: "Babu tikitin da ke jiran mu",
      nothingWaitingTitle: "Babu abin da ke jira",
      nothingWaitingBody: "An amsa kowane tikiti kuma an rufe shi.",
      reply: {
        label: "Amsa wannan mutum",
        placeholder: "Ka amsa a fili ka faɗi abin da zai biyo baya.",
        send: "Aika amsa",
        sending: "Ana aikawa",
        sent: "An aika amsa. An sanar da su a dandalin.",
        note: "Aikawa yana sanar da mai tikitin a dandalin.",
      },
      stateLabel: "Matsayin tikiti",
      states: {
        open: "A buɗe",
        pending: "Ana jiran amsa",
        resolved: "An warware",
        closed: "An rufe",
      },
    },

    bookings: {
      title: "Zaman baƙi",
      lede:
        "Kowane zama a kan dandalin, da kuma wuri guda inda za a iya soke zaman da aka biya a mayar da kuɗin. Jadawalin da aka wallafa shi ke tsara adadin. Kai kawai kana zaɓar dalili.",
      searchLabel: "Nemo zama",
      searchPlaceholder: "Lambar ajiye, ko wani sashe na sunan jeri",
      search: "Nema",
      clearSearch: "Nuna komai",
      noMatchTitle: "Babu abin da ya dace da hakan",
      noMatchBody: "Duba lambar ajiye, ko ka nemi wani sashe na sunan jeri a maimako.",
      emptyTitle: "Babu zama tukuna",
      emptyBody:
        "Zaman baƙi na bayyana nan da zarar baƙo ya yi ajiye. Babu abin da ke jiran ka a wannan shafin.",
      groups: {
        live: "Mai gudana da mai zuwa",
        past: "Ya riga ya ƙare",
        cancelled: "An soke",
      },
      open: "Buɗe wannan zaman",
      back: "Duk zaman baƙi",
      goneTitle: "Wannan zaman ba ya nan",
      goneBody: "Koma jeri ka ga abin da ke nan yanzu.",
      nights: "Dare {count}",
      nightsOne: "Dare 1",
      party: "Manya {adults}, yara {children}",
      partyAdultsOnly: "Manya {adults}",
      settledChip: "An biya {amount}",
      unpaidChip: "Ba a biya komai tukuna",
      refundedChip: "An mayar da {amount}",
      bookedWhen: "An yi ajiye {when}",
      fields: {
        reference: "Lamba",
        listing: "Jeri",
        host: "Mai gida",
        guest: "Baƙo",
        arriving: "Wanda zai iso",
        arrivingPhone: "Lambar wayarsa",
        arrivingEmail: "Imel ɗinsa",
        dates: "Kwanaki",
        length: "Tsawo",
        party: "Baƙi",
        perNight: "Kowane dare",
        cleaning: "Tsaftacewa",
        service: "Sabis",
        subtotal: "Ƙaramin jimla",
        total: "Jimlar zaman",
        settled: "An biya har yanzu",
        returned: "An riga an mayar",
        status: "Matsayi",
      },
      sections: {
        stay: "Zaman",
        money: "Kuɗi",
        people: "Mutane",
        payments: "Biyan kuɗi",
        history: "Tarihi",
        refunds: "Mayar da kuɗin da aka riga aka yanke",
      },
      noPayments: "Babu wanda ya biya wannan zaman tukuna.",
      noRefunds: "Ba a yanke hukuncin mayar da kuɗi a kan wannan zaman ba.",
      refundLine: "{refund} zuwa ga baƙo, {retained} ya rage wa mai gida.",
      decidedBy: "{who}, {when}",
      unnamed: "Ba a ba da suna ba",
      cancel: "Soke wannan zaman",
      cancelledAlready: "An soke wannan zaman. Hukuncin yana cikin audit log.",
      pastNote:
        "Wannan zaman ya ƙare. Soke shi yanzu zai saki darare da babu wanda zai sake ajiye su, don haka ba a bayar da shi anan. Ka mayar da kuɗin ta hanyar tallafi idan wani abu ya lalace.",
      reasons: {
        guest_choice: "Baƙo ne ke sokewa",
        host_cancelled: "Mai gida ne ya soke",
        not_as_listed: "Wurin bai yi kama da abin da aka jera ba",
        no_access: "Baƙo bai iya shiga ba",
      },
      sheet: {
        title: "A soke wannan zaman?",
        body:
          "Kwanakin za su sake buɗewa nan take, kuma duk abin da ake bin ku zai shiga walat ɗin baƙo a cikin ma'amala guda. Adadin yana fitowa daga jadawalin da aka wallafa, ba daga wata lamba da aka rubuta anan ba.",
        reasonLabel: "Me ya sa ake soke wannan zaman",
        working: "Ana ƙididdige abin da ake bin ku",
        owed: "{refund} zai koma ga baƙo.",
        kept: "{retained} zai rage wa mai gida.",
        nothingPaid: "Ba a taɓa biyan komai don wannan zaman ba, don haka babu kuɗin da ke motsi.",
        confirm: "Soke ka mayar da kuɗi",
        notesLabel: "Abin da aka tabbatar",
        successTitle: "An soke zaman",
        successBody:
          "Darare sun koma kan kalanda, kuɗin yana cikin walat ɗin baƙo, kuma baƙo yana da adadin da dalilin a rubuce.",
      },
    },

    switches: {
      // NATIVE REVIEW: "switch" kept in English throughout this surface.
      title: "Switch",
      lede:
        "Ka kashe wani sashe a duk RentMe ba tare da sabon deploy ba, sannan ka kunna shi idan matsalar ta ƙare. Ba a share komai ko ta yaya.",
      warning:
        "Kashe wani sashe yana cire shi ga kowa nan take, har da mutanen da ke tsakiyar amfani da shi. Ana kiyaye aikin da aka ajiye. Shafuka suna ɗaukar canjin cikin kusan daƙiƙa talatin. Ana rubuta kowane juyi a audit log da sunanka a kansa.",
      on: "A kunne",
      off: "A kashe",
      defaultNote: "Sashen RentMe da ake iya kashewa.",
      switchingOff: "Kashe shi: {consequence}",
      lastChanged: "Canji na ƙarshe {when}",
      switchOn: "Kunna",
      switchOff: "Kashe",
      labels: {
        bookings: "Ajiye",
        wallet: "Walat",
        messaging: "Saƙonni",
        assistant: "Mataimaki",
        support: "Tallafi",
        agent_listings: "Jerin wakilai",
        hybrid_hotels: "Otal na abokan haɗin gwiwa",
        hybrid_restaurants: "Gidan abinci na abokan haɗin gwiwa",
      },
      consequences: {
        bookings: "Baƙi ba za su iya ajiye ko soke zama ba. Ba a taɓa ajiyen da ke akwai.",
        wallet: "Shigar da kuɗi, cirewa da tura kuɗi za su tsaya. Ba a taɓa ma'auni da tarihi.",
        messaging:
          "Baƙi ba za su iya tura saƙo ga wakilai ba kuma wakilai ba za su iya amsa ba. Zaren baya sun kasance ana karantawa.",
        assistant: "Mataimaki zai daina amsa. Mutane har yanzu za su iya nema su duba.",
        support: "Hirar tallafi za ta daina shigar da sababbin tikiti. Tikitin da ke buɗe sun kasance a buɗe.",
        agent_listings: "Wakilai ba za su iya ƙirƙira ko gyara jeri ba. Jerin da ke aiki sun ci gaba da aiki.",
        hybrid_hotels:
          "Otal na abokan haɗin gwiwa za su fita daga bincike. Wuraren zama namu sun kasance.",
        hybrid_restaurants: "Gidajen abinci na abokan haɗin gwiwa za su fita daga bincike.",
        generic: "Wannan sashen zai ɓace ga kowa har sai an sake kunna shi.",
      },
      sheet: {
        title: "A kashe {label}?",
        body:
          "Kowa zai rasa wannan sashen RentMe nan take, har da mutanen da ke tsakiyar amfani da shi. Ba a share abin da aka ajiye ba, kuma sake kunna shi yana mayar da sashen. Canjin yana kai kowane shafi cikin kusan daƙiƙa talatin.",
        confirm: "Ee, ka kashe shi",
        successTitle: "An kashe",
        successBody: "Sashen a kashe ne ga kowa kuma canjin na cikin audit log.",
      },
    },
  },

  a11y: {
    logoHome: "Gidan RentMe",
    expand: "Buɗe",
    collapse: "Rufe",
    openMenu: "Buɗe menu",
    closeMenu: "Rufe menu",
    languageSwitcher: "Canza harshe",
    favourite: "Ajiye cikin abubuwan so",
    quickAccess: "Isa da sauri",
    notificationsUnread: "Sanarwa, {count} da ba a karanta ba",
    unreadOn: "{label}, sanarwa {count} da ba a karanta ba",
  },
};
