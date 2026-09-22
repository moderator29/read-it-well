/**
 * THE PRODUCT'S HIERARCHY, WRITTEN DOWN.
 *
 * HISTORY IS NOT HIERARCHY. Every back control on this platform used to call
 * `router.back()`, which walks the BROWSER'S history: the list of places the
 * machinery happened to send somebody, in the order it sent them. A person who
 * arrived at `/settings/account` through a sign-in bounce has `/sign-in` behind
 * them. A person who followed a deep link from a notification has whatever they
 * were reading in another application behind them, or nothing. A redirect leaves
 * the redirector behind them. In none of those cases is the previous entry the
 * parent of the current screen, and in all of them the old control cheerfully
 * went there. That is how a person inside the Console pressed back and landed on
 * the login page, and how somebody inside a feature pressed back and landed on
 * the marketing site.
 *
 * `canGoBackInApp()` in `lib/ui/history.ts` was the previous guard and it is not
 * wrong, it is answering a different question. It proves there is a screen of
 * OURS behind this one. It cannot prove that screen is the PARENT of this one,
 * because two of its three answers (our own sequence stamp, and a same-origin
 * referrer) carry no URL at all, and the third (`navigation.canGoBack`) is a
 * boolean. A control that trusts it is trusting "somewhere in our app" to mean
 * "one level up", and those are not the same claim.
 *
 * So the hierarchy is DECLARED, here, once, and read by
 * `lib/nav/resolve.ts`. This file is meant to be read by a person checking
 * whether the product's shape is what they think it is. It holds no logic on
 * purpose.
 *
 * HOW TO READ AN ENTRY.
 *
 *   "/listing/[id]": "/search",
 *
 * Left: a route pattern, spelled exactly as the directory under `src/app` is
 * spelled, minus the route groups (`(app)`, `(auth)`, `(site)`) which never
 * appear in a URL. `[id]` matches one segment.
 *
 * Right: that route's parent, as a pattern. Dynamic segments in the parent are
 * filled from the ones captured on the left, which is what makes
 * `"/u/[handle]/followers": "/u/[handle]"` resolve `/u/ada/followers` to
 * `/u/ada` rather than to a literal `[handle]`.
 *
 * `ROOT` means this route is the top of the hierarchy. There is nothing above
 * it, no back control belongs on it, and on Android it is the one kind of place
 * where the hardware back button may close the application.
 *
 * A ROUTE THAT IS NOT IN THIS FILE HAS NO DECLARED PARENT, AND THAT IS LOUD
 * RATHER THAN QUIET. `resolve.ts` returns `no-parent-declared`, the control
 * falls through to whatever fallback its caller passed, and a development build
 * prints a warning naming the path. It is deliberately NOT defaulted to "strip
 * the last segment": that guess is right often enough to hide the times it is
 * wrong, and a hierarchy nobody declared is exactly the thing this file exists
 * to stop.
 *
 * WHERE THE PATH DOES NOT MATCH THE HIERARCHY, AND WHY.
 *
 *   /listing/[id] -> /search        A listing's parent is the shelf it was
 *                                   taken off, not `/home`. The old fallback
 *                                   was `/home`, which threw away a filtered
 *                                   hunt every time it fired.
 *   /messages/[id] -> /messages     The inbox, per the founder's own example.
 *   /messages/share/<kind>/[id]     Four entries rather than one, because the
 *                                   thing being shared IS the parent and
 *                                   `kind` is a closed set of literal
 *                                   segments. This reproduces the page's own
 *                                   `back` computation as data.
 *   /rent/move-in/[listingId]       The listing being moved into, not `/rent`.
 *   /around/new -> /around/settings The suggestion flow is entered from the
 *   /around/manage                  feed's settings screen, not from the feed.
 *   /legal/* -> /settings           Reached from Settings, and nowhere else.
 *   /admin/*, /agent/*, /host/*     Each console has its own landing screen,
 *                                   and every screen inside it returns there.
 *                                   Back inside the Console never leaves the
 *                                   Console, which is the founder's first
 *                                   complaint.
 */

/** The top of a hierarchy. Nothing sits above a route marked with this. */
export const ROOT = null;

export type ParentRoute = string | typeof ROOT;

