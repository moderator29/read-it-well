# VALLO: COMPLETE PLATFORM VISUAL REIMAGINATION DISCOVERY REPORT

Written 18 September 2026 by the discovery session. Three read-only agents
walked the entire repository and the live database on this date; their full
evidence files are part of this deliverable and the design session should
treat them as chapters of this report:

- `docs/research/DISCOVERY_A_SURFACES.md` (887 lines: every route, every
  journey, property and stays experience, search, AI, profiles)
- `docs/research/DISCOVERY_B_SYSTEMS.md` (architecture, money, bookings,
  messaging, admin, settings, security, privacy)
- `docs/research/DISCOVERY_C_BRAND_DESIGN.md` (883 lines: brand census,
  design system, icons and imagery, motion, responsive, per-area verdicts,
  the draft image list)

Status vocabulary used everywhere: EXISTS AND WORKS / EXISTS BUT INCOMPLETE /
PARTIALLY CONNECTED / FRONTEND ONLY / BACKEND ONLY / MOCK-DEMO / PLACEHOLDER /
NOT IMPLEMENTED / UNCLEAR. Nothing in this report is inferred from the
product concept; everything is tied to files, and each chapter carries an
honesty log of what could not be verified.

**Read this first, it colours everything:** the tree was snapshotted while
the HANDOFF_05 two-side build session was actively pushing to main. On this
one day the side flip, the stays route shells, the three thread faces,
`/inspections`, the wallet's full-page send and receive, and
`/settings/payments` all landed. The design session must `git pull` and skim
`docs/BUILD_05_LEDGER.md` for what moved after this snapshot.

---

## 1. Executive summary

Vallo is a real, unusually well-governed Next.js 16 + Supabase property
marketplace, mid-transformation into a **two-side product**: a Property side
(rentals, sales, agents, inspections) and a Stays side (hotels, serviced
apartments, guest houses, resorts, shortlets, restaurants), flipped by a
finished, signature 3D coin-flip interaction. One account, one wallet, one
messages engine underneath.

What a redesign session must know in five sentences:

1. **The pipes are real, the water is seeded.** Every surface renders real
   rows through real RLS-bound queries, but all 64 live listings are demo
   rows, there are 0 bookings and 0 photographs; `MediaFrame`'s drawn scene
   is the face of the entire catalogue. The single biggest visual constraint
   is photography that does not exist yet.
2. **The design system is exceptional and binding.** One blue family (no
   warm hues anywhere), a four-ingredient glass law, a 14px control-radius
   law, a six-rung elevation ladder, self-hosted Inter and Poppins, a motion
   contract with written post mortems, 390px-dark-first. The redesign works
   inside this system; it does not replace it.
3. **The rebrand to Vallo is complete in source.** Old names survive only as
   historical comments and the accepted-internal `nf-` prefix. The slogan is
   "Real Estate reimagined!" (one casing question open).
