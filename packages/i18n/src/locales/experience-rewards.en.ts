/**
 * Session 3's copy for the Rewards Balance and the referral dashboard (D51,
 * Round 3 C3). One module per owner, so this never edits another agent's file.
 *
 * FRAME WORDS ONLY. Labels, headings, states and the share message live here.
 * Every SENTENCE that says how money moves (what a Rewards Balance is, what
 * qualifies a referral, the minimum, how the fee is set, where a withdrawal is
 * paid from) lives in `apps/web/src/lib/money/copy.ts` and is passed in, so
 * the screens, the Terms and the help centre cannot drift apart.
 *
 * NO RATE IS WRITTEN HERE. The reward, the monthly cap and the withdrawal
 * minimum are policy data (`money_policy`) and arrive as `{amount}` and
 * `{count}` placeholders filled from the server's read.
 *
 * THE WORDS THAT ARE NEVER USED: wallet (Vallo owes this money; it does not
 * hold it), downline, level, team, tree, passive, investment returns, and any
 * share line that sells the bounty instead of the product.
 *
 * English only: ha, ig and yo fall back to it until a translator supplies a
 * line, because an invented translation is worse than none.
 */
export const experienceRewardsEn = {
  title: "Rewards",
  lede: "What Vallo owes you for people who joined with your link.",

  /** The figure card. "Rewards Balance" is the mandated term (D51). */
  balance: {
    label: "Rewards Balance",
    available: "Available",
    pending: "Pending",
    pendingHint: "Waiting for referrals to qualify",
    lifetime: "Earned in total",
    lifetimeHint: "Everything added since you started",
  },

  /** Policy figures, as label and figure pairs. The figures come from `money_policy`. */
  policy: {
    label: "How it is counted",
    perReferral: "For each qualified referral",
    monthlyCap: "Qualified referrals counted a month",
    minimum: "Minimum withdrawal",
  },

  actions: {
    withdraw: "Withdraw",
    referrals: "Your referrals",
    history: "Rewards history",
  },

  /** `{count}` is a number. The referrals row's value on the dashboard. */
  referralsCount: "{count} joined",

  /** The invite link card. */
  invite: {
    label: "Your invite link",
    code: "Code {code}",
    copy: "Copy link",
    copied: "Copied",
    share: "Share",
    qrShow: "Show QR code",
    qrHide: "Hide QR code",
    /** The QR code's accessible name. */
    qrLabel: "QR code for your invite link",
    qrHint: "Let somebody scan this with their phone camera.",
    /** Said when the clipboard refused, so the person can still take the link. */
    copyFailed: "The link could not be copied here. Press and hold it to copy it yourself.",
    /** Said when there was no share sheet and the link went to the clipboard instead. */
    sharedAsCopy: "There is no share sheet on this device, so the link was copied instead.",
    sheetTitle: "Share your invite",
    sheetBody: "Whoever opens your link sees your first name and nothing else about you.",
    sheetCopy: "Copy the link",
    sheetCopyHint: "Paste it into any chat",
    sheetWhatsapp: "Share on WhatsApp",
    sheetMore: "More ways to share",
    sheetMoreHint: "Messages, email and your other apps",
    /**
     * THE SHARE MESSAGE SELLS THE PRODUCT, NEVER THE BOUNTY (D51). It says
     * what Vallo does for the person receiving it, in a claim the invite door
     * already makes (`publicDoors.invite.doorBody`), and nothing about what the
     * sender earns. `{url}` is the invite link.
     */
    shareText: "Join me on Vallo. Homes, land and stays across Nigeria, with the move-in cost written down before you call anybody. {url}",
  },

  /** A campaign bonus: progress toward a target. Never a tree, a level or a rank. */
  campaign: {
    label: "Campaign bonus",
    /** `{reached}` and `{target}` are numbers. */
    progress: "{reached} of {target} qualified referrals",
    bonus: "Bonus when you reach it",
    /** `{date}` is a formatted date. A real end date, never a countdown. */
    ends: "Ends {date}",
  },

  referrals: {
    title: "Your referrals",
    lede: "People who joined with your link, and where each one stands.",
    summary: "Where your referrals stand",
    /** Shown in place of a first name the person did not give. */
    unnamed: "Somebody you invited",
    /** `{date}` is a formatted date. */
    joinedOn: "Joined {date}",
    qualifiedOn: "Qualified {date}",
    status: {
      joined: "Joined",
      pending: "Pending",
      under_review: "Under review",
      qualified: "Qualified",
    },
    /**
     * What each status means, in one line. UNDER REVIEW NEVER SAYS WHY: no
     * risk reason, check name or signal reaches a member's screen.
     */
    meaning: {
      joined: "Signed up with your link.",
      pending: "Using Vallo, and not qualified yet.",
      under_review: "A person at Vallo is looking at it before it can qualify.",
      qualified: "Qualified, and counted in your Rewards Balance.",
    },
    meaningsLabel: "What each one means",
    emptyTitle: "Nobody has joined with your link yet",
    emptyBody: "When somebody signs up with your link, they are listed here with where they stand.",
    emptyAction: "Share your link",
  },

  history: {
    title: "Rewards history",
    lede: "Every amount added to your Rewards Balance or taken from it.",
    kind: {
      referral: "Referral qualified",
      bonus: "Campaign bonus",
      withdrawal: "Withdrawal",
      reversal: "Reward reversed",
    },
    /** `{name}` is a first name. */
    referralNamed: "{name} qualified",
    state: {
      done: "Done",
      processing: "Processing",
      failed: "Did not go through",
    },
    /** `{bank}` is a bank's name, `{last4}` four digits. */
    to: "To {bank} ending {last4}",
    /** `{amount}` is formatted money. */
    fee: "Fee {amount}",
    received: "You received {amount}",
    /** Said to a screen reader before a figure, since the plus and minus signs are drawn, not read. */
    added: "Added",
    takenOut: "Taken out",
    emptyTitle: "Nothing in your history yet",
    emptyBody: "Each reward and each withdrawal is listed here, newest first.",
  },

  withdraw: {
    title: "Withdraw",
    lede: "From your Rewards Balance to your bank account.",
    amountLabel: "Amount to withdraw",
    available: "Available",
    minimum: "Minimum withdrawal",
    to: "Paid to",
    /** `{bank}` is a bank's name, `{last4}` four digits. */
    toValue: "{bank} ending {last4}",
    /** The first step's action: ask the payout provider to prepare it and say the fee. */
    prepare: "See the fee",
    errors: {
      empty: "Enter an amount.",
      /** `{amount}` is the formatted minimum. */
      belowMinimum: "The minimum withdrawal is {amount}.",
      /** `{amount}` is the formatted available figure. */
      aboveAvailable: "You have {amount} available.",
      noDestination: "Add the bank account your rewards are paid to first.",
      unavailable: "The fee could not be read just now, so nothing was prepared. Try again in a moment.",
      /** The figures that came back did not add up, so they are not shown as a total. */
      mismatch: "The figures that came back did not add up, so they are not shown. Nothing has been sent.",
      expired: "That fee is no longer current. See the fee again for a fresh one.",
      confirmFailed: "The withdrawal could not be sent just now. Nothing has left your Rewards Balance.",
    },
    breakdown: {
      title: "Before you confirm",
      amount: "Amount",
      fee: "Processing fee",
      receive: "You'll receive",
    },
    confirm: "Confirm withdrawal",
    change: "Change amount",
    done: {
      title: "Withdrawal sent for processing",
      body: "It is processing now. It is in your rewards history, where its state changes when the bank confirms it.",
      action: "See rewards history",
    },
    belowMinimumTitle: "Not enough to withdraw yet",
    noDestinationTitle: "Add a bank account first",
    addAccount: "Add a bank account",
    notOpenTitle: "Withdrawals are not open",
    notOpenBody: "Withdrawing from a Rewards Balance is not switched on yet, so nothing can be prepared here.",
    back: "Back to rewards",
  },

  /**
   * D64: the programme has a monthly budget, and when it is reached new
   * referrals stop qualifying until it opens again. A pause, never a refusal.
   * Said on every rewards surface and on the invite hub, where it takes the
   * place of the invite link, so nothing invites under a reward while paused.
   * The sentence that says what is already earned is still paid is a money
   * sentence and lives in `lib/money/copy.ts`, never here. No date is ever
   * written in: `{date}` is drawn only when the server's read gives one.
   */
  pause: {
    label: "Rewards paused",
    title: "Rewards are paused this month",
    body: "No new referral can qualify while rewards are paused.",
    /** `{date}` is a formatted date, from the read only. */
    resumes: "They are due to resume on {date}.",
    /** Where the invite link would have been. */
    inviteOff: "Your invite link is not offered while rewards are paused.",
  },

  /** The states every rewards route draws in place of its content. */
  states: {
    notLiveTitle: "Rewards are not running yet",
    notLiveBody: "No reward is added for invites today, so there is no Rewards Balance to show. Your invite link works now.",
    notLiveAction: "Get my invite link",
    signedOutTitle: "Sign in to see your rewards",
    signedOutBody: "Your Rewards Balance and the people who joined with your link are shown only to you.",
    signIn: "Sign in",
    failedTitle: "Your rewards could not be read just now",
    failedBody: "Nothing has changed. Try again in a moment.",
    back: "Back to rewards",
  },
};
