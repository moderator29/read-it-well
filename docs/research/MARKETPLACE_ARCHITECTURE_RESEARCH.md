# Marketplace architecture research

> **Track A, 25 September 2026.** Vallo no longer holds customer money: the wallet, escrow and held payments are retired. Where this document describes them it describes the past; the current truth is [`docs/MONEY_ARCHITECTURE.md`](/docs/MONEY_ARCHITECTURE.md).

Agent 1 of the marketplace transformation. Research only. This file is the
single artefact of that work; no code, no doc and no database row was changed
in producing it. Written 18 September 2026 against `main` at `6b1bb674` and
the live Supabase project `uccixoonmbhrnyczyigt` (Postgres 17).

---

## The rules, restated before any finding

1. Zero em dashes anywhere. British spelling.
2. Money is integer kobo as bigint, everywhere, always. `formatMoney` from
   `@vallo/i18n` is the only divider.
3. Every server action returns the `ActionResult` envelope; sessions come from
   `resolveSession()`.
4. `BrandIcon` and `UiIcon` only. No `strokeWidth` on UiIcon, no `ramp` on
   BrandIcon, tiers never mix in a row.
5. 390px first, in dark, then wider, then light. Dark is the default and the
   OS does not override it.
6. One blue family. Emerald success, rose error, bright cyan pending and
   attention. No orange, amber, gold, purple, violet, magenta.
7. No raw colours, no raw spacing; use the scale or extend it.
8. The platform charges no fees anywhere in copy; a processor's cut is the
   processor's.
9. Escrow is promised nowhere until it operates.
10. The verified badge only ever means a human was checked. Partner inventory
    is always source-labelled, never dressed as first-party.
11. Banned in UI copy: demo, sample, preview, not live, coming soon, lorem.
    Colour is never the only signal.
12. Never say committed, tested, verified or done unless it is true. Say what
    was skipped, unprompted.

---

## 0. Method, and what this report can be trusted on

- Every database claim below marked **live-verified** came from the Supabase
  MCP tools against project `uccixoonmbhrnyczyigt` during this session:
  `list_tables`, `list_extensions` and SELECT-only `execute_sql` over
  `pg_catalog` and `information_schema`. No DML, no DDL was run.
- Every vault claim came from `git show` on the named commits in this
  repository's history.
- Everything else carries a file path. A claim with no path, sha or table name
  is a proposal, and is written as one.
- The end of this file lists what was not checked, plainly.

One security advisory the tooling surfaced must be relayed rather than
swallowed: **the Supabase advisor reports RLS disabled on four `private`
schema tables** (`private.reserved_handles`, `private.released_handles`,
`private.view_salts`, `private.daily_notes`). The `private` schema is not in
the PostgREST exposed schema list in this project's design, which is the
platform's stated defence, but I did not verify the exposed-schemas setting
from here. Agent 3 or the lead should confirm `private` is not API-exposed,
and if there is any doubt, enable RLS on those four with service-role-only
policies. Do not apply the advisor's bare `ENABLE ROW LEVEL SECURITY` without
policies; that would break the trigger paths that write them.

---

## 1. Track one: the vault excavation

### 1.1 What each commit holds, verified by `git show`

All eight commits are real, reachable from `main`, and dated 7 August 2026
(the day the hybrid layer reached its final form) except where noted. The
layer was then deleted wholesale under ADR-013 on 9 August; nothing under
`apps/web/src/lib/inventory/` exists in today's tree (verified by `ls`).

| Commit | What it is | Files |
| --- | --- | --- |
| `90b6b53d` | The LiteAPI booking client, 889 lines. `POST /rates/book` and cancel via `PUT /bookings/{id}`, wired to nothing on purpose. `ACC_CREDIT_CARD` is a literal, not an argument, so no caller can quietly change who is the merchant of record. Cancellation money converts to kobo only when the supplier says NGN; a foreign figure is a typed `unknown`, never a guess. Nothing throws; a failed booking explicitly does NOT mean no booking was made (timeout leaves the supplier free to have confirmed), so reconciliation before retry | `lib/inventory/providers/liteapi-booking.ts` (455), `liteapi-booking.test.ts` (434) |
| `f267a934` | A partner hotel becomes bookable, and says so only when it can. `LITEAPI_WHITELABEL_DOMAIN` mints a deep link to the whitelabel checkout on the SAME night the card was priced for. The domain is validated hard (no path, no query, no scheme injection) because it is interpolated into a URL a paying guest is sent to. The money test that matters: 185,000.55 naira maps to exactly 18,500,055 kobo via the integer parser, which `amount * 100` gets wrong for that value | `providers/liteapi.ts` +56, `liteapi.test.ts` +232, listing page +10 |
| `b02b290a` | The price the guest leaves with is the price the room costs. Book revalidates via `POST /rates/prebook` at the moment of the tap, records the intent in `public.partner_stay_intents` (a table whose name is load-bearing: it is NOT a booking), then hands over. A move past two per cent in either direction is said out loud; a revalidation that could not be reached says nothing, because a warning about a move nobody measured is worse than silence. Nothing in the path can stop somebody booking: every failure falls through to the price and link already held. `window.open` fires synchronously inside the click, before any await | `app/api/partner-stay/route.ts` (139), `components/app/listing/BookPartnerStay.tsx` (109), `providers/liteapi-prebook.ts` + tests |
| `5354fc90` | Quote the night the guest will actually be shown. Rates move from one adult to two, because the whitelabel destination defaults to two, and a number that changes when somebody acts on it reads as a bait price on the one screen asking for a card. The one-adult default was inherited from Amadeus and outlived its reason | `providers/liteapi.ts` +32 |
| `a78887ac` | The booking calls pointed at the right host. LiteAPI splits `api.liteapi.travel` (search, content) from `book.liteapi.travel` (booking family); all three modules had hardcoded `api`. One file, `liteapi-hosts.ts` (57 lines), now owns both hosts and says which is verified and which is inferred. `LITEAPI_BOOKING_HOST` overrides without a deploy; a value that is not a bare hostname is ignored rather than interpolated. The commit message records that the wrong host came from the brief itself and the client flagged it rather than following quietly | `providers/liteapi-hosts.ts` (new), booking/prebook/liteapi pointed at it |
| `7f9a7a4d` | Google Places quota batching, six requests to one. `/search` asked the repository three times per render and the decorator called out on all three; the map floor and bookings page were paying for rows they discarded. Both now pass `{ partners: false }`, a new repository option meaning "our own inventory, call nobody". A 429 quota refusal rests the provider for fifteen minutes, with a guard so the provider's own skip message (containing "quota") cannot renew the timer forever. Eight tests | `lib/inventory/index.ts` +71, `quota-backoff.test.ts` (88), `lib/listings/repository.ts`, search and bookings pages |
| `38c88d33` | The 401 disambiguation on empty provider notes. A `sand_`/`prod_` prefix is named as the right shape AND told what a 401 on that shape implies (the key itself refused: regenerate, check activation). No prefix names the public-key mistake. A test holds that the body of the key never appears in a note | `lib/inventory/http.test.ts`, `providers/liteapi.ts` |
| `08d2298f` | Amadeus removed, the decision recorded. The 417-line provider, registry entry, `byId` branch, three type members, two env variables and the secrets-redaction entries all go. Verified safe first: partner ids are minted at read time and never persisted, zero rows referenced one. **Note: this commit is a root commit in today's history** (no parent, `git log --format='%p'` is empty), so `git show 08d2298f` diffs against nothing and prints the whole tree snapshot. The inventory layer as of that snapshot is fully readable from it: `dedupe.ts` 353 lines, `index.ts` 367, `http.ts` 164, `liteapi.ts` 648, `places.ts` 502, `mapping.ts` 238, `types.ts` 95, plus 1,024 lines of tests |

### 1.2 The architecture, as read from the code at `a78887ac`

Read in full from `git show a78887ac:apps/web/src/lib/inventory/...`:

- **One interface, one method.** `InventoryProvider.search(filter)` resolves,
  never rejects, to a typed `ProviderResult` envelope with six outcomes:
  `ok`, `no_key`, `disabled`, `not_applicable`, `error`, `timeout`. "I have no
  key" and "I was called and broke" are different facts and only the second is
  logged.
- **The registry** (`index.ts`): three entries, Places registered twice (once
  per shelf) so `hybrid_hotels` and `hybrid_restaurants` kill switches in
  `public.feature_flags` move independently. Flags fail open (missing row
  means enabled); **keys are the actual gate and are checked first**, so a
  fail-open flag can never cause a request with no credential.
- **The timeout discipline.** `PROVIDER_TIMEOUT_MS = 2_500`, per provider,
  raced with `Promise.race`, collected with `Promise.allSettled`; the flag
  read sits inside the raced promise so a slow database eats the provider's
  budget, not the page's. Timers are `unref()`d so a serverless invocation is
  never held open.
