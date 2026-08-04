# Agent 1 selection: the best 50 platform upgrades

Prepared 2026-08-04 by Agent 1 (Platform Upgrades), from the FULL pool:
`RECOMMENDATIONS.md` R-01 to R-137 plus the 250 numbered items in
`docs/recommendations-inbox.md`, cross-checked against `KNOWN_GAPS.md`,
`docs/DEAD_ENDS.md` and the working tree.

A previous session's 50-item selection was ignored entirely, as instructed.
This list is mine.

## Status, updated 2026-08-04 after the home, pickers and admin round

Shipped since this list was written, and confirmed against the working tree
rather than against a report: 1 (reviews write path), 2 (payout accounts),
3 (`/agent/messages`), 4 (honest notifications), 5 (the unread badge),
6 (the bookings explainer), 7 (`min_stay_nights`), 8 (constraint-accurate
refusals), 9 (availability plus the block-dates calendar), 10 (real landing
numbers), 11 (the contact form), 12 (`max_guests`), 14 (`/agent/reviews`),
21a (listing text classification), 27 (notification preferences).

Added to the list by this round, ahead of everything still open above, because
each was a table or a column with an admin write policy and no screen at all:

| # | Item | State |
|---|---|---|
| A1 | Home, the overview: Lagos-time greeting, the person's own city, the city card with a lit pin per open place, the trending strip | Shipped |
| A2 | The occupation and local government pickers, at signup and in settings, with RM020 mapped to a sentence | Shipped |
| A3 | `/admin/moderation`: held posts, stories, story comments and bios, released or removed with a reason the author reads | Shipped |
| A4 | `/admin/reference`: the occupation and local government editors | Shipped |
| A5 | Item 13, `/agent/settings` | Already shipped before this round; verified against the file, not the list |
| A6 | Items 15, 16 and 17: light, water and the gate, as one migration and one wizard step | Shipped |
| A7 | "Top experiences": five tiles, five names, one identical href | Closed by deleting the row from home. The category row above it already covers experiences once, honestly |

## Status, updated 2026-08-04 after the arriving-guest round

| # | Item | State |
|---|---|---|
| 18 | Book for someone else | Shipped. `bookings.guest_name/phone/email` with four check constraints, the toggle and three fields on `ReservePanel`, the name on both the guest's and the host's booking cards, and one `announceConfirmedStay` replacing four separate copies of the confirmation email so the arriving guest is reached from all four paths that can confirm a stay. Deliberately NOT done: R-75's signed link giving the arriving guest a logged-out booking page. They get an email, not an account |

Still open, in order, from the ranked 50 below: 19
(seasons), 20 (WhatsApp share), 21 (check-in and check-out filters), then Tier C
onward. Two items were added to the pool by this round and are ranked with Tier
B because both are one query away from work already done:

| New | Item | Why |
|---|---|---|
| B-new-1 | Power and water filters in discovery | The columns and their partial indexes exist now, and the whole value of structured utilities is being able to filter on them. Without it the data is a label, not a lever |
| B-new-2 | The agent shell's seeded "Demo Agent" identity | `AgentComingSoon` and `AgentShell` render a seeded profile called "Demo Agent", verified and approved, to anybody who opens an agent route signed out. That is DEAD_ENDS M10, and it also puts the word "demo" on screen, which owner rule 13 forbids outright |

Still open from the ranked 50 below, in order: 13 (`/agent/settings`), 15 to 17
(power, water, estate access), 18 (book for someone else), 19 (seasons), 20
(WhatsApp share), 21 (check-in and check-out filters), then Tier C onward. The
exclusions section still stands: nothing here depends on `pg_cron`.

---

## How I chose

Six weights, applied in this order.

1. **Does it close a promise the product is currently breaking?** A control
   labelled "Leave a review" that leads nowhere, a permanent unread badge of 3
   on a placeholder route, and a notifications inbox that tells a signed-out
   stranger their booking is confirmed are all worse than missing features,
   because they look finished.
2. **Can I close the WHOLE loop?** The ONE LAW is the filter. An item that would
   leave a schema with no screen, or a screen with no write path, loses to an
   item I can take from a tap to a row to a reload to a notification to a spec.
3. **Does it reduce a real risk?** Money, trust, security, abuse.
4. **Does it earn money without charging anyone?** The platform charges no fees,
   so revenue items here are supplier-side or measurement-side only.
5. **Is it Nigeria-first in a way no competitor answers structurally?** Power,
   water, gate access, the diaspora payer, the December spike.
