# HANDOFF 05: the upgraded wide platform build

**This is the build brief.** Everything before it was understanding: the
company (`HANDOFF_01`), the method (`HANDOFF_02`), the glass language
(`HANDOFF_03`), the marketplace charter (`HANDOFF_04`), and two full research
reports that ground every claim in this file. Nothing here is speculation;
every fact carries a source in the repository.

**Read this as a revival.** Treat the platform like a serious project that was
paused with the engine still warm: the money core is sound, the design system
just went through two sprints, the hybrid inventory engine sits intact in git
history, and the research is done. The job is not building from scratch and it
is never allowed to feel like it. The job is to reopen the doors, re-light
every room, and walk out of this build with a product that looks and moves
like it was always meant to be a marketplace.

Written 18 September 2026. This session builds. The planning session that
produced this file did not write a line of product code on purpose.

---

## 0. The mission

**Vallo connects people with verified spaces, places, stays and the life
around them.** Property, Stays, Restaurants, one product, one search, one
wallet, one trust system. The slogan stands: **Real Estate reimagined!**

The standard, unchanged and binding: **would a funded design team have shipped
this.** Not "does it work".

---

## 1. First hour, no exceptions

1. `git pull origin main`. Read the newest sprint ledger; if a parallel
   session's sprint is still open, do not touch its owners' scopes until its
   close-out
2. Read, in order: `docs/HANDOFF_04_MARKETPLACE.md` (the charter, and its
   section 13 rules bind every worker),
   `docs/research/MARKETPLACE_ARCHITECTURE_RESEARCH.md` (1,050 lines, the
   architecture ground truth), `docs/research/API_INVENTORY_RESEARCH.md`
   (835 lines, the integration ground truth), `docs/API_INVENTORY.md` (the
   decisions distilled), `RECOMMENDATIONS.md` section 0 (the consolidation),
   then `docs/HANDOFF_03_FRONTEND.md` and `docs/FRONTEND_REVAMP.md` for the
   visual law
3. Run and record the baseline: `npm run typecheck`, `npm run lint`,
   `npm run test`, `npm run build`. Nothing is blamed on you that was already
   broken, and nothing broken by you hides in the noise
4. **Ask the founder once, at the start, for the seeded login.** Three
   sessions have named it the highest-leverage gift: nothing signed-in has
   ever been rendered by any session because the environment has no
   credentials
5. Confirm which founder decisions from section 5 have his word. Build
   everything that does not depend on the undecided ones; nothing in the
   backbone below is blocked by any of them except where marked

---

## 2. What the research established, so nobody re-learns it

**The vault is real and better than remembered.** All eight commits were read.
`dedupe.ts` and `http.ts` restore nearly as-is. The registry, envelope, types,
mapping, LiteAPI search client, places client, prebook flow and
`partner_stay_intents` restore rewritten to today's tree (the salvage map in
the research names target paths). The 889-line booking client stays
REFERENCE-ONLY behind the Model 2 gate. The `hybrid_hotels` and
`hybrid_restaurants` FeatureKeys still exist in `lib/flags.ts`; only the
database rows are gone. Amadeus stays dead without the founder's word.

**The location layer is further along than any document claimed.** PostGIS
3.3.7 is installed and live. `listings` already carries a trigger-maintained
geography column with a partial GiST index, and `listings_in_bounds` is wired
to a hardened API route. The search verdict is settled: Postgres FTS +
`pg_trgm` + PostGIS, no external engine, with a written adoption threshold if
the database ever measurably fails.

**The booking spine is nearly ready for stays.** The live `booking_status`
enum already carries `COMPLETED` and `NO_SHOW`. What bookings lacks is a
transition-guard trigger; `escrow_guard_transition` is the pattern to copy.
The cheapest big win in the whole backend.

**Paystack already covers Model 1's money needs.** Cards, transfers, payout
recipients, bank resolve, signed webhook, reconcile route. Stays under Model 1
need referral commission recording, not new payment rails.

