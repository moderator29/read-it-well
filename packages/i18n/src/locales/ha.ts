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
    reviews: "sharhi",
    verified: "An tabbatar",
    skipToContent: "Tsallake zuwa abun ciki",
  },

  nav: {
    home: "Gida",
    hotels: "Otal",
    apartments: "Gidaje",
    homes: "Muhalli",
    restaurants: "Gidan abinci",
    experiences: "Kwarewa",
    services: "Ayyuka",
    properties: "Kadarori",
    bookings: "Ajiye",
    messages: "Saƙonni",
    wallet: "Walat",
    aiAssistant: "Mataimakin AI",
    profile: "Bayanan martaba",
    settings: "Saituna",
    primaryLabel: "Na farko",
    accountLabel: "Asusu",
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
      secondary: "Duba ba tare da asusu ba",
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
      becomeAgent: "Zama wakili",
    },
  },

  auth: {
    welcomeBack: "Barka da dawowa",
    signInToContinue: "Shiga don ci gaba",
    createAccount: "Ƙirƙiri asusunka",
    signUpToStart: "Fara ganowa cikin ƙasa da minti ɗaya",
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
      title: "NaijaFinds AI",
      body: "Abokin tafiyarka mai wayo. Ka tambaya da harshe mai sauƙi.",
      action: "Tambayi mataimaki",
      samplePrompt: "Ɗaki biyu a Lekki ƙasa da 300k mai wurin ninkaya",
    },
    agentCard: {
      title: "Zama Wakilin NaijaFinds",
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

  a11y: {
    logoHome: "Gidan NaijaFinds",
    openMenu: "Buɗe menu",
    closeMenu: "Rufe menu",
    languageSwitcher: "Canza harshe",
    favourite: "Ajiye cikin abubuwan so",
  },
};
