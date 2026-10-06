/**
 * Session 3's copy for feature onboarding, Pro presence, plans and artefact cards (W7).
 *
 * One module per owner so nine agents can add strings without editing en.ts
 * at the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. Money sentences never live
 * here; they come from `lib/money/copy.ts` (Session 2).
 *
 * EVERY FIRST-RUN LINE BELOW IS A CLAIM ABOUT HOW THE PRODUCT WORKS TODAY, and
 * north star 14.1 deletes a first run that only decorates. So each one names,
 * in a comment, the code that makes it true. If that code changes, the line
 * changes with it.
 */
export const experienceFeaturesEn = {
  firstRun: {
    /** The always-reachable way out. Lands on the working feature, never a dead end. */
    skip: "Skip",
    next: "Next",
    /** `{n}` and `{total}` are numbers. The pager's accessible name for one dot. */
    page: "Page {n} of {total}",
    /** The pager's accessible name. */
    pager: "Pages",
    /** The region's accessible name. `{feature}` is the feature's name. */
    region: "Getting started with {feature}",

    /**
     * Host workspace. True per `app/host/today.ts`: `needsYou` is the sum of
     * the requests waiting, guests arriving today and unread messages that
     * were read; the oldest waiting item is promoted to the next action
     * (`HostTodayView`). The third panel is `stays_search`: a night with no
     * `room_inventory` row is not offered (`/host/rooms`).
     */
    host: {
      name: "your host desk",
      p1Title: "Start with what needs you",
      p1Body: "The figure at the top counts what is waiting on you today: requests to answer, guests arriving and messages unread.",
      p2Title: "Each count opens its list",
      p2Body: "Tap a count to land on that queue. The oldest thing still waiting is lifted to the top as your next step.",
      p3Title: "Guests book only nights you offer",
      p3Body: "A night with no room set up cannot be found by anybody searching dates. Rooms and nights is where you open them.",
      action: "Open my desk",
    },

    /**
     * Agent workspace. True per `RealDashboard.tsx`: "Needs you today" is open
     * inspection requests plus unread messages, and the oldest REQUESTED
     * inspection is the next action, above every other number.
     */
    agent: {
      name: "your workspace",
      p1Title: "Start with what needs you",
      p1Body: "The figure at the top counts what is waiting on you: requests to inspect a space and messages unread.",
      p2Title: "Inspections come first",
      p2Body: "A request to inspect that waits on you is shown before any other number, oldest first, because that is where a let begins.",
      action: "Open my workspace",
    },

    /**
     * The verification ladder. True per `lib/trust/verification.ts`: four
     * rungs in a fixed order, the tier is the count passed with no gap below,
     * and a rung is a decision a member of staff records after reading the
     * evidence (`lib/admin/verification-actions.ts`). "None of them is a fee"
     * is the page's own sentence (`/agent/verification`).
     */
    verification: {
      name: "verification",
      p1Title: "Four checks, in order",
      p1Body: "Identity, then address, then a bank account in your own name, then a meeting in person. None of them is a fee.",
      p2Title: "A check counts only on the ones before it",
      p2Body: "Your standing is the number of checks passed with no gap below them. Passing the fourth with the first missing promotes nobody.",
      p3Title: "A person decides each one",
      p3Body: "Nothing passes on its own. Somebody at Vallo reads what you sent and records the decision, and every listing you have shows it.",
      action: "See my checks",
    },

    /**
     * Agreements and inspections. The bodies are Session 2's money sentences
     * (`NO_INSPECTION_FEE`, `PAYMENT_GATE_SENTENCE`, `OFF_PLATFORM_SENTENCE`),
     * placed by the first-run registry; only the titles live here.
     */
    agreements: {
      name: "agreements",
      p1Title: "See it before anything is paid",
      p2Title: "Payment opens last",
      p3Title: "Keep it all on Vallo",
      action: "Open my agreements",
    },

    /**
     * The invite link. The bodies reuse `publicDoors.invite.rowSub` and
     * `.noReward`, which are what `/settings/invite` already says: no reward
     * is attached to inviting today (A5).
     */
    invite: {
      name: "invites",
      p1Title: "Your own invite link",
      p2Title: "Nothing to earn, on purpose",
      action: "Get my link",
    },

    /**
     * The renter passport. True per `lib/trust/passport.ts` (the lines are a
     * confirmed phone, an identity match, inspections attended, tenancies paid
     * and the month joined) and the page's own lede: off unless turned on,
     * shown only in chosen conversations, no lister may ask for it. The third
     * body reuses `trustVisible.passport.offNote`.
     */
    passport: {
      name: "your renter passport",
      p1Title: "What Vallo saw, not what you claim",
      p1Body: "It holds only what Vallo itself recorded: a confirmed phone, inspections you attended, tenancies you paid through Vallo.",
      p2Title: "Off until you turn it on",
      p2Body: "Nobody sees it until you show it in a conversation you choose, and no lister may ask you for it.",
      p3Title: "Take it back at any time",
      action: "Open my passport",
    },

    /**
     * Agent analytics. True per `lib/agent/analytics-queries.ts`: every read
     * is the agent's own, under their own account; nothing is estimated; views
     * and saves are not counted, so no view figure exists.
     */
    analytics: {
      name: "analytics",
      p1Title: "Only what actually happened",
      p1Body: "Every figure is counted from your own requests, bookings, payments and calendar. Nothing is estimated or filled in.",
      p2Title: "A gap stays a gap",
      p2Body: "Vallo does not count listing views or saves, so neither appears here. A figure we cannot count is left out, never guessed.",
      p3Title: "Read with your own account",
      p3Body: "These figures come from your own listings, read under your own sign-in, and nothing here changes anything.",
      action: "See my figures",
    },

    /**
     * THE TENANT'S COMMAND CENTRE, AS IT EXISTS TODAY: the tenancy file
     * (`/tenancy/[id]`, R3-12, north star 14.1 "what this surface is for").
     * Shown to the tenant only. The first two bodies are the file's own
     * published sentences (`afterTheGate.tenancy.lede` and `.cautionNotHeld`),
     * placed by the registry; the third is true per `RenewalSection` and
     * `TenancyHead`: the end date is on the page, and a renewal offer is shown
     * with its figures when the lister makes one.
     */
    tenancy: {
      name: "your tenancy",
      p1Title: "Your whole tenancy, on one page",
      p2Title: "Your caution, on the record",
      p3Title: "When it ends, and what comes next",
      p3Body: "The day your tenancy ends is on this page, and so is any renewal your landlord or agent offers, with its figures beside it.",
      action: "Open my tenancy file",
    },

    /**
     * THE OWNER'S COMMAND CENTRE, AS IT EXISTS TODAY: the owner's buildings on
     * `/agent/portfolio` (V-42, R3-12). Shown only to somebody who lists at
     * least one unit as its owner. True per that page: units grouped by place
     * with let-until and the figure achieved (`readMyBuildings`), who else
     * lists the unit and whom the mandate was given to, and invitations that
     * verified agents in the same place answer with a note and their record,
     * never seeing the address (`landlord.portfolio.inviteLede`).
     */
    portfolio: {
      name: "your buildings",
      p1Title: "Every unit you own, by place",
      p1Body: "Each unit you list as its owner, grouped by where it is: whether it is let, until when, and what it achieved.",
      p2Title: "Who is letting it for you",
      p2Body: "Each unit says who else lists it on Vallo, and which agent you gave the mandate to.",
      p3Title: "Ask verified agents to pitch",
      p3Body: "For a unit that is not let, invite verified agents who already list in its area. They see its place, bedrooms and your asking range, never the address.",
      action: "Open my buildings",
    },

    /**
     * PAID PROMOTION, FOR LISTERS (D3, D60, `docs/promotion/VALLO_PROMOTION.md`,
     * "The onboarding"). Exactly four panels, the spec's own count, and no
     * fifth selling value. Panel one says both limits on the first screen:
     * a marked slot, no change to rank (`lib/listings/ranking.test.ts`), no
     * badge (`lib/trust/promotion-trust.test.ts`). Panel two's tiers come
     * from `lib/promotion/tiers.ts` and `promotion.tiers` below. Panel three
     * has no figures because no promotion has run. Panel four's sentences
     * are money sentences and live in `lib/money/copy.ts`: buying is not open,
     * because promotion cannot be paid for until the payment account it
     * settles to exists (D38).
     */
    promotion: {
      name: "promotion",
      p1Title: "Promotion buys attention, not rank",
      p1Body: "A promoted listing appears in a slot marked Promoted. It does not change where your listing ranks, and it does not buy a verification badge.",
      p2Title: "Four ways to be seen",
      p2Body: "Each tier names where your listing appears, for how long, and who it suits.",
      p3Title: "What you will be able to measure",
      p3Body: "Each tier shows what your listing actually got. Vallo never estimates a number it does not have.",
      /** Over panel three's list: there are no figures because nothing has run, and the panel says so. */
      p3Example: "How the figures will be laid out. No promotion has run yet, so there is no real example to show: each line reads No data until one does.",
      p4Title: "Pick, pay, and what happens next",
      starts: "Starts",
      ends: "Ends",
      fullDays: "Full days",
      refunded: "If refunded",
      action: "See my listings",
    },
  },

  /**
   * PAID PROMOTION (D3, D60, `docs/promotion/VALLO_PROMOTION.md`). The words
   * around `lib/promotion/tiers.ts`; prices are formatted from its kobo, never
   * typed here, and every sentence about paying is in `lib/money/copy.ts`.
   */
  promotion: {
    /** The visible label on every promoted slot (guardrail 3: a slot without it is a bug). */
    label: "Promoted",
    /** The label's longer, accessible form. */
    labelLong: "Promoted listing. Paid placement in a marked slot; it does not change rank or verification.",
    /** `{price}` is formatted money, `{days}` a number. */
    tierMeta: "{price} for {days} days",
    /**
     * Each tier, in words. `name` is what a member reads; the slug never
     * changes. `prime.name` is the spec's recommended "Everywhere", the
     * founder's to confirm (guardrail 4: Prime names a rank, not a place).
     */
    tiers: {
      boost: {
        name: "Boost",
        forWhom: "A week in a marked slot on your area's page and its searches. For one property on a tight budget.",
      },
      spotlight: {
        name: "Spotlight",
        forWhom: "Two weeks in the Promoted carousel at the top of your area and its searches. For a good property that needs repeating.",
      },
      featured: {
        name: "Featured",
        forWhom: "A month on the front door, the city page, your area and matching searches. For a property that needs people who were not looking.",
      },
      prime: {
        name: "Everywhere",
        forWhom: "Everything Featured gets, plus the saved-search and area digests and the map. For high-value property, with a reviewed listing, photographs and a complete inspection record.",
      },
    },
    /** The ten F4 metrics, by name. */
    metrics: {
      impressions: "Impressions",
      views: "Views",
      uniqueViewers: "Unique viewers",
      saves: "Saves",
      shares: "Shares",
      inquiries: "Inquiries",
      contacts: "Contacts",
      viewings: "Viewings",
      bookings: "Bookings",
      transactions: "Transactions",
    },
    /** In place of a figure that has nothing behind it. Never a zero. */
    noData: "No data",
    /** The measurement screen (`/agent/listings/<id>/promotion`). */
    measure: {
      title: "Promotion results",
      lede: "What this listing got from a promotion, counted, never estimated.",
      notLiveTitle: "No promotion results yet",
      notLiveBody: "Promotion is not open yet, so no listing has been promoted and there is nothing to count. Every figure below reads No data until a promotion has run.",
      metricsTitle: "The ten figures",
      comparison: "Promoted against organic is shown only where there is enough data for the comparison to be valid. Where there is not, this page says so instead.",
      back: "Back to my listings",
    },
  },

  /**
   * The Pro switch (north star 14.2, D12). Drawn only for a member the server
   * says holds a plan; never a padlock, a crown or a greyed control.
   */
  pro: {
    label: "Pro",
    /** The switch's accessible name. */
    switchLabel: "Pro view",
  },

  /** The artefact fan (north star 14.4, D14). */
  artefact: {
    /** The fan's accessible name when the caller names nothing better. */
    selector: "Choose one",
    /** `{n}` and `{total}` are numbers. */
    position: "{n} of {total}",
  },

  /**
   * The verification ladder's tier credentials on `/agent/verification`. The
   * tier names and what each check looks at come from
   * `lib/trust/verification.ts`, so only the frame lives here.
   */
  trustTiers: {
    selector: "Your verification tiers",
    /** `{n}` is the tier number. */
    tier: "Tier {n}",
    held: "Held",
    notYet: "Not yet",
  },

  /**
   * The host workspace's inner pages (D25) and its statement as a document
   * (D28.1). Labels only; the statement's sentences are Session 2's
   * (`EARNINGS_SETTLEMENT`, `HISTORY_NOT_A_BALANCE`).
   */
  workspace: {
    /** The inner navigation's accessible name across decide, calendar, rooms and earnings. */
    innerNav: "Your desk's pages",
    /** Its toggle's accessible name. */
    innerNavToggle: "Open your desk's pages",
    statements: "Statements",
    statement: {
      label: "Payout statement",
      guestsPaid: "Guests paid",
      commission: "Vallo commission",
      guarantee: "Guarantee contribution",
      share: "Your share, after reversals",
      lines: "Every payment, line by line",
    },
  },

  /**
   * The listing wizard's progress path (reference 7110, north star 10 G/H:
   * "wizard with a progress path, autosave, clay step art"). The autosave
   * lines are said only when true: the device copy is written on every change
   * (`listingDraftKey`) and the account copy at every step (`persist`).
   */
  wizard: {
    allSteps: "All steps",
    /** `{n}` and `{total}` are numbers. */
    stepOf: "Step {n} of {total}",
    done: "Done",
    current: "You are here",
    upcoming: "Still to come",
    savedBoth: "Saved on this device as you type, and to your account each time you move on.",
    savedDevice: "Saved on this device as you type.",
    savedAccount: "Saved to your account each time you move on.",
    /* The host wizard writes to the account only when you move on from the
       business, registration and representative steps (`next()` in
       `HostWizard.tsx`); the other steps keep their answers on the device
       until then. Said as far as it is true. */
    savedHost:
      "Saved on this device as you type, and to your account when you move on from the business, registration and representative steps.",
  },

  /**
   * Plans and the trial timeline (north star 14.3, 15.6, D21). Non-money
   * frame words only: what is charged, when, the renewal and the cancel path
   * are money sentences and are passed in from `lib/money/copy.ts`.
   */
  plans: {
    monthly: "Monthly",
    annual: "Annual",
    /** The plan cards' group name. */
    choose: "Choose a plan",
    recommended: "Recommended",
    /** `{amount}` is formatted money. Shown on the annual card only when Session 2 supplies the real saving. */
    saving: "Saves {amount} a year",
    perMonth: "a month",
    perYear: "a year",
    benefits: "What you get",
    trialTitle: "How the trial works",
    today: "Today",
    /** Step labels; each is followed by the real date in the timeline. */
    remindStep: "We remind you",
    endStep: "The trial ends",
    /** Shown in place of a date the server has not supplied. */
    dateUnknown: "Date to be set when you start",
    /** Shown in the foot in place of the terms and the action when the chosen plan has no complete set of terms. */
    termsNotReady: "This plan's terms are not ready yet, so it cannot be chosen here.",
  },

  /**
   * Space Analytics (feature register J3, north star 16.6, I1). Every figure
   * these words sit beside is counted in `components/agent/intel/space-model.ts`
   * from `bookings` (any period) or `public.listing_funnel` (seven days only).
   * The funnel stage names are `shape.funnel.stages`, reused, so the two
   * screens never call one figure two things.
   */
  analytics: {
    /** The period control's accessible name. */
    period: "Period",
    ranges: { "7d": "7 days", "30d": "30 days", "90d": "90 days", all: "All time" },
    /** Which days a figure covers. "Since you joined" is the agents row's own date. */
    span: { "7d": "The last 7 days", "30d": "The last 30 days", "90d": "The last 90 days", all: "Since you joined" },
    /** `{confirmed}` and `{total}` are numbers. A cohort, never a rate. */
    confirmedOf: "{confirmed} of {total} confirmed",
    /** The same pair where the heading already says "confirmed". */
    ofTotal: "{confirmed} of {total}",
    /** In place of a figure whose period reaches past what was read. */
    notCounted: "Could not be counted",
    partial: "Your oldest requests reach further back than this page reads at once, so periods that far back show no figure.",
    requestsUnavailable: "Booking requests could not be read just now. Nothing is lost: they are counted again the next time this page opens.",
    funnelUnavailable: "Seen, opened and the rest of each listing's week are not being counted just now, so those figures are not shown.",
    chart: {
      requests: { day: "Requests by day", week: "Requests by week", month: "Requests by month" },
      confirmed: {
        day: "Confirmed, by the day they were requested",
        week: "Confirmed, by the week they were requested",
        month: "Confirmed, by the month they were requested",
      },
      period: { day: "Day", week: "Week", month: "Month" },
      requestsHead: "Requests",
      confirmedHead: "Confirmed",
      /** `{from}` and `{to}` are formatted dates: one bar of the 90-day chart. */
      span: "{from} to {to}",
      /** A period with nothing on record, in the chart's table. */
      none: "Not on record",
      /** Over the hatched slots. */
      empty: "Nothing on record for these days. Each request lands here on the day it is made.",
      /** `{label}` names a period, `{count}` is a number. */
      most: "Most in one period: {label}, {count}",
    },
    /** Under a chart whose every period is a measured zero. */
    zero: "No booking requests in these days.",
    metricsTitle: "Every figure",
    /** In place of a funnel figure when another period is chosen. */
    sevenOnly: "7 days only",
    metrics: {
      requests: {
        title: "Booking requests",
        blurb: "Every request to book or rent one of your listings, counted on the day it was made.",
      },
      confirmed: {
        title: "Confirmed bookings",
        blurb: "The requests made in these days that now stand confirmed.",
      },
      conversion: {
        title: "Requests confirmed",
        blurb: "Of the requests made in these days, how many now stand confirmed. A count, not a rate: a rate over so few requests would be noise.",
      },
      seen: { blurb: "Signed-in people who saw the listing in results, once each per day." },
      opened: { blurb: "Signed-in people who opened the listing, once each per day." },
      saved: { blurb: "Saves by signed-in people. A save made while signed out stays on that phone and is never counted." },
      enquired: { blurb: "Conversations started about the listing." },
      booked: { blurb: "Viewings booked on the listing." },
    },
    sevenDays: "Counted over the last seven days only: that is the one period Vallo counts these for.",
    noTotal: "Some of your live listings were not read, so there is no total. Each listing's own figure is below.",
    byListing: "By listing",
    noneByListing: "No listing had any in these days.",
    /** The confirmed share bar's accessible name, and its other part. */
    shareLabel: "Requests confirmed, out of the requests made",
    notConfirmed: "Not confirmed",
    absent: {
      title: "Not counted on Vallo",
      uniqueViewers: "Unique viewers. A viewer is counted once a day and the day's record is deleted when it ends, so nobody is followed from one day to the next.",
      engagedViews: "Engaged views. Nothing measures how long a listing is looked at.",
      shares: "Shares. Sharing a listing is not recorded.",
      contacts: "Contact reveals. Showing a phone number is not recorded.",
    },
    listings: {
      title: "Each listing's week",
      blurb: "Seen, opened and enquired over the last seven days. Open a listing for its whole week.",
      /** `{seen}`, `{opened}` and `{enquired}` are numbers. */
      line: "Seen {seen} · Opened {opened} · Enquired {enquired}",
    },
    week: {
      title: "This listing's week",
      lede: "The last seven days, stage by stage, beside the middle figure for similar homes from other listers in the same city.",
      /** `{median}` is a number: the middle figure for similar homes. */
      similar: "Similar homes: {median}",
      /** When fewer than five similar homes from other listers are live. */
      similarTooFew: "Similar homes: too few to compare",
      health: "Listing health",
      edit: "Edit listing",
      notLive: "Only a live listing is counted. Publish it and its week starts here.",
      example: "This is an example listing, so it is never counted.",
      missing: "This listing is not one of yours, or it is no longer here.",
      unavailable: "This listing's week could not be read just now. Nothing is lost; try again in a moment.",
    },
    back: "All figures",
  },

  /**
   * Listing Health (feature register J4, I1). Six explanations and the
   * recommendations a rule already enforced on the platform asks for; the
   * rules are in `components/agent/intel/health-model.ts`. No overall score
   * exists, and none is printed.
   */
  health: {
    title: "Listing health",
    lede: "What this listing's record holds and what it is missing. There is no overall score: each line is a fact you can act on.",
    /** The action on a listing row that opens this page. */
    open: "Health",
    allInPlace: "Everything Vallo can look at on this listing is in place.",
    /** `{things}` is a counted phrase ("2 things"). */
    toAdd: "{things} to add",
    states: {
      present: "In place",
      missing: "Missing",
      notHeld: "Not held",
      notAsked: "Not asked",
      unread: "Not read",
    },
    rows: {
      floorPlan: {
        title: "Floor plan",
        notHeld: "Vallo has nowhere to keep a floor plan yet, so this is not asked of you.",
      },
      amenities: {
        title: "Amenities",
        /** `{count}` is a number. */
        present: "{count} listed",
        missing: "None listed. A listing needs at least one.",
      },
      inspection: {
        title: "Inspection",
        /** `{date}` is a formatted date. */
        present: "Inspected by Vallo on {date}",
        missing: "No Vallo inspection on record.",
      },
      photos: {
        title: "Photographs",
        /** `{photos}` is a counted phrase ("6 photos"). */
        present: "{photos}, with a cover",
        /** `{photos}` is a counted phrase, `{min}` a number. */
        few: "{photos} of the {min} a listing needs",
        noCover: "{photos}, and none chosen as the cover",
      },
      availability: {
        title: "Availability",
        /** `{date}` is a formatted date. */
        present: "Last said to be available on {date}",
        /** `{date}` is a formatted date, `{limit}` a number of days. */
        missing: "Last said to be available on {date}, more than {limit} days ago.",
        never: "Not said to be available since it went live.",
        notAsked: "Only a live listing is asked.",
        unread: "When you last said it is available could not be read.",
      },
      verification: {
        title: "Ownership or mandate",
        missing: "No title document or owner's instruction on record yet.",
        /** The exact backed phrase (claims rule): `listings.address_verified_at`. */
        address: "Address checked",
      },
    },
    recsTitle: "What to do",
    recsNone: "Nothing to do from this listing's record right now.",
    recs: {
      photos: {
        title: "Add photographs",
        /** `{photos}` is a counted phrase ("1 photo"), `{min}` a number. */
        body: "Add {photos} to reach the {min} every listing needs.",
        cover: "Choose which photo leads the listing. The first one is the cover.",
        action: "Edit photos",
      },
      mandate: {
        title: "Show who you let for",
        body: "Add the owner's instruction, so staff can ring the owner and record the mandate.",
        action: "Open the mandate",
      },
      ownership: {
        title: "Show the property is yours",
        body: "Send your title document through verification, so staff can record it.",
        action: "Open verification",
      },
      description: {
        title: "Say more in the description",
        /** `{words}` and `{min}` are numbers. */
        body: "Words so far: {words}. A listing needs {min}.",
        action: "Edit description",
      },
      availability: {
        title: "Confirm it is still available",
        /** `{limit}` is a number of days. */
        body: "Renters read a listing confirmed in the last {limit} days as current.",
        action: "Still available",
        done: "Confirmed. Renters see it is current.",
        failed: "That did not go through. Nothing changed. Try again.",
      },
      amenities: {
        title: "List its amenities",
        body: "Choose at least one amenity guests will find.",
        action: "Edit amenities",
      },
      funnel: { title: "From this week's figures" },
    },
    notGiven: "Price advice and floor plans are not given here: no record on Vallo can support them yet.",
    example: "This is an example listing, so it has no health to show.",
    missing: "This listing is not one of yours, or it is no longer here.",
    unavailable: "This listing's record could not be read just now. Nothing is lost; try again in a moment.",
  },
};