6. **Craft.** The details that separate a good product from a great one.

## What I deliberately excluded, and why

Stated up front, because a quiet omission is worse than a stated one.

- **Anything whose correctness depends on `pg_cron`.** R-21's job runway, R-23's
  stale-hold sweep, R-29's nightly reconciliation, R-46's stuck-withdrawal
  check, R-51's notification retention, R-101's orphaned-upload sweep, R-106's
  weekly agent email and R-57's nightly rollup all need a scheduler that is not
  enabled on this project. `docs/HANDOFF.md` section 3.3 says to flag it rather
  than engineer around it, so I have. Where a cron-shaped item has a
  user-initiated equivalent that closes the same loop, I took the equivalent
  instead: item 1 below writes reviews from a control the guest taps, not from a
  reminder job.
- **Items needing a commercial decision or a signed agreement.** R-55 partner
  commission (needs an Amadeus booking agreement), R-56 airport transfer (needs
  an operator), R-66 rent agreements (needs legal), R-126's OTP tier where it
  depends on a Termii contract, R-05/R-236 NIN KYC beyond an env-guarded stub.
- **R-60 bulk listing intake and R-92 bulk admin actions.** Both are correct and
  both are premature: `public.listings` still holds zero live rows, so bulk
  tooling would be built against a queue that does not exist.
- **R-33 realtime scaling and R-40 Amadeus quota guards.** Correctly recorded as
  metric-gated follow-ups. Acting now is premature optimisation.
- **R-64 perceptual photo hashing and R-65 conversation-level risk scoring.**
  Both are genuinely valuable and both are large; they belong in a trust sprint
  of their own rather than squeezed between craft items. I would take them next
  after this 50.
- **R-80 listing-level map pins and R-100 address geocoding.** Sequenced behind
  each other and behind real listings with coordinates. Not closable today.
- **R-123 keyboard shortcuts and R-122 haptics.** Real, small, and the weakest
  members of the craft tier. Cut so a heavier item could take the slot.

---

## The ranked 50

Rank is also my intended work order. Each is worked ONE AT A TIME, closed
completely, self-audited, then handed to the lead.

### Tier A. Close a promise the product is currently breaking (1 to 14)

| # | Item | Source | Why it ranks here |
|---|---|---|---|
| 1 | Review writing loop: a real review form reachable from a completed stay | R-63, DEAD_ENDS S3 | `public.reviews` has an insert policy, a unique `booking_id` and two readers, and no writer at all, while `BookingsTabs` renders a "Leave a review" control that lands on the listing page with nothing to review with; this is the single most visible lie in the product and the whole loop is buildable today without a scheduler |
| 2 | Agent payout accounts: add, verify and default a NUBAN bank account | KNOWN_GAPS, R-59, R-127, R-32 | An approved agent can see earnings and has literally no way to tell us where to pay them, so the supply half of the marketplace terminates in a dead end; the ten-digit field also gets the account-name resolve that every Nigerian banking app has and that prevents mis-transfers |
| 3 | `/agent/messages` host inbox, with the hardcoded badge of 3 deleted | R-98, DEAD_ENDS S8 | Threads already work under RLS, so this is presentation over a live capability, and it kills a badge that every agent sees permanently and can never clear on a route that is a placeholder |
| 4 | Notifications: remove the fabricated inbox, design the honest signed-out state | DEAD_ENDS S7 | A visitor who has never booked anything is currently told "Booking confirmed, Lekki Palm Grove Shortlet is locked in" and "Your wallet is ready", with no marker; that breaks owner rules 13 and 22 on the same screen |
| 5 | Feed the unread badge for real on the rail and the tab bar | R-113 | `RailItem` declares `badge?: number`, renders it, and no item ever sets it; one count of unread `notifications` feeds both surfaces and the realtime subscription already in place keeps it live |
| 6 | `/bookings` explainer must describe the payment path that actually runs | R-116 | The copy promises "Confirm and pay" as step two; checkout now exists, so this is a correctness pass over the wording rather than a rewrite, and a payment promise standing on the wrong step is exactly the trust failure the honesty rules exist to prevent |
| 7 | `reserve()` honours `listings.min_stay_nights` | R-114 | The column exists with a `> 0` check constraint and is read by nothing outside the generated types, so a guest books one night at a three-night property and the agent discovers it at accept time |
| 8 | `reserve()` gives a constraint-accurate refusal instead of one vague line | R-115 | Four different check constraints raise `23514` and only two of them are ever the guest's doing; today all four say the same unhelpful thing, so our arithmetic bug reads to the guest as their mistake |
| 9 | Write `availability` on reserve, and give agents a block-dates calendar | R-62 | The GiST exclusion constraint is the platform's proudest guarantee and it currently reaches the guest as an arbitrary failure at the end of a filled-in form; this also gives `availability_status`'s `unavailable` value its first writer, so an agent can finally block a weekend for repairs |
| 10 | Landing numbers stop advertising inventory we do not have | DEAD_ENDS S9 | `NumbersBand` hardcodes "Listings 17+" while `platform-stats.ts` deliberately returns null to avoid publishing invented counts; the marketing page currently undercuts the refusal made in code |
| 11 | Contact form persists as a real support ticket | DEAD_ENDS M9 | `fileSupportTicket()` already handles anonymous filers through the service role and already has an admin queue reading it; the public form is one import away from being a closed loop instead of local state |
| 12 | `/listing/[id]` shows the stored guest capacity, not an invented one | R-134 | The page derives `Math.max(2, bedrooms * 2)` with a comment admitting it is a guess, while `listings.max_guests` exists, is collected by the wizard and is check-constrained; we are showing users a number we made up |
| 13 | `/agent/settings`, a real surface | R-97 | A placeholder standing in for the things an agent genuinely must set: public display name and photo, areas covered, working hours, notification preferences; reuses `SettingsGroups` and `Toggle` so the two settings surfaces stay identical |
| 14 | `/agent/reviews` with an inline host reply | R-96 | Directly downstream of item 1: an unanswered bad review does more damage than the review, and the reply must pass the same text classification listing copy does so an account number cannot be posted into a public field |

