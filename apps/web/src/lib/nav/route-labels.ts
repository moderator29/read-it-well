import { matchRoute } from "./resolve";

/**
 * What a screen is CALLED, for the back control's accessible name.
 *
 * A back control that says only "Back" makes a screen-reader user press it to
 * find out where it goes. "Back to Messages" says it before the press, which
 * is what the platform's own navigation bars do. Keyed by the same patterns as
 * `route-parents.ts`, so a dynamic screen is named for what it is ("the
 * listing") rather than for its id.
 *
 * ENGLISH ONLY, ON PURPOSE. These names are composed into "Back to <name>" for
 * an English reader. Every other locale keeps the translated `common.back`
 * word, because a Yoruba, Hausa or Igbo reader is better served by one word in
 * their language than by a sentence in someone else's. `BackControl` makes
 * that choice; `resolve.test.ts` checks every declared parent has a name here.
 *
 * A pattern with no name answers `null`, and the control says "Back".
 */
const NAMES: Readonly<Record<string, string>> = {
  "/": "Vallo",
  "/about": "About",
  "/docs": "the guide",
  "/docs/[slug]": "the chapter",
  "/r": "referrals",
  "/sign-in": "sign in",
  "/sign-in/email": "sign in",
  "/sign-up": "sign up",
  "/sign-up/email": "sign up",
  "/sign-up/finish": "finishing sign up",
  "/forgot-password": "password reset",
  "/welcome": "the welcome",
  "/home": "Home",
  "/home-or-landing": "Home",
  "/stays": "Stays",
  "/search": "Search",
  "/listing/[id]": "the listing",
  "/saved": "Saved",
  "/saved/searches": "saved searches",
  "/record/[code]": "the record",
  "/tenancy/[id]": "the tenancy",
  "/price": "Price check",
  "/price/area/[id]": "the area price",
  "/stays/search": "stay search",
  "/stay/[id]": "the stay",
  "/restaurants": "Restaurants",
  "/restaurant/[id]": "the restaurant",
  "/bookings": "Plans",
  "/bookings/[bookingId]": "the booking",
  "/messages": "Messages",
  "/messages/[id]": "the conversation",
  "/agreements": "Agreements",
  "/agreements/[id]": "the agreement",
  "/payments": "Payments",
  "/around": "Around",
  "/around/[slug]": "the district",
  "/around/settings": "feed settings",
  "/post/[id]": "the post",
  "/stories/[id]": "the story",
  "/u": "people",
  "/u/[handle]": "the profile",
  "/u/[handle]/followers": "followers",
  "/u/[handle]/following": "following",
  "/assistant": "the assistant",
  "/notifications": "Notifications",
  "/profile": "Profile",
  "/profile/application": "your application",
  "/profile/setup": "profile setup",
  "/settings": "Settings",
  "/settings/account": "Account",
  "/settings/devices": "Devices",
  "/settings/help": "Help",
  "/settings/privacy": "Privacy",
  "/settings/notifications": "Notifications settings",
  "/settings/payments": "Payment settings",
  "/support": "Help and support",
  "/support/messages": "your tickets",
  "/support/messages/[id]": "the ticket",
  "/legal/privacy": "the privacy policy",
  "/legal/terms": "the terms",
  "/admin": "the console",
  "/admin/bookings": "Bookings",
  "/admin/bookings/[bookingId]": "the booking",
  "/admin/handbook": "the handbook",
  "/admin/kyc": "KYC",
  "/admin/listings": "Listings",
  "/admin/listings/[id]": "the listing",
  "/admin/operations": "Operations",
  "/admin/people": "People",
  "/admin/people/[id]": "the person",
  "/admin/queue": "the queue",
  "/admin/support": "Support",
  "/admin/money": "Money",
  "/agent/dashboard": "the dashboard",
  "/agent/listings": "Listings",
  "/agent/messages": "Messages",
  "/agent/messages/[id]": "the conversation",
  "/agent/bookings": "Bookings",
  "/agent/inspections": "Inspections",
  "/agent/notifications": "Notifications",
  "/agent/settings": "Settings",
  "/host": "the host workspace",
  "/host/reservations": "Reservations",
  "/host/rooms": "Rooms",
  "/host/settings": "Settings",
  "/host/notifications": "Notifications",
  "/preview": "the previews",
  "/preview/[deck]": "the deck",
  "/preview/[deck]/[screen]": "the screen",
};

/** The English name of the screen at `path`, or `null` when it has none. */
export function screenName(path: string): string | null {
  const matched = matchRoute(path);
  if (!matched) return null;
  return NAMES[matched.pattern] ?? null;
}

/** "Back to Messages", or `null` when the destination has no name. */
export function backToLabel(path: string): string | null {
  const name = screenName(path);
  return name ? `Back to ${name}` : null;
}