**The one risk that outranks the rest:** Nigerian partner inventory depth is
unverified everywhere; LiteAPI is proven non-zero and nothing more. So
first-party host onboarding is the primary Nigerian supply, partner feeds are
the widener, and a Lagos-and-Abuja coverage count is recorded the day keys
land, before any density claim appears in copy.

**Two live security notes:** the Supabase advisor flags RLS disabled on four
`private`-schema tables (verify PostgREST schema exposure before touching
anything), and the `is_demo` discipline must be designed into every new table
from day one because all 64 current listings are demo rows with pins.

---

## 3. The build order

The backbone lands in this order because each step unblocks the next. The
full detail per step, including column lists, the ten-step migration sequence
and the concurrency probe, is research section 2; the register entries are
`MK-01` to `MK-68`.

**Phase A, the spine (backend-led):**
1. Enums, `cancellation_policies`, `businesses` (MK-01, MK-08)
2. `accommodations`, `room_types`, `rate_plans`, `rate_calendar` (MK-02,
   MK-03, MK-05, MK-06)
3. `room_inventory` with the one-statement locking reserve function, and the
   two-concurrent-taps probe that proves it (MK-07). Nothing above this is
   real until this holds
4. The `bookings` extension and the transition-guard trigger (MK-12, MK-13),
   after founder decision 1
5. `catalogue_entries` projection, `unaccent`, tsvector (MK-43)

**Phase B, the one search:**
6. Dates and guests end to end: URL shape, parser, controls, the
   availability join proving every night, range pricing with the total as
   the headline (MK-44, MK-45, MK-46)
7. The merged shelf and the ranking law: first party first at equal
   relevance, dated inventory first for dated queries (MK-47, MK-48)

**Phase C, the partner lane:**
8. Restore `lib/inventory` per the salvage map, flags re-inserted, kill
   switches live, zero keys required and zero visible change (MK-33 to
   MK-36)
9. The LiteAPI provider rewritten to the stays model, `places_cache`,
   `partner_stay_intents`, the prebook route (MK-36)
10. The source label and the fulfilment-honest CTA, before any partner row
    ever renders (MK-37, MK-38)

**Phase D, the surfaces (frontend-led, section 4 is the law):**
11. The stay detail page, the first new surface people transact on
12. Search results in list, grid, map and split, cards leading with the
    total and the source label
13. `catalogue_in_bounds`, landmarks, near-X, the map as a first-class
    surface (MK-52 to MK-57)
14. The business onboarding wizard, completable in one sitting (MK-20)
15. The host console on the QueueFilters frame: reservations, calendar,
    availability, revenue (MK-21 to MK-24)

**Phase E, the third pillar and the flywheel:**
16. Booking lifecycle jobs: hold TTL sweep, COMPLETED at checkout, NO_SHOW
    (MK-14, MK-17)
17. Restaurants on the machinery that exists: profiles, service windows, the
    trigger branch, the console, open-now discovery (MK-27 to MK-32)
18. Stays moderation, partner-source queues, provider health in admin
    (MK-39, plus the QueueFilters expansion)
19. Verified-stay reviews on COMPLETED bookings, host responses (MK-59,
    MK-61)
20. Money observability before the job count grows: cron alerting, money
    line alerting, the nightly inventory drift sweep (MK-65, MK-66), then
    notification consolidation and four-locale stays vocabulary (MK-67,
    MK-68)

**Threaded through every phase, not appended after it:** the still-open
load-bearing entries the sprints never touched, worked as their areas come
up: `A1-001` (the rent money path, the oldest wound), section B money
safety, `W-3`/`W-5`/`W-6` (the wallet graduates to the marketplace's
financial heart), `N-4`, `M-1`, CI type generation (`A2-064`/`P-5`).

---

## 4. The frontend law for this build

This is where the revival is seen. The platform's whole face gets carried the
rest of the way: **every container, every position, every size, every radius,
every surface re-cut to the glass language until the product reads as one
deliberate object.** Upgrading, never rebuilding: the sprints laid the
material system, the motion system, the icon layer and the seven-section
landing; this build extends that system to the marketplace and finishes what
they started. Nothing ships off-system.

