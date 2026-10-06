/**
 * Session 3's copy for feature onboarding, Pro presence, plans, artefact cards and streaks (W7).
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
     * WAITING ON SCREENS THAT DO NOT EXIST YET. Wallet, escrow and withdrawal
     * have no route today, so their first runs are content only and are not
     * mounted. Their bodies are money sentences and wait on Session 2
     * (`lib/money/copy.ts`, request W7-R3); only the titles live here.
     *
     * UNREACHABLE TODAY, BY CONSTRUCTION: `/first-run/[feature]` 404s any key
     * outside `MOUNTED_FIRST_RUNS`, `canMount` refuses a panel without a body,
     * and no page gates on these three. They also claim nothing: no rail for
     * held or protected money is live (custody retired 25 September; Payluk
     * escrow is the target, not the state, D41), so the words name the
     * feature and never promise protection. Revisit them with Session 2's
     * sentences when the escrow rail and its screens exist.
     */
    wallet: {
      name: "your wallet",
      p1Title: "Available and in escrow are different money",
      p2Title: "Where the money actually is",
      action: "Open my wallet",
    },
    escrow: {
      name: "escrow",
      p1Title: "Who holds the money",
      p2Title: "What releases it",
      p3Title: "If something goes wrong",
      action: "Open escrow",
    },
    withdrawal: {
      name: "withdrawals",
      p1Title: "Where it lands",
      p2Title: "What it costs",
      p3Title: "How long it takes",
      action: "Start a withdrawal",
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
  },

  /**
   * Standing streaks (north star 15.1, D17). A streak counts a real-world
   * behaviour with a counterparty; nothing here may describe an app-open.
   */
  streaks: {
    paused: "Paused",
    /** Under a paused count. */
    pausedWhy: "Paused while there is nothing to count. Your record is kept.",
    /** `{count}` is a number. The best run, quietly beside the current one. */
    best: "Best {count}",
    /** The window marks' accessible name. `{kept}` and `{total}` are numbers. */
    window: "{kept} of the last {total} kept",
    unit: {
      payments: "payments on time",
      weeks: "weeks replied in time",
      months: "months without a dispute",
      confirmations: "weeks confirmed available",
      inspections: "inspections attended",
      healthMonths: "months at full health",
    },
    name: {
      onTimeRent: "On-time rent",
      replyTime: "Reply time",
      disputeFree: "Dispute-free",
      freshness: "Listing freshness",
      inspections: "Inspection follow-through",
      completeListing: "Complete listing",
    },
    earned: {
      share: "Share",
      back: "Back",
      /** The medal's accessible name: tapping it replays the moment once. */
      replay: "Play it again",
    },
  },
};
