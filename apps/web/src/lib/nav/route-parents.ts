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
 *   /sign-in, /sign-up -> /welcome  NOT `/start`, which is a 307 and not a
 *                                   screen. See the door section below.
 *   /agreements/[id] -> /agreements Track A: the agreement list is where
 *                                   money now lives; the wallet and escrow
 *                                   routes are retired and redirect there.
 *   /price/area/[id] -> /price      What the page itself already passes to
 *                                   `PageHeader`, read off the surface.
 *   /preview/<four decks>/[screen]  Four decks have no index page, so the
 *                                   generic pattern sent back to a 404.
 *
 * EVERY OTHER ROUTE FILE IN `src/app` IS IN `NON_NAVIGABLE` AT THE FOOT OF
 * THIS FILE, with the reason it can never carry a back control, and
 * `route-files.test.ts` fails if any route file is in neither structure. A
 * route nobody has made a decision about is now impossible to add quietly.
 *
 * TWO ENTRIES BELOW DELIBERATELY DRAW NO CONTROL, AND THAT IS NOT THE GAP.
 *
 * A declared parent is a fact about where a screen SITS. It is not a promise
 * that the screen paints an arrow, and these cannot:
 *
 *   /gallery                `notFound()` in a production build by its own
 *                           guard. The control is wired for development, which
 *                           is the only place the board exists.
 *   /offline                the service worker's fallback document, served
 *                           when there is no network at all. Its way up is the
 *                           brand lockup, which links to `/home` - the same
 *                           place a back control would push. A second control
 *                           on a screen that only renders when nothing can be
 *                           fetched would be a control that cannot work.
 *
 * Android is unaffected by both: `isAppRoot` is false for every one of
 * them, so the hardware button goes to the parent rather than closing the
 * shell, which is the half that matters most there.
 *
 * `scripts/design/proof-nav.mjs` walks the rest in a real browser and writes
 * the landed path per route into `docs/design/proofs/nav/`.
 */

/** The top of a hierarchy. Nothing sits above a route marked with this. */
export const ROOT = null;

export type ParentRoute = string | typeof ROOT;

