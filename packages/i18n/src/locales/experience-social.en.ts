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
  newStory: {
    title: "Write a story",
    lede: "A picture, a headline, and a line or two. It stays up.",
    unreachableTitle: "We cannot reach stories right now",
    unreachableBody: "This is on our side, not yours. Nothing can be published from here at the moment. Nothing you have written has been lost, and the rest of the app works as normal.",
    backToHome: "Back to home",
  },
};