- **Glass where it earns its place, and slicker than anywhere else on the
  continent.** Buttons lit from within with real press physics, containers
  with the two-layer card, sheets that are real glass, the confirmation
  system on `ResultSheet` everywhere money or state changes. One glow scale,
  one elevation ladder, one radius law. A screen where twelve things glow is
  a screen where nothing does
- **The pillar navigation** (Discover, Property, Stays, Restaurants, Saved,
  Bookings, Wallet, Messages, Profile as the starting hypothesis) reasoned
  in both themes at both widths before the tab bar is rebuilt; ADR-007 gets
  its amendment written when the IA lands
- **Cards are honest and calm:** market label, the total as the headline,
  the source label, verification that means something exact, progressive
  disclosure, no truncation of meaning
- **The stay detail page is the showcase:** gallery, room and rate selection
  that feels like a real booking surface, dates and guests, the total with
  everything included, the policy in plain words, the fulfilment-honest CTA
- **The wallet reads like the financial heart** it already is underneath:
  balance, ledger, send, withdraw, fund, receipts, refunds, every state
  through the confirmation system, every transaction linked to the
  marketplace object it paid for
- **Motion is physics.** Named curves, one system, `prefers-reduced-motion`
  honoured at the top, one ambient animation per viewport, springs not fades
- **390px first, in dark, then wider, then light.** Both themes are designed;
  a finding that only works in dark is half a finding
- **No AI slop, the list is binding:** no meaningless gradients, no random
  glow, no glass smeared everywhere, no generic SaaS, no copied Airbnb or
  Booking language, no trend because it is trendy. Vallo has its own face now

---

## 5. Founder decisions, gated versus assumed

**Assumed (the charter already decided):** Model 1 as the MVP default; the
badge never on partner rows; additive-only migrations; Postgres-first search;
first-party supply primacy.

**Waiting on his word, tracked from the research:**

1. `bookings.listing_id` relaxed to nullable, the one constraint change on
   the money path's table (the alternative, a rival `stay_bookings` spine,
   is recommended against)
2. LiteAPI sandbox key, then whitelabel domain. Until the second, partner
   hotels are priced but honestly unbookable, which the restored vault
   already handles
3. Partner hotel photos: proxy through Vallo, or named CDN hosts in CSP.
   The old wildcard stays closed either way
4. MapTiler key funded before launch (licence exposure, `M-1`)
5. Google Places billing, and whether restaurant data is first-party only or
   licensed display
6. The four `private` tables the advisor flags: confirm non-exposure or
   authorise RLS
7. ADR-015 committed (draft in section 8)
8. The seeded login
9. The landmark seed list, one page to approve
10. Restaurants migrating from `property_type = 'restaurant'` listings to
    business rows
11. Amadeus stays dead unless he says otherwise
12. Paystack DVA (BVN consent and notice change first), push identifiers,
    KYC contracts: all NEXT-wave, none blocks the backbone

---

## 6. The APIs and what they cost

`docs/API_INVENTORY.md` is the plan; the research file holds the evidence.
The short of it: **the backbone needs almost no new money.** LiteAPI is
commission-model with no upfront fee found; PostGIS and FTS are included in
the database already paid for; MapTiler has a free tier and the key is a
licensing item; Paystack is live. The NEXT wave brings the priced items:
Termii per-message SMS, Apple's $99 a year when native push ships, KYC
contracts on quotes, Paystack DVA per-credit fees. Every figure is
search-derived and marked "requires provider confirmation"; none is invented,
and the founder confirms each before it is spent.

---

## 7. How this session runs

**Fully autonomous, two agents maximum plus the lead**, on the sprint-proven
contract: strict non-overlapping written file scopes; a finding outside your
scope is a line in your report, not an edit; agents never run git; the lead
re-audits and commits everything; nobody's success report is believed without
verification; everybody restates HANDOFF_04 section 13 before starting.

