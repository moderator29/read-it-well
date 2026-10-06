/**
 * Session 3's copy for Around, posts, stories and profiles (W4).
 *
 * One module per owner so nine agents can add strings without editing en.ts
 * at the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. Money sentences never live
 * here; they come from `lib/money/copy.ts` (Session 2).
 *
 * Two sections, one per working area, so the two never edit the same lines:
 * `feed` (Around, posts, stories) and `profile` (/u and /profile).
 */
export const experienceSocialEn = {
  feed: {
    /* Said after a name whose stories this reader has all opened (the ring's
       quiet state must never be the only way to learn it). */
    storySeen: "seen",
    /* The one line under the title of a post's action sheet (`ActionSheet`). */
    sheetBody: "Choose one. Nothing happens until you do.",
    /* The report sheet a post's menu opens, on the feed and on a thread
       (Round 3 sweep, C3). `{handle}` is the author's handle. */
    reportTitle: "Report this post",
    reportPostedBy: "Posted by @{handle}",
    reportPostedOnAround: "Posted on Around",
    /* The author, in the menu's sentences, when they have no handle. */
    thisPerson: "this person",
  },
  profile: {
    /* The badge row, the badge sheet and the earned moment (W4). */
    badgesTitle: "Badges",
    badgeGivenBy: "Given by the Vallo team",
    badgeEarnedOn: "Earned on {date}",
    badgeMeans: "What it means",
    momentOverline: "Badge earned",
    momentShare: "Share",
    momentBack: "Back",
    momentShareText: "I earned {badge} on Vallo.",
    momentCopied: "Copied. Paste it anywhere.",
    momentReplayHint: "Tap the medal to see it again",
  },
  /* The paused screen (`SocialPaused`), shown when social is switched off. */
  paused: {
    backToHome: "Back to home",
    searchStays: "Search stays",
  },
  /** `/stories/new`: the page's own words, moved out of the code (Round 3 sweep, C3). */
  /**
   * `/u`, the people directory: the page's own words, moved out of the page
   * (Round 3 sweep, C3). `{query}` is what was searched for.
   */
  people: {
    title: "People",
    unreachableTitle: "We cannot reach profiles right now",
    unreachableBody: "This is on our side, not yours. Nobody's page can be read from here at the moment. The rest of the app works as normal.",
    goToAround: "Go to Around",
    searchLabel: "Search for somebody by name or handle",
    clear: "Clear the search",
    placeholder: "A name or a handle",
    search: "Search",
    matching: "People matching {query}",
    arrived: "People who just arrived",
    searchedBy: "Searched by name and handle.",
    noMatchTitle: "Nobody here is called {query}",
    noneTitle: "Nobody has a page yet",
    noMatchBody: "Nobody matched that name or handle. Try a shorter piece of it, or the handle itself.",
    noneBody: "The first person to claim a handle appears here. Claim yours and yours is the first name anybody arriving reads.",
    everybody: "See everybody",
  },
  /**
   * `/u/[handle]/edit` and the two follow lists: the pages' own words, moved
   * out of the pages (Round 3 sweep, C3). `{handle}` is a handle without the
   * at sign; `{own}` is the reader's own handle.
   */
  editProfile: {
    title: "Edit your profile",
    yourProfile: "Your profile",
    unreachableTitle: "We cannot reach profiles right now",
    unreachableBody: "This is on our side, not yours. A handle cannot be claimed from here at the moment. Nothing you typed was lost, and the rest of the app works as normal.",
    backToHome: "Back to home",
    signedOutTitle: "Sign in to claim your handle",
    signedOutBody: "@{handle} is claimed from your own account, so people know a name belongs to one person. Sign in and it takes about a minute.",
    signIn: "Sign in",
    seeProfile: "See the profile",
    takenTitle: "@{handle} belongs to somebody else",
    takenBody: "Handles are one to a person and they are never reassigned quietly. Pick another name and it is yours in one step.",
    visit: "Visit @{handle}",
    backToAccount: "Back to your account",
    notYoursTitle: "This is not your profile",
    notYoursBody: "You already hold @{own}. Edit that one, or visit @{handle} to see whose it is.",
    free: "@{handle} is free. Take it and this becomes your address on Vallo.",
  },
  follows: {
    followersMeta: "Followers of @{handle}",
    followingMeta: "Who @{handle} follows",
  },
  newStory: {
    title: "Write a story",
    lede: "A picture, a headline, and a line or two. It stays up.",
    unreachableTitle: "We cannot reach stories right now",
    unreachableBody: "This is on our side, not yours. Nothing can be published from here at the moment. Nothing you have written has been lost, and the rest of the app works as normal.",
    backToHome: "Back to home",
  },
  /**
   * `/around/[slug]`, one place: the page's own words, moved out of the page
   * (Round 3 sweep, C3). `{name}` is the place, `{city}` its city.
   */
  place: {
    title: "Around",
    metaTitle: "Around {name}",
    metaDescription: "What is happening around {name}, {city}.",
    unreachable: "We cannot reach this place right now. This is on our side, not yours. Nothing has been lost, and the rest of the app works as normal.",
    partOf: "Part of {name}",
  },
  /**
   * `/post/[id]`, one thread: the page's own words (Round 3 sweep, C3).
   * `{place}` is the place the post sits in, `{who}` its author.
   */
  post: {
    title: "Post",
    thread: "Thread",
    aroundPlace: "Around {place}",
    metaTitle: "{who} on Around",
    metaDescription: "A post on Around, on Vallo.",
  },
  /**
   * `/u/[handle]` when there is no page to draw, and the share line when
   * there is (Round 3 sweep, C3). `{handle}` without its @, `{name}` the
   * person. The unreachable screen reuses `people`'s words.
   */
  profilePage: {
    metaDescription: "{name} on Vallo.",
    malformedTitle: "That is not a handle",
    malformedBody: "A handle is 3 to 20 characters: letters, numbers and underscores, starting with a letter. Check the address and try again.",
    officialTitle: "@{handle} is a Vallo name",
    nothingTitle: "Nothing to show at @{handle}",
    officialBody: "This name is kept for Vallo itself, so nobody can hold it. @vallo is the assistant you can call into a conversation by naming it in a post.",
    claimableBody: "Either nobody holds this handle, or its owner is not reachable from your account. If it is going spare, you can take it and it becomes your address on Vallo.",
    ownHandleBody: "Either nobody holds this handle, or its owner is not reachable from your account. You already have a page of your own, and a person keeps one handle at a time.",
    signedOutBody: "Nobody we can show you is at this handle. Sign in to claim it, or to see whose it is.",
    claim: "Claim @{handle}",
    goToAccount: "Go to your account",
    signInToClaim: "Sign in to claim it",
    backToHome: "Back to home",
  },
  /**
   * `/profile`, the reader's own account page: what it says signed out and
   * when the profile row did not load (Round 3 sweep, C3).
   */
  account: {
    title: "Profile",
    noRow: "We could not load your account profile just now, so this page is showing what is held on this device. Sign out and back in, then open this page again.",
    whatIsHere: "What is here",
    findPlace: "Find a place",
    more: "More",
    help: "Help",
  },
  /** `/around`, the feed: its empty state's words (Round 3 sweep, C3). `{name}` is the chosen place. */
  around: {
    emptyIn: "Nothing in {name} yet",
    empty: "Nothing here yet",
    findPlaces: "Find places to join",
  },
};