### Tier B. Nigeria-first structure nobody else has built (15 to 21)

| # | Item | Source | Why it ranks here |
|---|---|---|---|
| 15 | Power as structured columns, not one "Backup Power" tick box | R-71, inbox 2 | "Is there light" is the first question every Nigerian guest asks and one boolean cannot tell Band A apart from a generator running 7pm to 11pm; it must land before the catalogue fills, because agents will not revisit sixty listings to add a field |
| 16 | Water as structured columns | R-72, inbox 3 | The second question, same argument, and one migration and one wizard step if it ships in the same slice as item 15 |
| 17 | Estate access released the moment a booking is confirmed | R-73, inbox 4 | Nigerian arrivals fail at the gate, not the door, and withholding the gate details until confirmation is the "inspect before you pay" logic applied to arrival; the public page says "gated estate, access details on confirmation", which is honest and reassuring at once |
| 18 | Book for someone else: separate the payer from the arriving guest | R-75, inbox 7, 20 | The defining diaspora case is a sibling in London paying for a cousin arriving in Lagos, and we currently send the arrival directions to London; it lands with item 17 or it lands as a rewrite of item 17 |
| 19 | Seasons, with real indexable `/season/[slug]` routes starting at Detty December | R-74, R-76, inbox 5, 14, 17 | December is the largest demand spike of the year, the search intent starts in September, and `/search` is `noindex`, so the platform currently has no page a search engine can rank for the demand it most wants |
| 20 | WhatsApp share: a branded card and a pre-written message on every listing | inbox 8, 31, 244, 217 | WhatsApp is how property links actually travel here; a designed forwardable card is distribution the platform does not pay for, and it compounds with every listing added |
| 21 | Check-in and check-out filters in discovery | R-79, inbox 185 | The address bar carries budget, bedrooms, bathrooms, party size, amenities, instant book and verified-only, and not the one filter that decides whether a stay can take your nights; item 19's December preset has nothing to attach to without it |
| 21a | Classify listing title and description, the same hole reviews had | found during item 1's class sweep | `listings_owner_all` lets any approved agent update their own `title` and `description`, both publicly readable, and `listings` has no scanner at all on insert or update, so an account number can be typed straight onto a public page; sequenced here on the lead's instruction because items 15 to 17 already open a migration on this table, making it one extra trigger rather than a second pass. Scope: a `scan_listing_text` trigger on `after insert or update` filing a `risk_alerts` row exactly as `scan_review` does, with the same early return when the text is unchanged. Deliberately **no** HELD state: listings already pass an admin approval gate that reviews do not, so a flag into the queue is the proportionate answer |

### Tier C. Money, trust and security hardening (22 to 30)

