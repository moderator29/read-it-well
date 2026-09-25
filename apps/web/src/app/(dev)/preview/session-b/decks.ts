/**
 * The decks under `/preview/session-b`, listed by its index page. The
 * route-files test checks this list against the directories on disk, so a new
 * deck that is not named here is red.
 */
export const SESSION_B_DECKS: readonly (readonly [slug: string, note: string])[] = [
  ["admin", "Admin console shell: overview, operations, analytics, back arrow"],
  ["admin-review", "Review desks: listings, review, moderation, KYC"],
  ["audit2-fixes", "Fixes from the second interface audit"],
  ["feed", "Around: the feed"],
  ["inspection", "The inspection sheet and its shell"],
  ["posts", "Posts in Around"],
  ["profile", "The profile surface"],
  ["signin", "Sign in"],
  ["sweep-home", "Platform sweep: the home group"],
  ["sweep-orphans", "Platform sweep: screens with no other deck"],
  ["sweep-settings", "Platform sweep: settings"],
  ["sweep-social", "Platform sweep: social"],
  ["sweep-stays", "Platform sweep: stays and checkout"],
  ["welcome", "Welcome and first run"],
];
