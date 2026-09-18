# HANDOFF 05, third edition: the two-side platform in its true face

**This edition supersedes the second entirely** (archived at
`docs/archive/HANDOFF_05_SECOND_EDITION_2026-09-18.md`) on the founder's
ruling of late 18 September 2026. What changed: the founder produced a full
set of visual reference images of how Vallo must look (60-plus renders now in
`docs/design/references/`, catalogued in `docs/design/CATALOGUE.md`), and
ruled that **making the platform look near-identical to those images is the
most important work of this build**. The previous session was retired after
landing most of the backbone; a fresh session executes this edition.

**This handoff has two parts. PART ONE is the backend: finish and harden the
engine. PART TWO is the frontend: the image-driven visual sweep across the
whole platform.** They run in parallel with a ten-worker structure
(section 3). `docs/HANDOFF_04_MARKETPLACE.md` section 13 still binds every
worker; `docs/DESIGN_DIRECTION.md` is the frontend's law;
`docs/BUILD_05_LEDGER.md` records what the retired session landed and this
session's ledger is **`docs/BUILD_06_LEDGER.md`** (create it in the first
hour, same anatomy: rules restated, scopes, queue, landed table, probes,
pitches, needs-the-founder).

---

## 0. First hour, no exceptions

1. `git pull origin main`. Read this file top to bottom, then
   `docs/DESIGN_DIRECTION.md` (the frontend law), then
   `docs/design/CATALOGUE.md` beside the folder it maps, then
   `docs/BUILD_05_LEDGER.md` (what already landed, commit-tied), then
   `docs/HANDOFF_04_MARKETPLACE.md` section 13. For depth as needed:
   `docs/VALLO_DISCOVERY_REPORT.md` and the four discovery/research files it
   indexes, `docs/HOST_ONBOARDING_RESEARCH.md`, `RECOMMENDATIONS.md`
   section 0.
2. **Acknowledge the rules before touching anything**: restate the twenty
   rules and the stop list from `BUILD_05_LEDGER.md` section 0 at the top of
   `BUILD_06_LEDGER.md`. Every agent restates them in its first report.
3. Run and record the baseline (typecheck, lint, test, build) in the ledger.
4. Ask the founder ONCE, in one short message, for: the seeded login, the
   `COINGECKO_API_KEY` when he has it, and his word on M6. Then build
   everything that does not wait on them, which is nearly everything.
5. Work FULLY AUTONOMOUS: no permission questions for anything reversible,
   push to main (`git pull --rebase` before every push), report short and
   honest only when something big lands or genuinely needs his word. Never
   say done unless it is true.

---

## 1. PART ONE: THE BACKEND

The retired session landed the spine: M1 to M15 applied and probed (M6 and
the landmark seed drafted in `supabase/migrations/pending/`, founder-gated),
the oversell gate proven, thread contexts, inspection notifications,
`payment_methods` and `bank_accounts`, saved-card charging wired into
checkout, host onboarding actions (M14/M15) and the admin business desk.
`docs/BUILD_05_LEDGER.md` section 4 is the commit-tied record. What remains:

**B1. The founder-gated pair.** The moment his word lands: apply M6
(bookings.listing_id relaxation + the transition guard + booking_state_events
in one migration) and the M8 landmark seed. Until then, keep both drafted and
keep everything else independent of them.

**B2. The stays read layer completed.** `lib/stays/` exists now; finish the
twelve-filter search against the M9 projection (rating, room type,
facilities, breakfast, AC, parking, Wi-Fi, verified, free cancellation,
landmark distance, price, location), the availability-aware merged shelf,
date-and-guest parameters end to end, and wake the dormant
`readStayDetail()` seam so `/stay/[id]` renders the showcase instead of
falling through.

**B3. The consumer dead-ends closed.** Reservations on `/trips`
(`getMyReservations`) and `reserveTable` binding its thread so the
reservation face has a home; the rent money path (A1-001): design and ship
the in-product rent payment step riding the existing wallet and Paystack
rails (the inspection-to-payment journey must end on-platform); the feed's
pagination (consume the cursor that already exists).

**B4. The lifecycle jobs.** Hold TTL sweep releasing inventory, COMPLETED at
checkout time, NO_SHOW recording and its notification, the nightly inventory
drift sweep, cron alerting so no job fails silently (MK-14, MK-17, MK-65,
MK-66).

**B5. Hardening, the security layer.** Rate limits on every money path
(fund, send, withdraw, charge saved card) per A2-046/W-2; blocks enforced in
messaging (RLS or action-level), not only social; webhook and cron failure
alerting into `risk_alerts`; the audit_log gains a reader in admin; CI
(typecheck, lint, test on push) per A2-141/T-1; restaurant `service_windows`
surfaces (hours, open-now); host verification rungs completed against
`HOST_ONBOARDING_RESEARCH.md` section 3; `saved_places` surfaces on the
Stays side.

**B6. The crypto proxy.** A server-side route family for the side-nav
Crypto surface: CoinGecko (prices, markets, coin detail) and GeckoTerminal
(pairs) behind our API with caching and rate limits, key from env, honest
unconfigured state until the founder lands the key. Display-only; no
trading, no custody, no advice copy.

**B7. Admin enrichment.** The businesses queue is live; give admin what the
discovery named missing: the audit-log viewer, reservation oversight chip,
inventory drift surfacing in alerts, refund console on the money desk,
payment-method lookup panel, and every new backend surface this build
creates gets its queue or panel on the QueueFilters frame. Phase F (the
third-party lane) stays dark and founder-gated exactly as the second
edition specified; nothing there before his keys and word.

