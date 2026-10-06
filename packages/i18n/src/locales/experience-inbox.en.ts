/**
 * Session 3's copy for messages, the notification centre, assistant and support (W5).
 *
 * One module per owner so nine agents can add strings without editing en.ts
 * at the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. Money sentences never live
 * here; they come from `lib/money/copy.ts` (Session 2).
 *
 * Counted phrases are `{ one, other }` pairs read through `plural()`, so a
 * count is never inflected by hand. Nothing here states a figure, a name or a
 * date: those arrive from the real row and are formatted where they are drawn.
 */
export const experienceInboxEn = {
  /* ------------------------------------------------ the notification centre */
  notifications: {
    title: "Notifications",
    unread: "{count} unread",
    markAllRead: "Mark all read",
    preferences: "Preferences",
    preferencesLabel: "Notification preferences",
    filterLabel: "Filter notifications by kind",
    families: {
      all: "All",
      money: "Money",
      trust: "Trust",
      spaces: "Spaces",
      messages: "Messages",
      account: "Account",
    },
    sections: {
      needsYou: "Needs you",
      fresh: "New",
      earlier: "Earlier",
    },
    day: { today: "Today", yesterday: "Yesterday" },
    empty: {
      title: "You are all caught up",
      body: "Bookings, messages, agreements and money all land here the moment they happen.",
      action: "Find a place",
    },
    emptyFamily: {
      title: "Nothing under {family}",
      body: "When something happens in this area it appears here, and in All.",
      action: "Show all",
    },
    unreadMark: "Unread",
    showOlder: "Show older",
    loadingOlder: "Loading older",
    olderFailed: "Older notifications did not load. Check your connection and try again.",
    verbs: {
      reply: "Reply",
      confirm: "Confirm",
      review: "Review",
      addDetails: "Add details",
      check: "Check",
      renew: "Renew",
      open: "Open",
    },
    group: {
      messages: { one: "{count} new message", other: "{count} new messages" },
      updates: { one: "{count} update", other: "{count} updates" },
      show: "Show the updates",
      hide: "Hide the updates",
    },
    details: "Details",
    openRow: "Open",
    /* The signed-out and unreachable states. */
    signedOut: {
      title: "Sign in to see your notifications",
      body: "Your bookings, messages and agreements are tied to your account, so we only ever show you your own.",
      action: "Sign in",
      secondary: "Notification settings",
    },
    unreachable: { action: "Try again" },
    loading: "Loading your notifications",
  },

  /* --------------------------------------------- one notification, in full */
  notificationView: {
    pageTitle: "Notification",
    back: "Notifications",
    whatHappened: "What happened",
    when: "When",
    received: "Received",
    about: "About",
    amount: "Amount in this notice",
    nextHeading: "What to do next",
    nothingAsked: "Nothing is asked of you. This is for your records.",
    backToList: "Back to notifications",
    timelineHeading: "Earlier on this",
    timelineNow: "This notice",
    timelineEmpty: "This is the first notice about it.",
    changePreferences: "Change what you are told about {family}",
    familyLines: {
      money: "A payment, a refund, or a date money is due.",
      trust: "A check, a badge, or a document that needs a look.",
      spaces: "A listing, a booking, a stay or a tenancy.",
      messages: "A conversation, or somebody in your circle.",
      account: "Your sign-in, your devices, or support.",
    },
    /* The noun the link to the underlying object names. */
    objects: {
      booking: "booking",
      payment: "payment",
      agreement: "agreement",
      tenancy: "tenancy",
      inspection: "inspection",
      conversation: "conversation",
      space: "space",
      verification: "verification",
      passport: "Space Passport",
      wallet: "wallet",
      ticket: "support ticket",
      post: "post",
      profile: "profile",
      setting: "setting",
      workspace: "workspace",
      page: "page",
    },
    openObject: "Open the {object}",
    notFound: {
      title: "This notification is not here",
      body: "It may belong to another account, or it was removed. Your list has the rest.",
    },
    signedOut: {
      title: "Sign in to read this notification",
      body: "A notification is only ever readable by the person it was sent to.",
      action: "Sign in",
    },
    unreachable: {
      title: "This notification could not be loaded",
      body: "The read did not go through. Nothing has changed on your account.",
      action: "Try again",
    },
    loading: "Loading the notification",
    sender: "From",
  },

  /* ------------------------------------------------------- the thread, 15.4 */
  thread: {
    unreadDivider: {
      one: "{count} unread message",
      other: "{count} unread messages",
    },
    quoted: {
      you: "You",
      replyingTo: "Replying to {name}",
      photo: "Photo",
      voice: "Voice note",
      file: "Attachment",
      unavailable: "The message you replied to is no longer here",
    },
    attachment: {
      photo: "Photo",
      voice: "Voice note",
      file: "File",
      open: "Open {name}",
      size: "{size}",
    },
    voice: {
      play: "Play voice note",
      pause: "Pause voice note",
      label: "Voice note, {duration}",
      labelUnknown: "Voice note",
      position: "Playback position",
      unavailable: "This voice note could not be played",
    },
    day: { today: "Today", yesterday: "Yesterday" },
    newMessages: "Jump to the newest message",
  },

  /* -------------------------------------------------------------- the inbox */
  inbox: {
    filters: {
      label: "Filter conversations",
      recent: "Recent",
      unread: "Unread",
      requests: "Requests",
      archived: "Archived",
      reported: "Reported",
    },
    emptyUnread: {
      title: "Nothing is waiting on you",
      body: "Every conversation here has been read. A new message brings its conversation back to this filter.",
    },
    unreadBadge: { one: "{count} unread message", other: "{count} unread messages" },
    presence: { online: "Online now" },
  },

  /**
   * `/messages/share/[kind]/[id]`: sending a listing, booking or stay into a
   * conversation as a card. The page's own words, moved out of the page so
   * ha, ig and yo can carry them (Round 3 sweep, C3).
   */
  share: {
    title: "Share to chat",
    intoTitle: "Share into this chat",
    signedOutTitle: "Sign in to share this",
    signedOutBody: "Sharing sends a card into one of your conversations, so it needs your account. You will come straight back here.",
    signIn: "Sign in",
    pausedTitle: "Messaging is paused for maintenance",
    pausedBody: "Nothing has been lost. Try again in a few minutes.",
    back: "Back",
  },

  /* ------------------------------------------------------------- assistant */
  assistant: {
    answerLabel: "Vallo AI",
    thinking: "Thinking",
    searching: "Searching listings",
    stop: "Stop",
    copy: "Copy answer",
    copied: "Copied",
    statusDone: "Answer complete",
    statusStopped: "Answer stopped",
    statusError: "The answer did not arrive",
    stoppedNote: "You stopped this answer. What arrived is kept.",
    islandTitle: "Vallo AI is answering",
    islandDetail: "Tap to go to the answer",
    islandOpen: "Go to the answer",
    expand: "Show details",
    collapse: "Hide details",
    you: "You",
  },

  /* --------------------------------------------------------------- support */
  support: {
    palette: {
      heading: "Search for help",
      placeholder: "Refunds, inspections, verification",
      popular: "Popular articles",
      matching: { one: "{count} matching answer", other: "{count} matching answers" },
      none: "No answer matches that yet.",
      noneHelp: "Try a shorter word, or ask a question above. A person reads every ticket.",
      hint: "Use the arrow keys to move and Enter to open",
      openAnswer: "Open the answer",
      browseAll: "Browse every answer in the help centre",
      clear: "Clear the search",
    },
    thread: {
      you: "You",
      support: "Vallo support",
      sending: "Sending",
      newReply: "New reply",
    },
  },
};
