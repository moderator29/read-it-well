/**
 * English. The source of truth.
 *
 * Every other locale is typed against this shape, so a missing or misspelled
 * key is a compile error rather than a blank space in production.
 */
export const en = {
  meta: {
    localeName: "English",
    localeNativeName: "English",
    dir: "ltr",
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
    reviews: "reviews",
    verified: "Verified",
    skipToContent: "Skip to content",
  },

  nav: {
    home: "Home",
    hotels: "Hotels",
    apartments: "Apartments",
    homes: "Homes",
    restaurants: "Restaurants",
    experiences: "Experiences",
    services: "Services",
    properties: "Properties",
    bookings: "Bookings",
    messages: "Messages",
    wallet: "Wallet",
    aiAssistant: "AI Assistant",
    profile: "Profile",
    settings: "Settings",
    primaryLabel: "Primary",
    accountLabel: "Account",
  },

  landing: {
    navHome: "Home",
    hero: {
      line1: "Find it.",
      line2: "Book it.",
      line3: "Live it.",
      subtitle:
        "Your all-in-one platform for homes, hotels, restaurants, experiences and more.",
      searchPlaceholder: "Where do you want to go?",
      searchLabel: "Search destinations across Nigeria",
      popularLabel: "Popular right now",
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
      secondary: "Browse without an account",
    },
    footer: {
      tagline: "Find it. Book it. Live it. Around Nigeria.",
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
      becomeAgent: "Become an agent",
    },
  },

  auth: {
    welcomeBack: "Welcome back",
    signInToContinue: "Sign in to continue",
    createAccount: "Create your account",
    signUpToStart: "Start discovering in under a minute",
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
      title: "NaijaFinds AI",
      body: "Your smart travel buddy. Ask for anything, in plain words.",
      action: "Ask the assistant",
      samplePrompt: "2 bedroom in Lekki under 300k with a pool",
    },
    agentCard: {
      title: "Become a NaijaFinds Agent",
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

  a11y: {
    logoHome: "NaijaFinds home",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    languageSwitcher: "Change language",
    favourite: "Save to favourites",
  },
};

/**
 * Note the absence of `as const`. Widening the values to `string` is
 * deliberate: with literal types every translation would have to equal the
 * English text to typecheck. The shape is still enforced, so a missing or
 * misspelled key remains a compile error.
 */
export type Dictionary = typeof en;
