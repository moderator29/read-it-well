/**
 * Session 3's copy for the navigation shell, the shared primitives and the navigation audit (W10).
 *
 * One module per owner so agents can add strings without editing en.ts at
 * the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. Money sentences never live
 * here; they come from `lib/money/copy.ts` (Session 2).
 */
export const experienceShellEn = {
  /* The side navigation's Payments row (`nav-model.ts`): what this person
     paid and what came back. It was a literal in the model. */
  navPayments: "Payments",
  /* The side navigation's invite row (`nav-model.ts`), to `/settings/invite`.
     It names what the page does and nothing about earning: while the rewards
     read is not live, the hub itself says there is no reward for inviting. */
  navInvite: "Referral",
  /* The money group (7 October 2026, D70). The founder opened the drawer,
     looked for what he had paid for, and could not find it: these three pages
     were built and reachable only by address. Each label is its page's title. */
  navMoneyLabel: "Money",
  /* The member balance (Part B phase 6), held by the escrow partner and read
     from it. Its page is /wallet; the word a member reads is Wallet (D78). */
  navBalance: "Wallet",
  navReceipts: "Receipts",
  navPayouts: "Payouts",
  navRefunds: "Refunds",
  /* D76: the public leaderboards (referrals, and the top on Vallo), beside
     Rewards in the money group. The page's own title. */
  navLeaderboard: "Leaderboard",
  /* D78: the Space Passport is a feature with its own row in the side
     navigation, not only a settings page. */
  navPassport: "Space Passport",
  /* D78: the platform's documents, beside the registered name at the foot of
     the side navigation. Each is its page's own short name. */
  navDocsLabel: "Documents",
  navDocsTerms: "Terms",
  navDocsPrivacy: "Privacy",
  navDocsSafety: "Safety",
  navDocsHelp: "Help",
};