| # | Item | Source | Why it ranks here |
|---|---|---|---|
| 22 | Audit log writer on every privileged action | R-42, inbox 201 | `public.audit_log` was built with no update or delete policy precisely for this and nothing in application code writes to it; every privileged surface added from here repeats the gap unless the pattern is set now |
| 23 | Rate limits on reserve, on the wallet actions and on support filing | R-44, R-52, DEAD_ENDS S11, inbox 113 | `private.consume_rate_limit` is durable, applied and called from exactly two API routes; reserve holds real inventory, support filing is a service-role write reachable by anyone on the internet with no session, and neither counts anything |
| 24 | Close the account-enumeration leak in wallet transfers | R-47 | The transfer form answers "No RentMe account uses that email address yet" for a miss and something else for a hit, which is an email-address oracle a script can walk one response at a time |
| 25 | Transaction PIN before the first wallet-moving action | R-31, inbox 176 | Nigerian phones are shared and borrowed far more than the implicit Western threat model assumes, and a signed-in session alone currently authorises a debit |
| 26 | Session and device management, with a new-device alert | R-39, inbox 67, 249 | A wallet-bearing account on a lost phone must be recoverable by its owner, not by a support ticket, and the notification writer that would tell them already exists |
| 27 | Notification preferences per kind | R-105, inbox 135 | `profiles.settings` is a jsonb column sitting unused for exactly this; wallet movements and security notices stay deliberately unswitchable, because silence there is a safety problem rather than a preference |
| 28 | A server-side sink for the failures we deliberately swallow | R-104 | `bestEffortEmail()` and the catch blocks around notification, audit and storage writes are correct to swallow and wrong to forget; today a silent regression in email delivery is invisible for as long as nobody notices by hand |
| 29 | Queue ageing on the admin console, oldest first | R-93 | A count of eleven open flags cannot tell eleven that arrived this morning from one open for nine days; every queue table already carries `created_at`, so this is a query change with no schema cost |

### Tier D. Assistant and agent completeness (30 to 35)

| # | Item | Source | Why it ranks here |
|---|---|---|---|
| 30 | Assistant tools for the caller's own context | R-77, inbox 167 | A search box with a personality is copyable in a week; an assistant that knows your trip, your balance and your unread threads is not, and R-37's rule is honoured by giving each tool no identity argument at all and binding it to the caller's own RLS client server side |
| 31 | Assistant sidebar reads the threads it already persists | R-88, R-38, DEAD_ENDS S10 | The route writes `ai_conversations` and `ai_messages` and the sidebar reads only `localStorage`, so the assistant visibly forgets something it demonstrably knows the moment you change device |
| 32 | Escalate a stuck assistant conversation into a support ticket | R-91 | The assistant is where a confused person actually is, and it can currently only say it cannot help; `fileSupportTicket()` and `/admin/support` are both live, so this converts honest refusals into resolved problems |
| 33 | One first-party append-only `events` table | R-102, inbox 109, 242 | Nothing records a search, a view or a failed reserve attempt, so "recommended" ordering is a placeholder and every behaviour-dependent item is blocked; written from server code only, no personal data beyond the user id, no third-party script |
| 34 | `/agent/analytics` on real events | R-95 | Strictly after item 33, and the week after a host gets bookings they will ask what drove them; views, saves, conversations, reserve attempts and the conversion between them, benchmarked against the same city and property type so the number means something |
| 35 | `/agent/verification`, env-guarded | R-61, R-05 | `public.agent_documents` exists with RLS and the private bucket and signed-URL reviewer path already shipped for the application wizard, so the agent-side surface is the missing half; the NIN or BVN resolve degrades into an honest unconfigured state until keys land |

### Tier E. Discovery, distribution and the pages search engines can see (36 to 40)

| # | Item | Source | Why it ranks here |
|---|---|---|---|
| 36 | `app/robots.ts`, `app/sitemap.ts`, plus explicit robots metadata per operations route | R-83, R-132 | Nothing currently tells a crawler which routes matter, and `/admin` and `/agent` rely entirely on a `robots.ts` that does not exist yet; belt and braces, so a misconfigured file cannot expose an operations console |
| 37 | JSON-LD on listing pages | R-84, inbox 92 | A property page with no structured data is invisible to every rich result that would carry its price, rating and location; partner listings excluded, since we do not own that data |
| 38 | A per-listing social image | R-85, inbox 46 | Every shared link becomes a designed asset instead of a bare URL, and `ListingCard`'s deterministic hue already gives the no-photo fallback its palette |
| 39 | `/city/[slug]`, indexable city pages | R-86, inbox 91, 240 | There is no page that can rank for "shortlet in Lekki", and `PopularDestinations` and `CoverageMap` on the landing page already exist to link into them; geography stays on the `numeric` `latitude`/`longitude` columns `public.listings` already carries, since PostGIS is not installed |
| 40 | Preserve search state and scroll position on back navigation | inbox 27, 214 | Losing your filters and your place in a forty-card list after opening one listing is the classic mobile discovery rage moment, and it is the cheapest retention fix in the product |