- **The cache** is a request coalescer, not a store: 60s TTL, keyed on the
  filter, only complete answers cached (a timeout is retried, never
  inherited), capacity-capped at 64.
- **Reporting**: throttled to one log line per provider-outcome per minute;
  reasons carry status code and host, put through `redactSecrets` (which
  re-reads the environment on each call so a rotated key is still redacted),
  never a body.
- **The dedupe rule** (`dedupe.ts`): two records are one place only when BOTH
  signals agree: within 150 metres by haversine AND name token containment at
  0.6 after category nouns and place names are stripped, with `MIN_SOLO_TOKEN
  = 3` (three, not four, because "Eko" is three characters). Missing
  coordinates tighten to identical normalised name plus identical city rather
  than falling back to the unsafe half. Comparison classes stop a hotel
  merging with the restaurant inside it, and the tenancy market is never
  compared with nightly stays even at the same address. Position belongs to
  the first record seen; the strongest record fills it (first party 3, priced
  partner 2, priceless partner 1), so a feed can never displace or reorder
  first-party inventory.
- **The price honesty ladder** across `f267a934`, `5354fc90`, `b02b290a`,
  `a78887ac`: quote the occupancy the destination assumes; revalidate at the
  tap; speak only about a measured move past two per cent; record the intent;
  fail open to the link; and aim the booking family at the documented booking
  host with an env override.

### 1.3 The doors left open, checked against today's tree

- `apps/web/src/lib/listings/types.ts:177` keeps `source?: "vallo"` as a
  single-valued field, with the comment block at lines 48 to 61 saying exactly
  why: it widens back to a union without breaking a reader. **Verified, still
  true.**
- `apps/web/src/lib/flags.ts:26-27` still declares `"hybrid_hotels"` and
  `"hybrid_restaurants"` in the `FeatureKey` union. **Verified.** The
  database rows are gone (live `feature_flags` holds exactly:
  `agent_listings, assistant, bookings, events, messaging, social, support,
  wallet`, all true, live-verified), so re-instating the kill switches is one
  INSERT per shelf plus nothing in TypeScript.
- **One claim in HANDOFF_04 section 2.3 is stale and should not be repeated:**
  `apps/web/src/lib/security/csp.ts` no longer whitelists any LiteAPI host.
  The `img-src` wildcard that existed for partner hotel photos was closed
  (the comment at csp.ts lines 224 to 231 records the closure), and LiteAPI
  survives in that file only as history in a comment. Server-side provider
  calls are not governed by CSP at all, so restoration needs no CSP change
  for the API calls, but **partner hotel photos will need their CDN hosts
  added to `IMAGE_HOSTS` in csp.ts and to `next.config.ts` image domains**,
  and since LiteAPI serves photos from arbitrary supplier CDNs this is a real
  design decision (proxy the images, or accept a wildcard again). Flagged in
  section 5.
- `public.places_cache` and `public.partner_stay_intents` are **dropped from
  the live database** (live-verified: neither appears in the 75 public
  tables). Their migrations exist only in history. Restoration is a new
  migration, not a revert.

### 1.4 The salvage map

Verdicts: **RESTORE-AS-IS** means the behaviour and substantially the code
carry forward with only import-path and type-name mechanics.
**RESTORE-REWRITTEN** means the logic is treasure but the surface must be
rewritten to today's types, schema and rules. **REFERENCE-ONLY** means read
it, do not restore it without the named gate.

| Vault piece (at `a78887ac` unless noted) | Verdict | Target in today's tree | Why |
| --- | --- | --- | --- |
| `lib/inventory/dedupe.ts` + `dedupe.test.ts` | **RESTORE-AS-IS** | `apps/web/src/lib/inventory/dedupe.ts` | Pure functions over `Listing`; the 150m plus name-token rule, `MIN_SOLO_TOKEN = 3`, containment not Jaccard, comparison classes and the strength ladder are the treasure and encode weeks of debugging. Only edit: `PARTNER_CITIES` import follows wherever `mapping.ts` lands, and `Listing` gained fields since (additive, harmless) |
| `lib/inventory/types.ts` | **RESTORE-REWRITTEN** | `apps/web/src/lib/inventory/types.ts` | The envelope and the never-throws contract carry verbatim. Rewrite: `Listing.source` must widen to the new union (section 2), `verified: false` on partner rows stays law, and the provider name union grows only as providers are approved |
| `lib/inventory/index.ts` (registry, 2.5s race, allSettled, flag-inside-budget, throttled reporting, TTL cache, `partnerHealth`) | **RESTORE-REWRITTEN** | `apps/web/src/lib/inventory/index.ts` | The architecture is re-instated, not re-invented. Rewrite because: the `FeatureKey` flags need their DB rows re-inserted; `governs()` keys on `kind === "hotel"` and the kind model is changing; `partnerHealth` should feed a real admin surface this time (`/admin` integration health, A2-109) |
| `lib/inventory/http.ts` + test | **RESTORE-AS-IS** | `apps/web/src/lib/inventory/http.ts` | Deadline-per-conversation, nothing throws, `redactSecrets` re-read per call, upstream explanation bounded at 300 chars. Only edit: the secrets list tracks today's env names |
| `lib/inventory/mapping.ts` (partner id minting, `PARTNER_CITIES`) | **RESTORE-REWRITTEN** | `apps/web/src/lib/inventory/mapping.ts` | Partner ids minted at read time and never persisted was the right call and survives. Rewrite: city coverage should read `public.states` / `local_governments` rather than a hardcoded list, and mapped listings must target the new source model |
| `providers/liteapi.ts` + `liteapi-hosts.ts` + `liteapi-prebook.ts` + tests | **RESTORE-REWRITTEN** | `apps/web/src/lib/inventory/providers/liteapi.ts`, `liteapi-hosts.ts`, `liteapi-prebook.ts` | Carry verbatim in behaviour: two-adult quoting, naira-only pricing (drop a hotel with no NGN rate rather than show it priceless), the kobo integer parser, the two-host split with `LITEAPI_BOOKING_HOST` override, the key-shape diagnostics, static content cached and live rates never cached, both hops sharing one budget. Rewrite the `Listing` mapping to the stays model in section 2 |
| `providers/places.ts` + tests | **RESTORE-REWRITTEN** | `apps/web/src/lib/inventory/providers/places.ts` | Places policy (cache `place_id` indefinitely, details briefly, refetch on view, attribution flag carried on the mapped listing so the UI cannot forget) is licence compliance encoded in code. Rewrite: `public.places_cache` must be re-created by a new migration (section 2.6), and hotel-shelf registration only returns if the founder wants Places hotels at all |
| Quota backoff (`7f9a7a4d`: 15-minute rest on 429, self-renewal guard, `{ partners: false }` repository option) | **RESTORE-AS-IS** in behaviour | inside `index.ts` / `providers/places.ts`; the `partners` option on `ListingRepository` in `lib/listings/types.ts` | Paying six requests per render was measured, not guessed. The repository option is the piece that keeps first-party surfaces (bookings, map floors) from ever touching a feed |
| `providers/liteapi-booking.ts` + test (`90b6b53d`) | **REFERENCE-ONLY** | none until Model 2 | `ACC_CREDIT_CARD` makes Vallo merchant of record. HANDOFF_04 section 5 gates this on the founder's explicit word plus a funded float. The file is the costed proof of what Model 2 needs (reconciliation before retry, the cancellation-money union); it is not restored while the gate is closed |
| `partner_stay_intents` table + `app/api/partner-stay/route.ts` + `BookPartnerStay.tsx` (`b02b290a`) | **RESTORE-REWRITTEN** | new migration `partner_stay_intents`; `apps/web/src/app/api/partner-stay/route.ts`; `apps/web/src/components/app/listing/BookPartnerStay.tsx` | The prebook-at-tap, two per cent rule, fail-open-to-link, synchronous `window.open`, destination-rebuilt-from-the-listing behaviours carry verbatim. Rewritten because the table was dropped, the listing page has been rebuilt twice since, and the copy must satisfy today's banned-words specs and the fulfilment-honesty rule (the UI states who fulfils and where payment happens) |
| Listing detail partner branches (`f267a934`, `b02b290a` page edits) | **REFERENCE-ONLY** | the new stay detail page (HANDOFF_04 section 8) | The page they patched no longer exists in that shape. The behaviours (copy follows the action; a priced, unbookable hotel says plainly it cannot be booked here yet) transfer as requirements, not as code |
| `providers/amadeus.ts` (pre-`08d2298f`) | **REFERENCE-ONLY, do not restore** | none | Removed on the founder's word; the portal is dead. Restoring needs his word (HANDOFF_04 section 14) and a new provider anyway |

**What is stale in everything above**, so nobody pastes: the `@naijafinds/*`
scope became `@vallo/*`; `Listing` gained `isDemo`, utilities, videos,
`maxGuests` and the sale fields; the `source` union it targeted
(`"rentme" | "partner"`) is neither today's single value nor tomorrow's
union; `KIND_BY_PROPERTY_TYPE` and the intent model moved; the copy rules
(banned words, no "coming soon" synonyms) postdate every string in the vault;
and the glass icon layer replaced every mark those components rendered.

