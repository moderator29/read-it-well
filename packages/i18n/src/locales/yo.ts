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
    reviews: "àtúnyẹ̀wò",
    verified: "Tí fọwọ́sí",
    skipToContent: "Fò sí àkóónú",
  },

  nav: {
    home: "Ilé",
    hotels: "Hòtẹ́lì",
    apartments: "Fúláàtì",
    homes: "Ilé gbígbé",
    restaurants: "Ilé oúnjẹ",
    experiences: "Ìrírí",
    services: "Iṣẹ́ ìsìn",
    properties: "Ohun ìní",
    bookings: "Ìfipamọ́",
    messages: "Ìránṣẹ́",
    wallet: "Àpò owó",
    aiAssistant: "Olùrànlọ́wọ́ AI",
    profile: "Àkọọ́lẹ̀",
    settings: "Ètò",
    primaryLabel: "Àkọ́kọ́",
    accountLabel: "Àkàǹtì",
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
      secure: { title: "Ààbò àti ìgbẹ́kẹ̀lé", body: "Ààbò rẹ ni àkọ́kọ́ wa" },
      ai: { title: "Agbára AI", body: "Ìrírí ọlọ́gbọ́n" },
      africa: { title: "Fún Áfíríkà", body: "Tí a kọ́ pẹ̀lú ìtọ́jú" },
      stores: { title: "Wà lórí", body: "App Store àti Play Store" },
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
      title: "NaijaFinds AI",
      body: "Ọ̀rẹ́ ìrìnàjò ọlọ́gbọ́n rẹ. Béèrè ohunkóhun ní èdè tí ó rọrùn.",
      action: "Béèrè lọ́wọ́ olùrànlọ́wọ́",
      samplePrompt: "Yàrá méjì ní Lekki lábẹ́ 300k pẹ̀lú adágún",
    },
    agentCard: {
      title: "Di Aṣojú NaijaFinds",
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

  a11y: {
    logoHome: "Ilé NaijaFinds",
    openMenu: "Ṣí àkójọ",
    closeMenu: "Ti àkójọ",
    languageSwitcher: "Yí èdè padà",
    favourite: "Fi pamọ́ sí àyànfẹ́",
  },
};