export const ROUTE_PARENTS: Readonly<Record<string, ParentRoute>> = {
  /* ---------------------------------------------------------- the website */
  "/": ROOT,
  "/about": "/",
  /* V-82: a public area price page sits under the landing page, as the
     company pages do; it is a statement about a market, not a shelf. */
  "/areas/[state]/[area]": "/",
  "/cancellations": "/",
  "/careers": "/",
  "/contact": "/",
  "/delete-account": "/",
  "/docs": "/",
  "/docs/[slug]": "/docs",
  "/eula": "/",
  "/help": "/",
  "/r": "/",
  "/r/[code]": "/r",
  "/privacy": "/",
  "/disclaimer": "/",
  "/safety": "/",
  "/check": "/",
  "/standards": "/",
  "/styleguide": "/",
  "/terms": "/",

  /* ------------------------------------------------------------- the door
   *
   * `/start` IS NOT A SCREEN AND MAY NOT BE ANYBODY'S PARENT. It is
   * `app/(auth)/start/route.ts`, a 307 to `firstRunHref("/sign-up")`, which is
   * `/welcome?next=/sign-up`. `/sign-in`, `/sign-up` and `/auth/callback` all
   * named it as their parent, and on a device that has already seen first run
   * `planFirstRun` forwards that straight on, so BACK FROM SIGN IN LANDED ON
   * SIGN UP. Walked, cold and warm, by `scripts/design/proof-nav.mjs`.
   *
   * The screen above both doors is `/welcome`, whose closing panel IS the
   * choice between them (Sign in, Create an account, Look around first). With
   * no `?next` a returning device opens at that choice, which is exactly where
   * a person who pressed back from a door expects to be.
   *
   * `/start` keeps its own entry because it is still a URL that links point at,
   * and a declared route is one `isAppRoot` answers NO for. Nothing is above a
   * redirect, so its parent is the landing page, and no control ever draws on
   * it because no document is ever served from it.
   */
  "/start": "/",
  "/sign-in": "/welcome",
  "/sign-in/email": "/sign-in",
  "/sign-up": "/welcome",
  "/sign-up/email": "/sign-up",
  "/sign-up/verify": "/sign-up/email",
  "/forgot-password": "/sign-in",
  "/forgot-password/code": "/forgot-password",
  "/reset-password": "/sign-in",
  /* The landing place of every link out of Supabase Auth. A person pressing
     back here has abandoned a verification, and `/sign-in` is where its own
     refusal path already sends them (`?notice=link-expired`). `/welcome` was
     the other defensible answer and is one step further from what they were
     doing. */
  "/auth/callback": "/sign-in",
  /* The share door (V-07). A stranger arrives from outside Vallo and the
     card's own button is the only way on; the door draws no back control.
     Declared under the landing page because that is the public surface it
     sits beside, and a hardware back that had to go somewhere should go
     there rather than into the platform it is a door to. */
  "/s/[token]": "/",

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
  /* The founder, 23 September (C3.2): browsing is signed in only, and the
     back control on the two browsing screens goes to the landing page, not
     to `/home`, which lands a signed-out reader on the sign-in wall. */
  "/search": "/",
  "/listing/[id]": "/search",
  "/saved": "/home",
  "/saved/searches": "/saved",
  /* V-35: the gate code for one inspection, where a named delegate lands.
     Its parent is Plans, where inspections now live (V-76). */
  "/inspections/gate/[id]": "/bookings",
  "/rent/move-in/[listingId]": "/listing/[listingId]",
  "/rent/review/[paymentId]": "/bookings",
  "/record/[code]": "/search",
  "/settings/passport": "/settings",
  "/rent/pay/[inspectionId]": "/bookings",
  "/rent/share/[id]": "/agreements",
  "/tenancy/[id]": "/bookings",
  "/tenancy/[id]/complaint": "/tenancy/[id]",
  "/host/arrival": "/host",
  "/agent/listings/[listingId]/arrival": "/agent/listings",
  "/agent/listings/[listingId]/mandate": "/agent/listings",
  /*
   * PRICE CHECK. Both entries reproduce what the two pages already pass to
   * `PageHeader` as a fallback, which is the honest reading of the surface
   * rather than a guess from the path: `/price` passes `/home` and
   * `/price/area/[id]` passes `/price`. Declaring them changes nothing a
   * person sees on the web and changes the Android answer from "undeclared"
   * to a named destination.
   *
   * `/price` has no inbound link anywhere in the product either. It is reached
   * by address and by the share cards `lib/price-check/share-card.ts` builds,
   * which point at `/price/area/[id]`.
   */
  "/price": "/home",
  "/price/area/[id]": "/price",

  /* ---------------------------------------------------------- stays side */
  "/stays/search": "/stays",
  "/stay/[id]": "/stays",
  "/restaurants": "/stays",
  "/restaurant/[id]": "/restaurants",
  "/bookings": "/home",
  "/bookings/[bookingId]": "/bookings",
  "/bookings/[bookingId]/review": "/bookings/[bookingId]",
  "/checkout": "/stays",
  "/checkout/[bookingId]": "/bookings/[bookingId]",
  /* One crypto payment, opened from its notification or email. */
  "/pay/crypto/[reference]": "/bookings",

  /* ------------------------------------------------------------- messages */
  "/messages": "/home",
  "/messages/[id]": "/messages",
  "/messages/new": "/messages",
  "/messages/share/into/[id]": "/messages/[id]",
  "/messages/share/listing/[id]": "/listing/[id]",
  "/messages/share/stay/[id]": "/stay/[id]",
  "/messages/share/booking/[id]": "/bookings/[id]",

  /* --------------------------------------------------------------- money */
  /* Track A: the wallet and escrow routes are retired (they redirect to
     /agreements in next.config.ts). The agreement list is where money now
     lives. */
  "/agreements": "/home",
  "/agreements/[id]": "/agreements",

  /* -------------------------------------------------------------- social */
  /* C3.2, as `/search` above: the landing page, not `/home`. */
  "/around": "/",
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
  /* V-19: the new sign-in alert a push lands on; back is the devices screen. */
  "/settings/devices/alert": "/settings/devices",
  "/settings/help": "/settings",
  /* The in-app help and support home, and the member's ticket inbox under it. */
  "/support": "/home",
  "/support/messages": "/support",
  "/support/new": "/support",
  "/support/messages/[id]": "/support/messages",
  "/settings/interests": "/settings",
  "/settings/notifications": "/settings",
  "/settings/payments": "/settings",
  "/settings/place": "/settings",
  "/settings/privacy": "/settings",
  /* DB2: the people you blocked, one level inside Privacy & Security. */
  "/settings/privacy/blocked": "/settings/privacy",
  "/settings/phone": "/settings",
  "/settings/passcode": "/settings",
  "/legal/privacy": "/settings",
  "/legal/terms": "/settings",
  "/legal/disclaimer": "/settings",

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
  "/admin/analytics": "/admin",
  "/admin/audit": "/admin",
  "/admin/bookings": "/admin",
  "/admin/bookings/[bookingId]": "/admin/bookings",
  "/admin/bookings/reservations": "/admin/bookings",
  "/admin/businesses": "/admin",
  "/admin/agreements": "/admin",
  "/admin/examples": "/admin",
  "/admin/staff": "/admin",
  "/admin/handbook": "/admin",
  "/admin/fees": "/admin",
  "/admin/account-recovery": "/admin",
  "/admin/kyc": "/admin",
  "/admin/compliance": "/admin/kyc",
  "/admin/listings": "/admin",
  "/admin/listings/[id]": "/admin/listings",
  "/admin/money": "/admin",
  "/admin/operations": "/admin",
  /* V-80: field speed, one panel read from real phones. */
  "/admin/field-speed": "/admin/operations",
  "/admin/payments": "/admin",
  "/admin/people": "/admin",
  /*
   * `/admin/queue` is a DESK, not the console's landing screen, and that is the
   * whole of the founder's item 5: the queue used to BE `/admin` and the
   * console now opens on the overview before any desk. So its way up is
   * `/admin`, like every other desk, and not the other way round.
   */
  "/admin/queue": "/admin",
  "/admin/reference": "/admin",
  "/admin/settings": "/admin",
  "/admin/social": "/admin",
  "/admin/standing": "/admin",
  "/admin/stops": "/admin",
  "/admin/people/[id]": "/admin/people",
  "/admin/supply": "/admin",
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
  /* V-08: the TO LET board, under the listing's workspace like its calendar. */
  "/agent/listings/[listingId]/board": "/agent/listings",
  /* V-71: the Status kit, under the listing's workspace like its board. */
  "/agent/listings/[listingId]/status": "/agent/listings",
  "/agent/list": "/agent/listings",
  "/agent/messages": "/agent/dashboard",
  /* The workspace's own frame round the consumer thread and bell pages, so
     back from either stays inside the workspace. */
  "/agent/messages/[id]": "/agent/messages",
  "/agent/notifications": "/agent/dashboard",
  "/agent/reviews": "/agent/dashboard",
  "/agent/settings": "/agent/dashboard",
  "/agent/portfolio": "/agent/dashboard",
  "/agent/verification": "/agent/dashboard",
  "/agent/firm": "/agent/dashboard",
  /* The assistant inside the workspace (29 September 2026). */
  "/agent/assistant": "/agent/dashboard",

  /* ----------------------------------------------------- the host console */
  "/host": "/home",
  "/host/apply": "/host",
  "/host/photos": "/host",
  "/host/reservations": "/host",
  "/host/rooms": "/host",
  "/host/start": "/host",
  "/host/transfer": "/host",
  /* The host workspace's own assistant, settings and bell (29 September 2026). */
  "/host/assistant": "/host",
  "/host/settings": "/host",
  "/host/notifications": "/host",

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

  /* --------------------------------------- the decks with no index screen
   *
   * FOUND BY WALKING THE MAP AGAINST THE DIRECTORY TREE, NOT BY READING IT.
   * The three patterns above say a deck screen's way up is its deck, and for
   * seventeen decks that is true because `preview/<deck>/page.tsx` exists. For
   * four of them it does not: `b1b`, `c1`, `imgc` and `session-b` are folders
   * of screens with no index page, so the generic pattern resolved back to a
   * URL that answers not-found. Twenty five harness screens had a back control
   * pointing at a 404, and every one of them read as correctly declared.
   *
   * A literal segment beats a dynamic one in `resolve.ts`, left to right, so
   * each entry below outranks the generic pattern for its own deck and nothing
   * else is affected. The destination is `/preview`, which is the board that
   * lists the decks and is the real screen above a deck that has no index.
   *
   * These are development surfaces and nobody ships them. They are declared
   * for the same reason the generic patterns were: a harness that warns on
   * every screen is a harness people stop reading warnings in.
   */
  "/preview/b1b/[screen]": "/preview",
  "/preview/c1/[screen]": "/preview",
  "/preview/imgc/[screen]": "/preview",
  "/preview/session-b/[screen]": "/preview",
  /* Three more folders one level deeper inside `session-b`, same fault. The
     fourth and fifth (`wallet`, `inspection`) DO have an index page, so they
     keep the generic pattern and their screens go up to their own folder. */
  "/preview/session-b/admin/[screen]": "/preview",
  "/preview/session-b/admin-money/[screen]": "/preview",
  "/preview/session-b/admin-review/[desk]": "/preview",
};