The natural split: **one agent on the backend spine** (phases A, C and the
lifecycle jobs), **one agent on the surfaces** (phases B's controls and D),
**the lead** on migrations-and-probes, integration boundaries, admin, the
i18n and docs trail, and synthesis. Adjust by evidence, not preference.

**The stop list, short and absolute:** merchant-of-record exposure or any
float; spending money or new paid vendors; destructive database operations;
git history rewriting; remote branch deletion beyond credentials; native app
identifiers; anything touching `HANDOFF_01` legal ground; writing test rows
to live tables (ask for the seeded account instead); Amadeus. Everything
else: decide, build, verify, record, keep going.

**No half implementations, the banned sentences stand:** "hotel support
added" with only a card, "booking implemented" without availability
integrity proven under concurrency, "wallet redesigned" with a broken
withdraw, "marketplace complete" on an architecture that cannot carry it.
Every feature closes the ONE LAW loop: UI action, validated server action,
database write surviving RLS, the UI showing the new reality, the
notification the event deserves, a test proving it. **Never say committed,
pushed, tested or done unless it is true; report what was skipped,
unprompted.**

---

## 8. ADR-015, ready to commit on founder decision 7

> **ADR-015. The labelled-source lane.** Evolves ADR-013; does not repeal
> it. The verified badge keeps exactly its ADR-013 meaning: a human was
> checked by Vallo, and no partner or provider row may ever carry it, which
> a database CHECK enforces rather than a convention. What changes is the
> inventory rule: beside first-party rows, the platform may render partner
> inventory that always carries an explicit, calm source label and a
> fulfilment-honest call to action stating who fulfils the booking and where
> payment happens. Partner rows never enter escrow, never touch the wallet
> under Model 1, and are excluded from every claim the platform makes about
> verification. The code comments that cite ADR-013 as "there is not going
> to be another source" are corrected wherever a partner row can now render.

---

## 9. Repository hygiene carried into this build

- **The branch clicks are the founder's:** `docs/BRANCH_AUDIT.md` holds the
  fourteen Delete verdicts with recovery SHAs and the sixty-second UI path.
  This environment's credential cannot delete remote branches; do not burn
  time retrying
- **The Claude-authorship history rewrite is a gated, separate operation,**
  only after every parallel session has closed and only on the founder's
  explicit word, because it rewrites every commit and breaks every clone
  and open session. The shape when authorised: mirror-clone, rewrite
  committer and author identities and strip trailer lines with a
  history-filter tool, force-push the mirror, every collaborator re-clones,
  and the operation is documented in the audit file. Until that word: new
  work carries no tool-branded branch names, and the repository stays
  private
- Superseded documents move to `docs/archive/` when their replacement
  lands, never deleted; the archive is the record

---

## 10. Deliverables and the definition of done

1. The backbone of section 3 built, probed and green: schema live and
   mirrored, the reserve function surviving the concurrency probe, the one
   search answering Lagos-dates-guests with honest totals
2. The surfaces of phase D shipped to the section 4 law, in both themes, at
   390px first
3. The partner lane restored and dark: kill switches off, zero keys, ready
   to light the day the founder lands credentials
4. The consoles and admin queues operating
5. `RECOMMENDATIONS.md` maintained as the one register: MK entries closed
   with commits as they land, old rows normalised inline as their areas are
   touched
6. Documentation matching the code it describes, ADR-015 and the ADR-007
   amendment included once decided
7. **`docs/HANDOFF_06.md` for the next session**: what Vallo is now, what
   was implemented and verified, every schema and API change, what remains
   with file-level precision, credentials still missing, and the rules
   carried forward. An execution document, not a farewell note
8. A close-out to the founder in his language: short, honest, nothing
   padded, what needs his word listed plainly

**The final outcome, and read this out loud before starting:** a customer
finds a home, books a stay and knows where to eat, in one product that moves
like light on glass; a host runs a real console; a partner hotel is honest
about what it is; the wallet is the financial heart; the database refuses to
oversell a room even when two thumbs tap at once; and the next session opens
a handoff instead of an excavation. That is the revival. Build it.
