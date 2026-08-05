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
    year: "year",
    reviews: "reviews",
    verified: "Verified",
    skipToContent: "Skip to content",
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
      secondary: "Browse without an account",
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
        rcNumber: "RC number (optional)",
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
        chooseFile: "Choose a file, PNG or JPG or PDF, up to 5MB",
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
      sampleNote: "Designed figures. Your real numbers appear here once your listings go live.",
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
        delete: {
          title: "Delete this draft?",
          body: "The draft and its photos are removed for good. This cannot be undone.",
          confirm: "Delete draft",
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
      nights: "{count} nights",
      nightsOne: "1 night",
      guests: "{count} guests",
      guestsOne: "1 guest",
      composition: "{adults} adults, {children} children",
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
      nights: "{count} nights",
      nightsOne: "1 night",
      party: "{adults} adults, {children} children",
      partyAdultsOnly: "{adults} adults",
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
  },
};

/**
 * Note the absence of `as const`. Widening the values to `string` is
 * deliberate: with literal types every translation would have to equal the
 * English text to typecheck. The shape is still enforced, so a missing or
 * misspelled key remains a compile error.
 */
export type Dictionary = typeof en;
