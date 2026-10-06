/**
 * Session 3's copy for settings, the referral hub, the Space Passport and verification (W6).
 *
 * One module per owner so nine agents can add strings without editing en.ts
 * at the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. Money sentences never live
 * here; they come from `lib/money/copy.ts` (Session 2).
 *
 * Every sentence below says only what the code can prove today. In particular
 * the referral lines promise no reward (none exists: `public.referral_codes`
 * records who brought whom and nothing else), and the passport lines are
 * about records Vallo wrote itself (`public.my_renter_passport`).
 */
export const experienceAccountEn = {
  /* ------------------------------------------------------------ settings */
  settings: {
    /**
     * One page per setting, with its explanation (D25). `what` is what the
     * page does, `who` is who sees what is on it. The two are drawn by
     * `SettingsLede` under the page header.
     */
    lede: {
      what: "What this page does",
      account: {
        what: "Who you are signed in as, where you are, what you came for and your search defaults. This is also where you sign out or close your account.",
        who: "Only you can see this page.",
      },
      notifications: {
        what: "Choose which kinds of update reach you, and which of your phones Vallo may notify.",
        who: "These choices belong to your account. You can change them whenever you like.",
      },
      privacy: {
        what: "What other people can see about you, where you are signed in, and who you have blocked. The rest of what Vallo holds about you is one tap down.",
        who: "Only you can see this page.",
      },
      moneyLock: {
        what: "Use this phone's face or fingerprint lock before money moves, so a stolen unlocked phone cannot send it.",
        who: "The lock stays on your phone. Vallo never receives your face or your fingerprint.",
      },
      ai: {
        what: "The assistant answers questions about Vallo. This page shows whether you agreed to how it works, and lets you take that back.",
        who: "Your agreement is kept against your account and on this device.",
      },
      data: {
        what: "A copy of what Vallo holds about your account, and a way to clear what this device has saved.",
        who: "The copy is made for you alone, and only while you are signed in.",
      },
      appearance: {
        what: "Theme, text size, motion and language for this device.",
        who: "These choices apply to this device. Dark is the default.",
      },
      help: {
        what: "Ask the assistant, read the help centre, check what you have reported, and find the legal pages.",
        who: "What you report goes to Vallo's team.",
      },
      invite: {
        what: "Your own invite code and link. When somebody signs up with it, the sign-up is recorded as coming from you.",
        who: "Whoever opens your link sees your first name and nothing else about you.",
      },
      passport: {
        what: "What Vallo itself recorded about you, shown to a lister only in the conversations you choose.",
        who: "It is off until you turn it on, and no lister may ask you for it.",
      },
    },
    /** The glass navigation inside a settings screen with sections. */
    nav: {
      toggle: "Sections on this page",
      label: "On this page",
    },
    account: {
      navAccount: "Sign in and account",
      navPlace: "Your place",
      navSearch: "Search",
    },
    privacy: {
      navVisible: "What others see",
      navSecurity: "Security",
      navMore: "More",
      /** The doors that used to be groups crammed into this page. */
      moreLabel: "More privacy and security",
      moneyLockSub: "Face or fingerprint before money moves",
      aiSub: "What you agreed to, and how to take it back",
      dataSub: "Download a copy, or clear what this device saved",
    },
    notificationsNav: {
      navChannels: "What reaches you",
      navPhone: "On your phone",
      /** The link at the foot of one notification: the generic settings page, which has no per-category choice. */
      fromNotice: "Change what reaches you",
    },
  },

  /* -------------------------------------------------------- referral hub */
  invite: {
    /** The sealed gift, before the ticket opens. */
    sealed: "Your invite is ready",
    open: "Open your invite",
    replay: "Play the reveal again",
    codeLabel: "Your invite code",
    copy: "Copy",
    copied: "Copied",
    copyAria: "Copy your invite code",
    share: "Share",
    shareAria: "Share your invite",
    /** The share sheet (`ActionSheetIllustrated`). */
    sheetTitle: "Share your invite",
    sheetBody: "Send the link, or just the code. Whoever opens it sees only your first name.",
    sheetCopyLink: "Copy the link",
    sheetCopyLinkHint: "Paste it into any chat",
    sheetMore: "More ways to share",
    sheetMoreHint: "Messages, email and your other apps",
    /** Rows under the ticket. */
    linkLabel: "Your link",
    groupLabel: "Your invites",
    referralsTitle: "Who joined with your code",
    howTitle: "How invites work",
    howSub: "What is recorded, and what is not",
    /** `/settings/invite/how-it-works`. */
    how: {
      lede: "Invites are a way to bring somebody you know to Vallo. This is everything they do, and everything they do not.",
      codeTitle: "Your code is yours",
      codeBody: "Vallo made this code for your account the first time you opened this page. It is six characters long and it only ever points to you.",
      seenTitle: "What the other person sees",
      seenBody: "Somebody who opens your link sees your first name and nothing else about you.",
      recordedTitle: "What is recorded",
      recordedBody: "When they sign up with your link, or type your code, the sign-up is recorded as coming from you.",
      notTitle: "What is not",
      notBody: "Nothing here is an investment. There is nothing to pay in, only the person you invite is counted, and nothing builds up from the people they invite.",
      back: "Back to your code",
    },
    /**
     * `/settings/invite/referrals` and one referral. Vallo records a sign-up that
     * comes from a code, but a member has no way to read that list, so both pages
     * say so plainly. No reward, stage or earnings wording lives here: the
     * founder has not decided on a reward, and none is promised.
     */
    referrals: {
      lede: "Vallo records a sign-up that comes from your code.",
      emptyTitle: "This list is not shown here",
      emptyBody: "Vallo records when somebody signs up with your code, but this page cannot show you who. Your code and link are all you need.",
      emptyAction: "Back to your code",
    },
  },

  /* ---------------------------------------------------- the Space Passport */
  passport: {
    credentialLabel: "Renter passport",
    on: "On",
    off: "Off",
    /** `{month}` is a month and year. */
    credentialSince: "On Vallo since {month}",
    factsLabel: "What it says",
    factsLede: "Each line is something Vallo recorded itself, with the date where there is one.",
    factsEmpty: "Nothing yet. As you confirm your phone, attend inspections and rent through Vallo, it fills itself in.",
    shareLabel: "Sharing",
    switchLabel: "Show my passport",
    switchOnSub: "Shown only in the conversations you choose",
    switchOffSub: "Off. No lister can see it.",
    cardLabel: "What a lister would see",
    cardLede: "This is the whole of it. Nothing else is shown.",
    cardShare: "Show it in a conversation",
    sheetTitle: "Show your passport",
    sheetBody: "A passport is shown one conversation at a time, and only to the lister in it.",
    sheetOpen: "Open a conversation",
    sheetOpenHint: "Choose the lister you want to show it to",
    sheetTurnOff: "Turn it off",
    sheetTurnOffHint: "Takes it back from every conversation",
    /** Shown on the share sheet when "Turn it off" throws (a dropped request). */
    sheetTurnOffFailed: "That did not go through. Your passport is still on.",
    evidenceBack: "Back to your passport",
    evidenceCheckedLabel: "How it was checked",
    evidenceDateLabel: "Date",
    evidenceCountLabel: "Recorded so far",
    evidenceSeenLabel: "Where a lister sees it",
    evidenceSeen: "As one line on your passport, only in a conversation where you chose to show it.",
    evidenceNotFoundTitle: "That is not on your passport",
    evidenceNotFoundBody: "A line only appears once Vallo has recorded something behind it. Your passport is one step back.",
    facts: {
      phone: {
        title: "Phone confirmed",
        checked: "Vallo sent a six-digit code to your mobile number and you entered it. The number itself is never shown to anybody.",
        open: "Manage your phone",
      },
      identity: {
        title: "Identity matched with NIMC",
        checked: "Your virtual NIN was checked with NIMC. Vallo never stores your NIN.",
        open: "Open verification",
      },
      attended: {
        title: "Inspections attended",
        checked: "An inspection counts when both phones recorded it at the gate: yours showing the code, and the lister's or their delegate's confirming they showed you the space. Your word alone never counts.",
        open: "See your plans",
      },
      tenancies: {
        title: "Tenancies paid through Vallo",
        checked: "Counted from rent payments made through Vallo on bookings that are confirmed or completed.",
        open: "See your payments",
      },
      since: {
        title: "On Vallo since",
        checked: "The day your account was created.",
        open: "Open your account",
      },
    },
  },

  /* ------------------------------------------------------- verification */
  verification: {
    pathLabel: "What each step checks",
    pathLede: "Four steps, in order. Each one names what a person at Vallo actually looks at.",
    /** `{date}` is a date. */
    passedOn: "Passed on {date}",
    /** `{date}` is a date. */
    refusedOn: "Refused on {date}",
    passed: "Passed",
    failedLabel: "Needs another go",
    inReview: "With a reviewer",
    next: "Next",
    later: "Later",
    checkedLabel: "What was checked",
    willCheckLabel: "What will be checked",
    reviewerSaid: "The reviewer wrote",
    documentsApproved: "Documents approved",
    documentsRejected: "A document was refused",
    tierLabel: "Where you are",
    /** `{done}` and `{total}` are whole numbers. */
    stepsOf: "{done} of {total} steps passed",
    /** Drawn instead of the path when an agent's verification could not be read. */
    unreadable: "We could not read your verification right now.",
  },
};