---

## 2. Track two: the data model

### 2.1 Ground truth, live-verified on 18 September 2026

75 base tables in `public` (the docs' "76" includes a view or predates a
drop; state 75 going forward). RLS enabled on every `public` table. 174
migration files in `supabase/migrations/`. 8 `pg_cron` jobs live (ADR-014
said six; two were added since). 154 functions in the `private` schema.

- **`listings`**: 65 columns (PRODUCT.md's 60 is stale). Kinds via
  `property_type` enum: `apartment, hotel, home, villa, shortlet, rental,
  shop, office, land, restaurant`. `listing_intent` is still two values
  (`rent, sale`) stretched over four markets (P-7 stands). Sale columns,
  tenure enum, utilities columns, `total_move_in_cost_minor` all present.
  `latitude`/`longitude` nullable; `location geography` maintained by trigger
  `listings_location_sync` (`private.sync_listing_location`); partial GiST
  index `listings_location_gist` on PUBLISHED with location. Trigram GIN
  indexes exist on `title`, `city`, `area` (PUBLISHED-partial). 64 rows, all
  64 `is_demo = true`, all 64 carrying pins.
- **`bookings`**: date-range stay object. `during daterange`, and the
  database itself refuses a double booking: `bookings_no_overlap EXCLUDE
  USING gist (listing_id WITH =, during WITH &&) WHERE status IN (PENDING,
  CONFIRMED)`. Arithmetic is constraint-enforced: `nights = check_out -
  check_in`, `subtotal = price_per_night * nights`, `total = subtotal +
  cleaning + service`, all bigint kobo. **`booking_status` is now `PENDING,
  CONFIRMED, COMPLETED, NO_SHOW, CANCELLED`, live-verified.** PRODUCT.md and
  RECOMMENDATIONS `E-2` ("no COMPLETED") are stale: the enum grew, most
  plausibly in `d5af1587` ("bookings: the loop gets an end"). Triggers:
  demo-listing refusal, notify, `set_updated_at`. **No transition-guard
  trigger exists on bookings**; state legality lives in application code and
  `booking_state_events` is written by the app
  (`lib/bookings/actions.ts`), not by trigger. That is the gap the
  marketplace state machines close.
- **`availability`**: PK `(listing_id, date)`, `availability_status`
  (`available, booked, unavailable`). One row per night per listing: correct
  for whole-place shortlets, and exactly the shape that does NOT scale to
  units per room type per night.
- **`booking_state_events`**: append-only history, app-written.
- **`reservations`**: restaurant table booking. Party size at a moment, not a
  date range; reuses `booking_status`. The trigger
  `reservations_validate` (`private.reservation_is_valid`, function body
  read live) enforces: the listing exists, `property_type = 'restaurant'`,
  status PUBLISHED, and no reservation in the past. The archive's
  "partner-blocking" framing survives as the first-party-only rule: the only
  reservable venue is a first-party published restaurant row. This trigger is
  the source-attribution principle already enforced in the schema.
- **`wallets`**: one per user, **no balance column** (table comment says so;
  balance derived via `private.wallet_balance` over COMPLETED
  `wallet_entries`). **`wallet_entries`**: append-only, amount positive,
  `UNIQUE (reference)` for idempotency, and a check that binds kind to
  direction (deposit/refund/transfer_in/escrow_release/escrow_refund are
  credits; withdrawal/payment/transfer_out/escrow_hold are debits).
- **`escrows`**: eight-state machine (`INITIATED, FUNDED, HELD,
  RELEASE_REQUESTED, RELEASED, REFUNDED, DISPUTED, RESOLVED`) with
  `escrows_guard_transition` BEFORE UPDATE trigger enforcing legality, an
  audit insert trigger, NGN-only check, parties-differ check, dispute and
  resolution note minimums. This is the house pattern the marketplace
  booking machines copy.
- **`fee_rates`**: append-only, `UNIQUE (kind, effective_from)`, two live
  rows (`commission` and `listing_fee`), **both 0 basis points and 0 flat,
  live-verified**.
- **`platform_revenue`**: append-only fee record with `reference`,
  `escrow_id`, `rate_id`, `revenue_source` enum
  (`escrow_commission, listing_fee`). Referral commission from partner
  bookings has no `revenue_source` value yet; that is an enum addition, not a
  new table.
- **`agent_verification_checks`**: one row per rung (`kind` text: identity,
  address, payout, in_person), `agents.verification_tier` derived by
  `private.sync_agent_verification_tier`, never hand-set. `agent_badges`
  written only by `private.sync_agent_badge`.
- **`audit_log`**: 482 rows, append-only, UPDATE/DELETE/TRUNCATE refused by
  three triggers calling `private.audit_log_is_append_only`.
- **`private.pay_booking_from_wallet`** exists (in the 154 private
  functions), the six-writes-in-one-transaction money path.

### 2.2 Extend `listings` versus new tables: the argument, and the pick

**The pick: a business layer with new stays tables, `listings` kept as the
property-market table, and `bookings` extended additively as the one booking
spine.** Reasoning:

For extending `listings`: one catalogue, one repository, one search path, one
RLS story; the shortlet market already works end to end on it; a hotel could
be a listing with `room_count`.

Against, and decisive: HANDOFF_04 section 6 forbids the shortcut by name
("Rooms are not listings"), and the schema itself agrees. A hotel is one
business with N room types and M units per type; a listing is one offer with
one price and one calendar. Bolting rooms onto `listings` means either one
listings row per room type (which multiplies every downstream FK: saved
items, reviews, conversations, and makes "the hotel" unaddressable) or
JSON room arrays (which the GiST exclusion, the rate calendar and the
inventory counter cannot touch). The 65-column table is already carrying four
markets on two intent values (P-7); adding a fifth axis is how it becomes
unmaintainable. And `availability`'s PK `(listing_id, date)` physically
cannot express "7 of 12 doubles left on the 16th".

What survives from the extend side: **the catalogue read stays unified.** A
search projection (section 2.5) gives discovery one shape to rank, so the
frontend never learns two repositories.

Also kept deliberately: **whole-place shortlets, guest houses with one unit,
and serviced apartments listed singly stay on `listings` + `bookings` +
`availability` exactly as today.** That machinery is proven (HANDOFF_02
section 2) and rebuilding it is the named most expensive mistake. The new
tables are for multi-unit inventory and for businesses as entities.

### 2.3 The proposed schema, table by table

All money bigint kobo. All tables: `id uuid primary key default
gen_random_uuid()`, `created_at timestamptz not null default now()`,
`updated_at timestamptz not null default now()` with the existing
`set_updated_at` trigger, RLS enabled, every FK covered by an index. RLS
postures follow the house pattern: public read of published rows via
planner-friendly `(select auth.uid())` policies, owner write, service role
through `private` SECURITY DEFINER functions.

**New enums** (all additive):

- `source_kind`: `first_party | partner | licensed_data`. First-class,
  never inferred, on every inventory root row.
- `fulfilment_mode`: `vallo | external_completion | partner_handoff`.
  Model 2 becomes a value flip on a row, not a rebuild, which is exactly the
  gate HANDOFF_04 section 5 asks the architecture to hold.
- `business_kind`: `hotel | serviced_apartments | guest_house | resort |
  shortlet_operator | restaurant | agency`.
- `meal_plan`: `room_only | breakfast | half_board | full_board`.
- `landmark_kind`: `airport | business_district | market | mall | stadium |
  beach | park | transport | education | hospital | worship | other`.
- Extend `booking_status`? No. It already has the five values needed.
- Extend `revenue_source` with `referral_commission` (additive enum value).

**`public.businesses`**, the operator entity and the root of source
attribution:

| Column | Type | Notes |
| --- | --- | --- |
| `owner_id` | uuid null, FK `auth.users` | Null allowed ONLY when `source <> 'first_party'`; CHECK enforces `(source = 'first_party') = (owner_id is not null)` |
| `agent_id` | uuid null, FK `agents` | The verified human behind a first-party business; the badge hangs here, never on partner rows |
| `kind` | `business_kind` not null | |
| `name`, `slug` | text not null, slug unique | |
| `description` | text | |
| `source` | `source_kind` not null default `'first_party'` | The column everything downstream branches on |
| `provider_name` | text null | e.g. `liteapi`, `places`; CHECK: null iff `source = 'first_party'` |
| `provider_ref` | text null | upstream id; `UNIQUE (provider_name, provider_ref)` partial where not null |
| `attribution` | text null | licence-required label, e.g. the Places attribution obligation, carried on the row so the UI cannot forget (the vault's pattern) |
| `status` | `listing_status` not null default `'DRAFT'` | reuse the existing enum and admin approval gate |
| `state_code`, `city`, `area` | as `listings` | |
| `address` | text | |
| `latitude`, `longitude` | double precision null | |
| `location` | geography(Point,4326) | by the same trigger pattern as `private.sync_listing_location`; partial GiST index on published |
| `phone`, `email` | text null | never rendered raw on partner rows |

Indexes: `(kind, status)`, slug unique, GiST on location, trigram on `name`.
RLS: public SELECT where `status = 'PUBLISHED'`; owner ALL on own rows;
partner rows written by service role only.

**`public.accommodations`**, one bookable property of a business (a hotel
building, a guest house, an aparthotel site):

`business_id` FK not null; `name`, `slug`, `description`; `star_rating`
smallint null CHECK 1..5; `check_in_from time`, `check_out_by time`;
`house_rules text`; `cancellation_policy_id` FK; `source source_kind not
null` (denormalised from the business by trigger so a row is
self-describing; CHECK equal to parent enforced in the sync trigger);
`fulfilment fulfilment_mode not null default 'vallo'` with CHECK
(`source = 'first_party'` implies `fulfilment = 'vallo'`); `provider_name`,
`provider_ref` with the same partial unique; `status listing_status`;
location columns and geography as businesses; `featured boolean`. Photos via
`accommodation_photos` mirroring `listing_photos` (position 0 cover, same
bucket discipline), amenities via `accommodation_amenities` reusing
`public.amenities`.

**`public.room_types`**: `accommodation_id` FK not null; `name` ("Deluxe
Double"); `description`; `sleeps smallint not null CHECK (sleeps > 0)`;
`beds jsonb` (typed shape validated in app; not filtered in SQL v1);
`size_sqm numeric null`; `units_total integer not null CHECK (units_total >
0)`; `base_rate_minor bigint not null CHECK (>= 0)`; `currency text not null
CHECK (currency = 'NGN')` (partner prices convert at the edge, conversion
recorded, per section 2.6); `status`; photos and amenities join tables.
`UNIQUE (accommodation_id, name)`.

**`public.units`**: optional physical rooms for operators who assign them:
`room_type_id` FK, `label` ("Room 204"), `active boolean`. `UNIQUE
(room_type_id, label)`. V1 booking allocates by count, not by unit; units
exist so the console can grow room assignment without a schema change.
(Seam, not room: HANDOFF_04 section 4.4's rule applied to the schema.)

**`public.rate_plans`**: `room_type_id` FK; `name`; `meal_plan meal_plan not
null default 'room_only'`; `cancellation_policy_id` FK not null;
`rate_minor bigint not null CHECK (>= 0)` (nightly, kobo);
`min_stay_nights smallint not null default 1 CHECK (>= 1)`;
`max_stay_nights smallint null CHECK (max_stay_nights >= min_stay_nights)`;
`active boolean not null default true`. `UNIQUE (room_type_id, name)`.

**`public.rate_calendar`**: nightly overrides: `rate_plan_id` FK, `date
date`, `rate_minor bigint CHECK (>= 0)`, `closed boolean not null default
false` (a blackout for the plan without touching inventory). PK
`(rate_plan_id, date)`. Absent row means the plan's base rate.

**`public.room_inventory`**, availability at stays scale, the deliberate
departure from per-listing `availability`:

| Column | Type | Notes |
| --- | --- | --- |
| `room_type_id` | uuid FK | |
| `date` | date | |
| `units_open` | integer not null CHECK (>= 0) | capacity offered that night (<= `units_total`, trigger-checked) |
| `units_booked` | integer not null default 0 CHECK (`units_booked >= 0` AND `units_booked <= units_open`) | |

PK `(room_type_id, date)`. **Concurrency is the existing house method,
constraints and locks in the database, not hope in the application**: a
`private.reserve_room_nights(room_type_id, check_in, check_out, rooms)`
SECURITY DEFINER function does `UPDATE room_inventory SET units_booked =
units_booked + rooms WHERE room_type_id = $1 AND date >= $2 AND date < $3
AND units_booked + rooms <= units_open`, counts affected rows against the
night count in one statement, and raises (rolling back) on any shortfall.
The CHECK is the backstop the way the GiST exclusion is for `bookings`; the
one-statement update is the lock. Blackout is `units_open = 0`. Min and max
stay live on the rate plan and are validated in the same function.
Whole-place stays keep the GiST exclusion path untouched.

**`public.stay_bookings` versus extending `bookings`: extend `bookings`,
additively.** Ledger, `pay_booking_from_wallet`, notifications, refunds,
`booking_refunds`, reviews and state events all point at `bookings`, and two
booking spines mean two money paths that can disagree, which is the exact
disease the platform already cured once (one shared settlement
implementation). Additive changes:

- `accommodation_id uuid null` FK, `room_type_id uuid null` FK,
  `rate_plan_id uuid null` FK, `rooms smallint not null default 1 CHECK
  (rooms > 0)`.
- CHECK (`room_type_id is null` OR `listing_id is null`): a booking targets
  one spine. **This requires relaxing `listing_id` to nullable, which is a
  constraint change on the money path's table and needs founder sign-off**
  (section 5). The non-destructive alternative, a sentinel is worse; the
  honest fallback if he declines is a parallel `stay_bookings` table plus a
  view, at the cost of a second money path. My recommendation is the
  relaxation: it loses no data, and every existing row keeps
  `listing_id not null` in practice.
- A **transition-guard trigger** `bookings_guard_transition` modelled line
  for line on `private.escrow_guard_transition`: legal edges only (`PENDING
  -> CONFIRMED | CANCELLED`; `CONFIRMED -> COMPLETED | NO_SHOW | CANCELLED`;
  terminal states immutable), and an AFTER trigger writing
  `booking_state_events` so history is trigger-written like escrow's audit
  insert, not app-written. This also closes the "archipelago of `isBooked`
  booleans" risk for every new surface. Existing app writes keep working;
  illegal ones start failing loudly, which is the point. Probe after
  applying (HANDOFF_02 section 18: a migration succeeding does not mean the
  function works).
- Room bookings do not use `during`/exclusion (overlap is legitimate across
  units); the exclusion constraint stays scoped as-is (its WHERE already
  limits it to PENDING/CONFIRMED rows; add `AND listing_id IS NOT NULL` when
  the column relaxes).

**Restaurants.** A restaurant becomes a `businesses` row (`kind =
'restaurant'`) with:

- `public.restaurant_profiles`: `business_id` PK/FK; `cuisines text[]`;
  `price_band smallint CHECK 1..4` (a band, never a fake amount, the Places
  lesson); `menu_url text null`; `dress_code`, `parking boolean`, and the
  Nigerian columns that matter (`power_backup`, `outdoor boolean`).
- `public.service_windows`: `business_id` FK, `weekday smallint CHECK 0..6`,
  `opens time`, `closes time`, `last_seating time`, `covers integer not null`
  (seats offered per service). The lean slot engine the archive's
  DATA_SOURCES section 3 already scoped: no aggregator exists, so it is ours.
- `public.reservations` gains `business_id uuid null` FK (additive), CHECK
  exactly one of `listing_id` / `business_id` set, and
  `private.reservation_is_valid` grows a branch: a `business_id` reservation
  requires `businesses.kind = 'restaurant'`, `status = 'PUBLISHED'`, and
  **`source = 'first_party'`**, which carries the trigger's existing
  first-party-only law into the business era on the day partner restaurant
  data exists. Capacity check against `service_windows.covers` in the same
  trigger. The `listing_id` path keeps working untouched.

**`public.landmarks`**, location intelligence as data:

`name`, `kind landmark_kind`, `state_code` FK, `city`, `latitude`,
`longitude`, `location geography` (trigger + GiST), `aliases text[]`
(trigram-indexed via a generated joined column or an expression index),
`slug unique`, `source source_kind` (seeded rows are `first_party` curation;
a licensed feed would say so). Seed Lagos and Abuja first: airports, VI,
Ikoyi, Lekki Phase 1, Ikeja GRA, Maitama, Wuse, the malls, the stadiums. A
seed migration is data, not schema, and must be honest curation, never
scraped.

**`public.cancellation_policies`**: `name`, `summary text` (the plain-words
sentence the stay page shows), `rules jsonb` (ordered tiers: hours before
check-in, refund basis points of total), `refund_to text CHECK (refund_to =
'wallet')` for v1. Referenced by rate plans and accommodations. A1-122
(nothing covers a rental) gets its home here too.

**Partner support tables** (restored, not revived):

- `public.places_cache`: `place_id text PK`, `payload jsonb`, `fetched_at`,
  service-role only, with the brief-caching TTL discipline in the provider.
- `public.partner_stay_intents`: as the vault built it: who, when, provider,
  provider hotel ref, quoted rate kobo, revalidated rate kobo, moved
  basis points, destination host; append-only; owner-readable. The name
  stays load-bearing: it is not a booking.
- `feature_flags` rows re-inserted: `hybrid_hotels`, `hybrid_restaurants`
  (keys already in `FeatureKey`).
- Currency conversion recorded at the edge: `fx_snapshots`
  (`provider, base_currency, quote_currency, rate_micros bigint, fetched_at`)
  and `partner_price_conversions` referencing the snapshot used, so "every
  partner price converts at the edge with the conversion recorded"
  (HANDOFF_04 section 6) is a table, not a comment. V1 with LiteAPI is
  NGN-only (the vault drops non-NGN rates), so these two can wait until a
  non-NGN provider is approved; named here so the seam is designed.

**What deliberately does not exist**: services tables (transport, cleaning,
concierge). The seam is `business_kind` plus the pillar navigation; no table
ships (HANDOFF_04 section 4.4).

### 2.4 Source attribution and trust, in the schema

- `source source_kind not null` on `businesses`, `accommodations`,
  `landmarks` (and denormalised where a row must be self-describing).
  Everything downstream branches on it: badges (only `first_party` rows with
  a verified human may render the badge; enforce with a CHECK that partner
  rows carry `agent_id is null`, and keep the badge derivation in
  `private.sync_agent_badge`'s family), booking (fulfilment CHECK above),
  messaging (no conversation may anchor to a partner row; enforce in the
  conversation-creation path and a trigger), reviews (verified-stay reviews
  only against COMPLETED bookings; partner ratings stored separately with
  `attribution`).
- The existing `reservations_validate` trigger is the precedent: the rule
  lives in the database, so no future application bug can book a table at a
  partner venue. Every new branch point copies that posture.

### 2.5 The one search projection

`public.catalogue_entries`, a thin read-model row per discoverable thing
(listing, accommodation, restaurant business), maintained by AFTER triggers
on the three source tables: `entity_kind` enum, `entity_id`, `title`, `area`,
`city`, `state_code`, `kind` (market category), `source`, `verified`,
`headline_price_minor`, `location geography`, `search tsvector` (generated:
`to_tsvector('simple', unaccent(title || ' ' || area || ' ' || city))`,
'simple' because Yorùbá, Hausa and Igbo have no Postgres stemmer and English
stemming over Nigerian proper nouns hurts more than it helps; `unaccent`
must be created, it is available but not installed, live-verified), GIN on
`search`, GiST on `location`, partial on published. This keeps discovery one
query without forcing rooms into `listings`. It is a projection, so it can
be dropped and rebuilt; nothing owns data in it. (Alternative considered: a
UNION ALL view. Rejected: no single GIN/GiST over a union, and ranking
needs one indexed relation.)

### 2.6 The migration sequence, additive only

Each step: one migration file mirrored into `supabase/migrations/`, applied,
then a functional probe (insert a draft row as a test user, read it back
under RLS, exercise the trigger, delete it). Nothing here drops, renames or
rewrites an existing column. The single constraint relaxation is flagged.

1. **Enums and policies**: `source_kind`, `fulfilment_mode`,
   `business_kind`, `meal_plan`, `landmark_kind`; `cancellation_policies`.
2. **`businesses`** + photos-equivalent storage policy + RLS + indexes +
   location trigger.
3. **`accommodations`**, `accommodation_photos`,
   `accommodation_amenities` + source-sync trigger.
4. **`room_types`, `units`, `rate_plans`, `rate_calendar`** + RLS.
5. **`room_inventory`** + `private.reserve_room_nights` +
   `private.release_room_nights` + probes (the two-tap oversell probe
   especially: two concurrent reserves of the last unit, one must fail).
6. **`bookings` extension**: three FK columns + `rooms` + CHECKs; the
   `listing_id` NULL relaxation **only after founder sign-off**; the
   transition-guard trigger and trigger-written state events; extend the
   GiST exclusion WHERE clause in the same migration.
7. **Restaurants**: `restaurant_profiles`, `service_windows`,
   `reservations.business_id` + trigger branch.
8. **`landmarks`** + seed data (curated, Lagos and Abuja first).
9. **Search**: install `unaccent`; `catalogue_entries` + triggers + backfill
   (INSERT ... SELECT from the three sources).
10. **Partner support**: `places_cache`, `partner_stay_intents`, the two
    feature-flag rows, `revenue_source + 'referral_commission'`.

Founder sign-off needed before steps 6 (the NULL relaxation) and anything in
this file that touches money semantics. Nothing in the sequence is
destructive; a rollback at any step is DROP of new objects only.

---

## 3. Track three: search and location

### 3.1 What the current search does, read from the code

- **Free text** (`apps/web/src/lib/listings/supabase-repository.ts:431`,
  `freeTextGroups`): words ANDed, columns ORed, `ILIKE %word%` over `title`,
  `city`, `area`, plus state-name-to-code and property-type expansion done
  in JavaScript against reference maps; punctuation becomes `%` so patterns
  only ever widen. The design contract (comment at lines 400 to 430): SQL
  must be a superset of the in-browser matcher in `lib/listings/filter.ts`
  (`haystack`), which the filter drawer runs client-side for live counts, so
  one definition of "matches" cannot drift into two.
- **Structured filters** in SQL: category, price floor and ceiling,
  bedrooms, bathrooms; the long tail (amenities, utilities, guests) applied
  through the shared matcher. Ordering: `featured desc, published_at desc,
  created_at desc`, backed by `listings_catalogue_order_idx`.
- **Index support, live-verified**: trigram GIN on title, city, area
  (PUBLISHED-partial), so the leading-wildcard ILIKE is indexed. `BE-3`
  ("no full-text index") is marked DONE in RECOMMENDATIONS and the live
  indexes bear it out, but note it is trigram, not tsvector FTS: fine at 64
  rows and fine for substring semantics; no ranking, no multi-word
  relevance.
- **The map** is now wired to PostGIS: `public.listings_in_bounds()` (SQL,
  STABLE, not SECURITY DEFINER so RLS decides, `&&` against
  `st_makeenvelope` on the partial GiST index) is called by
  `apps/web/src/lib/listings/bounds.ts` through
  `app/api/map/listings/route.ts`, with NaN rejection, corner
  normalisation, a Nigeria clamp, a 1.5 degree max span, and rate limiting
  at the route. M-4/BE-8 ("exists and nothing calls it") are stale: the
  wiring exists. What has not changed: pins are optional
  (`latitude` nullable, wizard does not force one), so an unpinned listing
  is invisible to every viewport query (M-3 stands and gets more important).
- `lib/search/` holds exactly one module, `memory.ts` (view cookie, recent
  searches, recently viewed, all validated on read-back). There is no
  server-side search engine directory; search lives in `lib/listings`.
- **No date or guest dimension exists in search at all.** `available_from`
  is a column; nightly availability is never consulted by any search path.
  The one search HANDOFF_04 section 4.5 demands (`Lagos, 15 to 18 December,
  2 adults`) has no current entry point.

### 3.2 Is PostGIS available? Live-verified: yes, and installed

`list_extensions` on the live project: **PostGIS 3.3.7 installed** (schema
`extensions`), `pg_trgm` 1.6 installed, `btree_gist` 1.7 installed (the
exclusion constraint uses it), `pg_cron` 1.6.4 installed. Available but NOT
installed: `unaccent` (needed for the tsvector, one `create extension`),
`pgroonga` 3.2.5, `vector` 0.8.2, `earthdistance`, `pgrouting`,
`postgis_tiger_geocoder`. The `location geography` column, the sync trigger
and the partial GiST index are already live on `listings`.

### 3.3 The comparison HANDOFF_04 section 8 demands

| Criterion | Postgres FTS + pg_trgm + PostGIS | External engine (Meilisearch / Typesense / Algolia / OpenSearch) |
| --- | --- | --- |
| Data volume today | 64 listings, all demo; thousands at success | Engines earn their keep from hundreds of thousands of documents |
| Availability-aware results | Native: one query joins `room_inventory` and prices the range; the truth and the index are the same database, so stale availability is structurally impossible | The index is a copy; date-level availability either lives outside the engine (second query) or is synced per night per room type, and stale availability sold as live is the exact sin HANDOFF_04 forbids |
| RLS and trust rules | Queries run under RLS; PUBLISHED-only and source rules cannot be bypassed | The sync pipeline must re-implement visibility; every RLS bug becomes a data leak in the index |
| Geo | PostGIS is the strongest geo engine in this table; radius, bbox, distance sort, clustering all in SQL on live GiST indexes | Geo support exists but is a projection of what PostGIS already does |
| Multi-language (en, yo, ha, ig) | No stemmers for the three; 'simple' + unaccent + trigram is honest and works for proper-noun-heavy queries | Same absence; engines' typo tolerance is their real edge here |
| Typo tolerance | pg_trgm similarity gives fuzzy matching; not as polished as an engine | Best in class |
| Ops and cost | Zero new vendors, zero sync jobs, zero credentials; the platform's one database habit holds | A service to run or pay for, a sync pipeline to monitor (the platform currently has no alerting even on cron, A2-121), a new failure mode on the critical path |
| Multi-market seams | Nothing hardcoded; Ghana is rows | Same, plus a second system to configure |

**Recommendation: Postgres FTS (tsvector on the catalogue projection) plus
pg_trgm plus PostGIS. No external engine.** Adopt an engine only when a
measured threshold trips: catalogue above roughly 100,000 rows, or p95
search latency above 300ms with indexes proven right, or a product need
(instant-as-you-type federated suggestions) that trigram similarity
measurably fails. Record that threshold in the ADR that adopts this, so the
future decision is a measurement, not a mood. `pgroonga` is the middle
option (multilingual FTS inside Postgres) if 'simple' tsvector proves too
crude; it is one `create extension` away and keeps every property in the
left column.

### 3.4 The geospatial model

- **Coordinates on**: `listings` (already), `businesses`, `accommodations`,
  `landmarks`, `areas` (centroids, backfill; 9 live rows). Pins become
  mandatory at publish time for anything that should appear on a map (M-3):
  enforce at the APPROVED to PUBLISHED transition, not retroactively.
- **Landmarks as data** (section 2.3): "near Victoria Island" resolves the
  landmark by trigram over name and aliases, then `ST_DWithin(location,
  landmark.location, radius)`; distance rendered from `ST_Distance`. "Near
  the airport" is `kind = 'airport'` scoped by city.
- **Radius and bbox**: bbox stays on the proven `listings_in_bounds` shape,
  extended to a `catalogue_in_bounds` over the projection; radius is
  `ST_DWithin` on the same GiST indexes. Keep the bounds module's clamps
  (Nigeria extent, max span, NaN refusal) as the house rule for every new
  geo entry point; they are the anti-export defence SEC-6 named.
- **Map and list in conversation**: the projection gives both surfaces one
  row shape, so the map dock and the result list cannot disagree about what
  exists.

### 3.5 The Lagos-dates-guests query path, end to end

`Lagos, 15 to 18 December, 2 adults` (3 nights):

1. **Parse**: dates and party from typed controls (never free text); place
   term resolved in order against `states` (name to code), `areas`,
   `landmarks` (trigram), else free text. Output: a geographic scope (state
   code, area, or a landmark point plus radius) and `check_in`,
   `check_out`, `adults`, `rooms`.
2. **Candidate stays** (one SQL statement): from `room_types rt` join
   `accommodations a` (published, in scope by `city`/`state_code` or
   `ST_DWithin`) where `rt.sleeps >= 2`, lateral-join the availability
   aggregate: 3 rows in `room_inventory` for `[15,18)` with
   `units_open - units_booked >= 1` on every night (a `HAVING count(*) =
   nights` group). A missing inventory row is "not offered", never
   "available"; stale availability is never shown as guaranteed.
3. **Price the range**: for the best active `rate_plan` per room type with
   `min_stay <= 3 <= coalesce(max_stay, 3)`: `sum(coalesce(rate_calendar.
   rate_minor, rate_plans.rate_minor))` over the three nights, all kobo.
   **The total is the headline**: the query returns the 3-night total and
   the per-night figure; the card leads with the total, fees included,
   cancellation summary from the plan's policy. No fee is invented; today
   every fee is zero and the row still shows.
4. **Candidate whole-place stays**: published `listings` with a nightly
   `rate_period`, `max_guests >= 2`, in scope, and NOT EXISTS an overlapping
   PENDING/CONFIRMED booking (the same predicate the GiST exclusion
   enforces on write) and no blocking `availability` rows for the range.
5. **Relevant property**: published rent listings in scope (no date
   dimension), ranked below dated inventory for a dated query but present,
   which is the side-by-side HANDOFF_04 section 4.5 asks for.
6. **Merge and rank** through the catalogue projection: first party above
   partner at equal relevance (the vault's rule), then availability-priced
   stays, distance where a point was given, then the standing catalogue
   order. Partner rows carry the source label and their own fulfilment CTA.
7. **Partner inventory** joins the same shelf through the restored provider
   layer with its 2.5s budget and dedupe against first-party rows, and a
   partner price is a photograph until prebook revalidates it at the tap.

Filters from section 4.5 map: price (total, not nightly), rating, type,
room type, facilities (amenities joins), breakfast (`meal_plan`), parking
and air conditioning (amenities), verified (`source` + badge), free
cancellation (policy rules), distance (PostGIS), guests (`sleeps`),
availability (step 2 by construction).

---

## 4. Track four: the recommendations consolidation map

Ground rules of this map: RECOMMENDATIONS.md is not edited; identifiers keep
resolving; the lead applies this map. Counts, verified by summing the file's
own tables: 474 new entries (30 Critical + 164 High + 210 Medium + 54
Nice-to-have + 3 Future + 13 Unclassified) plus 171 legacy (26 P0 + 85 P1 +
48 P2 + 12 unprioritised) equals 645. The file already carries 9 DONE from
15 September with shas; those stand and are not repeated here.

### 4.1 Entries the sprints already landed

DONE with a sha only where the last-60 log or live verification ties it.
Where the sprint close-outs (docs/SPRINT_60.md, docs/SPRINT_60_B.md) attest
completion but no single commit in the 60-commit window names it, the row
says so; the lead should confirm before flipping status, because "landed per
ledger" is attestation, not my verification.

| Entry | Verdict | Evidence |
| --- | --- | --- |
| `E-2` (add COMPLETED to booking_status) | **DONE, live-verified** | Live enum is `PENDING, CONFIRMED, COMPLETED, NO_SHOW, CANCELLED`; commit `d5af1587` ("bookings: the loop gets an end") is the plausible carrier |
| `F2-066` (an agent can record that a stay happened) | **DONE in schema, live-verified**; UI path attested by SPRINT_60_B owner B close-out | Same enum; verify the console control renders before closing |
| `A1-021` (help promises payouts after a completed stay that cannot exist) | **Reshaped**: the enum half is fixed; the copy claim needs re-audit | Live enum |
| `A3-001`, `A3-003`, `A3-005` (ResultSheet, real pending, verdict copy) | **DONE per ledger** | `240cf357` "money: ResultSheet, and every confirmation on the money path goes through it"; SPRINT_60 items 38 to 41 |
| `F2-055` / one admin queue frame (SPRINT item 46, then B-37) | **PARTLY DONE with sha** | `3044c2aa` "console: ten queues have a frame". SPRINT_60_B says owner B finished 24 of 24, but SPRINT_60's own close-out carried "QueueFilters on one queue of nineteen"; the truth moved during the second sprint, re-verify the count |
| `9a4d0935` pair: the `/admin/bookings` filter narrowing rows not the query (carried-forward gap), and an unconfigured state that stopped being an appointment | **DONE** | `9a4d0935` names both |
| `A2-099` (four scratch files in the root) | **DONE** | `8610d196` |
| `A3-046` (five media tokens declared twice) | **DONE** | `7c461569` |
| `A3-110` (ambient layers over budget) | **DONE** | `24749750` "seven ambient animations were running against a budget of one" |
| `A1-024` (landing FAQ hardcoded English) | **DONE** | `ed57b601` "the FAQ speaks four languages"; `efb97263` for console and settings i18n |
| `F1-103` (`PostGlyph` fourth icon namespace) | **DONE** | `c287e586` |
| MomentScreen retirement (`F2-025`, SPRINT_60_B item 36) | **DONE to one call site removed** | `9e00a476` "the last MomentScreen call site goes"; the carried-forward note says the component had one call site left, this commit says it went; delete-the-component still to confirm |
| `F2-003` ("switches on shortly" synonym ban) | **DONE per ledger** | `a371c5cc` "the banned sentence leaves the platform"; owner B 24 of 24 |
| `F1-080`, `F1-082`, `F1-085` (/about and /contact claims) | **DONE per ledger** | `62d2290e` "site: three claims nobody could stand behind"; owner L items 47 to 49 closed |
| `F1-084` and the marketplace scope correction | **DONE per ledger** | `4661d34a` "landing: a marketplace, stated as one", `d5af1587` "the legal pages get the marketplace" |
| `A3-127` (stacked headers) | **DONE per ledger** | `823a85c7` "four headers, four heights, one token pair"; SPRINT_60 item 20 |
| `A3-055` / raw colour literals | **Largely DONE** | `8980749c`, `db468d6a`, `855d8c75`; SPRINT_60_B corrects the count at source: outside definition layers the true figure was 31, now enforced at zero as an error |
| `A1-049` (OG image) | **DONE** | Marked DONE in RECOMMENDATIONS itself; SPRINT_60 item 48 |
| Wallet strings `F2-008`, wallet drawers, hold clock `F2-021`, `F2-023` | **DONE per SPRINT_60_B owner B close-out; no single sha isolable in the window** | Ledger attestation only; `KIND_NOUN`/`STATUS_LABEL` dictionary keys were still named as carried forward in SPRINT_60's close-out, so check which sprint's word is later |
| `cd53b8bf` (admin search comma rewriting the query) | New fix, no pre-existing id | Worth a retroactive entry so the class of bug (PostgREST `.or()` injection via commas) is recorded |

Explicitly NOT closed by the sprints, still open and now load-bearing:
`A1-001` (rent money path), `A1-002` (rent and sale reviews), `G-1`, `G-2`,
`G-3`, all of section B money safety (`A2-001` to `A2-133`), CI (`A2-141`,
`T-1`), cron alerting (`A2-121`), N-4 OAuth removal, M-1 MapTiler licence,
and the seeded login (SPRINT_60_B item 60, still the highest-leverage gift).

### 4.2 Entries the marketplace direction supersedes or reshapes

| Entry | How the direction changes it |
| --- | --- |
| ADR-013 / `S-2` (first-party only) | Evolves, not violated: the badge rule survives untouched; the inventory rule gains the labelled-source lane. The ADR needs a successor entry (ADR-015) recording the evolution, because code comments cite ADR-013 as "there is not going to be another source" (supabase-repository.ts header) and those comments become stale the day a partner row renders |
| `S-3` (restaurants and hotels have no supply story) | Superseded by this mission: the supply story is section 2 of this file plus the onboarding consoles |
| `P-7` (`listing_intent` two values for four markets) | Reshaped: stays and restaurants move to their own tables, so `listing_intent` goes back to meaning exactly rent-or-sale for property. The enum needs no third value; the fix becomes documentation plus the projection's `entity_kind` |
| `P-4` / `A1-152` (`ListingKind` declares `experience`) | Reshaped: remove `experience` from the union (A1-152's direction), and the future services pillar arrives as `business_kind`, not as a listing kind |
| `A1-009` (Instant book empties the catalogue), `A1-010` (party-size guesses capacity) | Reshaped: real fields return on the stays model (`rate_plans`, `sleeps`); the listings-side hacks are retired rather than fixed |
| `A1-013` (Experiences tile can never return results) | Superseded: pillar navigation replaces the tile; experiences stay a designed seam |
| `E-1` to `E-7`, section 3 escrow analysis | Unchanged in force, and the marketplace inherits the constraint: stays revenue is referral commission (Model 1) precisely so no new custody arises. `G-1` handover evidence extends naturally to check-in evidence for stays |
| `A2-059` (`escrow_purpose` cannot express a stay) | Superseded in direction: do not extend escrow to stays at all under Model 1 |
| `W-x` wallet entries | Reshaped upward: the wallet becomes the financial heart of marketplace surfaces (HANDOFF_04 section 8), so W-3 (dead second deck), W-5 (transaction PIN), W-6 (reconciliation) graduate from cleanup to prerequisites |
| `A1-041` (utility record has no table) | Untouched by stays; keep, property pillar |
| `DEMO-1` to `DEMO-4` | Reshaped: 64 demo listings with pins are now also the seed reality for stays surfaces; the same is_demo discipline (CHECK, trigger, mapper) must be designed into `businesses`/`accommodations` from day one, not retrofitted |
| `M-2` (Leaflet stylesheet everywhere) | Stands WITHDRAWN; the map's promotion to first-class surface may reverse the calculus, re-measure |
| `A1-133` (`/rent` unaudited), `N-5` (ADR-007 navigation) | Superseded by the IA re-cut: pillars (Discover, Property, Stays, Restaurants...) replace the current tree; ADR-007 needs its third amendment |
| `A1-078` (no tenancy record) | Reshaped: the tenancy object should be designed beside the booking spine so property and stays do not grow rival transaction shapes |

### 4.3 Entries that become MORE important under Stays

`M-1` (MapTiler licence: the map becomes first-class and commercial),
`M-3` (mandatory pins), `M-5` to `M-10` (viewport loading, debounce,
clustering, markers, split view, search-this-area: all now core surfaces),
`A1-127` (near-this-place: becomes the landmarks feature), `A1-125`,
`A1-014` (filters and move-in/total sorting: totals are the stays headline),
`A2-047` (Reserve idempotency: room inventory makes double-submit costlier),
`A2-046`, `W-2` (rate limits on money surfaces), `A2-053` (settle only what
the processor proves: partner webhooks arrive), `A2-121` to `A2-123`
(cron and money alerting: availability sweeps and partner freshness jobs
join the unwatched pile otherwise), `A2-136`/`EM-2` (email delivery proof:
booking confirmations), `A2-139` (SMS: guests at a gate need it), `A1-122`
(cancellation policy: becomes a table and a legal surface), `A1-080`
(notification batching: booking chatter multiplies), `A2-064`/`P-5`
(generated DB types in CI: the schema is about to grow ten tables),
`A2-102` (admin pagination: moderation queues multiply), `A1-075` (demand
capture on empty results: stays searches will be empty first), `T-5` (specs
that skip on an empty catalogue), `BE-6` (catalogue reads pull whole rows:
the projection fixes this or inherits it), `A1-086`/`A1-088` (diaspora
phone and payment: stays are the diaspora product), `V-2` (payout identity
standard: hosts get paid), `A2-096` (webhook dead-letter store: partner
webhooks), `A1-064` (video and remote inspection: diaspora stays).

### 4.4 New entry areas the marketplace requires that do not exist yet

Sixty-eight areas, grouped, one line each. None of these matches an existing
identifier; each becomes a full seven-field entry when the lead absorbs this
map into RECOMMENDATIONS.md (bar stays at 400+ genuine entries; these are
genuinely new work, not padding).

**Stays data model (11)**
1. `businesses` table with first-class `source_kind` and owner CHECK.
2. `accommodations` with fulfilment mode per row and source sync trigger.
3. `room_types` with sleeps, beds shape and `units_total`.
4. `units` as the room-assignment seam (schema only, no v1 UI).
5. `rate_plans` with meal plan, min and max stay, policy FK.
6. `rate_calendar` nightly overrides and plan-level closure.
7. `room_inventory` counters with the one-statement reserve function and
   oversell probe.
8. `cancellation_policies` table with plain-words summary rendering.
9. Accommodation photos and amenities joins with bucket size limits from
   day one (MED-1 applied to the new buckets).
10. `is_demo` discipline designed into businesses and accommodations
    (CHECK, trigger, mapper) before any example row exists.
11. `landmarks` table, curated seed for Lagos and Abuja, aliases trigram.

**Booking engine (8)**
12. `bookings` extension: room-type bookings on the one spine, rooms count,
    target-exclusivity CHECK.
13. `bookings_guard_transition` trigger and trigger-written state events.
14. Stay holds: TTL on PENDING room bookings and an inventory-releasing
    sweep (extends `release_stale_booking_holds`).
15. Multi-room, multi-night pricing function that the card total and the
    checkout share, so they cannot disagree.
16. Booking modification path (date change as cancel-plus-rebook in one
    transaction, policy-priced).
17. NO_SHOW recording flow and its notification.
18. Guest capacity validation against `sleeps` at reserve time.
19. Receipts for stays (A3-015 generalised): one receipt object across
    listing stays and room stays.

**Hosts and consoles (7)**
20. Business onboarding wizard (profile, verification, rooms, photos,
    pricing, policies) completable in one sitting.
21. Host reservations queue on the `QueueFilters` frame.
22. Availability and calendar management surface (open, close, blackout).
23. Bulk and seasonal pricing tools writing `rate_calendar`.
24. Host revenue view over the existing ledger.
25. Business verification rungs: extend the check model to businesses
    (registration, premises) without diluting the human badge.
26. Role model for staff: a business grants console access to an employee
    without sharing an account (seam now, build later).

**Restaurants (6)**
27. `restaurant_profiles` (cuisines, price band, menu link).
28. `service_windows` and covers.
29. `reservations.business_id` branch in `reservation_is_valid` with the
    first-party-only rule carried forward.
30. Reservation reminder notifications (day-of, hour-before).
31. Restaurant console: today's list, accept and decline, close a service.
32. Restaurant discovery surface with hours-aware "open now".

**Partner layer (10)**
33. Restore `lib/inventory` per the salvage map (registry, envelope, http,
    dedupe) against the new source model.
34. Re-insert `hybrid_hotels` and `hybrid_restaurants` flag rows; admin
    switchboard labels for them.
35. Re-create `places_cache` with TTL discipline.
36. Re-create `partner_stay_intents` and the prebook-at-tap route.
37. Source label component: calm, honest, never orange, on card and detail.
38. Fulfilment-honest CTA: who fulfils, where payment happens, stated on
    every partner surface.
39. Provider health admin page on `partnerHealth` (A2-109 shape).
40. Freshness policy per source, stored and enforced: stale is never sold
    as live.
41. Partner image hosts decision: proxy versus named CDN list in csp.ts
    `IMAGE_HOSTS` and next/image domains.
42. Referral commission recording: `revenue_source + 'referral_commission'`
    and the reconciliation report for partner-paid commissions.

**Search (9)**
43. Install `unaccent`; `catalogue_entries` projection with tsvector and
    triggers.
44. Date and guest search parameters end to end (URL shape, parser,
    controls).
45. Availability-aware stay search (the HAVING count(*) = nights join).
46. Range pricing in results: the total is the headline.
47. Ranking policy encoded once: first party first at equal relevance,
    dated inventory first for dated queries.
48. Merge shelf: stays, short lets and property side by side for one query.
49. Saved searches grow stay semantics (dates, guests) when P-6 lands.
50. Empty-result demand capture for stays (A1-075 extended).
51. Suggestion strip: states, areas, landmarks as you type (trigram).

**Location and map (6)**
52. `catalogue_in_bounds` over the projection with the bounds module's
    clamps as house law.
53. Radius search: `ST_DWithin` entry point with distance in results.
54. Distance-from-landmark sort and "near X" chips.
55. Mandatory pin at publish for map-bearing entities (M-3 executed at the
    APPROVED gate).
56. Area centroid backfill and areas-as-geography.
57. Cluster computation server-side by zoom tier (M-7 made real for the
    marketplace shelf).

**Trust and reviews (5)**
58. Badge derivation for businesses: only first-party plus verified human;
    CHECK that partner rows cannot carry it.
59. Verified-stay reviews: review eligibility keyed to COMPLETED bookings
    on either spine.
60. Partner rating attribution fields and licence-aware display.
61. Review responses for hosts on stay reviews (extend
    `review_responses`).
62. Marketplace abuse pass: fake hotels, review farming, availability
    manipulation, payout fraud on hosts (HANDOFF_04 section 9 list).

**Money and operations (6)**
63. Host payout path for stays on the existing payout accounts and ledger.
64. Refund-per-policy function: policy rules jsonb priced into a
    `booking_refunds` row.
65. Inventory integrity sweep: nightly job proving `units_booked` equals
    live bookings, alerting on drift (the wallets_overdrawn pattern for
    rooms).
66. Cron and partner-job alerting before the job count grows again
    (A2-121 executed as a prerequisite, not a wish).
67. Notification architecture consolidation (one system, channels per
    event class) before stays multiply the triggers.
68. i18n for the stays and restaurant vocabulary in all four locales, with
    the terminology table extended (room, rate plan, check-in) so synonyms
    do not breed.

---

## 5. Decisions needed from the founder

1. **The `bookings.listing_id` NULL relaxation** (section 2.3). It touches
   the money path's table. Additive everywhere else; this one constraint
   change needs your word. Alternative if refused: a parallel
   `stay_bookings` table and a second money path, which I recommend against.
2. **Model 1 confirmed as the MVP default** (aggregator, referral
   commission, booking completes with the provider). Architected here;
   Model 2 remains gated and nothing in this plan activates it.
3. **LiteAPI**: sandbox key, then the whitelabel booking site and
   `LITEAPI_WHITELABEL_DOMAIN`. Without the second, partner hotels are
   priced but honestly unbookable, which the vault already handles.
4. **Google Places billing**: one key lights restaurants coverage,
   hotel coverage and address autocomplete; requires a billing account.
   Partner restaurant DATA display is also a product decision: first-party
   restaurants only, or licensed Places data with attribution.
5. **Partner hotel photos**: proxy through Vallo (cost, control) or
   re-open named CDN hosts in CSP and next/image (the old wildcard is
   closed and should stay closed).
6. **MapTiler key** before money moves through the deployment (M-1,
   licence exposure, unchanged).
7. **Amadeus stays dead** unless you say otherwise (restated per the
   charter; nothing here proposes it).
8. **The four `private` tables flagged by the Supabase advisor** (section
   0): confirm `private` is not API-exposed, or authorise RLS-with-policies
   on them. Not destructive, but it is a security posture change.
9. **A seeded login** for signed-in rendering. Still the highest-leverage
   gift, named by three sessions running.
10. **ADR-015**: authorise the written evolution of ADR-013 (badge rule
    intact, labelled-source lane added) so the code comments that say
    "there is not going to be another source" can be corrected honestly.
11. **Landmark seed list sign-off**: curation carries editorial judgement
    about places; a one-page list to approve.
12. **Restaurant reservations via businesses**: confirm restaurants migrate
    from `property_type = 'restaurant'` listings to business rows (the
    listings path keeps working during the transition; no data is lost).

---

## 6. The top-20 build order for the marketplace backbone

Ranked by what unblocks the most, not by severity. Each item names what it
unblocks.

1. **Migration 1 and 2: enums, `cancellation_policies`, `businesses`**.
   Everything else references them.
2. **Migrations 3 and 4: `accommodations`, `room_types`, `rate_plans`,
   `rate_calendar`**. The stays catalogue exists after this.
3. **Migration 5: `room_inventory` + `reserve_room_nights` +
   the concurrency probe**. Bookable inventory; nothing above it is real
   until this holds under two concurrent taps.
4. **Migration 6: the `bookings` extension + transition-guard trigger**
   (after decision 1). One booking spine; the money path reaches rooms.
5. **`catalogue_entries` projection + `unaccent` + tsvector** (migration
   9). One search shape for every surface; unblocks search, map and cards
   at once.
6. **The one search: dates and guests end to end** (params, availability
   join, range pricing, merged shelf). The product's headline capability.
7. **Restore `lib/inventory` per the salvage map** (types, http, registry,
   dedupe; flags re-inserted). Partner rows can exist behind kill switches
   with zero keys and zero visible change.
8. **LiteAPI provider rewritten to the stays model + `places_cache` +
   `partner_stay_intents` + prebook route**. Priced partner hotels with
   honest handoff the day a key lands.
9. **Source label + fulfilment-honest CTA components**. Nothing partner
   renders before these exist; they are the trust law on screen.
10. **The stay detail page** (gallery, room and rate selection, date and
    guest controls, total with everything included, policy in plain words,
    fulfilment-honest CTA). First new surface people transact on.
11. **Search results in list, grid, map, split** on the projection, stay
    cards leading with the total and the source label.
12. **`catalogue_in_bounds` + landmarks + near-X search**. Location
    intelligence; unblocks the map as a first-class surface.
13. **Business onboarding wizard** (profile, verification, rooms, photos,
    pricing, policies). Supply cannot exist without it.
14. **Host console: reservations queue, calendar, availability editing**
    on the QueueFilters frame. The other half of supply.
15. **Booking lifecycle jobs**: stay-hold TTL sweep releasing
    `room_inventory`, COMPLETED transition at checkout date, NO_SHOW flow.
    Availability integrity over time.
16. **Restaurants: profiles, service windows, `reservations.business_id`
    trigger branch, restaurant console**. The third pillar on the machinery
    that already exists.
17. **Stays moderation and partner-source queues in admin + provider
    health page**. Operations before scale.
18. **Verified-stay reviews on COMPLETED bookings + host responses**. The
    trust flywheel.
19. **Money observability prerequisites**: cron alerting (A2-121), money
    line alerting (A2-123), inventory drift sweep. The marketplace adds
    jobs; nothing watches the existing eight.
20. **Notification consolidation + stays vocabulary i18n in four
    locales**. The layer every flow above emits into.

---

## 7. What was not checked, and why

- **The full text of `docs/FRONTEND_REVAMP.md`** (2,864 lines): I read its
  structure (all section headers) and consumed its findings through
  RECOMMENDATIONS.md, SPRINT_60.md and SPRINT_60_B.md, which index it. Its
  per-finding bodies were not read line by line.
- **The three reports in `docs/audit/`**: not opened; RECOMMENDATIONS.md is
  their register and was read in full.
- **`docs/HANDOFF_01_COMPANY.md`**: not in my assigned reading; legal and
  company claims here are second-hand via HANDOFF_04 and RECOMMENDATIONS.
- **Function bodies in `private`**: I read `reservation_is_valid` in full
  and verified the existence and trigger wiring of
  `escrow_guard_transition`, `pay_booking_from_wallet`,
  `sync_listing_location` and the audit guards; I did not read the other
  ~150 bodies.
- **RLS policy texts**: RLS enablement was live-verified per table;
  individual policy predicates were not read.
- **The exposed-schemas API setting** (whether `private` is PostgREST
  exposed): not checkable with the tools I used; flagged in section 0.
- **No build, typecheck, lint or test was run**: this was a read-only
  research mission and running them was Agent 2 or the lead's baseline job.
- **Commit attribution in section 4.1**: shas tie to entries through commit
  messages and live verification; where I wrote "per ledger" the evidence
  is the sprint close-out's attestation, not my own verification, and it is
  labelled so.
- **All 8 vault commits were read via `git show`**; for `08d2298f` (a root
  commit) I read the message, the inventory and listings file stats and the
  registry note it contains, not all ~1,900 files of the snapshot.
- **Row-level data** beyond the counts and rows quoted (feature flags,
  fee_rates, demo counts, pins) was not exported, and no personal data was
  read or reproduced anywhere in this file.