4. **Two consumer journeys dead-end today**: the rent money path (the
   product's flagship market ends at "then pay" with no pay surface) and
   restaurant reservations (a booked table vanishes; no trips row, no
   thread). The feed cannot paginate. `/host` is a protected door with no
   room behind it.
5. **The quality floor is high**: bespoke skeletons on nearly every route,
   one empty-state anatomy, honest unconfigured and signed-out states,
   strong accessibility baseline. This is a platform to be reimagined, not
   rescued.

## 2. What VALLO currently is

One product, two faces, three workspaces. Consumer Property side (the
current app, mature), consumer Stays side (landed this week as first light
over the existing catalogue, with the business-grade stay schema live
underneath and its read layer still to come), the agent console (complete:
dashboard, seven-step listing wizard, calendar, inspections, bookings,
earnings, analytics, reviews, settings, verification ladder), and the admin
console (twenty-plus desks). A Host console for stays operators is doctrine
and middleware only: NOT IMPLEMENTED. The company is VALLO SPACES LTD,
RC 9870413, incorporated 18 September 2026; the product brand is **Vallo**
and legal identity appears only where legally required.

## 3. Technology architecture

npm workspaces monorepo: `@vallo/web` (Next.js 16 App Router, React 19, TS
strict, Tailwind v4), `@vallo/design-tokens`, `@vallo/i18n` (four locales);
Capacitor shell inside apps/web (`ng.vallo.app`). Supabase Postgres 17:
RLS on every table, SECURITY DEFINER functions in a `private` schema,
pg_cron jobs, Vault, storage buckets, realtime. Server actions on the
ActionResult/resolveSession pattern; middleware gates product segments;
feature flags in `lib/flags.ts` backed by a flags table with admin
switchboard. Integrations actually wired: Paystack (deep: charges,
transfers, resolve, signed webhook, reconcile), Resend email, Anthropic
(three real AI surfaces), MapTiler/CARTO tiles (key pending, licence
caveat), Yellow Card (built, never live-proven). Full detail and the API
route inventory: DISCOVERY_B section 1.

## 4. Complete route and page inventory

DISCOVERY_A section 1 holds the full per-route table (route, purpose, user
type, status, components, data, actions, gaps, per-route UX/UI/mobile
verdicts) covering: root/system routes, the full (auth) group, eleven (site)
marketing/legal pages, the entire (app) consumer group (home, search, rent,
listing/[id], saved, around feed family, stories, u/[handle] family,
profile family, notifications, verification, assistant, bookings, checkout,
inspections, messages family, wallet family, settings family, and the six
stays-side routes), the twelve-page agent console and the twenty-plus admin
desks. Headline statuses: almost everything EXISTS AND WORKS; the notable
exceptions are listed in sections 35 to 38 below.

## 5. Complete feature inventory

The union of sections 6 to 24 below, each with its owning chapter. The
platform's feature spine at snapshot: catalogue and search, listing detail
with move-in economics, inspections (full state machine, accept-in-thread,
Open/Closed page), bookings and checkout with hold countdown (shortlets),
restaurant reservations (write-only today), the wallet (fund, send,
receive, withdraw, pots, receipts), saved items, the social layer (feed,
posts, stories, places, follows), three AI surfaces, notifications with
realtime, four-locale i18n, PWA + Capacitor shells, agent verification
four-rung ladder, admin operations.

## 6. User roles

Seven verified: signed-out visitor, signed-in consumer, owner,
professional, approved agent, admin/staff, and the specified-but-absent
Host. **Role is never a cookie**: `nf_mode` and `nf_side` are view
preferences; authorisation is always an RLS-bound server read
(`getAgentContext()`, `requireAdmin()`). Full role-by-role capabilities:
DISCOVERY_A section 2.

## 7. User journeys

All mapped with their actual routes in DISCOVERY_A section 3. Sound end to
end: discovery→save/share/message, sign-up→first value, password recovery,
agent onboarding→earnings, shortlet booking→checkout→trips→review (in code;
never run under real traffic). Broken or dead-ending: rent/sale ends at
"then pay" with no pay step (A1-001); reserved tables vanish after
confirmation; a stays notification can open in the wrong shell (href
side-law, MK-67); assistant listing cards always open the Property shell.

## 8. Property ecosystem

DISCOVERY_A section 4. `ListingCard` (688L) is the strongest component in
the product: strict hierarchy, one badge cap, power-band differentiator,
money never truncates. The 1048-line detail page is complete and honest;
missing on the most important screen: similar listings, a location map, a
visible availability calendar, price/market context, and neighbourhood
context (the `area_intel` data exists one hop away, already built for the
assistant, mounted nowhere on the listing page). `/rent` duplicates a
search filter and carries an N+1 query. The move-in ledger is the
product's moat and has no designed surface of its own yet.

## 9. VALLO Stays

DISCOVERY_A section 5. Live at snapshot: the side axis, the finished flip,
per-side nav and dock, `/stays` home, `/stays/search` (four filters of the
promised twelve), `/trips` (stays only), `/restaurants` and
`/restaurant/[id]` (reservation-first, honest about missing hours). The
stay-detail showcase (room types, rate-plan refusals) is built and tested
but dormant: `readStayDetail()` returns null because `lib/stays/` does not
exist yet, so `/stay/[id]` falls through to the listing page. Schema M1 to
M15 applied and probed including the oversell gate; M6 founder-gated. Not
built: the read layer, host onboarding, `/host` console,
`admin/businesses`, restaurant hours, landmarks seed, the projection
reads, reservations on trips, the whole Phase F third-party lane (dark by
design until keys land).

## 10. Feed and discovery

DISCOVERY_A section 6.1. The social layer is real (marks, reposts,
replies, tombstones, moderation, places directory of 36 states + 774
LGAs), with one structural defect: **the feed renders only its first page**
(server cursors exist, the client never consumes them) and roughly 88 per
cent of posts are bot-authored, so the honest design brief is a young
feed, not a busy one.

## 11. Search

DISCOVERY_A section 6.2. URL-first state, the best filter drawer in the
product (real counts against the candidate pool), list/map views with a
remembered toggle, designed no-results. Missing: suggestions/typeahead,
saved searches and alerts (grep-verified absent), a split list+map view at
any width, and the stays twelve-filter promise awaiting the projection.

## 12. AI

DISCOVERY_A section 7. Three REAL Claude surfaces (concierge with three
catalogue tools over SSE, support summariser, Around area bot), all
graceful when unkeyed, none mocked. Design-relevant gaps: assistant cards
ignore the side law; cross-device thread restore unclear; the assistant is
invisible from the Stays side.

## 13. Wallet, 14. Savings, 15. Payments

DISCOVERY_B sections 2 and 3 hold the full money map. Snapshot headlines:
the wallet is append-only-ledger real with derived balances; send and
receive graduated to full pages this week; **"savings" as a product does
not exist** (pots are the nearest object); saved cards
(`payment_methods`, webhook-fed) and user bank accounts with
resolve-verified names landed this week at `/settings/payments`; the agent
`payout_accounts` system now coexists with user `bank_accounts` and
nothing reconciles the two; escrow is promised nowhere in copy and the
`escrow-hold` icon is structurally withheld; fee rates are all zero.

## 16. Messaging, 17. Notifications

DISCOVERY_B section 4; surfaces in DISCOVERY_A. One two-party
listing-bound conversations engine; the three thread faces (rental with
inspection controls, reservation, booking timeline) landed this week as a
single fork point (`ThreadContextBanner`); optimistic send, realtime,
attachments, safety scanning. Notifications: one table, trigger-written,
realtime list with deep links; hrefs predate the side axis (MK-67);
inspections gained notifications only this week; no push anywhere (native
identifiers founder-gated).

## 18. Profiles, 19. Profile switching

DISCOVERY_A section 8. `/profile` (own account wearing the social header),
`/u/[handle]` public pages with server-decided tab sets. **Three switch
controls, three questions**: RoleSwitcher sheet (what you do),
ModeSwitcher (personal/agent workspace), SideSwitch coin + flip (which
product face). Doctrine holds in code; nothing onboards a user to any of
them, and the coin sits below the drawer fold: the signature interaction
is undiscoverable.

## 20. Bookings, 21. Inspection

Bookings: DISCOVERY_B section 3 (spine, statuses, GiST no-overlap, hold
countdown checkout, cancel flow, review eligibility decided by the
database). Inspections: six-state trigger-guarded machine, accept inside
the thread, `/inspections` Open/Closed, notifications on every transition
as of this week: the property side's signature flow, one design pass old.

## 22. Sharing

Native share sheets with clipboard fallback everywhere it matters;
`/wallet/receive` composes prefilled payment-request links. No referral or
invite mechanism exists anywhere.

## 23. Property management, 24. Agent and owner experiences

The agent console is complete and real (DISCOVERY_A section 1.5): all
twelve routes live against RLS-bound reads, the seven-step wizard with
draft restore, the calendar as the only writer of unavailability, real
analytics. The owner/professional distinction disappears after approval;
the Host (stays operator) experience does not exist yet.

## 25. Admin panel

DISCOVERY_B section 6: the deep walk of all twenty-plus desks, the
QueueFilters frame coverage, gating, audit logging, and what a serious
production company still needs. Design-critical fact: nineteen queues of
tabular content have never been rendered signed-in by any session; admin
needs one reference design (a queue at 390px and at desktop) that all
desks inherit.

## 26. Settings

DISCOVERY_B section 7. Searchable settings home, payments (new), 
interests, place, devices/sessions, theme, language, legal copies.
Missing settings that would materially improve the product are listed
there (notification preferences granularity, data export, account
deletion flow status).

## 27. Authentication, 28. Security

DISCOVERY_B section 8 (architecture level, no secrets): full email flow
with verify codes and honest expired-link states, OAuth chooser, session
handling, middleware gates, rate limiting inventory, zod coverage, webhook
signature verification, RLS posture over 75 tables, and the areas
requiring hardening. 2FA does not exist. Client error observability is
`console.error` (Sentry named as future): the redesign will have no field
data on real breakage.

## 29. Privacy and data collection

DISCOVERY_B section 9: what personal data is collected by table and
bucket, where it flows (Supabase, Paystack, Anthropic, Resend), the legal
pages versus actual behaviour, NDPA posture and the NDPC registration
commitment, and the attention list. No user data is reproduced anywhere in
these reports.

## 30. Existing branding

DISCOVERY_C section 1: the rebrand is done in source; the 18-row
location-by-location table covers the remnants (stale `.next` artefacts,
`rm-` email classes, migration filenames as accepted history, the `nf-`
prefix permanently accepted as internal, manifest "travel" category, the
repo name itself, the unverifiable old Vercel deployment). Slogan: one
open register question (exclamation casing vs the hero's sentence case).

## 31. Existing design system

DISCOVERY_C section 2, binding on the redesign: the colour law, the glass
material's four ingredients and stride-ring card, elevation/radius/spacing
/type laws, the component inventory (including: there is deliberately no
toast, with its landing curve reserved), and the verified inconsistency
tail (464 arbitrary font sizes, 328 raw spacing utilities, the duplicated
thread anatomy, the admin mode-accent orphan, the parallel email palette).

## 32. Responsive and mobile

DISCOVERY_C section 5. The 390-dark-first law holds structurally: one
gutter token, floating dock vs 64rem rail from one stylesheet, safe areas
handled including Capacitor. Admin-on-phone has a shell but unverified
content density. Long-form (site) pages are under-designed at desktop, not
squeezed on mobile.

## 33. Existing assets

DISCOVERY_C section 3: four Vallo logo assets (alpha fixed), 103 glass
objects + 24 light twins + 12 hero scenes (restaurant and resort marks
missing, commissions; `escrow-hold` and `hotel-sign` structurally
withheld), scripted icon/OG/PWA pipelines, eight self-hosted font files,
zero photographs, zero video, the dead 6.5MB clay set. Retain/replace/
redesign verdicts included. `docs/IMAGERY.md` is the vetted eight-scene
photography shopping list: founder work, because the build environment
blocks every image host.

## 34. Existing integrations

Section 3 above plus DISCOVERY_B section 1. Costed plan: 
`docs/API_INVENTORY.md`.

## 35. Technical gaps (top of the list)

1. `lib/stays/` read layer absent: the stay showcase is dormant.
2. The feed's dead cursor: pagination BACKEND ONLY.
3. `/rent` N+1 conversation lookups on the hot path.
4. Two bank-account systems, no reconciliation surface.
5. No client error reporting; no analytics product anywhere.
6. Map tiles on a non-commercial licence until the MapTiler key lands.
7. M6 founder-gated: room-level bookings cannot exist until it lands.

## 36. UX gaps (top of the list)

1. The rent money path dead-end (the platform's most emphasised journey).
2. Reserved tables vanish (no trips row, no thread).
3. Nothing teaches the flip or the three switchers; the coin is below the
   fold.
4. No saved searches, alerts, price-drop or new-in-area notifications, no
   push: zero retention loops beyond localStorage recents.
5. No similar listings, location map or visible availability calendar on
   the decision screen.
6. Sign-up wall on all product links from the landing (recorded product
   decision; the redesign should challenge it consciously or accept it).

## 37. UI and design gaps

DISCOVERY_C section 7 carries per-area verdicts. The five that most need
design decisions rather than polish: the no-photo card treatment (the
whole catalogue's face), the flip mid-turn frame, ResultSheet's pending
state (the marks exist, nothing draws them), the admin queue reference,
and the Stays warmth register (today the two sides differ only by accent
depth and nav).

## 38. Missing product capabilities

Referral/invites, saved-search alerts, price history and market context,
neighbourhood context on listings (data exists), reviews summary and
distribution, comparison tooling on /saved, host tooling (the entire
operator side of Stays), push notifications, analytics, support tooling
depth (DISCOVERY_B), data export.

## 39. Areas requiring visual redesign

In priority order, from the per-area verdicts: (1) the catalogue face
(card + detail under the no-photo reality), (2) the Stays side's own
character, (3) the money ceremony (ResultSheet states, checkout pending,
send/receive), (4) the thread faces as one family, (5) home's masthead
moment, (6) admin's queue reference, (7) onboarding/welcome with the
two-sides story, (8) the landing's section-scene rhythm. The auth screen
is the register-setter: change everything around it, do not regress it.

## 40. Recommended visual reference image list

**The definitive list: 24 images, one area each, never a collage**, fully
specified in DISCOVERY_C section 8 with what must be visible, components,
imagery requirements, UI requirements, motion ideas, viewport, and the
why. The areas: landing hero phone, landing hero desktop, markets band,
property card without photograph, property card with photograph, search
results with filter drawer, listing detail top fold, the move-in ledger,
**the flip mid-turn**, stays home shelf (with one honest Third party row),
stay detail showcase, trips date spine, wallet home, send money mid-flow,
ResultSheet pending, ResultSheet failed in light theme, inbox + rental
thread face, booking thread face timeline, inspections Open/Closed,
settings grouped rows, admin queue at 390px, admin queue at desktop, auth
sign-in, welcome first-run with the coin. Deliberately excluded and why:
legal, help, map view, restaurants (blocked on the mark commission),
social feed (premature while system-authored).

## 41. Design principles for the next session

1. **Work inside the law.** One blue family; glass floats, reading sits on
   solid; four glass ingredients or it is not glass; 22px cards, 14px
   controls; motion is physics with a written contract; 390px dark first,
   light as a designed twin, both themes for every reference.
2. **Design for both catalogue realities**: the no-photo information
   surface and the golden-hour photograph, as a pair.
3. **The two sides are one system with two temperaments**: Property
   architectural, Stays warmer and more photographic, told apart by depth
   and imagery, never by a new hue.
4. **Honesty is the brand**: statuses are refusals-with-reasons, pending
   states carry marks + amount + consequence, nothing invents data, demo
   rows are disclosed. Design the honesty beautifully instead of hiding it.
5. **Restraint**: no glass smeared everywhere, no capsule buttons, no
   warm gradients, no generic SaaS shapes, one ambient motion per
   viewport, no confetti. The existing product deletes its failures and
   writes down why; match that culture.
6. **The two visual references from the founder**: NOT YET RECEIVED at
   the time of writing. When they arrive, extract composition principles
   (hero anchoring, floating UI, layering, search placement, typography,
   image treatment) and translate them into Vallo's own language; never
   copy them. [PLACEHOLDER: this section is completed when the founder
   sends the two images.]

## 42. Anything else discovered

- The styleguide page (`/styleguide`) is a living token reference: the
  screenshot-before-and-after page for the redesign.
- The (dev) gallery renders gated components without a session: the
  redesign session's window into signed-in UI.
- `KNOWN_GAPS.md` is stale (9 August) and will mis-plan anyone who reads
  it first; this report supersedes it for discovery purposes.
- The motion post mortems are binding law: no CSS lands without its
  component.
- Nothing signed-in has ever been rendered by any audit session; the
  seeded login remains the highest-leverage gift the founder can give.

---

# DESIGN SESSION HANDOFF

The ten things the design session must hold before drawing anything:

1. **Mission**: produce separate visual reference images, ONE AREA PER
   IMAGE, per the 24-image list in section 40 (full specs in
   DISCOVERY_C section 8). Never one giant collage. The eventual product
   direction: premium glass with restraint, 2030-level polish, an original
   Vallo identity, not a copy of any reference.
2. **Read in order**: this report, then DISCOVERY_C (the design law and
   verdicts), then DISCOVERY_A (what every surface actually is), then
   DISCOVERY_B for any system you touch, then `docs/BRAND_MARKS.md`,
   `docs/ICON_SYSTEM.md`, `docs/HANDOFF_03_FRONTEND.md`, and
   `packages/design-tokens/src/tokens.css` (it argues its own reasoning).
3. **The binding laws**: one blue family + emerald/rose/cyan only; the
   four-ingredient glass contract; 22px cards, 14px rectangular controls;
   390px dark first, light designed not derived; two-tier icons never
   mixed in a row; no text baked into artwork; escrow promised nowhere;
   no orange, amber, gold or purple, ever.
4. **The catalogue has zero photographs.** Design every card and detail
   for the drawn-scene reality AND the future photograph, as a pair.
5. **The flip is the signature.** It is built and finished; give it the
   hero frame it deserves and let the two sides' temperaments justify it.
6. **Design the dead-ends as if solved**: the rent pay step, reservations
   on trips and in threads: these are building as you draw; reference
   images should show the completed journeys.
7. **The three switchers need an onboarding moment**; welcome/first-run
   is the natural home and currently the thinnest designed surface.
8. **Admin gets one reference queue** (390px and desktop) that nineteen
   desks inherit; it has never been seen rendered.
9. **Money states are the anxiety peak**: pending/failed ResultSheet
   frames with mark + amount + consequence are the highest-leverage
   designs in the set.
10. **Do not regress the best screens**: auth, the wallet balance card,
    the settings row grammar, the listing card. They set the register the
    rest must rise to.