---

## 2. PART TWO: THE FRONTEND, the image-driven visual sweep

**`docs/DESIGN_DIRECTION.md` is the whole law of this part. Read it before
any pixel.** The one-line version: the reference images are the target; the
shipped product must read near-identical to them; match through the token
system; translate off-brand render details per the direction doc; every
area without an image inherits the register; everything stays functional
end to end. This is a WIDE PLATFORM SWEEP: every surface of the product is
in scope, not a page or two.

The sweep, grouped for the five frontend workers (exact file scopes written
in the ledger by the lead; the catalogue names which image governs which
surface):

**F1. Chrome and navigation.** The app header (hamburger, lockup, bell,
avatar), the side drawer rebuilt as the designed surface with the flip coin
as its star, the five-slot dock (Home/Stays, Search, Feed, More, Profile)
restyled to the renders, the flip's cover and glow matched to
`GOVERNING-flip-mid-turn.png`, welcome/first-run introducing the two sides
and the coin, sign-in restyled to its render, the theme crossing held.

**F2. The landing and marketing shell.** The landing rebuilt to the two
GOVERNING landing images (hero with the villa plate, glass nav, search pill
with Buy/Rent/Stay/Invest, floating verified card, stats band, feature
grid, community band, how-it-works, category tiles, Stays band, app band,
footer), desktop first for this one surface then the 390px derivation, and
the (site) pages pulled into the same register.

**F3. Catalogue and money surfaces.** Search results and filters, listing
detail and the move-in ledger, stays home, stay search, stay detail, trips,
restaurants, checkout, the wallet family (home, send, receive,
transactions, receipts), payment result sheets, `/settings/payments`, all
restyled to their governing renders with the photo assets wired in; the
crypto surface built new in the register.

**F4. Social and identity.** The feed to `GOVERNING-feed-plus-bloom.png`
including the + bloom exactly (Post, Story, Review), post threads, stories,
places, profile to its render (cover, avatar, counts, tabs), edit profile
and children in the same register, notifications, settings home restyled.

**F5. Conversations and operations.** Messages to
`GOVERNING-chat-booking-card.png` including real forwardable listing and
booking cards in chat, the three thread faces restyled as one family,
inspections, the agent console pulled into the register, the host wizard
surfaces, and the admin queue reference (one queue designed at 390px and
desktop, all desks inheriting).

**The enhancement worker (the tenth).** As each frontend scope closes, this
worker re-audits it against its governing image (side-by-side screenshot in
the ledger), and adds the small depth the founder asked for: little tools
and touches that make each surface more functional without changing the
look: quick actions, empty-state intelligence, keyboard affordances, share
entries, micro-copy. Never restyles against the direction, never blocks a
scope, records every addition in the ledger.

---

## 3. How this session runs

**The lead plus nine agents, all hands on deck, shipping non-stop.**

- **Lead**: owns the ledger, writes every scope, re-audits and commits
  everything, builds hands-on in the gaps (the flip restyle and chrome are
  natural lead work), keeps the founder's short reports, closes with
  HANDOFF_06.
- **Five frontend agents** on F1 to F5. **Four backend agents** on B1+B4,
  B2+B3, B5, B6+B7 (adjust splits by evidence, never overlap files).
  **One enhancement worker** as above.
- Contract unchanged and absolute: strict non-overlapping written file
  scopes; agents never run git; a finding outside your scope is a line in
  your report; no success report believed without the lead's verification;
  narrow commands until a phase closes; every worker restates the rules
  before starting.
- Budget discipline: read the direction and catalogue once, work from
  them; batch edits; screenshots for the image comparisons, not prose.
- The permission surface is the founder's session setting; the work itself
  asks him nothing except the section 0 item 4 list and anything on the
  stop list.

**The stop list of the second edition stands word for word** (it is
restated in `BUILD_05_LEDGER.md` section 0), plus two additions: never ship
an image asset without compression and sizing through next/image, and
never let a reference image's off-brand detail (warm hue, pill control,
baked text) into the product; the direction doc's translation rules decide.

---

## 4. Definition of done

1. Every surface in Part Two matches its governing image per the
   DESIGN_DIRECTION definition of done (side-by-side in the ledger), and
   every surface without an image reads as the same product.
2. Everything remains FUNCTIONAL end to end: the sweep never trades a
   working flow for a look; the ONE LAW closes every touched feature.
3. Part One's B2 and B3 close the three consumer dead-ends (rent payment,
   reservations visible, feed paging) and the stays showcase is live.
4. The hardening list (B5) lands: rate limits, blocks in messaging, CI,
   alerting, the audit viewer.
5. The photo assets are wired: cards, galleries, landing, auth carry the
   real imagery; no drawn-scene-only catalogue remains where photos exist.
6. Store-readiness posture: this build is heading to the App Store and
   Play Store; the Capacitor shells keep working, safe areas hold, nothing
   regresses the PWA.
7. `BUILD_06_LEDGER.md` maintained throughout; `RECOMMENDATIONS.md` rows
   closed inline as touched; **`docs/HANDOFF_06.md`** written at close: what
   Vallo now is, what landed with commits, what remains file-precisely,
   what needs the founder.
8. A short close-out to the founder in his language: what is live, what is
   proven, what needs his word.

**Read this before starting and read it out loud: the founder's bar is
"almost identical if not identical" to the images, alive, premium,
marvelous, and still honest and functional underneath. Both at once. That
is the whole job. Build it.**