/**
 * ROUTE FILES WHOSE DECISION IS MADE ONE LITERAL AT A TIME.
 *
 * `app/(app)/messages/share/[kind]/[id]/page.tsx` serves four addresses and
 * only four: the page calls `notFound()` on any `kind` that is not `listing`,
 * `booking`, `stay` or `into`. Each of those four has a DIFFERENT parent,
 * because the thing being shared is the parent, so the map declares them
 * separately and the file's own pattern matches nothing.
 *
 * That is correct and it looked exactly like an undeclared route to the gap
 * test, which is why the relationship is written down rather than argued about
 * in a comment. `route-files.test.ts` requires every expansion listed here to
 * be declared above, so adding a fifth kind to the page without declaring its
 * parent fails.
 */
export const LITERAL_EXPANSIONS: Readonly<Record<string, readonly string[]>> = {
  "/messages/share/[kind]/[id]": [
    "/messages/share/into/[id]",
    "/messages/share/listing/[id]",
    "/messages/share/stay/[id]",
    "/messages/share/booking/[id]",
  ],
};

/**
 * ROUTE FILES THAT ARE NOT SCREENS, AND THE REASON FOR EACH.
 *
 * WHY THIS EXISTS. `ROUTE_PARENTS` above says where a screen sits. It said
 * nothing at all about the rest of `src/app`, and "nothing at all" is
 * indistinguishable from "nobody has looked at it yet", which is how sixty
 * routes drew no back control for months. Every `route.ts` under `src/app` is
 * listed here with the reason it can never carry a back control, so that the
 * set of route files nobody has made a decision about is EMPTY and provably so.
 *
 * `route-files.test.ts` walks `src/app` and fails if a route file is in
 * neither structure, or is in both. A new API handler needs one line here; a
 * new page needs a real decision above. Neither can be added silently.
 *
 * NONE OF THESE CAN EVER BE `window.location.pathname` IN THE SHELL. A route
 * handler answers JSON, JavaScript or a redirect; the web view never settles
 * on one, so `isAppRoot` is never asked about them. They are written down
 * because a thing nobody wrote down is a thing nobody checked.
 */