### Tier F. Craft, accessibility and i18n (41 to 49)

| # | Item | Source | Why it ranks here |
|---|---|---|---|
| 41 | Every empty state offers a real next action | inbox 35 | A dead end teaches users the inventory is thin even when it is not, and owner rule 22 already requires every state to be designed; this makes "designed" mean "has a way out" |
| 42 | `loading.tsx` per app route, with skeletons shaped like the real content | R-78, R-117 | Not one `loading.tsx` exists, so a tap on a city chip holds the previous screen with no acknowledgement on 3G; a skeleton of the wrong shape is worse than none, so the card skeletons ship with it, and `/wallet` deliberately gets none because a skeleton where a balance goes invites misreading |
| 43 | Segment error boundaries for `/admin` and `/agent` | R-131 | A thrown error inside `/admin/flags` currently unmounts the operations navigation and drops the person onto the consumer error screen with no way back into the queue they were working |
| 44 | Overlay parity: focus handling and Escape on the two older drawers | R-118, R-119 | `FilterDrawer`, `ListingOptionsSheet` and `AgentMobileNav` already do it properly; `MobileMenu` and the `AppShell` drawer carry the ARIA and none of the behaviour, so the pattern exists and two components simply predate it |
| 45 | 44px chip targets, and an image error fallback on `ListingCard` | R-121, R-120 | Chips are the primary control on `/search` and land near 30px tall while `.nf-icon-btn` is documented at 44px; and a dead photo URL currently leaves a blank frame in the middle of a results grid although `ListingGallery` already solved it |
| 46 | Dates render in Lagos time and in the caller's locale | R-108, R-109 | `formatDate` passes no `timeZone`, so a date near midnight in Lagos renders as the previous day, and four call sites have already worked around it individually, which is the tell; `getMyBookings(locale)` meanwhile takes a locale it never gives to its formatter |
| 47 | `formatMoney` can render exact kobo, and the wallet uses `.nf-numeric` | R-110, R-133 | 8,500,050 kobo currently renders identically to 8,500,000, and the flagship money surface is the one place on the platform where figures are set in proportional digits and jitter while a transfer settles |
| 48 | A naira glyph and compact-notation spec across all four locales | R-111, R-112, inbox 43 | The supplied mockups themselves showed the naira sign falling back to a plain N, and compact notation depends on per-locale CLDR data that may not exist for yo, ha and ig; no typecheck can catch either |
| 49 | One pluralisation helper, and `Accept-Language` negotiation | R-125, R-09, KNOWN_GAPS | The booking card renders "1 adults, 1 children" today, and a first-time visitor with a Yoruba browser still gets English; both are named in `KNOWN_GAPS.md` and both are small |

### Last, deliberately after everything else

| # | Item | Source | Why it ranks here |
|---|---|---|---|
| 50 | Content Security Policy with a nonce strategy | R-07, KNOWN_GAPS | Still the largest open security item, and moved to last on the lead's binding instruction: a nonce strategy compatible with Next 16 streaming is the change in this list most likely to break `npm run build` or to break only in production, and Vercel deploys from `main`, so it must not sit in the middle of a run where a silent breakage would be blamed on the wrong item |

---

## Notes on execution

- Every item is worked to the ONE LAW: a UI action, a validated server action
  returning the `ActionResult` envelope through `resolveSession()`, a database
  write that survives RLS, the UI showing the new reality after a reload, the
  notification or email the event deserves, and a spec in `apps/web/tests/`.
- Items 15, 16 and 17 share one migration and one wizard slice, and I will say
  so when I hand them over, but they are still delivered and verified one at a
  time.
- Every migration is applied through the Supabase MCP tools and mirrored into
  `supabase/migrations/` with a timestamp prefix, with a functional probe after
  the DDL, `auth.uid()` wrapped in a scalar subquery in every policy, and a
  covering index on every foreign key.
- I run git for nothing. The lead commits.
