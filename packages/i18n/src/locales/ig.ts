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
    reviews: "nyocha",
    verified: "Enyochala",
    skipToContent: "Wụga na ọdịnaya",
  },

  nav: {
    home: "Ụlọ",
    hotels: "Họtel",
    apartments: "Ụlọ obibi",
    homes: "Ebe obibi",
    restaurants: "Ụlọ oriri",
    experiences: "Ahụmahụ",
    services: "Ọrụ",
    properties: "Ihe onwunwe",
    bookings: "Ndebe",
    messages: "Ozi",
    wallet: "Akpa ego",
    aiAssistant: "Onye enyemaka AI",
    profile: "Profaịlụ",
    settings: "Ntọala",
    primaryLabel: "Isi",
    accountLabel: "Akaụntụ",
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
      secondary: "Chọgharịa na-enweghị akaụntụ",
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
      becomeAgent: "Bụrụ onye nnọchiteanya",
    },
  },

  auth: {
    welcomeBack: "Nnọọ ọzọ",
    signInToContinue: "Banye ka ị gaa n'ihu",
    createAccount: "Mepụta akaụntụ gị",
    signUpToStart: "Malite ịchọpụta n'ime otu nkeji",
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
      title: "NaijaFinds AI",
      body: "Enyi njem gị maara ihe. Jụọ ihe ọ bụla n'okwu dị mfe.",
      action: "Jụọ onye enyemaka",
      samplePrompt: "Ụlọ ime abụọ na Lekki n'okpuru 300k nwere ọdọ mmiri",
    },
    agentCard: {
      title: "Bụrụ Onye Nnọchiteanya NaijaFinds",
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

  a11y: {
    logoHome: "Ụlọ NaijaFinds",
    openMenu: "Mepee menu",
    closeMenu: "Mechie menu",
    languageSwitcher: "Gbanwee asụsụ",
    favourite: "Chekwaa na ndị masịrị gị",
  },
};