export const NON_NAVIGABLE: Readonly<Record<string, string>> = {
  "/agent/listings/[listingId]/board/image": "V-08: the board as a PNG, not a page.",
  "/s/[token]/status": "V-71: the door's card as a Status PNG, not a page.",
  "/api/account/export": "the member's own data as a JSON download, not a page.",
  "/api/assistant": "POST only, the assistant's model call.",
  "/api/auth/email-hook": "Supabase Auth's send-email webhook.",
  "/api/client-error": "the browser's error beacon.",
  "/api/passcode/touch": "POST only, the passcode unlock's heartbeat (docs/PASSCODE.md).",
  "/api/vitals": "the browser's field speed beacon (V-80).",
  "/api/cron/account-purge": "scheduled job, bearer token.",
  "/api/cron/canary": "scheduled job, bearer token.",
  "/api/cron/complete-stays": "scheduled job, bearer token.",
  "/api/cron/crypto-reconcile": "scheduled job, bearer token.",
  "/api/cron/email-outbox": "scheduled job, bearer token.",
  "/api/cron/hold-sweep": "scheduled job, bearer token.",
  "/api/cron/rent-share-refunds": "scheduled job, bearer token.",
  "/api/cron/inventory-drift": "scheduled job, bearer token.",
  "/api/cron/landlord-line": "scheduled job, bearer token.",
  "/api/cron/sanctions-lists": "scheduled job, bearer token.",
  "/api/compliance/sanctions-upload": "POST only, staff upload of a sanctions list file.",
  "/api/cron/sanctions-screen": "scheduled job, bearer token.",
  "/api/cron/pg-cron-watch": "scheduled job, bearer token.",
  "/api/cron/risk-classes": "scheduled job, bearer token.",
  "/api/cron/saved-search-alerts": "scheduled job, bearer token.",
  "/api/cron/store-readiness": "scheduled job, bearer token.",
  "/api/cron/new-match-alerts": "scheduled job, bearer token.",
  "/api/health/catalogue": "health check polled by an external uptime monitor; answers JSON, not a page.",
  "/api/csp-report": "the browser's policy violation report.",
  "/api/documents/[id]": "a signed document stream, not a page.",
  "/api/landlord/inbound": "the SMS aggregator's inbound webhook, bearer token.",
  "/api/whatsapp/inbound": "Meta's WhatsApp webhook (V-96), signed with the app secret.",
  "/api/plans/next": "the home-screen widget's next-up read (V-98), device-bound bearer token.",
  "/api/map/listings": "JSON read for the map.",
  "/api/paystack/reconcile": "processor reconciliation.",
  "/api/paystack/webhook": "processor webhook.",
  "/api/push/drain": "scheduled job, bearer token.",
  "/api/push/key": "the public VAPID key as JSON.",
  "/api/push/register": "POST only, a subscription write.",
  "/api/push/revoke": "POST only, a subscription delete.",
  "/api/push/self-test": "POST only, a diagnostic send.",
  "/api/push/sw": "a retired service worker, serving only its own unregister.",
  "/api/support": "POST only, the contact form.",
  "/api/yellowcard/webhook": "processor webhook.",
  "/admin/enter": "303 into the console with the entry cookie.",
  "/home-or-landing": "307 to `/` or `/home`, decided by the caller's cookies.",
  "/landlord/[token]":
    "a landlord's single-use reply page, opened from an SMS by somebody with no account; there is nowhere inside the platform for it to go back to.",
  "/safe/[token]":
    "the page a renter's trusted contact opens from a link the renter sent; the contact has no account and nowhere inside the platform to go back to.",
  "/open": "307 to `/home`, `/search` or `/welcome`: where the native app starts (STORE-04).",
};