export const ROUTE_PARENTS: Readonly<Record<string, ParentRoute>> = {
  /* ---------------------------------------------------------- the website */
  "/": ROOT,
  "/about": "/",
  "/cancellations": "/",
  "/careers": "/",
  "/contact": "/",
  "/delete-account": "/",
  "/docs": "/",
  "/docs/[slug]": "/docs",
  "/eula": "/",
  "/help": "/",
  "/privacy": "/",
  "/safety": "/",
  "/standards": "/",
  "/styleguide": "/",
  "/terms": "/",

  /* ------------------------------------------------------------- the door */
  "/start": "/",
  "/sign-in": "/start",
  "/sign-in/email": "/sign-in",
  "/sign-up": "/start",
  "/sign-up/email": "/sign-up",
  "/sign-up/verify": "/sign-up/email",
  "/forgot-password": "/sign-in",
  "/reset-password": "/sign-in",
  "/auth/callback": "/start",

  /* ------------------------------------------------- the two app homes
   *
   * Two roots, not one, because the product has two sides. `/home` is the rent
   * side and `/stays` is the stays side, and `nav-model.ts` makes each one the
   * first destination of its own tab bar. Both are tops of the hierarchy and
   * both are places Android's hardware back button may close the shell.
   */
  "/home": ROOT,
  "/stays": ROOT,
  "/welcome": "/home",
  "/offline": "/home",

  /* ----------------------------------------------------------- rent side */
  "/search": "/home",
  "/listing/[id]": "/search",
  "/saved": "/home",
  "/saved/searches": "/saved",
  "/inspections": "/home",
  "/rent": "/home",
  "/rent/move-in/[listingId]": "/listing/[listingId]",
  "/rent/pay/[inspectionId]": "/inspections",

  /* ---------------------------------------------------------- stays side */
  "/stays/search": "/stays",
  "/stay/[id]": "/stays",
  "/trips": "/stays",
  "/restaurants": "/stays",
  "/restaurant/[id]": "/restaurants",
  "/bookings": "/home",
  "/bookings/[bookingId]": "/bookings",
  "/bookings/[bookingId]/review": "/bookings/[bookingId]",
  "/checkout": "/stays",
  "/checkout/[bookingId]": "/bookings/[bookingId]",

  /* ------------------------------------------------------------- messages */
  "/messages": "/home",
  "/messages/[id]": "/messages",
  "/messages/new": "/messages",
  "/messages/share/into/[id]": "/messages/[id]",
  "/messages/share/listing/[id]": "/listing/[id]",
  "/messages/share/stay/[id]": "/stay/[id]",
  "/messages/share/booking/[id]": "/bookings/[id]",

  /* --------------------------------------------------------------- money */
  "/wallet": "/home",
  "/wallet/receive": "/wallet",
  "/wallet/send": "/wallet",
  "/wallet/transactions": "/wallet",
  "/wallet/transactions/[id]": "/wallet/transactions",
  "/crypto": "/wallet",
  "/crypto/[id]": "/crypto",

  /* -------------------------------------------------------------- social */
  "/around": "/home",
  "/around/[slug]": "/around",
  "/around/settings": "/around",
  "/around/new": "/around/settings",
  "/around/manage": "/around/settings",
  "/post/[id]": "/around",
  "/stories/new": "/around",
  "/stories/[id]": "/around",
  "/u": "/around",
  "/u/[handle]": "/around",
  "/u/[handle]/edit": "/u/[handle]",
  "/u/[handle]/followers": "/u/[handle]",
  "/u/[handle]/following": "/u/[handle]",

  /* ------------------------------------------------------------- account */
  "/assistant": "/home",
  "/notifications": "/home",
  "/profile": "/home",
  "/profile/application": "/profile",
  "/profile/setup": "/profile",
  "/profile/setup/[role]": "/profile/setup",
  "/profile/setup/agent": "/profile/setup",
  "/profile/setup/firm": "/profile/setup",
  "/profile/setup/owner": "/profile/setup",
  "/verification": "/profile",
  "/settings": "/home",
  "/settings/account": "/settings",
  "/settings/appearance": "/settings",
  "/settings/devices": "/settings",
  "/settings/help": "/settings",
  "/settings/interests": "/settings",
  "/settings/notifications": "/settings",
  "/settings/payments": "/settings",
  "/settings/place": "/settings",
  "/settings/privacy": "/settings",
  "/legal/privacy": "/settings",
  "/legal/terms": "/settings",

  /* ------------------------------------------------------------- console
   *
   * Back inside the Console stays inside the Console. Every screen here
   * returns to `/admin`, and `/admin` itself returns to `/home` rather than to
   * whatever the browser remembers, which was the login page for anybody who
   * got here through a sign-in bounce.
   */
  "/admin": "/home",
  "/admin/agents": "/admin",
  "/admin/alerts": "/admin",
  "/admin/audit": "/admin",
  "/admin/bookings": "/admin",
  "/admin/bookings/[bookingId]": "/admin/bookings",
  "/admin/bookings/reservations": "/admin/bookings",
  "/admin/businesses": "/admin",
  "/admin/escrow": "/admin",
  "/admin/examples": "/admin",
  "/admin/fees": "/admin",
  "/admin/flags": "/admin",
  "/admin/kyc": "/admin",
  "/admin/listings": "/admin",
  "/admin/moderation": "/admin",
  "/admin/money": "/admin",
  "/admin/payments": "/admin",
  "/admin/reference": "/admin",
  "/admin/reports": "/admin",
  "/admin/social": "/admin",
  "/admin/standing": "/admin",
  "/admin/stops": "/admin",
  "/admin/support": "/admin",
  "/admin/switches": "/admin",

  /* ---------------------------------------------------- the agent console */
  "/agent/dashboard": "/home",
  "/agent/analytics": "/agent/dashboard",
  "/agent/bookings": "/agent/dashboard",
  "/agent/earnings": "/agent/dashboard",
  "/agent/inspections": "/agent/dashboard",
  "/agent/listings": "/agent/dashboard",
  "/agent/listings/[listingId]/calendar": "/agent/listings",
  "/agent/list": "/agent/listings",
  "/agent/messages": "/agent/dashboard",
  "/agent/reviews": "/agent/dashboard",
  "/agent/settings": "/agent/dashboard",
  "/agent/verification": "/agent/dashboard",

  /* ----------------------------------------------------- the host console */
  "/host": "/home",
  "/host/apply": "/host",
  "/host/photos": "/host",
  "/host/reservations": "/host",
  "/host/rooms": "/host",
  "/host/start": "/host",
  "/host/transfer": "/host",

  /* ------------------------------------------------- the design harnesses
   *
   * `/preview` and `/gallery` are development surfaces, not product. They are
   * declared so that working in them does not produce a warning on every
   * screen, and they are declared as three patterns rather than a hundred and
   * fifty entries because their hierarchy genuinely IS their path: a deck
   * holds screens, a screen occasionally holds a variant.
   */
  "/gallery": "/",
  "/preview": "/",
  "/preview/[deck]": "/preview",
  "/preview/[deck]/[screen]": "/preview/[deck]",
  "/preview/[deck]/[screen]/[variant]": "/preview/[deck]/[screen]",
};
