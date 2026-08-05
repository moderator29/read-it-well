import type { Dictionary } from "./en";

/**
 * Yorùbá.
 *
 * NEEDS NATIVE REVIEW BEFORE LAUNCH. These strings are functional and carry the
 * correct diacritics, but marketing copy in particular should be rewritten by a
 * native speaker rather than translated literally. Tracked in KNOWN_GAPS.md.
 */
export const yo: Dictionary = {
  meta: { localeName: "Yoruba", localeNativeName: "Yorùbá", dir: "ltr" },

  common: {
    search: "Wá",
    signIn: "Wọlé",
    signUp: "Forúkọsílẹ̀",
    signOut: "Jáde",
    viewAll: "Wo gbogbo rẹ̀",
    seeAll: "Wo gbogbo rẹ̀",
    back: "Padà",
    next: "Tókàn",
    continue: "Tẹ̀síwájú",
    loading: "Ń gbéwọlé",
    perNight: "fún alẹ́ kan",
    night: "alẹ́",
    year: "ọdún",
    reviews: "àtúnyẹ̀wò",
    verified: "Tí fọwọ́sí",
    skipToContent: "Fò sí àkóónú",
  },

  nav: {
    home: "Ilé",
    hotels: "Hòtẹ́lì",
    apartments: "Fúláàtì",
    homes: "Ilé gbígbé",
    rent: "Yíyà ilé",
    restaurants: "Ilé oúnjẹ",
    experiences: "Ìrírí",
    services: "Iṣẹ́ ìsìn",
    properties: "Ohun ìní",
    bookings: "Ìfipamọ́",
    messages: "Àpótí Ìránṣẹ́",
    wallet: "Àpò owó",
    aiAssistant: "Olùrànlọ́wọ́ AI",
    profile: "Àkọọ́lẹ̀",
    settings: "Ètò",
    explore: "Ṣàwárí",
    saved: "Tí a fipamọ́",
    around: "Agbègbè",
    map: "Máàpù",
    primaryLabel: "Àkọ́kọ́",
    accountLabel: "Àkàǹtì",
    notifications: "Ìfitónilétí",
    places: "Àwọn ibi",
    people: "Àwọn ènìyàn",
    agentMode: "Ipò Aṣojú",
    consoleLabel: "Ìdarí",
    workspacesLabel: "Àwọn ibi iṣẹ́",
  },

  landing: {
    navHome: "Ilé",
    hero: {
      line1: "Wá a.",
      line2: "Fi pamọ́.",
      line3: "Gbé e.",
      subtitle:
        "Pátákó rẹ kan ṣoṣo fún ilé, hòtẹ́lì, ilé oúnjẹ, ìrírí àti púpọ̀ sí i.",
      searchPlaceholder: "Ibo ni o fẹ́ lọ?",
      searchLabel: "Wá àwọn ibi jákèjádò Nàìjíríà",
      popularLabel: "Gbajúmọ̀ báyìí",
    },
    vision: {
      overline: "Ìran wa",
      title: "Nàìjíríà ní àtẹ́lẹwọ́ rẹ. Áfíríkà tẹ̀lé.",
      body: "RentMe ń kọ́ ilé tí a lè gbẹ́kẹ̀lé fún ìwádìí, ibùgbé, oúnjẹ àti ìrírí ní gbogbo Nàìjíríà, àti kọ́ńtínẹ́ǹtì náà. Àkọọ́lẹ̀ kan, àpamọ́wọ́ kan, olùrànlọ́wọ́ kan.",
      missionOverline: "Iṣẹ́ àpinnu wa",
      missionTitle: "Jẹ́ kí wíwá àti ìforúkọsílẹ̀ ohunkóhun rọrùn àti ní ààbò.",
      missionBody: "Àwọn ibi tí a ti mọ̀, iye tòótọ́ ní naira, àtúnyẹ̀wò tòótọ́, àti olùrànlọ́wọ́ tí ó lóye ohun tí o fẹ́.",
      points: {
        verified: { title: "Ìdánimọ̀ ṣáájú", body: "A ń ṣàyẹ̀wò gbogbo àkọsílẹ̀ àti aṣojú kí ó tó jáde." },
        naira: { title: "Iye ní naira", body: "Àpapọ̀ tí ó ye kooro, láìsí ìyàlẹ́nu tàbí owó tí a fi pamọ́." },
        everywhere: { title: "Ìpínlẹ̀ mẹ́rìndínlógójì", body: "Jákèjádò orílẹ̀-èdè láti ọjọ́ kìíní." },
        assistant: { title: "AI tí ó ń ràn ọ́ lọ́wọ́", body: "Béèrè ní èdè tí ó rọrùn kí o sì rí ibi gidi." },
      },
    },
    stats: {
      hotels: "Hòtẹ́lì",
      apartments: "Fúláàtì",
      restaurants: "Ilé oúnjẹ",
    },
    features: {
      ai: { title: "Olùrànlọ́wọ́ AI", body: "Ìrànlọ́wọ́ ọlọ́gbọ́n, wákàtí mẹ́rìnlélógún" },
      verified: { title: "Àtòjọ tí fọwọ́sí", body: "Ìgbẹ́kẹ̀lé àti ààbò" },
      prices: { title: "Owó tó dára jù", body: "Fi owó pamọ́ sí i" },
      booking: { title: "Ìfipamọ́ rọrùn", body: "Kíákíá àti rọrùn" },
    },
    trust: {
      multiLanguage: { title: "Èdè púpọ̀", body: "EN / YO / HA / IG" },
      secure: { title: "Ààbò & Ìgbẹ́kẹ̀lé", body: "Ààbò rẹ ni àkọ́kọ́ wa" },
      ai: { title: "Agbára AI", body: "Ìrírí ọlọ́gbọ́n" },
      africa: { title: "Fún Áfíríkà", body: "Tí a kọ́ pẹ̀lú ìfẹ́ ❤️" },
      stores: { title: "Wà lórí", body: "App Store & Play Store" },
    },
    categories: {
      title: "Gbogbo rẹ̀, ní ibì kan",
      subtitle: "Ọ̀nà márùn-ún láti ṣàwárí Nàìjíríà. Àkàǹtì kan, àpò owó kan.",
    },
    cta: {
      title: "Ṣé o ti ṣetán láti wá ibi tókàn rẹ?",
      subtitle: "Dara pọ̀ mọ́ ẹgbẹẹgbẹ̀rún tó ń ṣàwárí ibùgbé, oúnjẹ àti ìrírí.",
      action: "Bẹ̀rẹ̀ lọ́fẹ̀ẹ́",
      secondary: "Wò ó láìní àkàǹtì",
    },
    footer: {
      tagline: "Wá a. Fi pamọ́. Gbé e. Ní Nàìjíríà.",
      rights: "Gbogbo ẹ̀tọ́ ni a fi pamọ́.",
      product: "Ọjà",
      company: "Ilé iṣẹ́",
      support: "Ìtìlẹ́yìn",
      legal: "Òfin",
      about: "Nípa wa",
      careers: "Iṣẹ́",
      help: "Ibùdó ìrànlọ́wọ́",
      contact: "Kàn sí wa",
      privacy: "Àṣírí",
      terms: "Àdéhùn",
      becomeAgent: "Di aṣojú",
    },
  },

  auth: {
    welcomeBack: "Káàbọ̀ padà",
    signInToContinue: "Wọlé láti tẹ̀síwájú",
    createAccount: "Ṣẹ̀dá àkàǹtì rẹ",
    signUpToStart: "Bẹ̀rẹ̀ ìṣàwárí ní ìṣẹ́jú kan",
    orContinue: "tàbí tẹ̀síwájú pẹ̀lú",
    continueWithEmail: "Tẹ̀síwájú pẹ̀lú Ímeèlì",
    continueWithGoogle: "Tẹ̀síwájú pẹ̀lú Google",
    continueWithApple: "Tẹ̀síwájú pẹ̀lú Apple",
    continueWithX: "Tẹ̀síwájú pẹ̀lú X",
    orDivider: "tàbí",
    emailLabel: "Àdírẹ́sì ímeèlì",
    emailPlaceholder: "iwo@apeere.com",
    passwordLabel: "Ọ̀rọ̀ ìpamọ́",
    passwordPlaceholder: "Ó kéré tán lẹ́tà mẹ́jọ",
    fullNameLabel: "Orúkọ kíkún",
    fullNamePlaceholder: "Orúkọ rẹ",
    forgotPassword: "Ṣé o gbàgbé ọ̀rọ̀ ìpamọ́?",
    noAccount: "Ṣé o kò ní àkàǹtì?",
    haveAccount: "Ṣé o ti ní àkàǹtì?",
    termsNotice: "Nípa títẹ̀síwájú o gbà pẹ̀lú Àdéhùn àti Ìlànà Àṣírí wa.",
    providerUnavailable: "Ọ̀nà ìwọlé yìí kò tíì ṣetán.",
    backToHome: "Padà sí ilé",
    otherWays: "Àwọn ọ̀nà mìíràn láti tẹ̀síwájú",
  },

  home: {
    greeting: "Káàbọ̀ padà",
    prompt: "Ibo ni o ń lọ lónìí?",
    searchPlaceholder: "Wá ibi, hòtẹ́lì, ilé oúnjẹ",
    locationLabel: "Ibi tí o wà",
    recommended: "A dábàá fún ọ",
    topExperiences: "Ṣàwárí ìrírí tó ga jù",
    nearby: "Nítòsí rẹ",
    aiCard: {
      title: "RentMe AI",
      body: "Ọ̀rẹ́ ìrìnàjò ọlọ́gbọ́n rẹ. Béèrè ohunkóhun ní èdè tí ó rọrùn.",
      action: "Béèrè lọ́wọ́ olùrànlọ́wọ́",
      samplePrompt: "Yàrá méjì ní Lekki lábẹ́ 300k pẹ̀lú adágún",
    },
    agentCard: {
      title: "Di Aṣojú RentMe",
      body: "Ṣàtòjọ ohun ìní rẹ, ṣàkóso ìfipamọ́, kí o sì gbé iṣẹ́ rẹ ga.",
      action: "Di aṣojú",
    },
    experienceCategories: {
      beach: "Ibùdó etí òkun",
      city: "Ìrìn àjò ìlú",
      dining: "Oúnjẹ dáadáa",
      adventure: "Ìrìn wàhálà",
      events: "Ayẹyẹ",
    },
  },

  agent: {
    mode: {
      personal: "Ipo Ara-ẹni",
      agent: "Ipo Aṣojú",
      switchToAgent: "Yipada si Ipo Aṣojú",
      switchToPersonal: "Yipada si Ipo Ara-ẹni",
      manageSub: "Ṣakoso atokọ àti èrè rẹ",
      chooseTitle: "Yan ipo rẹ",
      chooseSub: "Yipada laarin awọn ipo nigbakigba",
      personalDesc: "Ṣawari ki o si fi awọn ibi iyanu pamọ jákèjádò Nàìjíríà.",
      agentDesc: "Ṣakoso atokọ, ìfipamọ́, onibara àti èrè rẹ.",
      verifiedAgent: "Aṣojú Tí Fọwọ́sí",
      visitor: "O kò wọlé gẹ́gẹ́ bí aṣojú",
      signInToWorkspace: "Wọlé",
      workspaceLabel: "Ibi iṣẹ́ aṣojú",
      notApproved: "Ìbéèrè aṣojú rẹ wa labẹ atunyẹwo.",
    },
    nav: {
      dashboard: "Pátákó",
      money: "Owó",
      myListings: "Atokọ Mi",
      listApartment: "Ṣàtòjọ Fúláàtì",
      bookings: "Ìfipamọ́",
      messages: "Àpótí Ìránṣẹ́",
      reviews: "Àtúnyẹ̀wò",
      earnings: "Èrè",
      analytics: "Ìtúpalẹ̀",
      verification: "Ìfọwọ́sí",
      settings: "Ètò",
    },
    join: {
      title: "Dara pọ̀ mọ́ Àwùjọ Aṣojú RentMe",
      body: "Ṣàtòjọ ohun ìní, so pọ̀ mọ́ àwọn àlejò tí fọwọ́sí, ṣàkóso ìfipamọ́ kí o sì jèrè.",
      start: "Bẹrẹ ìbéèrè",
      resume: "Tẹsiwaju ìbéèrè",
      whatYouGet: "Ohun tí o ń rí gbà",
      benefitReach: "Dé ọ̀dọ̀ ẹgbẹẹgbẹ̀rún àlejò tí fọwọ́sí",
      benefitTools: "Àwọn irinṣẹ́ atokọ àti ìfipamọ́ ọ̀jọ̀gbọ́n",
      benefitEarn: "Tọpa èrè kí o sì gba owó láìséwu",
    },
    apply: {
      title: "Di Aṣojú",
      draftSaved: "A ti fi àkọ̀wé pamọ́ sórí ẹ̀rọ yìí",
      next: "Tókàn",
      back: "Padà",
      submit: "Fi ìbéèrè ránṣẹ́",
      submitting: "Ń fi ránṣẹ́",
      agentType: "Irú aṣojú",
      individual: "Ẹnìkọ̀ọ̀kan",
      individualDesc: "Ìwọ fúnra rẹ ló ń ṣàtòjọ tí o sì ń ṣàkóso ohun ìní.",
      business: "Ilé-iṣẹ́",
      businessDesc: "O ń ṣojú fún ilé-iṣẹ́ tí a forúkọsílẹ̀.",
      steps: {
        personal: "Ìwífún Ara-ẹni",
        identity: "Ìfọwọ́sí Ìdánimọ̀",
        business: "Ìwífún Ilé-iṣẹ́",
        documents: "Ìgbésókè Àwọn Ìwé",
        payout: "Àlàyé Báńkì / Owó",
        review: "Àtúnyẹ̀wò & Fífiránṣẹ́",
      },
      fields: {
        firstName: "Orúkọ àkọ́kọ́",
        lastName: "Orúkọ ìdílé",
        phone: "Nọ́mbà fóònù",
        idType: "Irú ìdánimọ̀",
        idNumber: "Nọ́mbà ìdánimọ̀",
        nin: "Nọ́mbà Ìdánimọ̀ Orílẹ̀-èdè (NIN)",
        bvn: "Nọ́mbà Ìfọwọ́sí Báńkì (BVN)",
        businessName: "Orúkọ ilé-iṣẹ́",
        rcNumber: "Nọ́mbà RC (àṣàyàn)",
        state: "Ìpínlẹ̀",
        city: "Ìlú",
        address: "Àdírẹ́sì",
        bankName: "Báńkì",
        accountNumber: "Nọ́mbà àkàǹtì",
        accountName: "Orúkọ àkàǹtì",
        agreeTerms: "Mo gba Àdéhùn Aṣojú RentMe àti Ìlànà Owó.",
      },
      documents: {
        title: "Gbé àwọn ìwé rẹ sókè",
        body: "Ìdánimọ̀ ìjọba jẹ́ dandan. Àwọn aṣojú ilé-iṣẹ́ tún ń gbé ìforúkọsílẹ̀ sókè.",
        idFront: "Káàdì ìdánimọ̀, iwájú",
        idBack: "Káàdì ìdánimọ̀, ẹ̀yìn",
        registration: "Ìforúkọsílẹ̀ ilé-iṣẹ́",
        upload: "Gbé sókè",
        chooseFile: "Yan fáìlì, PNG tàbí JPG tàbí PDF, dé 5MB",
      },
      review: {
        title: "Àtúnyẹ̀wò kí o sì fi ránṣẹ́",
        body: "Ṣàyẹ̀wò àlàyé rẹ. O lè padà sí ìgbésẹ̀ èyíkéyìí láti ṣàtúnṣe.",
        editStep: "Ṣàtúnṣe",
      },
    },
    status: {
      submittedTitle: "A ti fi ìbéèrè ránṣẹ́",
      submittedBody: "À ń ṣàyẹ̀wò ìbéèrè rẹ. A ó sọ fún ọ nígbà tí a bá fọwọ́sí i.",
      status: "Ipò",
      draft: "Àkọ̀wé",
      pendingReview: "Ń dúró de Àtúnyẹ̀wò",
      underReview: "Labẹ Àtúnyẹ̀wò",
      moreInfo: "A Nílò Ìwífún Síwájú",
      approved: "Tí fọwọ́sí",
      rejected: "Tí kọ̀",
      submittedOn: "Fi ránṣẹ́ ní",
      applicationId: "ID ìbéèrè",
      reviewNote: "Ẹgbẹ́ wa máa ń ṣàyẹ̀wò àwọn ìbéèrè láàrin wákàtí 24 sí 48.",
      backHome: "Padà sí ilé",
      enterAgent: "Wọ Ipo Aṣojú",
      signedOutTitle: "Wọlé láti rí ìbéèrè rẹ",
      signedOutBody:
        "Ìbéèrè rẹ àti nọ́mbà rẹ̀ so mọ́ àkántì rẹ, nítorí náà a gbọ́dọ̀ mọ ẹni tí o jẹ́ kí a tó fi wọ́n hàn.",
      signIn: "Wọlé",
      noneTitle: "Kò sí ìbéèrè kankan",
      noneBody:
        "O kò tí ì bẹ̀rẹ̀ ìbéèrè láti di aṣojú. Ó máa gba nǹkan bí ìṣẹ́jú mẹ́wàá, o sì nílò ìwé ìdánimọ̀ kan.",
      startApplication: "Bẹ̀rẹ̀ ìbéèrè aṣojú",
      unconfiguredTitle: "Ìbéèrè kò tíì ṣí síbí",
      unconfiguredBody:
        "Ojú-ìwé yìí máa fi ìbéèrè rẹ gidi hàn ní kété tí àwọn kọ́kọ́rọ́ pèpéle bá dé. Kò sí ohun tí o ti fi ránṣẹ́ tí yóò sọnù.",
      reviewedOn: "Ìpinnu ní",
      reviewerNote: "Ohun tí olùyẹ̀wò sọ",
    },
    dashboard: {
      title: "Pátákó Aṣojú",
      subtitle: "Àkọ́sórí iṣẹ́ ohun ìní rẹ",
      totalEarnings: "Àpapọ̀ Èrè",
      totalBookings: "Àpapọ̀ Ìfipamọ́",
      activeListings: "Atokọ Tí Ń Ṣiṣẹ́",
      occupancyRate: "Ìwọ̀n Gbígbé",
      responseRate: "Ìwọ̀n Ìdáhùn",
      earningsOverview: "Àkọ́sórí Èrè",
      recentBookings: "Ìfipamọ́ Àìpẹ́",
      bookingSources: "Orísun Ìfipamọ́",
      listingPerformance: "Iṣẹ́ Atokọ",
      guestMessages: "Ìránṣẹ́ Àlejò",
      quickActions: "Ìgbésẹ̀ Kíákíá",
      addListing: "Fi Atokọ Tuntun Kún",
      viewBookings: "Wo Ìfipamọ́",
      manageListings: "Ṣàkóso Atokọ",
      earningsReport: "Ìjábọ̀ Èrè",
      thisMonth: "Oṣù Yìí",
      lastMonth: "ní ìfiwéra oṣù tó kọjá",
      views: "Ìwòye",
      revenue: "Owó tí ń wọlé",
      confirmed: "Tí fọwọ́sí",
      pending: "Ń dúró",
      sampleNote: "Nọ́mbà tí a ṣe àpẹẹrẹ. Àwọn nọ́mbà gidi rẹ máa hàn níbí nígbà tí atokọ rẹ bá ń ṣiṣẹ́.",
    },
  },

  agentListings: {
    wizard: {
      stepsLabel: "Àwọn ìgbésẹ̀ àtòjọ",
      stepCounter: "Ìgbésẹ̀ {current} nínú {total}",
      stepAria: "Ìgbésẹ̀ {number}, {name}",
      steps: {
        basics: "Ìwífún ìpìlẹ̀",
        photos: "Àwòrán",
        location: "Ibùdó",
        amenities: "Ohun ìrọ̀rùn",
        utilities: "Iná àti omi",
        pricing: "Iye",
        guestView: "Ojú àlejò",
        submit: "Fífiránṣẹ́",
      },
      unconfiguredNotice:
        "Ìtẹ̀jáde máa ṣiṣẹ́ ní kété tí àwọn kọ́kọ́rọ́ pátákó bá dé. Tẹ̀síwájú: gbogbo ohun tí o kọ wà ní ìpamọ́ sórí ẹ̀rọ yìí, ó sì máa dúró de ọ.",
      savedAt: "A fi pamọ́ ní {time}",
      saving: "Ń fi pamọ́",
      next: "Tókàn",
      back: "Padà",
      myListings: "Àtòjọ mi",
    },

    basics: {
      titleLabel: "Àkọlé àtòjọ",
      titleHint: "Ohun tí àlejò kọ́kọ́ rí. Sọ orúkọ ibi náà àti ohun tó dára nínú rẹ̀.",
      titlePlaceholder: "Fúláàtì yàrá méjì tó mọ́lẹ̀ ní Lekki Phase 1",
      propertyTypeLabel: "Irú ohun ìní",
      rentalNote:
        "Ilé yíyà jẹ́ ọjà ọdọọdún: ìwọ ló ń pinnu owó ilé fún ọdún kan, àwọn àlejò máa fi ìránṣẹ́ sí ọ, wọ́n máa wá yẹ ilé wò, lẹ́yìn náà wọ́n máa san owó. Kò sí ìfipamọ́ alẹ́ kan lórí ilé yíyà.",
      descriptionLabel: "Àpèjúwe",
      descriptionHint: "{words} nínú ọ̀rọ̀ {min}. Ṣàpèjúwe àwọn yàrá, àdúgbò àti ohun tó wà nítòsí.",
      descriptionPlaceholder:
        "Sọ fún àwọn àlejò nípa àyè náà, ìmọ́lẹ̀ rẹ̀, ilé ìdáná, àdúgbò àti bí wọ́n ṣe lè rìn kiri.",
      counters: {
        guests: "Àlejò",
        bedrooms: "Yàrá ìbùsùn",
        beds: "Ibùsùn",
        bathrooms: "Yàrá ìwẹ̀",
      },
      counterFewer: "Dín {label} kù ní ọ̀kan",
      counterMore: "Fi ọ̀kan kún {label}",
    },

    propertyTypes: {
      apartment: {
        label: "Fúláàtì",
        blurb: "Fúláàtì tó pé fúnra rẹ̀ tí a yá ní alẹ́ kan.",
      },
      shortlet: {
        label: "Shortlet",
        blurb: "Ibùgbé tí ó ní ohun èlò fún alẹ́ díẹ̀ tàbí ọ̀sẹ̀ díẹ̀.",
      },
      home: { label: "Ilé", blurb: "Ilé pátápátá tí àwọn àlejò yá ní alẹ́ kan." },
      villa: { label: "Villa", blurb: "Ilé ńlá aládàáni pẹ̀lú àgbàlá." },
      hotel: { label: "Hòtẹ́lì", blurb: "Àwọn yàrá nínú ilé tí a ń ṣàkóso." },
      rental: {
        label: "Ilé yíyà",
        blurb: "Ilé tí a yá lọ́dọọdún. Iye rẹ̀ fún ọdún kan, a yẹ̀ ẹ́ wò kí a tó san owó.",
      },
      shop: { label: "Ṣọ́ọ̀bù", blurb: "Àyè ìtajà tí a yá lọ́dọọdún." },
      office: { label: "Ọ́fíìsì", blurb: "Àyè iṣẹ́ tí a yá lọ́dọọdún." },
      land: { label: "Ilẹ̀", blurb: "Ilẹ̀ kan, owó rẹ̀ jẹ́ ti ọdún." },
    },

    photos: {
      intro:
        "Fi ó kéré tán àwòrán {min} kún, dé {max}. Èyí àkọ́kọ́ ni ìbòjú, nítorí náà bẹ̀rẹ̀ pẹ̀lú àwòrán fífẹ̀ tó ń tà ibi náà.",
      tooNarrow: "Àwòrán gbọ́dọ̀ fẹ̀ tó {width}px kí ó lè hàn kedere lórí gbogbo ojú ẹ̀rọ.",
      choose: "Yan àwòrán",
      addMore: "Fi àwòrán kún",
      uploading: "Ń gbé sókè",
      progress: "{count} nínú {min} tí a nílò",
      empty: "Kò sí àwòrán síbẹ̀. Ìmọ́lẹ̀ ọ̀sán, ìwò fífẹ̀ àti yàrá mímọ́ ni ó ń ṣe iṣẹ́ jù.",
      cover: "Ìbòjú",
      makeCover: "Sọ di ìbòjú",
      remove: "Yọ kúrò",
      ceiling: "Àtòjọ kan gba àwòrán {max} péré.",
      notAnImage: "Àwòrán gbọ́dọ̀ jẹ́ fáìlì àwòrán, bí i JPG tàbí PNG.",
      notPrepared:
        "A kò lè múra àwòrán náà láìséwu, nítorí náà a kò gbé e sókè. Gbìyànjú àwòrán mìíràn.",
      uploadFailed: "Àwòrán náà kò parí ìgbésókè. Jọ̀wọ́ gbìyànjú lẹ́ẹ̀kan sí i.",
      needsKeys:
        "Àwòrán máa gbéra sókè ní kété tí àwọn kọ́kọ́rọ́ pátákó bá dé. Gbogbo ohun mìíràn tí o ti kọ wà ní ìpamọ́.",
      needsTitle:
        "Kọ àkọlé ní ìgbésẹ̀ kìíní kọ́kọ́, lẹ́yìn náà àwọn àwòrán rẹ máa so mọ́ àtòjọ yìí.",
    },

    location: {
      stateLabel: "Ìpínlẹ̀",
      statePlaceholder: "Yan ìpínlẹ̀",
      cityLabel: "Ìlú",
      cityPlaceholder: "Lagos",
      areaLabel: "Àdúgbò",
      areaHint: "Àdúgbò tí àwọn àlejò ń wá.",
      areaPlaceholder: "Lekki Phase 1",
      addressLabel: "Àdírẹ́sì ilé",
      addressHint:
        "A fi pamọ́ ní àṣírí títí a bá fọwọ́sí ìfipamọ́ tàbí kí ìwọ fúnra rẹ pín in nínú ìfọ̀rọ̀wérọ̀.",
      addressPlaceholder: "12 Admiralty Way",
      landmarkLabel: "Àmì ibi",
      landmarkHint: "Ohun kan nítòsí tó jẹ́ kí ó rọrùn láti rí ibi náà.",
      landmarkPlaceholder: "Ní òdìkejì ọ̀nà àyíká Lekki",
    },

    amenities: {
      intro:
        "Yan gbogbo ohun tí àlejò máa rí ní ilé náà ní tòótọ́. Àtòjọ tòótọ́ ń mú àtúnyẹ̀wò tó dára jù àtòjọ gígùn.",
      names: {
        wifi: "WiFi",
        ac: "Ẹ̀rọ atutù afẹ́fẹ́",
        tv: "TV",
        kitchen: "Ilé ìdáná",
        parking: "Ibùdó ọkọ̀",
        pool: "Adágún ìwẹ̀",
        gym: "Ilé eré ìdárayá",
        security: "Ààbò",
        elevator: "Lífítì",
        furnished: "Pẹ̀lú ohun èlò",
        balcony: "Balikoni",
        garden: "Ọgbà",
        laundry: "Ibi ìfọṣọ",
        generator: "Agbára àfẹ̀yìntì",
        water: "Omi ń ṣàn",
      },
    },

    pricing: {
      priceNightLabel: "Iye fún alẹ́ kan",
      priceYearLabel: "Owó ilé ọdọọdún",
      priceHint: "Kọ iye náà ní naira, bí àpẹẹrẹ 85,000.",
      priceWithPeriod: "{price} {period}",
      priceNightPlaceholder: "85,000",
      priceYearPlaceholder: "2,500,000",
      perNight: "fún alẹ́ kan",
      perYear: "fún ọdún kan",
      cleaningLabel: "Ìmọ́tótó",
      cleaningHint: "Àṣàyàn. A fi kún lẹ́ẹ̀kan fún ìbùgbé, kì í ṣe fún alẹ́ kọ̀ọ̀kan.",
      cleaningHintSet: "{amount} tí a fi kún lẹ́ẹ̀kan fún ìbùgbé.",
      cleaningPlaceholder: "10,000",
      minStayLabel: "Alẹ́ tí ó kéré jù fún ìbùgbé",
      instantTitle: "Ìfipamọ́ kíákíá",
      instantBody: "Àwọn àlejò máa fi pamọ́ láìdúró de ìfọwọ́sí rẹ.",
      rentalNote:
        "Ilé yíyà ni iye rẹ̀ fún ọdún kan. Àwọn àlejò máa fi ìránṣẹ́ sí ọ nínú RentMe, wọ́n máa yẹ ilé wò, lẹ́yìn náà wọ́n máa san owó. Fún ààbò rẹ, jẹ́ kí gbogbo ìfọ̀rọ̀wérọ̀ àti sísan owó wà nínú RentMe.",
    },

    guestView: {
      intro: "Báyìí ni àtòjọ rẹ máa hàn nínú ìwádìí.",
      addPhotos: "Fi àwòrán kún kí káàdì náà pé",
      rentBadge: "Yíyà",
      instantBadge: "Kíákíá",
      locationPlaceholder: "Fi ibùdó kún ní ìgbésẹ̀ kẹta",
      titlePlaceholder: "Àkọlé àtòjọ rẹ",
      rooms: "Yàrá ìbùsùn {bedrooms}, yàrá ìwẹ̀ {bathrooms}, ó gba àlejò {guests}",
      priceToSet: "Iye láti pinnu",
      descriptionPlaceholder: "Àpèjúwe rẹ máa hàn lórí ojú ewé àtòjọ.",
    },

    submit: {
      title: "Ó ti ṣetán fún àtúnyẹ̀wò",
      body:
        "A ń ṣàyẹ̀wò àtòjọ kọ̀ọ̀kan pẹ̀lú ọwọ́ kí ó tó dé ọ̀dọ̀ àwọn àlejò. Pé àtòjọ ìyẹ̀wò yìí, ó máa lọ tààrà sí ìlà.",
      action: "Fi ránṣẹ́ fún àtúnyẹ̀wò",
      sending: "Ń fi ránṣẹ́",
      note: "Àtúnyẹ̀wò gba wákàtí 24 sí 48. A ó sọ fún ọ bákan náà.",
      checklist: {
        title: "Àkọlé",
        description: "Àpèjúwe ọ̀rọ̀ {min} tàbí jù bẹ́ẹ̀ lọ",
        photos: "Àwòrán {min} tàbí jù, ìbòjú ní àkọ́kọ́",
        stateCode: "Ìpínlẹ̀",
        city: "Ìlú",
        area: "Àdúgbò",
        amenities: "Ohun ìrọ̀rùn",
        priceNight: "Iye fún alẹ́ kan",
        priceYear: "Owó ilé ọdọọdún",
        rooms: "Yàrá àti àlejò",
      },
      needsTitle:
        "Kọ àkọlé ní ìgbésẹ̀ kìíní kọ́kọ́, lẹ́yìn náà a lè fi àtòjọ yìí ránṣẹ́ fún àtúnyẹ̀wò.",
      needsKeys:
        "Fífiránṣẹ́ fún àtúnyẹ̀wò máa ṣiṣẹ́ ní kété tí àwọn kọ́kọ́rọ́ pátákó bá dé. Iṣẹ́ rẹ wà ní ìpamọ́ sórí ẹ̀rọ yìí.",
    },

    gate: {
      titleShort: "Fún àtòjọ náà ní àkọlé tí ó kéré tán lẹ́tà {min}.",
      titleLong: "Dín àkọlé kù sí lẹ́tà {max} tàbí kéré.",
      description: "Ṣàpèjúwe ohun ìní náà ní ó kéré tán ọ̀rọ̀ {min}. O ní {count} báyìí.",
      propertyType: "Yan irú ohun ìní tí èyí jẹ́.",
      photos: "Fi ó kéré tán àwòrán {min} kún. O ní {count}.",
      cover: "Yan àwòrán tí yóò ṣáájú àtòjọ náà. Èyí àkọ́kọ́ ni ìbòjú.",
      stateCode: "Yan ìpínlẹ̀ tí ohun ìní náà wà.",
      city: "Kọ ìlú, bí àpẹẹrẹ Lagos.",
      area: "Kọ àdúgbò, bí àpẹẹrẹ Lekki Phase 1.",
      amenities: "Yan ó kéré tán ohun ìrọ̀rùn kan tí àwọn àlejò máa rí.",
      priceNight: "Pinnu iye fún alẹ́ kan ní naira.",
      priceYear: "Pinnu owó ilé ọdọọdún ní naira.",
      bedrooms: "Sọ iye yàrá ìbùsùn tí ohun ìní náà ní.",
      bathrooms: "Sọ iye yàrá ìwẹ̀ tí ohun ìní náà ní.",
      maxGuests: "Sọ iye àlejò tí ohun ìní náà lè gbà.",
    },

    submitted: {
      title: "Àtòjọ rẹ wà lọ́wọ́ ẹgbẹ́ àtúnyẹ̀wò wa",
      body:
        "A ń ṣàyẹ̀wò àtòjọ kọ̀ọ̀kan pẹ̀lú ọwọ́ kí àwọn àlejò lè gbẹ́kẹ̀lé ohun tí wọ́n fi pamọ́. Àtúnyẹ̀wò gba wákàtí 24 sí 48, a ó sì sọ fún ọ bákan náà. Bí ohunkóhun bá nílò ìyípadà, a ó sọ ohun tí ó jẹ́ gan-an.",
      goToListings: "Lọ sí àtòjọ mi",
      another: "Ṣàtòjọ ohun ìní mìíràn",
    },

    pitch: {
      title: "Ṣàtòjọ ohun ìní rẹ lórí RentMe",
      bodySignedIn:
        "Ṣíṣàtòjọ wà fún àwọn aṣojú tí a ti fọwọ́sí. Ìbéèrè náà gba nǹkan bí ìṣẹ́jú méjì, a sì ń ṣàyẹ̀wò láàrin wákàtí 24 sí 48.",
      bodySignedOut:
        "Wọlé sí àkàǹtì aṣojú rẹ láti bẹ̀rẹ̀ àtòjọ, tàbí béèrè ní nǹkan bí ìṣẹ́jú méjì bí o ṣẹ̀ṣẹ̀ dé ibí.",
      points: {
        verified: {
          title: "Ohun ìní tí a fọwọ́sí nìkan",
          body:
            "A ń ṣàyẹ̀wò àtòjọ kọ̀ọ̀kan pẹ̀lú ọwọ́, nítorí náà àmì tó wà lórí ohun ìní rẹ ní ìtumọ̀ fún àwọn àlejò.",
        },
        inside: {
          title: "Àwọn àlejò dé ọ̀dọ̀ rẹ nínú RentMe",
          body:
            "Ìfọ̀rọ̀wérọ̀, ìyẹ̀wò ilé àti sísan owó wà lórí pátákó, níbi tí a ń dáàbò bò wọ́n.",
        },
        keep: {
          title: "Ìwọ ni ó ń gba ohun tí o béèrè",
          body: "RentMe kò gba owó kankan lọ́wọ́ rẹ láti ṣàtòjọ. Iye tí o pinnu ni iye rẹ.",
        },
      },
      apply: "Di aṣojú",
      signIn: "Wọlé",
      how: "Bí ṣíṣàtòjọ ṣe ń ṣiṣẹ́",
    },

    workspace: {
      title: "Àtòjọ mi",
      lede: "Gbogbo ohun ìní tí o ní lórí RentMe, àti ipò tí ọ̀kọ̀ọ̀kan wà.",
      start: "Bẹ̀rẹ̀ àtòjọ",
      unconfigured:
        "Àtòjọ rẹ máa hàn níbí ní kété tí àwọn kọ́kọ́rọ́ pátákó bá dé. O lè bẹ̀rẹ̀ ìkọ́ ọ̀kan báyìí: ẹ̀rọ àtòjọ máa fi iṣẹ́ rẹ pamọ́ sórí ẹ̀rọ yìí títí ìgbà náà.",
      emptyTitle: "Kò sí àtòjọ síbẹ̀",
      emptyBody:
        "Ohun ìní àkọ́kọ́ rẹ gba nǹkan bí ìṣẹ́jú mẹ́wàá, àwòrán ni ó pọ̀ jù nínú rẹ̀. Bẹ̀rẹ̀ nígbàkigbà tí o ṣetán: a ń fi àkọ̀wé pamọ́ bí o ti ń lọ.",
      groups: {
        live: { title: "Ń ṣiṣẹ́", blurb: "Àwọn àlejò lè rí ìwọ̀nyí nínú ìwádìí." },
        review: {
          title: "Lọ́wọ́ ẹgbẹ́ àtúnyẹ̀wò wa",
          blurb: "A ń ṣàyẹ̀wò àtòjọ kọ̀ọ̀kan pẹ̀lú ọwọ́. Èyí gba wákàtí 24 sí 48.",
        },
        attention: {
          title: "Ó nílò àfiyèsí rẹ",
          blurb: "Ìyípadà kan pọn dandan kí èyí lè ṣiṣẹ́.",
        },
        drafts: { title: "Àkọ̀wé", blurb: "Ìwọ nìkan ni ó lè rí ìwọ̀nyí." },
      },
      status: {
        DRAFT: "Àkọ̀wé",
        SUBMITTED: "A ti fi ránṣẹ́",
        UNDER_REVIEW: "Labẹ àtúnyẹ̀wò",
        MORE_INFO_REQUIRED: "A nílò ìwífún síwájú",
        APPROVED: "Tí fọwọ́sí",
        PUBLISHED: "Ń ṣiṣẹ́",
        REJECTED: "A kò gbà",
        SUSPENDED: "A dá dúró",
      },
      photoCount: "Àwòrán {count}",
      photoCountOne: "Àwòrán kan",
      actions: {
        edit: "Ṣàtúnṣe",
        submit: "Fi ránṣẹ́ fún àtúnyẹ̀wò",
        takeDown: "Mú kúrò",
        delete: "Pa rẹ́",
      },
      /* Deleting a draft opens no dialogue: the row leaves and offers its
         way back, and nothing reaches the server until that offer runs out. */
      undo: {
        removed: "A ti pa àkọ̀wé náà rẹ́",
        action: "Yí padà",
      },
      sheets: {
        keep: "Fi sílẹ̀ bẹ́ẹ̀",
        working: "Ń ṣiṣẹ́",
        close: "Ti",
        submit: {
          title: "Ṣé kí a fi àtòjọ yìí ránṣẹ́ fún àtúnyẹ̀wò?",
          body:
            "Ẹgbẹ́ wa máa ṣàyẹ̀wò àwọn àwòrán, àpèjúwe àti ibùdó. A ó dáhùn sí ọ láàrin wákàtí 24 sí 48, bákan náà.",
          confirm: "Fi ránṣẹ́ fún àtúnyẹ̀wò",
        },
        unpublish: {
          title: "Ṣé kí a mú àtòjọ yìí kúrò?",
          body:
            "Ó máa kúrò nínú ìwádìí lẹ́sẹ̀kẹsẹ̀ kí ó padà sí àkọ̀wé rẹ. O lè ṣàtúnṣe rẹ̀ kí o sì fi ránṣẹ́ padà fún àtúnyẹ̀wò nígbàkigbà tí o ṣetán.",
          confirm: "Mú kúrò",
        },
        delete: {
          title: "Ṣé kí a pa àkọ̀wé yìí rẹ́?",
          body: "A ó yọ àkọ̀wé náà àti àwọn àwòrán rẹ̀ kúrò pátápátá. Èyí kò ṣe é padà.",
          confirm: "Pa àkọ̀wé rẹ́",
        },
      },
    },

    dashboard: {
      standing: "{name}, ipò tí àwọn ohun ìní rẹ wà lónìí ni èyí.",
      liveListings: "Àtòjọ tó ń ṣiṣẹ́",
      withReview: "Lọ́wọ́ àtúnyẹ̀wò",
      drafts: "Àkọ̀wé",
      upcomingStays: "Ìbùgbé tó ń bọ̀",
      unreadMessages: "Ìránṣẹ́ tí a kò kà",
      noListings:
        "Kò sí ohun ìní síbẹ̀. Àtòjọ àkọ́kọ́ rẹ gba nǹkan bí ìṣẹ́jú mẹ́wàá, a sì ń fi àkọ̀wé pamọ́ bí o ti ń lọ.",
      noStays:
        "Kò sí ìbùgbé tí a fi pamọ́ síbẹ̀. Àwọn àtòjọ tó ń ṣiṣẹ́ nínú ìwádìí ni àwọn àlejò lè fi pamọ́.",
      stayDates: "{from} sí {to}",
    },
  },

  agentBookings: {
    title: "Ìfiléke",
    lede: "Gbogbo ìbéèrè àti gbogbo ìbùgbé lórí àwọn ohun ìní rẹ.",
    unconfigured:
      "Àwọn ìbéèrè àti ìbùgbé rẹ máa hàn níbí ní kété tí àwọn kọ́kọ́rọ́ pátákó bá dé. Kò sí ohun tí ó sọnù láàrin ìgbà náà.",
    tabsLabel: "Àwọn ẹgbẹ́ ìfiléke",
    waitingOn: "{count} ń dúró dè ọ́",
    waitingOnOne: "Ọ̀kan ń dúró dè ọ́",
    groups: {
      requests: {
        title: "Ìbéèrè",
        blurb:
          "Ń dúró de ìpinnu rẹ. Ìbéèrè kan dì àwọn alẹ́ mọ́ fún wákàtí {hours}, lẹ́yìn náà ó tú ara rẹ̀ sílẹ̀.",
      },
      upcoming: { title: "Tó ń bọ̀", blurb: "Àwọn ìbùgbé tí o gbà tí kò tíì dé." },
      completed: { title: "Tí parí", blurb: "Àwọn ìbùgbé tí àwọn àlejò rẹ ti parí." },
      cancelled: {
        title: "Tí a fagilé",
        blurb: "Àwọn ìbéèrè tí o kọ̀, àti àwọn ìbùgbé tí ẹnìkẹ́ni nínú ẹ̀yin méjèèjì dá dúró.",
      },
    },
    card: {
      dates: "{from} sí {to}",
      nights: "Alẹ́ {count}",
      nightsOne: "Alẹ́ kan",
      guests: "Àlejò {count}",
      guestsOne: "Àlejò kan",
      composition: "Àgbàlagbà {adults}, ọmọdé {children}",
      total: "Àpapọ̀",
      requested: "A béèrè ní {date}",
      waiting: "Ó ti dúró {duration}",
      waitingNew: "Ó ṣẹ̀ṣẹ̀ dé",
      releasesIn: "Ó máa tú ara rẹ̀ sílẹ̀ ní {duration}",
      releasingNow: "Ó ti kọjá ìdìmọ́ wákàtí {hours} rẹ̀, ó lè tú sílẹ̀ nígbàkigbà",
      hours: "Wákàtí {count}",
      hoursOne: "Wákàtí kan",
      days: "Ọjọ́ {count}",
      daysOne: "Ọjọ́ kan",
      settled: "Owó ti wọlé",
      awaiting: "Owó kò tíì wọlé",
      unknown: "A kò lè sọ ipò owó náà báyìí",
      arriving: "Ẹni tí ó ń dé: {name}",
      arrivingPhone: "Nọ́mbà ẹnu-ọ̀nà {phone}",
    },
    status: {
      PENDING: "Ń dúró de ìpinnu rẹ",
      CONFIRMED: "A ti fọwọ́sí",
      CANCELLED: "A ti fagilé",
    },
    actions: {
      accept: "Gbà",
      decline: "Kọ̀",
      working: "Ń ṣiṣẹ́",
      back: "Padà sẹ́yìn",
      close: "Ti",
    },
    accept: {
      title: "Ṣé kí o gbà ìbéèrè yìí?",
      body:
        "Àlejò náà máa gbọ́ lẹ́sẹ̀kẹsẹ̀, a ó sì dì àwọn alẹ́ náà mọ́ fún un lórí kàlẹ́ńdà rẹ. Ṣàyẹ̀wò pé ohun ìní náà wà ní ọ̀fẹ́ ní tòótọ́ kí o tó gbà.",
      confirm: "Gbà ìbéèrè náà",
    },
    decline: {
      title: "Ṣé kí o kọ̀ ìbéèrè yìí?",
      body:
        "Àwọn alẹ́ náà máa padà sí kàlẹ́ńdà rẹ, a ó sì sọ fún àlejò náà. Kò sí owó tí a gbà bákan náà.",
      reasonLabel: "Kí ló dí kí o gbà àwọn ọjọ́ wọ̀nyí?",
      reasonHint: "Àlejò náà máa kà á ọ̀rọ̀ sí ọ̀rọ̀, nítorí náà jẹ́ kí ó rọrùn àti pẹ̀lú ìwà pẹ̀lẹ́.",
      reasonPlaceholder: "A ti gba iyẹ̀wù náà ní àwọn alẹ́ wọ̀nyẹn.",
      suggestionsLabel: "Tàbí bẹ̀rẹ̀ láti ọ̀kan nínú ìwọ̀nyí",
      suggestions: {
        taken: "A ti gba iyẹ̀wù náà ní àwọn alẹ́ wọ̀nyẹn.",
        maintenance: "Wọ́n ń ṣe iṣẹ́ àtúnṣe ní ohun ìní náà ní ọ̀sẹ̀ náà.",
        guests: "Ohun ìní náà kò lè gba iye àlejò bẹ́ẹ̀ ní ìtẹ́lọ́rùn.",
      },
      confirm: "Kọ̀ ìbéèrè náà",
    },
    empty: {
      requestsTitle: "Kò sí ohun tí ń dúró dè ọ́",
      requestsBody:
        "Kò sí àlejò tí ń dúró de ìpinnu báyìí. Àwọn ìbéèrè tuntun máa dé sí ibí, wọ́n á sì dì àwọn alẹ́ mọ́ fún wákàtí {hours} nígbà tí o ń dáhùn.",
      upcomingTitle: "Kò sí ìbùgbé tí a fi pamọ́ síbẹ̀",
      upcomingBody:
        "Àwọn ìbéèrè tí o gbà máa hàn níbí pẹ̀lú àwọn ọjọ́, àwọn àlejò àti àpapọ̀ owó.",
      completedTitle: "Kò sí ohun tí ó parí síbẹ̀",
      completedBody: "Ìbùgbé kan máa wá síbí ní ọjọ́ kejì tí àlejò rẹ jáde.",
      cancelledTitle: "Kò sí ohun tí a fagilé",
      cancelledBody:
        "Àwọn ìbéèrè tí o kọ̀, àti àwọn ìbùgbé tí ẹnìkẹ́ni dá dúró, wà níbí fún àkọsílẹ̀ rẹ.",
      openListings: "Ṣàkóso àtòjọ mi",
    },
  },

  agentEarnings: {
    title: "Owó tí o rí",
    lede: "Ohun tí ó ti wọlé láti àwọn ìbùgbé rẹ, tààrà láti inú ìwé ìṣírò.",
    unconfigured: "Owó tí o rí máa hàn níbí ní kété tí àwọn kọ́kọ́rọ́ pátákó bá dé.",
    unavailable:
      "A kò lè kà ìwé ìṣírò náà báyìí, nítorí náà a kò fi iye kan hàn dípò kí a fi èyí tí kò tọ́ hàn. Tún ojú-ìwé yìí kó ní ìṣẹ́jú kan.",
    totals: {
      yourShare: "Ìpín rẹ tí ó ti wọlé",
      guestsPaid: "Ohun tí àwọn àlejò san",
      settledStays: "Ìbùgbé tí owó rẹ̀ wọlé",
      thisMonth: "Oṣù yìí",
    },
    byMonth: "Ní oṣù kọ̀ọ̀kan",
    monthShare: "Ìpín rẹ",
    monthGross: "Ohun tí àwọn àlejò san",
    stays: "Ìbùgbé {count}",
    staysOne: "Ìbùgbé kan",
    emptyTitle: "Owó kò tíì rìn síbẹ̀",
    emptyBody:
      "Gbogbo owó tí ó wọlé ni a kọ sínú ìwé ìṣírò, ó sì máa hàn níbí pẹ̀lú ìpín rẹ lórí rẹ̀. A kò díwọ̀n ohunkóhun lórí ojú-ìwé yìí, nítorí náà títí owó ìbùgbé kan bá wọlé, ó máa wà ní òfìfo lọ́nà mímọ̀ọ́mọ̀.",
    emptyAction: "Wo àwọn ìfiléke rẹ",
    howTitle: "Bí a ṣe ṣírò ìpín rẹ",
    howBody:
      "A pín owó tí ó wọlé ní ọ̀nà mẹ́ta: ìpín rẹ, ìpín pátákó náà, àti ohun tí ẹni tó ń gbé owó náà kọjá mú. Àwọn mẹ́tẹ̀ẹ̀ta ń papọ̀ dé ohun tí àlejò san, ìdí nìyẹn tí ìlà kọ̀ọ̀kan níbí ń bá ara rẹ̀ mu.",
  },

  admin: {
    console: {
      // NATIVE REVIEW: "console" kept in English the way Nigerian staff say it.
      title: "Console Alákòóso",
      navLabel: "Console Alákòóso",
      signedIn: "Ti wọlé",
      // NATIVE REVIEW: "audit log" kept in English, it is a compliance term.
      auditNote: "Gbogbo ìpinnu tí o ṣe níbí ni a kọ sí audit log pẹ̀lú orúkọ rẹ lórí i.",
    },

    nav: {
      overview: { label: "Àkọ́sórí", short: "Àkọ́sórí" },
      // NATIVE REVIEW: "flag" kept in English, it is the safety scan's own term.
      flags: { label: "Flag ìránṣẹ́", short: "Flag" },
      alerts: { label: "Ìkìlọ̀ ewu", short: "Ìkìlọ̀" },
      reports: { label: "Ìròyìn ẹ̀sùn", short: "Ìròyìn" },
      applications: { label: "Ìbéèrè aṣojú", short: "Aṣojú" },
      stops: { label: "Ìdádúró", short: "Ìdádúró" },
      listings: { label: "Àtúnyẹ̀wò àtòjọ", short: "Àtòjọ" },
      bookings: { label: "Ìdúró", short: "Ìdúró" },
      tickets: { label: "Ìtìlẹ́yìn", short: "Ìtìlẹ́yìn" },
      // NATIVE REVIEW: "switch" kept in English, it names a control staff use.
      social: { label: "Agbègbè", short: "Agbègbè" },
      standing: { label: "Ipò", short: "Ipò" },
      moderation: { label: "Dídádúró", short: "Dídádúró" },
      reference: { label: "Dátà ìtọ́kasí", short: "Ìtọ́kasí" },
      switches: { label: "Switch", short: "Switch" },
    },

    access: {
      unconfiguredTitle: "Console kò tíì ṣí",
      unconfiguredBody:
        "Console máa ṣiṣẹ́ ní kété tí àwọn kọ́kọ́rọ́ pátákó bá dé. Kò sí ohun tí ó sọnù láàrin ìgbà náà.",
      signedOutTitle: "Ìwọlé àwọn òṣìṣẹ́",
      signedOutBody: "Wọlé pẹ̀lú àkàǹtì iṣẹ́ rẹ láti tẹ̀síwájú.",
      notAdminTitle: "O kò ní ààyè sí console",
      notAdminBody:
        "Ibí yìí wà fún ẹgbẹ́ iṣẹ́ RentMe. Àkàǹtì rẹ kò ní ipò náà.",
      backToRentMe: "Padà sí RentMe",
      signIn: "Wọlé",
      backToYourHome: "Padà sí ilé rẹ",
      otherAccount: "Wọlé pẹ̀lú àkàǹtì mìíràn",
    },

    common: {
      waiting: "{count} ń dúró",
      unavailableTitle: "A kò lè gbé ìlà yìí wọlé",
      unavailableBody:
        "Console kò lè dé data pátákó ní báyìí, nítorí náà kò fi ìlà tí kò lè jẹ́rìí sí i hàn ọ́. Tún gbé wọlé ní ìṣẹ́jú kan.",
      notRecorded: "A kò kọ sílẹ̀",
      notGiven: "A kò fúnni",
      passes: "Ó pé",
      needsAttention: "Ó nílò àfiyèsí",
      close: "Ti",
      done: "Ó parí",
      notNow: "Kì í ṣe báyìí",
      working: "Ń ṣiṣẹ́",
      optional: "(àṣàyàn)",
      notePlaceholder: "Wọ́n máa kà á ọ̀rọ̀ fún ọ̀rọ̀, nítorí náà jẹ́ pàtó àti onínúure.",
      // NATIVE REVIEW: "audit log" kept in English, it is a compliance term.
      inAuditLog: "Ìpinnu náà wà nínú audit log.",
      // NATIVE REVIEW: "audit log" kept in English, it is a compliance term.
      noteInAuditLog: "Àkọsílẹ̀ náà wà nínú audit log.",
      recentlyReviewed: "Tí a ṣàyẹ̀wò lẹ́nu àìpẹ́",
      recentlyResolved: "Tí a yanjú lẹ́nu àìpẹ́",
      recentlyDecided: "Tí a pinnu lẹ́nu àìpẹ́",
      recentlyClosed: "Tí a ti lẹ́nu àìpẹ́",
      dueIn: "Dáhùn láàrin wákàtí {hours}",
      dueSoon: "Dáhùn láàrin wákàtí kan",
      overdue: "Ó ti pẹ́ ju wákàtí {hours} lọ",
      resolvedBy: "{who} ló ti lẹ́nu rẹ̀",
      reviewedBy: "{who} ló ti yẹ̀ ẹ́ wò",
      someone: "ẹnìkejì kan",
      status: {
        open: "Ṣí sílẹ̀",
        reviewed: "A ti ṣàyẹ̀wò",
        reviewing: "Ń ṣàyẹ̀wò",
        resolved: "A ti yanjú",
        dismissed: "A gbé kúrò",
        pending: "Ń dúró de ìdáhùn",
        closed: "A ti tì",
        DRAFT: "Àkọ̀wé",
        SUBMITTED: "A ti fi ránṣẹ́",
        UNDER_REVIEW: "Ń ṣàyẹ̀wò",
        MORE_INFO_REQUIRED: "A béèrè ìyípadà",
        APPROVED: "Tí fọwọ́sí",
        PUBLISHED: "Ń ṣiṣẹ́",
        REJECTED: "A kò fọwọ́sí",
        SUSPENDED: "A dá dúró",
        PENDING: "Tí a béèrè",
        CONFIRMED: "Tí a fọwọ́sí",
        CANCELLED: "Tí a fagilé",
      },
    },

    overview: {
      title: "Àkọ́sórí iṣẹ́",
      lede:
        "Gbogbo àmì ìgbẹ́kẹ̀lé tí RentMe ń mú jáde parí síbí: ohun tí ẹ̀rọ ààbò rí, ohun tí àwọn ọmọ ẹgbẹ́ ròyìn, ẹni tí ó ń dúró de ìfọwọ́sí, àti ohun tí ó ń dúró láti ṣiṣẹ́. Nọ́mbà kọ̀ọ̀kan jẹ́ ìlà tí o lè pé.",
      queueClear: "Ìlà yìí mọ́.",
      tiles: {
        moderation: {
          label: "Àkóónú tí a dá dúró",
          lede: "Àwọn ìfìwéránṣẹ́, ìtàn, àsọyé àti ìtàn ara ẹni tí àyẹ̀wò ààbò dá dúró.",
        },
        // NATIVE REVIEW: "flag" kept in English, it is the safety scan's own term.
        flags: {
          label: "Flag ìránṣẹ́ tí ó ṣí sílẹ̀",
          lede: "Ọ̀rọ̀ owó tí ẹ̀rọ ààbò rí nínú ìfọ̀rọ̀wérọ̀.",
        },
        alerts: {
          label: "Ìkìlọ̀ ewu tí ó ṣí sílẹ̀",
          lede: "Àwọn ọ̀rọ̀ tí a gbé sókè fún ẹgbẹ́ iṣẹ́ láti ṣiṣẹ́ lé lórí.",
        },
        applications: {
          label: "Ìbéèrè aṣojú",
          lede: "Àwọn ènìyàn tí ń dúró de ìpinnu kí wọ́n lè bẹ̀rẹ̀ àtòjọ.",
        },
        listings: {
          label: "Àtòjọ tí ó wà lábẹ́ àtúnyẹ̀wò",
          lede: "Àwọn ìfiránṣẹ́ tí ń dúró kí a ṣàyẹ̀wò, fọwọ́sí àti tẹ̀ jáde.",
        },
        reports: {
          label: "Ìròyìn ẹ̀sùn tí ó ṣí sílẹ̀",
          lede: "Àkóónú àti àkàǹtì tí àwọn ọmọ ẹgbẹ́ ròyìn fún wa.",
        },
        tickets: {
          label: "Tíkẹ́ẹ̀tì ìtìlẹ́yìn",
          lede: "Àwọn ìbéèrè tí olùrànlọ́wọ́ kò lè dáhùn fúnra rẹ̀.",
        },
      },
      how: {
        title: "Bí console ṣe ń ṣiṣẹ́",
        // NATIVE REVIEW: "audit" kept in English, it is a compliance term.
        audit:
          "Ìpinnu kọ̀ọ̀kan ń kọ ilà audit tí ó gbé orúkọ rẹ, àkọsílẹ̀ tí o fọwọ́ kàn àti ipò rẹ̀ ṣáájú àti lẹ́yìn. Kò sí ẹni tí ó lè ṣàtúnṣe tàbí pa log náà rẹ́, ìwọ pẹ̀lú.",
        notify:
          "Ìfọwọ́sí àti ìkọ̀sílẹ̀ ń sọ fún ẹni tí ọ̀rọ̀ kàn lórí pátákó, kí ẹnikẹ́ni má ṣe dúró ní àìmọ̀ ohun tí ó ṣẹlẹ̀ sí ìbéèrè tàbí àtòjọ rẹ̀.",
        invisible:
          "Ẹ̀rọ ààbò kò hàn ní ibòmíràn bí kò ṣe nínú console yìí. Kò sí ohun kan nínú áàpù tí ó sọ fún ọmọ ẹgbẹ́ pé a ti gbé ìránṣẹ́ rẹ̀ sókè.",
        openSwitches: "Ṣí àwọn switch",
      },
    },

    flags: {
      // NATIVE REVIEW: "flag" kept in English throughout this queue.
      title: "Flag ìránṣẹ́",
      lede:
        "Ẹ̀rọ inú data ń ṣàyẹ̀wò ìránṣẹ́ kọ̀ọ̀kan fún nọ́mbà àkàǹtì oní nọ́mbà mẹ́wàá àti fún ọ̀rọ̀ owó, ó sì ń fi ohun tí ó rí sílẹ̀ níbí. A kò sọ fún ẹni tí ó fi ránṣẹ́ láé, nítorí náà ìlà yìí nìkan ni ibi tí ẹ̀rọ ààbò ń fi iṣẹ́ rẹ̀ hàn.",
      emptyTitle: "Kò sí flag tí ń dúró",
      emptyBody:
        "A ti ṣàyẹ̀wò gbogbo ìránṣẹ́ tí a gbé sókè. Àwọn tuntun máa hàn níbí ní kété tí ẹ̀rọ ààbò bá fi wọ́n sílẹ̀.",
      reason: { account_number: "Nọ́mbà àkàǹtì", payment_keyword: "Ọ̀rọ̀ owó" },
      role: { guest: "Àlejò", agent: "Aṣojú", unknown: "Olùkópa" },
      matched: "Ẹ̀rọ ààbò rí {fragment} nínú ìránṣẹ́ láti ọwọ́ {role}.",
      context: "Àyíká ìfọ̀rọ̀wérọ̀",
      flagged: "A gbé sókè",
      reviewed: "A ti ṣàyẹ̀wò.",
      clear: "Pé flag yìí",
      escalate: "Gbé ìkìlọ̀ ewu sókè",
      clearSheet: {
        title: "Ṣé kí a pé flag yìí?",
        body:
          "Ẹ̀rọ ààbò ṣe dáadáa láti wò, ṣùgbọ́n ìfọ̀rọ̀wérọ̀ yìí dára. Flag náà máa tì, a ó sì kọ ìpinnu náà sí audit log pẹ̀lú orúkọ rẹ lórí i. A kò sọ fún ẹnikẹ́ni nínú ìfọ̀rọ̀wérọ̀ náà.",
        confirm: "Bẹ́ẹ̀ ni, pé é",
        successTitle: "A ti pé flag náà",
        successBody: "A ti ṣàtúnṣe ìlà náà, audit log sì gbé ìpinnu rẹ.",
      },
      escalateSheet: {
        title: "Ṣé kí a gbé ìkìlọ̀ ewu sókè?",
        body:
          "Èyí máa tì flag náà kí ó ṣí ìkìlọ̀ ewu tó ga lórí ìránṣẹ́ náà, kí ọ̀rọ̀ náà dúró lórí ìlà ìkìlọ̀ títí ẹnìkan bá ṣiṣẹ́ lé lórí. A kò sọ fún ẹnikẹ́ni nínú ìfọ̀rọ̀wérọ̀ náà.",
        confirm: "Ti flag náà kí o gbé ìkìlọ̀ sókè",
        successTitle: "A ti gbé ìkìlọ̀ sókè",
        successBody:
          "A ti ṣàyẹ̀wò flag náà, ìkìlọ̀ tó ga sì ṣí sílẹ̀ lórí ìlà ìkìlọ̀ báyìí.",
      },
    },

    alerts: {
      title: "Ìkìlọ̀ ewu",
      lede:
        "Àwọn ọ̀rọ̀ tí ó nílò ènìyàn, kì í ṣe òfin: flag ìránṣẹ́ tí a gbé sókè àti ohunkóhun mìíràn tí pátákó rí pé ó tọ́ sí ìwò kejì. Ìkìlọ̀ kan máa ṣí sílẹ̀ títí ẹnìkan bá kọ ohun tí a ṣe sílẹ̀.",
      emptyTitle: "Kò sí ìkìlọ̀ tí ó ṣí sílẹ̀",
      emptyBody:
        "Kò sí ohun tí ń dúró. Gbígbé flag ìránṣẹ́ sókè máa ṣí ìkìlọ̀ kan níbí.",
      severity: { low: "Kékeré", medium: "Àárín", high: "Gíga" },
      severityChip: "Ìwúwo {level}",
      attachedTo: "Ó so mọ́ {type} {id}",
      resolvedWhen: "A yanjú {when}.",
      resolve: "Sàmì sí i pé a ti yanjú",
      sheet: {
        title: "Ṣé kí a yanjú ìkìlọ̀ yìí?",
        body:
          "Lò èyí lẹ́yìn tí a ti ṣiṣẹ́ lórí ọ̀rọ̀ náà ní tòótọ́. Ìkìlọ̀ náà máa tì pẹ̀lú àkókò, àkọsílẹ̀ rẹ sì máa wọ audit log.",
        confirm: "Bẹ́ẹ̀ ni, yanjú u",
        notesLabel: "Ohun tí a ṣe",
        successTitle: "A ti yanjú ìkìlọ̀ náà",
        successBody: "A ti tì ìkìlọ̀ náà, audit log sì gbé àkọsílẹ̀ rẹ.",
      },
    },

    verification: {
      title: "Àkàbà ìfẹsẹ̀múlẹ̀",
      tierLine: "Ìpele {step} nínú 4: {name}",
      tierName: {
        "0": "A fọwọ́sí, a kò tí ì ṣàyẹ̀wò síwájú",
        "1": "A ti ṣàyẹ̀wò ìdánimọ̀",
        "2": "A ti ṣàyẹ̀wò àdírẹ́sì",
        "3": "A ti ṣàyẹ̀wò àkọọ́lẹ̀ ìsanwó",
        "4": "A ti ṣàyẹ̀wò pátápátá",
      },
      rung: {
        identity: "A rí ìdánimọ̀",
        address: "A jẹ́rìí àdírẹ́sì",
        payout: "Àkọọ́lẹ̀ báǹkì lórúkọ ara wọn",
        in_person: "A pàdé wọn lójú kojú",
      },
      passed: "Ó kọjá",
      failed: "Kò kọjá",
      undecided: "A kò tí ì ṣàyẹ̀wò",
      decidedBy: "{who}, {when}",
      pass: "Kọ ọ́ pé ó kọjá",
      fail: "Kọ ọ́ pé kò kọjá",
      blockedBelow: "Ìpele tó wà ní ìsàlẹ̀ èyí kò tí ì kọjá.",
      sheet: {
        passTitle: "Kọ àyẹ̀wò yìí pé ó kọjá?",
        failTitle: "Kọ àyẹ̀wò yìí pé kò kọjá?",
        passBody:
          "A ó tún ìpele aṣojú náà ṣírò láti inú àwọn àyẹ̀wò tó kọjá, a ó sì sọ fún wọn nígbà tí ó bá yípadà.",
        failBody:
          "Èyí lè dín ìpele tí àwọn àlejò ti ń rí kù, nítorí náà sọ ohun tí kò tọ́. Aṣojú náà yóò ka ọ̀rọ̀ rẹ.",
        confirm: "Kọ ọ́ sílẹ̀",
        notesLabel: "Ohun tí o wò",
        successTitle: "A ti kọ àyẹ̀wò náà",
        successBody: "A ti ṣàtúnṣe àkàbà náà, ìpinnu náà sì wà nínú ìwé ìṣàyẹ̀wò.",
      },
    },

    reports: {
      title: "Ìròyìn ẹ̀sùn",
      lede:
        "Ohun tí àwọn ọmọ ẹgbẹ́ sọ pé kò tọ́: àtòjọ, àtúnyẹ̀wò, ìránṣẹ́ tàbí àkàǹtì. Olùròyìn rí ìròyìn ara rẹ̀ nìkan, nítorí náà ìlà yìí ni ibi tí a ń dáhùn sí i ní tòótọ́.",
      emptyTitle: "Kò sí ìròyìn tí ó ṣí sílẹ̀",
      emptyBody:
        "Kò sí ohun tí ń dúró de ìpinnu. Ìròyìn tuntun máa dé síbí bí àwọn ọmọ ẹgbẹ́ ti gbé wọn sókè.",
      reportedBy: "{reporter} ròyìn lórí {type} {id}",
      closedWhen: "A tì {when}.",
      startReview: "Bẹ̀rẹ̀ àyẹ̀wò",
      resolve: "Yanjú",
      dismiss: "Gbé kúrò",
      reviewSheet: {
        title: "Ṣé kí o gbà ìròyìn yìí?",
        body: "Ó máa yí padà sí àyẹ̀wò kí ẹgbẹ́ tó kù lè rí i pé ẹnìkan ti gbà á.",
        confirm: "Bẹ́ẹ̀ ni, mo ti gbà á",
        notesLabel: "Àkọsílẹ̀ fún audit log",
        successTitle: "A ti gbà ìròyìn náà",
        successBody: "Ìròyìn náà ń fi hàn báyìí pé ó wà lábẹ́ àyẹ̀wò.",
      },
      resolveSheet: {
        title: "Ṣé kí a yanjú ìròyìn yìí?",
        body:
          "Lò èyí nígbà tí a ti gbé ìgbésẹ̀ lórí àkóónú tàbí àkàǹtì tí a ròyìn. Ìròyìn náà máa tì pẹ̀lú àkókò.",
        confirm: "Bẹ́ẹ̀ ni, yanjú u",
        notesLabel: "Ohun tí a ṣe",
        successTitle: "A ti yanjú ìròyìn náà",
        successBody: "A ti tì ìròyìn náà, àkọsílẹ̀ rẹ sì wà nínú audit log.",
      },
      dismissSheet: {
        title: "Ṣé kí a gbé ìròyìn yìí kúrò?",
        body:
          "Lò èyí nígbà tí kò sí ohun tí a lè ṣe lé lórí. Ìròyìn náà máa tì, a kò sì gbé ìgbésẹ̀ kankan sí ẹni tí a ròyìn.",
        confirm: "Bẹ́ẹ̀ ni, gbé e kúrò",
        notesLabel: "Ìdí tí a gbé e kúrò",
        successTitle: "A ti gbé ìròyìn náà kúrò",
        successBody: "A ti tì ìròyìn náà, àkọsílẹ̀ rẹ sì wà nínú audit log.",
      },
    },

    applications: {
      title: "Ìbéèrè aṣojú",
      lede:
        "Ìfọwọ́sí ń ṣẹ̀dá àkọọ́lẹ̀ aṣojú, ó ń fún wọn ní ipò aṣojú kí Ipo Aṣojú lè ṣí, ó sì ń sọ fún olùbéèrè lórí pátákó. Fífi ọ̀kan ránṣẹ́ padà ń béèrè ohun tí ó kù gan-an.",
      emptyTitle: "Kò sí ìbéèrè tí ń dúró",
      emptyBody:
        "Gbogbo ẹni tí ó béèrè ti rí ìdáhùn. Ìbéèrè tuntun máa dé síbí ní kété tí a bá fi wọ́n ránṣẹ́.",
      individual: "Ẹnìkọ̀ọ̀kan",
      business: "Ilé-iṣẹ́",
      nameMissing: "A kò fún wa ní orúkọ",
      thisApplicant: "olùbéèrè yìí",
      submittedWhen: "A fi ránṣẹ́ {when}",
      decidedWhen: "A pinnu {when}.",
      sections: {
        personal: "1. Ara-ẹni",
        identity: "2. Ìdánimọ̀",
        business: "3. Ilé-iṣẹ́",
        documents: "4. Àwọn ìwé",
        payout: "5. Owó ìsanwó",
        review: "6. Àtúnyẹ̀wò",
      },
      fields: {
        fullName: "Orúkọ kíkún",
        phone: "Fóònù",
        email: "Ímeèlì",
        address: "Àdírẹ́sì",
        location: "Ibùdó",
        documentType: "Irú ìwé",
        documentNumber: "Nọ́mbà ìwé",
        businessName: "Orúkọ ilé-iṣẹ́",
        rcNumber: "Nọ́mbà RC",
        business: "Ilé-iṣẹ́",
        uploaded: "A gbé sókè",
        bank: "Báńkì",
        accountNumber: "Nọ́mbà àkàǹtì",
        accountName: "Orúkọ àkàǹtì",
        terms: "Àdéhùn",
        applied: "Ó béèrè",
        lastNote: "Àkọsílẹ̀ olùyẹ̀wò tó kẹ́yìn",
        lastReviewed: "Àyẹ̀wò tó kẹ́yìn",
      },
      asIndividual: "Ó ń béèrè bí ẹnìkọ̀ọ̀kan",
      documentsCount: "Ìwé {count}",
      documentsOne: "Ìwé kan",
      documentsNone: "Kò sí ìwé tí a gbé sókè, nítorí náà a kò lè ṣàyẹ̀wò ìbéèrè yìí síbẹ̀",
      documentOpen: "Ṣí",
      documentUnavailable: "Ìjápọ̀ kò sí",
      documentKinds: {
        idFront: "Ìwé ìdánimọ̀, iwájú",
        idBack: "Ìwé ìdánimọ̀, ẹ̀yìn",
        registration: "Ìforúkọsílẹ̀ CAC",
      },
      // NATIVE REVIEW: legal wording, "terms" of the platform.
      termsAgreed: "Ó gba àdéhùn pátákó",
      termsNotAgreed: "Kò gbà",
      approve: "Fọwọ́sí",
      requestChanges: "Béèrè ìyípadà",
      reject: "Kọ̀",
      approveSheet: {
        title: "Ṣé kí a fọwọ́sí {name}?",
        body:
          "Èyí ń ṣẹ̀dá àkọọ́lẹ̀ aṣojú wọn, ó ń fún wọn ní ipò aṣojú kí Ipo Aṣojú lè ṣí fún wọn, ó sì ń sọ fún wọn lórí pátákó. A ó kọ ọ́ sí audit log pẹ̀lú orúkọ rẹ lórí i.",
        confirm: "Bẹ́ẹ̀ ni, fọwọ́sí",
        notesLabel: "Àkọsílẹ̀ sí olùbéèrè",
        successTitle: "A ti fọwọ́sí ìbéèrè náà",
        successBody:
          "Àkọọ́lẹ̀ aṣojú wọn ń ṣiṣẹ́, a ti fún wọn ní ipò náà, a sì ti sọ fún wọn.",
      },
      changesSheet: {
        title: "Ṣé kí a béèrè ìwífún síwájú?",
        body:
          "Ìbéèrè náà máa yí padà sí ìyípadà tí a béèrè, a ó sì sọ fún olùbéèrè ohun tí o nílò. Wọ́n lè ṣàtúnṣe kí wọ́n fi ránṣẹ́ padà.",
        confirm: "Fi ránṣẹ́ padà",
        notesLabel: "Ohun tí olùbéèrè gbọ́dọ̀ yí padà",
        successTitle: "A ti fi ránṣẹ́ padà sí olùbéèrè",
        successBody: "A ti sọ fún wọn, wọ́n sì lè ṣàtúnṣe ìbéèrè wọn.",
      },
      rejectSheet: {
        title: "Ṣé kí a kọ̀ {name}?",
        body:
          "Ìbéèrè náà máa tì bí èyí tí a kò fọwọ́sí, a ó sì sọ fún olùbéèrè. Sọ ìdí: òun nìkan ni àlàyé tí wọ́n máa rí.",
        confirm: "Bẹ́ẹ̀ ni, kọ̀ ọ́",
        notesLabel: "Ìdí fún olùbéèrè",
        successTitle: "A ti kọ ìbéèrè náà",
        successBody: "A ti sọ fún olùbéèrè, ìpinnu náà sì wà nínú audit log.",
      },
    },

    listings: {
      title: "Àtúnyẹ̀wò àtòjọ",
      lede:
        "Ìfọwọ́sí sọ pé ìfiránṣẹ́ náà pé àtòjọ ìyẹ̀wò. Ìtẹ̀jáde ni ìgbésẹ̀ kejì, ọ̀tọ̀, tí ó fi í sínú ìwádìí gbogbo ènìyàn. Fífi ọ̀kan ránṣẹ́ padà ń sọ fún aṣojú ìlà tí ó yẹ kí ó tún ṣe.",
      emptyTitle: "Kò sí àtòjọ tí ń dúró",
      emptyBody:
        "A ti ṣiṣẹ́ lórí gbogbo ìfiránṣẹ́. Àwọn tuntun máa hàn níbí bí àwọn aṣojú ti fi wọ́n ránṣẹ́.",
      propertyType: {
        apartment: "Fúláàtì",
        hotel: "Hòtẹ́lì",
        home: "Ilé",
        villa: "Villa",
        shortlet: "Shortlet",
        rental: "Ilé yíyà",
        shop: "Ṣọ́ọ̀bù",
        office: "Ọ́fíìsì",
        land: "Ilẹ̀",
      },
      checklistLines: "Ìlà ìyẹ̀wò {count} láti wò",
      checklistLineOne: "Ìlà ìyẹ̀wò kan láti wò",
      submittedWhen: "A fi ránṣẹ́ {when}",
      locationMissing: "A kò fún wa ní ibùdó",
      perYear: "fún ọdún kan",
      perNight: "fún alẹ́ kan",
      photoAlt: "{title}, àwòrán {number}",
      checklistTitle: "Àtòjọ ìyẹ̀wò ìgbàwọlé",
      checks: {
        photoCount: "Àwòrán mẹ́rin tàbí jù bẹ́ẹ̀ lọ",
        cover: "A ti yan àwòrán ìbòjú",
        titleCase: "Àkọlé ní lẹ́tà tí ó tọ́",
        place: "A kọ àdúgbò àti ìlú sílẹ̀",
        price: "A kọ iye sílẹ̀ ní naira",
        rooms: "A kọ yàrá ìbùsùn àti yàrá ìwẹ̀ sílẹ̀",
        amenities: "A yan ohun ìrọ̀rùn",
        description: "Àpèjúwe ọ̀rọ̀ 40 tàbí jù bẹ́ẹ̀ lọ",
        clean: "Kò sí nọ́mbà ìbánisọ̀rọ̀ tàbí ìsanwó nínú ọ̀rọ̀ náà",
      },
      submission: "Ìfiránṣẹ́",
      fields: {
        agent: "Aṣojú",
        capacity: "Ìwọ̀n tí ó gbà",
        address: "Àdírẹ́sì",
        amenities: "Ohun ìrọ̀rùn",
        description: "Àpèjúwe",
        lastNote: "Àkọsílẹ̀ olùyẹ̀wò tó kẹ́yìn",
        lastReviewed: "Àyẹ̀wò tó kẹ́yìn",
      },
      capacity:
        "Àlejò {guests}, yàrá ìbùsùn {bedrooms}, ibùsùn {beds}, yàrá ìwẹ̀ {bathrooms}",
      amenitiesSelected: "{count} tí a yàn",
      liveInSearch: "Ó ń ṣiṣẹ́ nínú ìwádìí.",
      closed: "A ti tì.",
      approve: "Fọwọ́sí",
      publish: "Tẹ̀ jáde",
      requestChanges: "Béèrè ìyípadà",
      reject: "Kọ̀",
      approveSheet: {
        title: "Ṣé kí a fọwọ́sí {title}?",
        body:
          "Ìfọwọ́sí sọ pé ìfiránṣẹ́ náà pé àtúnyẹ̀wò. Kò tí ì fi àtòjọ náà síwájú àwọn àlejò: ìtẹ̀jáde ni ìgbésẹ̀ kejì ọ̀tọ̀, kí ohunkóhun má ṣe ṣiṣẹ́ láìròtẹ́lẹ̀.",
        confirm: "Bẹ́ẹ̀ ni, fọwọ́sí",
        notesLabel: "Àkọsílẹ̀ sí aṣojú",
        successTitle: "A ti fọwọ́sí àtòjọ náà",
        successBody:
          "A ti sọ fún aṣojú náà. Tẹ̀ ẹ́ jáde nígbà tí o ṣetán kí àwọn àlejò rí i.",
      },
      publishSheet: {
        title: "Ṣé kí a tẹ̀ {title} jáde?",
        body:
          "Èyí máa fi àtòjọ náà sínú ìwádìí gbogbo ènìyàn lẹ́sẹ̀kẹsẹ̀, níbi tí ẹnikẹ́ni lè rí i kí ó sì fi pamọ́. A ó sọ fún aṣojú náà pé ó ń ṣiṣẹ́.",
        confirm: "Bẹ́ẹ̀ ni, tẹ̀ ẹ́ jáde",
        notesLabel: "Àkọsílẹ̀ sí aṣojú",
        successTitle: "Àtòjọ náà ń ṣiṣẹ́",
        successBody: "Ó wà nínú ìwádìí báyìí, a sì ti sọ fún aṣojú náà.",
      },
      changesSheet: {
        title: "Ṣé kí a béèrè ìyípadà lọ́wọ́ aṣojú?",
        body:
          "Àtòjọ náà máa yí padà sí ìyípadà tí a béèrè, a ó sì sọ fún aṣojú náà ohun tí ó gbọ́dọ̀ tún ṣe gan-an. Tọ́ka sí ìlà ìyẹ̀wò tí kò pé.",
        confirm: "Fi ránṣẹ́ padà",
        notesLabel: "Ohun tí aṣojú gbọ́dọ̀ yí padà",
        successTitle: "A ti fi ránṣẹ́ padà sí aṣojú náà",
        successBody: "A ti sọ fún wọn, wọ́n sì lè ṣàtúnṣe àtòjọ náà.",
      },
      rejectSheet: {
        title: "Ṣé kí a kọ̀ {title}?",
        body:
          "Àtòjọ náà máa tì bí èyí tí a kò fọwọ́sí, a kò sì lè fi pamọ́. A ó sọ fún aṣojú náà, nítorí náà sọ ìdí.",
        confirm: "Bẹ́ẹ̀ ni, kọ̀ ọ́",
        notesLabel: "Ìdí fún aṣojú",
        successTitle: "A ti kọ àtòjọ náà",
        successBody: "A ti sọ fún aṣojú náà, ìpinnu náà sì wà nínú audit log.",
      },
    },

    support: {
      title: "Ìtìlẹ́yìn",
      lede:
        "Àwọn ìgbésókè gbé orúkọ àti ímeèlì tí ẹni náà fún wa nìkan. Ìdáhùn rẹ máa sọ fún wọn lórí pátákó lẹ́sẹ̀kẹsẹ̀.",
      emptyTitle: "Kò sí tíkẹ́ẹ̀tì",
      emptyBody:
        "Kò sí ẹni tí ó nílò ìgbésókè. Tíkẹ́ẹ̀tì máa dé síbí nígbà tí olùrànlọ́wọ́ kò lè dáhùn.",
      generalQuestion: "Ìbéèrè gbogbogbò",
      threadCount: "Ìránṣẹ́ {count} nínú ìfọ̀rọ̀wérọ̀",
      threadCountOne: "Ìránṣẹ́ kan nínú ìfọ̀rọ̀wérọ̀",
      allTickets: "Gbogbo tíkẹ́ẹ̀tì",
      whoFiled: "Ẹni tí ó fi í sílẹ̀",
      fields: { name: "Orúkọ", email: "Ímeèlì", account: "Àkàǹtì", filed: "Ìgbà tí a fi sílẹ̀" },
      signedInWhenFiled: "Ó ti wọlé nígbà tí ó fi í sílẹ̀",
      noAccountAttached: "Kò sí àkàǹtì tí ó so mọ́ ọ",
      whatTheyAsked: "Ohun tí wọ́n béèrè",
      supportSender: "Ìtìlẹ́yìn RentMe",
      waitingOnUs: "Ń dúró lọ́wọ́ wa",
      noneWaitingHeading: "Kò sí tíkẹ́ẹ̀tì tí ń dúró lọ́wọ́ wa",
      nothingWaitingTitle: "Kò sí ohun tí ń dúró",
      nothingWaitingBody: "A ti dáhùn tíkẹ́ẹ̀tì kọ̀ọ̀kan, a sì ti tì wọ́n.",
      reply: {
        label: "Dáhùn sí ẹni yìí",
        placeholder: "Dáhùn kedere kí o sọ ohun tí ó ń tẹ̀lé.",
        send: "Fi ìdáhùn ránṣẹ́",
        sending: "Ń fi ránṣẹ́",
        sent: "A ti fi ìdáhùn ránṣẹ́. A ti sọ fún wọn lórí pátákó.",
        note: "Fífiránṣẹ́ ń sọ fún ẹni tí ó ní tíkẹ́ẹ̀tì náà lórí pátákó.",
      },
      stateLabel: "Ipò tíkẹ́ẹ̀tì",
      states: {
        open: "Ṣí sílẹ̀",
        pending: "Ń dúró de ìdáhùn",
        resolved: "A ti yanjú",
        closed: "A ti tì",
      },
    },

    bookings: {
      title: "Àwọn ìdúró",
      lede:
        "Gbogbo ìdúró tí ó wà lórí pẹpẹ, àti ibi kan ṣoṣo tí a ti lè fagilé ìdúró tí a ti san owó rẹ̀ kí owó náà sì padà. Àkọsílẹ̀ tí a tẹ̀ jáde ni ó pinnu iye náà. Ìwọ nìkan yan ìdí.",
      searchLabel: "Wá ìdúró kan",
      searchPlaceholder: "Ìtọ́kasí ìfipamọ́, tàbí apá kan orúkọ àtòjọ",
      search: "Wá",
      clearSearch: "Fi gbogbo rẹ̀ hàn",
      noMatchTitle: "Kò sí ohun tí ó bá a mu",
      noMatchBody:
        "Yẹ ìtọ́kasí ìfipamọ́ wò, tàbí wá apá kan orúkọ àtòjọ dípò.",
      emptyTitle: "Kò sí ìdúró kankan síbẹ̀",
      emptyBody:
        "Àwọn ìdúró máa fara hàn níbí ní kété tí àlejò bá fipamọ́. Kò sí ohun kan lórí ojú ewé yìí tí ń dúró dè ọ́.",
      groups: {
        live: "Tí ń lọ àti tí ń bọ̀",
        past: "Tí ó ti kọjá",
        cancelled: "Tí a fagilé",
      },
      open: "Ṣí ìdúró yìí",
      back: "Gbogbo ìdúró",
      goneTitle: "Ìdúró náà kò sí níbẹ̀",
      goneBody: "Padà sí àtòjọ láti rí ohun tí ó wà níbẹ̀ báyìí.",
      nights: "Òru {count}",
      nightsOne: "Òru 1",
      party: "Àgbàlagbà {adults}, ọmọdé {children}",
      partyAdultsOnly: "Àgbàlagbà {adults}",
      settledChip: "{amount} tí a san",
      unpaidChip: "Kò sí owó tí a san síbẹ̀",
      refundedChip: "{amount} tí a dá padà",
      bookedWhen: "A fipamọ́ {when}",
      fields: {
        reference: "Ìtọ́kasí",
        listing: "Àtòjọ",
        host: "Onílé",
        guest: "Àlejò",
        arriving: "Ẹni tí ń dé",
        arrivingPhone: "Nọ́mbà wọn",
        arrivingEmail: "Ímeèlì wọn",
        dates: "Àwọn ọjọ́",
        length: "Gígùn",
        party: "Àwọn àlejò",
        perNight: "Fún òru kan",
        cleaning: "Ìmọ́tótó",
        service: "Iṣẹ́",
        subtotal: "Àpapọ̀ kékeré",
        total: "Àpapọ̀ fún ìdúró náà",
        settled: "Tí a san títí di ìsinsìnyí",
        returned: "Tí a ti dá padà",
        status: "Ipò",
      },
      sections: {
        stay: "Ìdúró náà",
        money: "Owó",
        people: "Àwọn ènìyàn",
        payments: "Àwọn ìsanwó",
        history: "Ìtàn",
        refunds: "Àwọn ìdápadà owó tí a ti pinnu",
      },
      noPayments: "Kò sí ẹni tí ó ti san owó fún ìdúró yìí.",
      noRefunds: "Kò sí ìdápadà owó tí a pinnu lórí ìdúró yìí.",
      refundLine: "{refund} padà sí àlejò, {retained} wà lọ́wọ́ onílé.",
      decidedBy: "{who}, {when}",
      unnamed: "Kò sí orúkọ",
      cancel: "Fagilé ìdúró yìí",
      cancelledAlready: "A ti fagilé ìdúró yìí. Ìpinnu náà wà nínú audit log.",
      pastNote:
        "Ìdúró yìí ti parí. Fífagilé rẹ̀ báyìí yóò tú àwọn òru tí kò sí ẹni tí ó lè tún fipamọ́, nítorí náà a kò fi í hàn níbí. Dá owó padà nípasẹ̀ ìtìlẹ́yìn bí ohun kan bá ṣàṣìṣe.",
      reasons: {
        guest_choice: "Àlejò ni ó ń fagilé",
        host_cancelled: "Onílé ni ó fagilé",
        not_as_listed: "Ibùjókòó kò rí bí a ṣe kọ ọ́ sínú àtòjọ",
        no_access: "Àlejò kò lè wọlé",
      },
      sheet: {
        title: "Fagilé ìdúró yìí?",
        body:
          "Àwọn ọjọ́ máa tún ṣí lẹ́sẹ̀kẹsẹ̀, ohunkóhun tí a jẹ ni yóò sì lọ sí àpò owó àlejò nínú ìṣòwò kan náà. Iye náà wá láti inú àkọsílẹ̀ tí a tẹ̀ jáde, kì í ṣe láti ara nọ́mbà tí a tẹ̀ síbí.",
        reasonLabel: "Kí ni ìdí tí a fi ń fagilé ìdúró yìí",
        working: "À ń ṣírò ohun tí a jẹ",
        owed: "{refund} yóò padà sí àlejò.",
        kept: "{retained} yóò wà lọ́wọ́ onílé.",
        nothingPaid: "Kò sí owó tí a san rí fún ìdúró yìí, nítorí náà kò sí owó tí ń rìn.",
        confirm: "Fagilé kí o sì dá owó padà",
        notesLabel: "Ohun tí a fi ìdí rẹ̀ múlẹ̀",
        successTitle: "A ti fagilé ìdúró náà",
        successBody:
          "Àwọn òru ti padà sí kàlẹ́ndà, owó náà wà nínú àpò owó àlejò, àlejò sì ní iye àti ìdí náà ní àkọsílẹ̀.",
      },
    },

    switches: {
      // NATIVE REVIEW: "switch" kept in English throughout this surface.
      title: "Switch",
      lede:
        "Pa ojú kan lórí RentMe láìsí ìtúsílẹ̀ tuntun, kí o sì tún ṣí i nígbà tí ìṣòro bá parí. Kò sí ohun tí a pa rẹ́ bákan náà.",
      warning:
        "Pípa ojú kan mú un kúrò lọ́wọ́ gbogbo ènìyàn lẹ́sẹ̀kẹsẹ̀, àti àwọn tí ń lò ó lọ́wọ́lọ́wọ́. A ń pa iṣẹ́ tí a ti fi pamọ́ mọ́. Àwọn ojú ewé máa gbà ìyípadà náà láàrin nǹkan bí ìṣẹ́jú-àáyá ọgbọ̀n. A ń kọ gbogbo ìyípadà sí audit log pẹ̀lú orúkọ rẹ lórí i.",
      on: "Ó ṣí",
      off: "Ó pa",
      defaultNote: "Ojú RentMe tí a lè pa tàbí ṣí.",
      switchingOff: "Pípa á: {consequence}",
      lastChanged: "Ìyípadà tó kẹ́yìn {when}",
      switchOn: "Ṣí i",
      switchOff: "Pa á",
      labels: {
        bookings: "Ìfipamọ́",
        wallet: "Àpò owó",
        messaging: "Ìránṣẹ́",
        assistant: "Olùrànlọ́wọ́",
        support: "Ìtìlẹ́yìn",
        agent_listings: "Àtòjọ aṣojú",
        hybrid_hotels: "Hòtẹ́lì alábàáṣiṣẹ́pọ̀",
        hybrid_restaurants: "Ilé oúnjẹ alábàáṣiṣẹ́pọ̀",
      },
      consequences: {
        bookings:
          "Àwọn àlejò kò lè fi ìbùgbé pamọ́ tàbí fagilé rẹ̀. A kò fọwọ́ kan àwọn ìfipamọ́ tó wà.",
        wallet:
          "Ìfikún owó, ìyọkúrò àti ìfiránṣẹ́ owó máa dúró. A kò fọwọ́ kan owó tó wà àti ìtàn rẹ̀.",
        messaging:
          "Àwọn àlejò kò lè fi ìránṣẹ́ sí aṣojú, aṣojú kò sì lè dáhùn. Ìfọ̀rọ̀wérọ̀ àtijọ́ ṣì ṣe é kà.",
        assistant: "Olùrànlọ́wọ́ máa dá ìdáhùn dúró. Àwọn ènìyàn ṣì lè wá kí wọ́n wò.",
        support:
          "Ìfọ̀rọ̀wérọ̀ ìtìlẹ́yìn máa dá tíkẹ́ẹ̀tì tuntun dúró. Àwọn tíkẹ́ẹ̀tì tó ṣí sílẹ̀ máa dúró bẹ́ẹ̀.",
        agent_listings:
          "Àwọn aṣojú kò lè ṣẹ̀dá tàbí ṣàtúnṣe àtòjọ. Àwọn àtòjọ tó ń ṣiṣẹ́ máa ṣiṣẹ́ lọ.",
        hybrid_hotels:
          "Àwọn hòtẹ́lì alábàáṣiṣẹ́pọ̀ máa kúrò nínú ìwádìí. Àwọn ibùgbé tiwa máa dúró.",
        hybrid_restaurants: "Àwọn ilé oúnjẹ alábàáṣiṣẹ́pọ̀ máa kúrò nínú ìwádìí.",
        generic: "Ojú yìí máa parẹ́ lọ́wọ́ gbogbo ènìyàn títí a bá tún ṣí i.",
      },
      sheet: {
        title: "Ṣé kí a pa {label}?",
        body:
          "Gbogbo ènìyàn máa pàdánù ẹ̀yà RentMe yìí lẹ́sẹ̀kẹsẹ̀, àti àwọn tí ń lò ó lọ́wọ́lọ́wọ́. A kò pa ohun tí a ti fi pamọ́ rẹ́, ìtúnṣí i sì máa dá ojú náà padà. Ìyípadà náà máa dé ojú ewé kọ̀ọ̀kan láàrin nǹkan bí ìṣẹ́jú-àáyá ọgbọ̀n.",
        confirm: "Bẹ́ẹ̀ ni, pa á",
        successTitle: "A ti pa á",
        successBody: "Ojú náà ti pa fún gbogbo ènìyàn, ìyípadà náà sì wà nínú audit log.",
      },
    },
  },

  a11y: {
    logoHome: "Ilé RentMe",
    expand: "Ṣí",
    collapse: "Pa",
    openMenu: "Ṣí àkójọ",
    closeMenu: "Ti àkójọ",
    languageSwitcher: "Yí èdè padà",
    favourite: "Fi pamọ́ sí àyànfẹ́",
  },
};
