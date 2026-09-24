# API and integration inventory: the research

Written 18 September 2026, by the research agent for the marketplace mission
(`docs/archive/HANDOFF_04_MARKETPLACE.md` section 10). This is the researched input to
the final `docs/API_INVENTORY.md`. Everything in it is either verified in this
repository's code, verified in this repository's git history, or derived from
web search results whose sources are named in the verification log at the end.
The sandbox proxy blocked direct fetches of every official documentation host
attempted, so nothing below is claimed as doc-verified; the log says exactly
what was blocked.

## The rules, restated before anything else

1. Zero em dashes anywhere. British spelling throughout.
2. Pricing is never invented. Where a figure was not verified against the
   provider, the entry says "pricing requires provider confirmation". Where a
   figure appears, its provenance (search-derived, code, or repo doc) is named
   and it still requires provider confirmation before anyone budgets on it.
3. API capabilities are never invented. A capability is stated only where a
   source is named; what could not be verified is said plainly.
4. No scraping, and no data source whose terms forbid the use proposed.
5. Credentials appear as placeholders only (`MAPS_API_KEY` style). Never a
   real value in this or any document.
6. The frontend never holds a provider credential. Anything `NEXT_PUBLIC_` is
   in the browser bundle and is treated as public.
7. Every external call goes behind the backend integration layer: frontend,
   then Vallo API, then service layer, then provider. Provider interfaces
   (`HotelProvider`, `MapProvider`, `PaymentProvider`, `NotificationProvider`,
   `IdentityProvider`) where lock-in would hurt.
8. "Verified" is only ever written where the source was actually opened. The
   verification log distinguishes code-verified, search-derived and BLOCKED.
9. The founder adds all keys personally; a missing key never blocks a build
   and never fails silently on a payment webhook.
10. Money is integer kobo; the internal ledger never depends on an external
    API for its own history.

---

## 0. Already connected: established from code, not memory

Compiled by grepping the working tree and reading each call site on 18
September 2026, branch `main`.

| Integration | Where in code | State |
| --- | --- | --- |
| Supabase (database, auth, storage, RLS, realtime) | `apps/web/src/lib/supabase/`, CSP builds its origins from `NEXT_PUBLIC_SUPABASE_URL` | Live, required |
| Paystack (cards, transfers, bank list, account name resolution) | `apps/web/src/lib/payments/paystack.ts` (thin fetch layer over `https://api.paystack.co`), webhook at `apps/web/src/app/api/paystack/webhook/route.ts` (HMAC SHA-512 `x-paystack-signature` check at line 518), reconcile at `app/api/paystack/reconcile/route.ts`, payouts in `lib/agent/payout-actions.ts` using `/transferrecipient`, `/transfer`, `/transfer/verify/{ref}`, `/bank?currency=NGN`, `/bank/resolve` | Live. Server-only key, no browser SDK, checkout is a server-initiated redirect |
| Yellow Card (crypto on-ramp, NGN settlement) | `apps/web/src/lib/payments/yellowcard.ts`, webhook at `app/api/yellowcard/webhook/route.ts`, HMAC verification and idempotency written | Built but never executed against a live merchant account; the module says so itself. Gated on `YELLOWCARD_API_KEY` and `YELLOWCARD_API_SECRET`; nothing renders without keys |
| Resend (transactional email) | `apps/web/src/lib/email/client.ts`, thin fetch to `https://api.resend.com/emails`, no SDK, plus auth email hook at `app/api/auth/email-hook/route.ts` | Live behind `RESEND_API_KEY`; degrades to `{sent:false, reason:"unconfigured"}` |
| Anthropic (assistant and support summariser) | `apps/web/src/app/api/assistant/route.ts` (direct fetch to `https://api.anthropic.com/v1/messages`, SSE streaming, three tools), `app/api/support/route.ts` | Live behind `ANTHROPIC_API_KEY`; honest "not configured" fallback; model defaults to `claude-sonnet-5` per `docs/ENVIRONMENT.md` |
| Map tiles: MapTiler with CARTO fallback | `apps/web/src/lib/maps/tiles.ts`. A licensing module first: CARTO public basemaps are non-commercial only, and the module carries a `nonCommercial` boolean and per-provider attribution | Wired. `NEXT_PUBLIC_MAPTILER_KEY` switches provider, zoom ceiling and attribution together |
| Nigeria reference data (states, LGAs, occupations) | `apps/web/src/lib/places/` reads `public.states` (37), `public.local_governments` (774), `public.occupations` (749) from the platform's own database | Live, first-party. This is not an external places API |
| Capacitor 8.5 native shell | `apps/web/package.json`: `@capacitor/core`, `app`, `browser`, `keyboard`, `splash-screen`, `status-bar`, plus android and ios platforms. No push plugin installed | Native shell exists; push does not |

**Not connected, confirmed by absence in code:** no Google Maps or Google
Places client (removed 2026-08-09, ADR-013), no LiteAPI client in the working
tree (in git history only, see 1.1), no Amadeus (removed 2026-08-07, commit
`08d2298f`), no SMS or OTP provider (`TERMII_API_KEY` documented as unwired in
`docs/ENVIRONMENT.md` section 4), no push notifications, no analytics client,
no Sentry, no CAPTCHA, no external KYC provider (the verification ladder in
`agent_verification_checks` is entirely first-party; the payout rung's
evidence is Paystack's `/bank/resolve` answer).

**One correction to the charter:** `HANDOFF_04` section 2.3 says
`apps/web/src/lib/security/csp.ts` "still whitelists the LiteAPI host". The
current file does not: the `img-src` wildcard that existed for LiteAPI's
supplier CDNs was deliberately closed and the comment in the file records
that. Re-admitting partner hotel photos means reopening image hosts
deliberately, ideally by proxying or re-hosting images rather than restoring
the `https:` wildcard.

**CSP-visible external surface today:** images from Unsplash,
`*.googleusercontent.com`, CARTO, MapTiler and Supabase storage; `connect-src`
is self plus Supabase only; `form-action` allows the four Paystack checkout
origins. That is the complete browser-visible integration surface, which is
exactly how the architecture wants it: everything else is server-side.

---

## 1. Hospitality inventory

### 1.1 LiteAPI (Nuitée Connect): the incumbent in the vault

**What sits in git history (code-verified):**

- `90b6b53d`: 889-line booking client, `POST /rates/book` and
  `PUT /bookings/{id}` cancel, wired to nothing, with the merchant-of-record
  consequence of `ACC_CREDIT_CARD` written as a warning at the top.
- `5354fc90` (and siblings `f267a934`, `b02b290a`, `a78887ac`): the search
  client against `https://api.liteapi.travel/v3.0`, `GET /data/hotels` with
  `countryCode=NG` for static content, `POST /hotels/rates` requesting
  `currency: "NGN"`, with a hard rule that any offer not quoted in NGN is
  dropped and noted. The health probe in `docs/archive/DATA_SOURCES.md`
  records that a sandbox key returned non-zero Nigerian listings, which is
  the only concrete evidence of Nigerian coverage this research holds.
- `docs/archive/DATA_SOURCES.md` (repo doc): sandbox keys are instant
  (`sand_` prefix), production keys (`prod_`) after account completion; the
  key alone selects environment; the whitelabel booking site
  (`<name>.nuitee.link`, env var `LITEAPI_WHITELABEL_DOMAIN` at the time)
  lets the guest pay on LiteAPI's own hosted
  page so Vallo earns commission without holding money.

**Current state, search-derived (docs.liteapi.travel is BLOCKED to direct
fetch):**

- What data: static content, real-time rates and availability, the
  prebook/book/cancel flow, loyalty and vouchers, booking webhooks, over
  2 million properties. Documentation current as of mid-2026.
- Live availability and pricing: yes, `Rates` then `Prebook` (offer
  validation) then `Book`. The prebook-before-charge discipline the vault
  encodes still matches the documented flow.
- Booking: via API (merchant-of-record consequences as above) or via the
  hosted whitelabel where LiteAPI is merchant of record. Search results also
  describe a payment SDK where Nuitée is merchant of record inside your own
  flow; that variant needs confirmation before it is designed against.
- Commission: commission and markup model; a `margin` parameter sets your
  commission and the selling price. The core workflow is free at a
  reasonable look-to-book ratio. Exact revenue-share percentages: pricing
  requires provider confirmation.
- Auth: API key (the repo's own client sent it as a header against v3.0).
- Rate limits: sandbox 5 requests/second; production 27,000 requests/minute;
  custom limits on request (search-derived from their rate-limiting page).
- Webhooks: booking webhooks exist (search-derived); payload shapes and
  signing scheme unverified, BLOCKED.
- Partnership requirements: none for sandbox; self-serve account completion
  for production. No application queue, which is what distinguished it from
  every alternative in 2026 and still does.
- Sandbox: yes, production-like, free.
- Nigerian coverage: proven non-zero by the platform's own past probe;
  breadth and depth by city unquantified. First production task is a coverage
  count for Lagos, Abuja, Port Harcourt before any UI promises density.
- What changed since mid-2026: heavy AI-era repositioning (an MCP server at
  `mcp.liteapi.travel`, "LiteAPI Agentic", chatbot and price-intelligence
  products, Q1 2026 update post). The core REST surface appears intact; the
  v3.0 base URL the vault used must be re-confirmed on the day keys arrive.
- Licensing and limitations: supplier hotel photos come from arbitrary CDNs
  (the reason the old CSP had an image wildcard); content redistribution
  terms unverified, BLOCKED.

**Verdict: AVAILABLE NOW.** The only self-serve, sandbox-first, Nigeria-proven
option, with 889 lines of hard-won client logic in the vault and the Model 1
fulfilment story (whitelabel completion, commission, no float) already
matching section 5 of the charter. Model 2 via `ACC_CREDIT_CARD` stays
founder-gated exactly as the vault's own comment warns.

### 1.2 Booking.com Demand API

- What data: accommodation and attraction inventory, availability, pricing;
  orders endpoints for booking.
- Partnership: gated hard. As of 30 July 2026 (search-derived) it requires
  Managed Affiliate Partner status, a signed contract and Account
  Manager-enabled Partner Centre access before sandbox or production
  credentials exist. Direct booking through Orders needs a separate "Search,
  Look and Book" approval with a business case. General Partner Terms v5
  require prior written approval before using AI in performing the agreement,
  which matters because Vallo ships an AI assistant.
- Commission: revenue share on bookings driven through the API, no usage
  fees; the affiliate share is a percentage of Booking.com's own commission.
  Exact schedule: pricing requires provider confirmation.
- Auth: API key plus `X-Affiliate-Id` (search-derived).
- Rate limits, webhooks, sandbox: gated behind partnership; unverified.
- Nigerian coverage: Booking.com's consumer coverage of Nigeria is large,
  but nothing about API-side coverage could be verified without partner
  access.
- Verdict: **APPLICATION REQUIRED.** The strongest brand and likely the
  deepest Nigerian inventory, but a managed-partner queue with no
  self-service and an AI-approval clause. Worth applying early because the
  clock only starts when the application does; build nothing against it
  until credentials exist.

### 1.3 Expedia Rapid (Expedia Partner Solutions)

- What data: lodging content, rates, availability, booking. 700k+ properties
  claimed in marketing; unverified.
- Partnership: commercial agreement required; applications reviewed case by
  case; OTAs and white-label travel platforms qualify, individual developers
  do not. API key starts in restricted development mode until a site review
  approves launch (search-derived from their launch-requirements pages).
- Launch requirements worth noting now: PCI compliance evidence unless using
  EPS Checkout; total price display with tax and fee breakdown, no rounding
  or currency conversion (which collides with a kobo-priced UI unless rates
  arrive in NGN; unverified whether NGN rates are offered); TripAdvisor
  content agreement; downstream agent agreement link in the booking flow.
- Commission: models vary by agreement; pricing requires provider
  confirmation.
- Nigerian coverage: unverified.
- Verdict: **APPLICATION REQUIRED**, and heavier than Booking.com to launch.
  A second-wave candidate, not an MVP one.

### 1.4 Amadeus Hospitality

- Fact base: the Self-Service portal was decommissioned on 17 July 2026 and
  existing keys disabled (search-confirmed by multiple sources including
  PhocusWire, and recorded first-hand in `docs/ENVIRONMENT.md` and
  `docs/archive/DATA_SOURCES.md`). Enterprise APIs continue for contracted
  Enterprise customers only.
- The codebase's provider was removed by the founder's decision, commit
  `08d2298f`, and the charter forbids resurrecting it without his word.
- Evaluation: the only route back is an Enterprise contract, a sales
  process, a signed agreement and unknown minimums. Pricing requires
  provider confirmation. Nothing about it fits an MVP.
- Verdict: **UNSUITABLE** today, and in any case **founder-gated**: even if
  Enterprise terms turned out attractive, restoring Amadeus needs his
  explicit word first.

### 1.5 Hotelbeds (HBX Group, APItude)

- What data: 300,000+ hotels, 195+ countries (marketing figures,
  search-derived); hotel content, availability, rates, booking APIs.
- Partnership: register as a travel-trade partner and request credentials;
  a certification process (workflow review via apitude@hotelbeds.com) gates
  production. Not a managed-affiliate queue like Booking.com, but not
  key-in-minutes self-service either.
- Commission: net-rate wholesale model; you mark up. Pricing requires
  provider confirmation.
- Nigerian coverage: unverified; Hotelbeds is bedbank inventory and African
  depth outside resort markets is a known industry question. Must be tested
  with a real credential.
- Verdict: **APPLICATION REQUIRED.** Credible second source; note LiteAPI
  resells overlapping bedbank inventory anyway (the repo's own
  `DATA_SOURCES.md` made this exact point when the decision was last taken).

### 1.6 RateHawk (Emerging Travel Group)

- What data: Partner API pAPI v3 at `api.worldota.net`; 2.5M+ properties,
  190+ countries; hotel search, prebook, asynchronous order booking flow,
  static content, cancellation; JSON REST over HTTP Basic auth
  (search-derived).
- Commission: net rates only, you set the margin; no commission scheme.
- Partnership: free registration for registered travel businesses, then
  key issuance and an integration review; VALLO SPACES LTD qualifies as a
  registered business. Momentum is real: 78% year-on-year API booking growth
  and 1,800 partner companies by H1 2026 (their own press, search-derived).
- Nigerian coverage: unverified; must be probed with a test key.
- Sandbox, rate limits, webhooks: present in their docs family
  (docs.emergingtravel.com) but unverified in detail, BLOCKED to fetch.
- Verdict: **APPLICATION REQUIRED**, the lightest-weight application of the
  net-rate set, and the best structural fit for a second provider slot in
  the registry once Model 1 is proven on LiteAPI. The asynchronous booking
  flow means the provider interface must not assume synchronous confirmation.

### 1.7 Africa-focused sources

- **Hotels.ng**: the largest Nigerian OTA (7,000+ Nigerian hotels claimed
  historically). No public self-serve inventory API could be found in 2026;
  the only "API" surfaced is an old third-party crawl, which is scraping and
  therefore banned under rule 4. A direct partnership conversation is the
  honest route. Verdict: **FUTURE**, pending a human conversation, not an
  integration.
- **HotelOnline**: Nairobi-based, 6,000+ hotels across 27 African countries,
  but it sells revenue-management and e-commerce services to hotels; no
  public distribution API found. Verdict: **FUTURE / UNSUITABLE as an API**,
  possibly interesting as a supply partnership.
- No other credible Africa-focused inventory API with public documentation
  was found. The honest conclusion: for Nigerian depth, first-party host
  onboarding (Vallo Stays' own supply side) is itself the Africa-focused
  inventory source, and it is entirely in Vallo's control.

### 1.8 The recommended stays path

1. **Now:** re-instate the provider registry, kill switches and timeout
   discipline from the vault; salvage the LiteAPI client's logic (NGN gate,
   dedupe, prebook-before-anything) into today's codebase behind a
   `HotelProvider` interface; run on a fresh sandbox key; fulfil via the
   whitelabel (Model 1) with the fulfilment-honest CTA the charter requires.
2. **In parallel, paperwork:** apply to Booking.com Demand (longest queue,
   biggest prize) and register with RateHawk (shortest queue, net-rate
   control). Both are applications a founder signs, not code.
3. **Never without his word:** Amadeus, and any Model 2 activation on any
   provider.

---

## 2. Maps and location

### 2.1 What exists (code-verified)

- Rendering: Leaflet-style raster tiles via `lib/maps/tiles.ts`; MapTiler
  when `NEXT_PUBLIC_MAPTILER_KEY` is set (dataviz-light/dark styles), CARTO
  non-commercial fallback otherwise, attribution travelling with the URL.
- A map listings API at `app/api/map/listings/route.ts` serving the
  platform's own coordinates from its own database.
- No geocoding client anywhere in the tree. Listing coordinates come from
  the listing flow itself. There is no Places, no Mapbox, no Google client.

### 2.2 The comparison

**Google Maps Platform** (search-derived): the March 2025 repricing replaced
the flat $200 credit with per-SKU free caps, roughly 10,000 free billable
events/month for Essentials SKUs, 5,000 for Pro, 1,000 for Enterprise, with
per-1,000 prices from about $2 to $30+ (Places Details Advanced around $32
per 1,000). Nigerian coverage and geocoding accuracy are the best available;
places and landmark data unrivalled. But: caching is forbidden beyond place
IDs (indefinitely) and coordinates (30 days), Places content generally must
be displayed with Google attribution and, when on a map, on a Google map.
That licensing shape fights a marketplace that wants to store geocodes
against its own listings, and the JS SDK is the heaviest of the three on a
mid-range Android. Exact current SKUs: pricing requires provider
confirmation.

**Mapbox** (search-derived): 50,000 free web map loads/month, then about $5
per 1,000; Temporary Geocoding 100,000 free requests/month but results may
not be stored; **Permanent Geocoding**, the variant that may be stored, has
no free tier and is billed per 1,000 (rate requires provider confirmation).
Nigerian geocoding quality is the disqualifier: a Mapbox's own GitHub issue
reports no usable coverage in Nigeria, wrong-country results and missing
major streets. Unless re-tested and disproven, Mapbox is not a Nigeria
geocoder; its GL renderer remains excellent.

**OpenStreetMap stack**: ODbL-licensed data, commercial use allowed with
attribution and share-alike on the data. Nigerian OSM coverage in Lagos and
Abuja is substantial (community-mapped; quality varies by neighbourhood).
The public Nominatim instance is not a production dependency: absolute
maximum 1 request/second, bulk jobs restricted to 4 requests/minute, and the
policy itself instructs you to cache results. Self-hosting Nominatim (or
Photon for search-as-you-type) removes every limit and every per-call fee,
and storing geocodes forever is legal under ODbL. Tiles: MapTiler (already
wired, OSM-based, commercial licence) so no tile server needs running.

### 2.3 One recommended architecture, not three providers

**MapTiler tiles (already wired) + PostGIS in the existing Postgres + a
self-hosted or MapTiler-provided OSM geocoder, behind a `MapProvider`
interface. No Google Maps SDK in the browser.**

- Tiles and rendering: keep `lib/maps/tiles.ts` exactly as designed; fund
  the MapTiler key (the licensing item `docs/ENVIRONMENT.md` already flags).
  MapTiler also sells an OSM-based geocoding API; evaluate it first since
  the account will already exist (pricing requires provider confirmation).
- Search geometry: PostGIS in the existing Supabase Postgres 17 for radius,
  bounding box, distance-from-landmark and clustering. The charter's
  "evaluate against plain Postgres" note stands; the evaluation belongs to
  Agent/backend work, but nothing in this research found a need for an
  external service to do geometry the database can do.
- Geocoding Nigerian addresses: the honest truth is that no provider
  geocodes free-text Nigerian addresses reliably. The platform already holds
  the better answer: 37 states, 774 LGAs, its own landmark table to come,
  and map-pin confirmation in the listing flow (structure over free text).
  An OSM geocoder (self-hosted Nominatim/Photon, or MapTiler's) covers the
  landmark and area lookup on top; results are cacheable forever, which the
  Google terms would forbid.
- Google's role, if any, is a narrow later add for POI display only (see
  section 4), never the base map, never the stored geocode.
- SDK weight: raster tiles plus the existing map code is the lightest option
  on a mid-range Android; Google's JS API is the heaviest; Mapbox GL sits
  between. No change needed to win this dimension: the current approach is
  already the light one.

---

## 3. Payments and banking

### 3.1 What exists (code-verified, and stronger than the charter assumes)

`lib/payments/paystack.ts` already covers most of "the new needs":

- Card checkout by server-initiated redirect; webhook with HMAC SHA-512
  signature verification, idempotency, metadata-as-string survival
  (`metadataObject`, with the regression test telling the story of the
  dropped funding), reconcile route, and `lib/payments/observability.ts`
  giving every money branch a greppable log line.
- **Transfers and payouts**: `/transferrecipient`, `/transfer`,
  `/transfer/verify/{reference}` already in the client and used by agent
  payout actions.
- **Account name lookup**: `/bank/resolve` plus `/bank?currency=NGN` already
  power the payout verification rung; the resolved name is the rung's
  evidence.
- **Not present**: dedicated virtual accounts, subscriptions, split
  payments, multi-currency.

### 3.2 Paystack against the new needs (search-derived where noted)

- Collections fee shape (search-derived, requires confirmation): 1.5% +
  NGN 100 local, NGN 100 waived under NGN 2,500, capped at NGN 2,000.
- **Dedicated Virtual Accounts (DVA)**: per-customer NUBAN account numbers so
  a guest funds a wallet by plain bank transfer. Registered Nigerian
  businesses that completed go-live only; requires customer BVN
  verification before an account is created; deposits arrive as webhook
  events (`dedicatedaccount.assign`, `charge.success`); fee search-derived
  at 1% capped at NGN 300, requires confirmation. This is the single most
  valuable payments addition for a wallet-centred marketplace, and it is an
  extension of the existing provider, not a new vendor. The BVN requirement
  is a privacy-notice change first (HANDOFF_02 section 22 rule two).
- Transfers: already integrated; per-transfer fees require provider
  confirmation.

### 3.3 Flutterwave, as comparison only

Search-derived: local cards 1.4% + NGN 100 with the same NGN 2,000 cap,
international 3.8% against Paystack's 3.9%; comparable transfers, virtual
accounts and resolve endpoints. There is no capability gap that justifies a
second processor now; the `PaymentProvider` abstraction is the multi-market
seam, and Flutterwave's wider African country coverage (Ghana, Kenya francs
and franc-zone) makes it the likely second provider when a second market
arrives, not before.

### 3.4 Model 1 versus Model 2

- **Model 1 (aggregator, the MVP)** needs nothing new from payments at all.
  The booking completes with the provider; commission arrives as provider
  settlement outside the guest flow; the existing wallet machinery keeps
  serving first-party bookings as it already does.
- **Model 2 (documented, not recommended, founder-gated)** would demand:
  merchant-of-record status on partner stays, a funded float with the
  supplier (LiteAPI `ACC_CREDIT_CARD` charges Vallo's own account, as commit
  `90b6b53d` warns in its own words), refund liability from Vallo's pocket,
  an idempotency key shared between charge webhook and supplier booking, a
  "guest paid, supplier not confirmed" state with automatic refund, currency
  conversion recorded at the edge, and probably DVA-based collection. Every
  one of these is architecture to leave room for and activate never, absent
  the founder's word: under HANDOFF_01 it is shaped like a Reserved Matter.
- **Yellow Card** stays exactly as built: a crypto on-ramp where Vallo is
  never custodian and never exchange; the seam to prove on keys day is
  `createCollection` and `parseWebhook`, per the module's own honest note.

---

## 4. Restaurant and places data

Licensed options only; the `reservations` trigger already enforces that
partner venues cannot be reserved, which is the schema-level version of this
section.

- **First-party onboarding is the primary source.** Restaurants that join
  Vallo own their profile, hours, menus and photos; no licence question
  exists. Everything below is display-layer augmentation.
- **Google Places API** (search-derived from their policy pages): place IDs
  may be stored indefinitely; coordinates cached at most 30 days; names,
  ratings, reviews, photos and phone numbers must be requested live, never
  warehoused; attribution required, and Places content shown on a map must
  be on a Google map. That last clause is the trap for Vallo: the map is
  MapTiler, so Google Places data could only be shown off-map (lists,
  detail panels) with the Google logo, or the map rule is breached. The old
  quota-batching commit (`7f9a7a4d`, six requests to one) shows the cost
  pressure is real. Usable, but only as: store place ID + own geocode,
  fetch details live, display off-map with attribution. Pricing per SKU
  requires provider confirmation.
- **Foursquare Places** (search-derived, including their API licence
  agreement page): effective 1 June 2026, Pro endpoints about $15 per 1,000
  calls after 500 free calls/month (their own pages show a discrepancy with
  an older 10,000-free claim); only `fsq_place_id`, photo IDs and address
  IDs may be cached; no storing, merging or building a POI dataset;
  "Powered by Foursquare" attribution. No map exclusivity clause surfaced,
  which makes it more compatible with a MapTiler map than Google is, but
  Nigerian POI depth is unverified and must be probed with a free-tier key
  before anything is designed against it.
- **OpenStreetMap POI data** (ODbL): may be stored, served and displayed on
  any map forever, with attribution and share-alike on derived data. Lagos
  restaurant coverage in OSM is real but thin and unevenly maintained.
  Right licence, weakest data.
- **What may be stored versus displayed, the summary:** own data: anything.
  OSM: anything, under ODbL attribution/share-alike. Google: IDs forever,
  coordinates 30 days, everything else live-only. Foursquare: IDs only,
  everything else live-only. **No scraping of Hotels.ng, Google results,
  Instagram or anywhere else, ever.**

---

## 5. Notifications

- **Email (exists):** Resend, code-verified as above; 3k emails/month free
  tier per `docs/ENVIRONMENT.md`; `EMAIL_FROM` must be a verified sender.
  Nothing to change except growing the template family with the
  notification architecture of HANDOFF_04 section 9.
- **SMS and OTP for Nigeria (new, and gated by product need):**
  - **Termii**: Lagos-built, developer-first, OTP-focused; the env var
    `TERMII_API_KEY` is already documented in `docs/ENVIRONMENT.md` as
    reserved-but-unwired, which makes Termii the path of least resistance
    when phone OTP ships. Strong Nigerian delivery reputation including
    DND-registered numbers via transactional routes. Per-SMS pricing
    requires provider confirmation.
  - **Africa's Talking**: the pan-African aggregator with local routing
    across the continent; the multi-market candidate when Ghana or Kenya
    arrive. Pricing requires provider confirmation.
  - **Twilio**: widest tooling, priciest Nigerian routes (search-derived
    range $0.0075 to $0.28 per message depending on route class); DND
    bypass exists on premium OTP routes. Justified only if channels beyond
    SMS consolidate onto it, which Resend and FCM make unlikely.
  - The Nigerian regulatory fact that shapes all three: DND filtering means
    promotional SMS silently dies on DND numbers; OTP must go on
    transactional sender routes. Whichever provider, the
    `NotificationProvider` interface should carry message class.
- **Push (new):** Capacitor 8 native shell already exists in the repo;
  `docs/MOBILE.md` notes the Android scaffolding already resolves
  `com.google.gms:google-services`. Current community consensus
  (search-derived) is `@capacitor-firebase/messaging` for a unified FCM
  token across Android and iOS (APNs under FCM), plus FCM web push with
  VAPID keys for the PWA, where the existing `public/sw.js` service worker
  and the CSP `worker-src 'self' blob:` already leave room. FCM is free;
  APNs needs the Apple Developer account already on the accounts list.
  Native push requires app identifiers, which are on the founder's
  full-stop list, so web push can land first.

---

## 6. Identity and KYC

The law of the ladder: `agent_verification_checks` (one row per rung),
`agents.verification_tier` derived never set, `agent_badges` written only by
`private.sync_agent_badge`. External providers become evidence writers for
rungs, exactly as Paystack's `/bank/resolve` already is for the payout rung.
They augment; they never replace Vallo's own verification logic, and the
verified badge keeps meaning "a human was checked by Vallo".

All providers below hold NIMC data-processor relationships and are accessed
as licensed aggregators (search-derived); every claim of exact coverage needs
confirmation against each provider's dashboard before contracting. NIN, BVN
and every KYC payload is personal data of the highest class: a named lawful
basis and a privacy-notice change come first (HANDOFF_01 section 4), consent
flows are mandatory for BVN, and rule 16 forbids any of it appearing in logs
or documents.

| Provider | What it verifies (search-derived) | Sandbox | Cost |
| --- | --- | --- | --- |
| **Smile ID** | NIN, BVN, phone, voter's ID, document capture plus biometric face match; models advertised as de-biased for African faces; pan-African coverage | Yes | Pricing requires provider confirmation |
| **Dojah** | NIN, BVN, CAC business lookup, document and biometric checks, AML, one API | Yes, unlimited free sandbox requests (their own claim) | Pricing requires provider confirmation |
| **YouVerify** | KYC, KYB (CAC), AML screening, address verification including physical address agents, no-code workflow builder | Yes | Pricing requires provider confirmation |
| **Prembly (IdentityPass)** | Identity checks, background checks, fraud prevention, API and no-code | Yes | Pricing requires provider confirmation |
| **VerifyMe (QoreID)** | Identity and address verification; the least documentation surfaced in this research; treat as unverified beyond existence | Unverified | Pricing requires provider confirmation |

**The pick:** start conversations with **Smile ID and Dojah** in parallel and
decide on tested Nigerian pass rates and quoted prices, not on marketing.
Smile ID for biometric-grade identity rungs (NIN plus selfie match), Dojah as
the strong all-rounder whose free sandbox lets the `IdentityProvider`
interface be built and tested before any contract. YouVerify is the address
rung specialist if physical address verification becomes a rung the ladder
wants. This is a paid-vendor decision, so contracting is the founder's call
under section 14 of the charter; building the interface and sandbox flow is
not.

---

## 7. Brief passes

- **AI:** Anthropic already integrated (code-verified): direct fetch, SSE,
  three tools, honest unconfigured fallback, `ASSISTANT_MODEL` /
  `SUPPORT_MODEL` pins. The marketplace adds surface (stay questions,
  restaurant discovery) to an existing integration; no new AI vendor earns a
  place. Note Booking.com's AI-approval clause in 1.2 if that partnership
  proceeds.
- **Media and CDN:** Supabase storage already serves listing photos and
  `listing_videos` (the CSP's `media-src` note anticipates the video
  player). Supabase image transformations are the first candidate for
  responsive sizes because the buckets are already there; confirm
  availability on the project's current plan before promising it (BLOCKED
  from verifying plan entitlements here). Partner hotel images should be
  re-hosted or proxied into storage where licensing allows, rather than
  reopening the CSP image wildcard; where licensing forbids re-hosting,
  named provider CDN hosts get added deliberately.
- **Search:** Postgres first, per the charter. FTS with `pg_trgm`, plus
  PostGIS for geometry, on data that lives in the database already. No
  external engine (Algolia, Typesense, Meilisearch) until a measured
  comparison on real data says the database cannot serve the query shapes;
  adopting one now would be an integration without a demonstrated need.
- **Analytics:** nothing installed today (code-verified; the PostHog vars
  are documented as unwired). Privacy-first options: Plausible (hosted,
  about $9/month entry, search-derived, requires confirmation) or
  self-hosted Umami (MIT, one Node process plus Postgres, cookieless, no
  personal data). Umami self-hosted fits the platform's privacy posture and
  budget best; either way the CSP `connect-src` and privacy notice change
  together, and a paid plan is the founder's call.
- **Security services:** CAPTCHA is absent; durable rate limiting and the
  message scanner already exist in-database. Cloudflare Turnstile is free,
  invisible and the default candidate if abuse pressure demands a
  challenge, with hCaptcha and Friendly Captcha as alternatives
  (search-derived); adding any means CSP `script-src`/`frame-src` changes,
  so it must arrive deliberately, not by default. Sentry (or an equivalent)
  remains unwired; error reporting is an observability decision for the
  backend agent, noted here only because `SENTRY_DSN` already sits in the
  unwired list.

---

## 8. The master matrix

Existing = a client exists in the working tree today. Cost column: "PRC" =
pricing requires provider confirmation (figures elsewhere in this document
are search-derived and also require confirmation).

| Category | Provider | Purpose | Existing or new | Required or optional | Nigeria coverage | Booking/transaction support | Credentials needed | Partnership needed | Cost | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Core | Supabase | DB, auth, storage, RLS | Existing | Required | N/A | N/A | URL, anon key, service role key | No | Free tier then usage | Live |
| Hospitality | LiteAPI (Nuitée) | Partner stays: content, rates, prebook/book, whitelabel fulfilment | New (client in git history) | Required for partner stays | Proven non-zero, depth unquantified | Yes; Model 1 via whitelabel, Model 2 gated | `HOTEL_PROVIDER_API_KEY`, whitelabel domain | No (self-serve) | Commission/margin model, PRC | IMMEDIATE |
| Hospitality | Booking.com Demand | Deep global and Nigerian inventory | New | Optional | Likely strong, unverified via API | Yes, gated by extra approval | Key + affiliate ID after contract | Yes, managed affiliate | Revenue share, PRC | NEXT (apply now) |
| Hospitality | RateHawk (ETG) | Net-rate second provider | New | Optional | Unverified | Yes, async flow | Basic-auth key pair | Yes, light registration | Net rates, PRC | NEXT |
| Hospitality | Hotelbeds APItude | Bedbank second source | New | Optional | Unverified | Yes, after certification | Key + secret | Yes | Net rates, PRC | LATER |
| Hospitality | Expedia Rapid | Global lodging | New | Optional | Unverified | Yes, heavy launch reqs | Key after agreement | Yes, case-by-case | PRC | LATER |
| Hospitality | Amadeus Enterprise | Hotel content/booking | Removed | No | Unverified | Enterprise only | Contract-issued | Yes, Enterprise contract | PRC | UNSUITABLE, founder-gated |
| Hospitality | Hotels.ng / HotelOnline | Nigerian supply partnerships | New | Optional | Native | No public API found | N/A | Yes, human conversation | PRC | FUTURE |
| Maps | MapTiler | Commercial tiles (and candidate geocoder) | Existing | Required (licensing) | Good (OSM base) | N/A | `NEXT_PUBLIC_MAPTILER_KEY` | No | Free tier then plans, PRC | IMMEDIATE (fund key) |
| Maps | PostGIS (in Supabase) | Radius, bbox, clustering, landmarks | New (extension) | Required | Own data | N/A | None | No | Included | IMMEDIATE |
| Maps | Self-hosted Nominatim/Photon or MapTiler geocoding | Geocoding, landmark lookup, stored geocodes | New | Optional | OSM-grade, city-dependent | N/A | None or MapTiler key | No | Hosting cost or PRC | NEXT |
| Maps | Google Maps Platform | Geocoding/POI fallback | New | Optional | Best-in-class | N/A | `MAPS_API_KEY` (server) | No | Per-SKU, PRC | LATER, display-rule constrained |
| Places | Google Places API | Restaurant/landmark display data | Removed (batching logic in vault) | Optional | Best-in-class | No | `PLACES_API_KEY` (server) | No | Per-SKU, PRC | LATER |
| Places | Foursquare Places | POI display alternative | New | Optional | Unverified, probe first | No | `PLACES_PROVIDER_API_KEY` | No | Per-call after free tier, PRC | LATER |
| Places | OpenStreetMap POI | Storable POI base layer | New | Optional | Real but thin | No | None | No | Free (ODbL duties) | NEXT |
| Payments | Paystack | Cards, transfers, payouts, resolve | Existing | Required | Native | Yes | `PAYSTACK_SECRET_KEY` | Business go-live done | Fee schedule, PRC | Live |
| Payments | Paystack DVA | Per-user NUBAN wallet funding | New (same vendor) | Optional, high value | Native | Yes | Same key, feature enablement | Registered business + customer BVN | PRC | NEXT |
| Payments | Flutterwave | Second processor, multi-market seam | New | Optional | Native + wider Africa | Yes | Key pair | Business onboarding | PRC | FUTURE |
| Payments | Yellow Card | Crypto on-ramp, NGN settlement | Existing (unproven live) | Optional | Native | Collections | `YELLOWCARD_API_KEY`, `YELLOWCARD_API_SECRET`, `YELLOWCARD_API_BASE` | Merchant account | PRC | NEXT (keys day) |
| Notifications | Resend | Transactional email | Existing | Required | N/A | No | `RESEND_API_KEY`, `EMAIL_FROM` | No | Free 3k/month then paid | Live |
| Notifications | Termii | SMS/OTP Nigeria | New (env var reserved) | Optional until phone OTP ships | Native, DND-aware routes | No | `SMS_PROVIDER_API_KEY` (`TERMII_API_KEY`) | No | Per-SMS, PRC | NEXT |
| Notifications | Africa's Talking | Multi-market SMS | New | Optional | Pan-African | No | Key + username | No | Per-SMS, PRC | FUTURE |
| Notifications | FCM/APNs via Capacitor | Push | New (shell exists) | Optional, high value | N/A | No | Firebase config, `PUSH_VAPID_*`, APNs key | Apple Dev account | FCM free; Apple $99/yr | NEXT |
| KYC | Smile ID | NIN + biometric rungs | New | Optional (ladder evidence) | Native | No | `IDENTITY_PROVIDER_API_KEY` | Contract | PRC | NEXT (sandbox now, contract is founder's) |
| KYC | Dojah | NIN, BVN, CAC, one API | New | Optional | Native | No | `IDENTITY_PROVIDER_API_KEY` | Contract | PRC, free sandbox | NEXT (same) |
| KYC | YouVerify / Prembly / VerifyMe | Address rung, KYB, alternatives | New | Optional | Native | No | Per provider | Contract | PRC | LATER |
| AI | Anthropic | Assistant, support summariser | Existing | Required (headline feature) | N/A | No | `ANTHROPIC_API_KEY` | No | Pay as you go | Live |
| Media | Supabase storage (+ transforms) | Photos, video, responsive images | Existing | Required | N/A | No | Existing keys | No | Plan-dependent, PRC | IMMEDIATE (confirm plan) |
| Search | Postgres FTS + PostGIS | One search | New (extension) | Required | Own data | N/A | None | No | Included | IMMEDIATE |
| Analytics | Umami (self-hosted) or Plausible | Privacy-first analytics | New | Optional | N/A | No | `ANALYTICS_*` per choice | No | Hosting, or ~$9/mo PRC | LATER |
| Security | Cloudflare Turnstile | Bot challenge if needed | New | Optional | N/A | No | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | No | Free (search-derived) | LATER |

---

## 9. Current versus new

**Already connected (from code):** Supabase; Paystack (cards, transfers,
payouts, bank resolve, webhook, reconcile); Resend; Anthropic; MapTiler/CARTO
tiles; Capacitor native shell; Yellow Card (built, awaiting a live merchant
account); the platform's own Nigeria reference data.

**Required for the new architecture:** LiteAPI re-instated behind the
provider registry (Model 1); PostGIS enabled in the existing database;
MapTiler key funded (licensing); Supabase storage confirmed for stays and
restaurant media; Postgres-first search.

**Recommended next:** Booking.com Demand application and RateHawk
registration (paperwork now, code later); Paystack DVA for wallet funding;
Termii for phone OTP when the product needs it; FCM web push first, native
push behind app identifiers; Smile ID and Dojah sandboxes for the
`IdentityProvider` interface; an OSM/MapTiler geocoding decision; Yellow Card
live keys.

**Future:** Flutterwave (second market), Africa's Talking (second market),
Hotelbeds/Expedia (second-wave inventory), Hotels.ng or HotelOnline supply
partnerships, analytics, Turnstile, an external search engine only if the
database measurably fails, Amadeus never without the founder's word.

---

## 10. Credential checklist (placeholders only, never a real value)

Webhook paths that exist in code today: `/api/paystack/webhook`,
`/api/yellowcard/webhook`, `/api/auth/email-hook`, `/api/csp-report`.
Callback that exists: the Paystack checkout return to
`/checkout/[bookingId]` (verified server-side, never trusted from the
browser). All URLs below are relative to `https://vallospaces.com`.

| Env var (placeholder) | Scope | For | Webhook/callback to register |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Core | N/A |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Core, and the var whose absence silently eats payment webhooks (W-1) | N/A |
| `PAYSTACK_SECRET_KEY` | server only | Cards, transfers, resolve; also signs webhook verification | Register `/api/paystack/webhook` in the Paystack dashboard |
| `YELLOWCARD_API_KEY`, `YELLOWCARD_API_SECRET`, `YELLOWCARD_API_BASE` | server only | Crypto on-ramp | `/api/yellowcard/webhook` |
| `RESEND_API_KEY`, `EMAIL_FROM` | server only | Email | Auth emails via `/api/auth/email-hook` |
| `ANTHROPIC_API_KEY`, `ASSISTANT_MODEL`, `SUPPORT_MODEL` | server only | AI | N/A |
| `NEXT_PUBLIC_MAPTILER_KEY` | public by design (tile URLs are public; restrict by referrer in the MapTiler dashboard) | Tiles | N/A |
| `HOTEL_PROVIDER_API_KEY` (LiteAPI; `sand_` then `prod_`) | server only | Partner stays | Booking webhook endpoint to create: `/api/stays/provider/webhook` (name to be settled by the backend agent); whitelabel return URL |
| `HOTEL_PROVIDER_WHITELABEL_DOMAIN` | server only | Model 1 fulfilment handoff | N/A |
| `BOOKING_DEMAND_API_KEY`, `BOOKING_AFFILIATE_ID` | server only | If/when the partnership lands | Per contract |
| `RATEHAWK_KEY_ID`, `RATEHAWK_API_KEY` | server only | If/when registered | Per docs |
| `SMS_PROVIDER_API_KEY` (Termii) | server only | OTP/SMS | Delivery report webhook per provider, e.g. `/api/sms/status` |
| `PUSH_FCM_PROJECT_CONFIG`, `PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY`, APNs auth key via Apple account | server only (VAPID public may ship to the client) | Push | N/A |
| `IDENTITY_PROVIDER_API_KEY` (per chosen KYC vendor, sandbox first) | server only | Ladder evidence | Result webhook, e.g. `/api/kyc/provider/webhook`, signature-verified |
| `PAYMENT_WEBHOOK_SECRET` style vars | server only | Any provider that signs with a secret separate from the API key | Named beside each webhook |
| `TURNSTILE_SITE_KEY` (public), `TURNSTILE_SECRET_KEY` (server) | mixed | If a challenge ever ships | N/A |

Rules that travel with the table: no `NEXT_PUBLIC_` prefix on anything
secret; every webhook verifies a signature, tolerates duplicates and delayed
delivery, and never 200s a failure silently; a missing key degrades honestly
everywhere except payment webhooks, where it must log loudly (the
`unconfigured` outcome in `lib/payments/observability.ts` is the pattern).

---

## 11. Action plan

### IMMEDIATE (this mission)

1. **LiteAPI, Model 1.**
   Provider: LiteAPI. Purpose: partner stays inventory and fulfilment.
   Credentials: `HOTEL_PROVIDER_API_KEY` (sandbox first),
   `HOTEL_PROVIDER_WHITELABEL_DOMAIN`. Backend: re-instate the provider
   registry, per-provider kill switches in `feature_flags`, 2.5s timeout
   with `allSettled`, the 150m + name-token dedupe, and a rewritten LiteAPI
   client salvaging the NGN gate and prebook logic from `90b6b53d`,
   `5354fc90`, `b02b290a`, `f267a934`, behind a `HotelProvider` interface.
   Frontend: stay cards and detail with source label and
   fulfilment-honest CTA ("Booking completes with the partner"). Database:
   `source`/fulfilment columns per HANDOFF_04 section 6; the widened
   `source` union in `lib/listings/types.ts`. Webhooks: booking webhook
   endpoint with signature check once the scheme is confirmed (BLOCKED in
   this research). Testing: sandbox end-to-end, a Lagos/Abuja coverage
   count recorded before any density claim. Security: key server-side only;
   partner images proxied or their hosts named in CSP deliberately; stale
   rates never shown as live (freshness policy per source).
2. **PostGIS and search.** Provider: none (extension). Backend: enable
   PostGIS, geometry columns and GiST indexes for radius/bbox/landmark
   queries; FTS with `pg_trgm`. Frontend: map/list conversation, distance
   filters. Testing: query-plan comparison against plain Postgres recorded,
   per the charter. Security: none new; RLS unchanged.
3. **MapTiler key funded.** Purpose: get off non-commercial CARTO tiles
   before launch; a licensing item, already wired, founder adds
   `NEXT_PUBLIC_MAPTILER_KEY` with referrer restriction.
4. **Media check.** Confirm Supabase image transform entitlement on the
   project's plan; wire responsive sizes for stay galleries from existing
   buckets.
5. **Paperwork started (founder):** Booking.com Demand application,
   RateHawk registration, MapTiler plan, LiteAPI production account. None
   of these block code.

### NEXT

1. **Paystack DVA.** Purpose: wallet funding by bank transfer. Credentials:
   existing `PAYSTACK_SECRET_KEY` plus feature enablement and business
   go-live. Backend: DVA create/assign service behind `PaymentProvider`;
   webhook handling for assignment and credit events on the existing
   `/api/paystack/webhook` with the existing idempotency. Database: DVA
   number stored against the wallet (bank account numbers never logged,
   rule 16). Frontend: "fund by transfer" surface in the wallet. Testing:
   duplicate and delayed webhook delivery. Security: BVN consent flow and
   privacy notice change before anything ships.
2. **Push.** FCM web push (VAPID, existing service worker) first; native
   via `@capacitor-firebase/messaging` after the founder grants app
   identifiers. Backend: `NotificationProvider` with per-user tokens and
   per-event routing on the existing trigger-driven system. Testing:
   foreground/background, token rotation. Security: tokens are personal
   data; retention schedule entry.
3. **Termii OTP** when phone verification ships: `SMS_PROVIDER_API_KEY`,
   transactional route class for DND delivery, OTP rate-limited by the
   existing durable rate limiting, delivery webhook signature-checked.
4. **KYC sandboxes.** Build `IdentityProvider` against Dojah's free sandbox
   and Smile ID's sandbox; write results only into
   `agent_verification_checks` as rung evidence; contracting and pricing
   are the founder's decision. Lawful basis and privacy notice first; no
   NIN/BVN in logs, ever.
5. **Yellow Card live keys**: prove `createCollection` and `parseWebhook`
   against the real API, per the module's own note.
6. **RateHawk integration** as the second registry provider once approved,
   validating the registry's multi-provider claim (async booking flow
   support in the interface).

### LATER

1. **Booking.com Demand** integration when the partnership lands (note the
   AI-approval clause against the assistant).
2. **Places augmentation**: probe Foursquare Nigerian depth with a free
   key; OSM POI import under ODbL for landmarks; Google Places only
   off-map with attribution, place IDs and own geocodes stored, everything
   else fetched live; the `7f9a7a4d` batching logic salvaged if Google
   returns.
3. **Analytics** (Umami self-hosted or Plausible: paid, founder's call),
   **Turnstile** if abuse pressure demands it, **error reporting**
   (`SENTRY_DSN` is already reserved), **Hotelbeds/Expedia** as second-wave
   inventory, **Flutterwave and Africa's Talking** with the second market.

---

## 12. Verification log

**Code-verified (source opened in this repository):**
`docs/archive/HANDOFF_04_MARKETPLACE.md`, `docs/ENVIRONMENT.md`,
`docs/HANDOFF_02_PLATFORM.md` section 22, `apps/web/src/lib/security/csp.ts`,
`lib/payments/paystack.ts` (via targeted reads), `lib/payments/yellowcard.ts`,
`lib/payments/observability.ts`, `lib/payments/metadata.test.ts`,
`lib/email/client.ts`, `lib/maps/tiles.ts`, `lib/places/*`,
`app/api/paystack/webhook/route.ts` (signature line),
`app/api/assistant/route.ts`, `lib/agent/payout-actions.ts`,
`apps/web/package.json`, `docs/MOBILE.md` (grep),
`docs/archive/DATA_SOURCES.md`, `docs/archive/HYBRID_INVENTORY.md`, and git
history `90b6b53d` (full commit message and file list) and
`5354fc90:.../liteapi.ts` (targeted grep of the old client).

**BLOCKED (fetch attempted, egress proxy refused):**
`docs.liteapi.travel`, `developers.google.com`,
`operations.osmfoundation.org`. After these three distinct hosts were
refused, no further official-doc fetches were attempted; every remaining web
finding below is search-derived by policy.

**Search-derived (WebSearch results with named sources; no page was opened
directly, so none of this is claimed as doc-verified):**

- LiteAPI surface, rate limits, sandbox, webhooks, commission/margin, 2026
  AI additions: docs.liteapi.travel result snippets, github.com/api-evangelist/nuitee,
  nuitee.com product and Q1-2026 update pages, mcp.liteapi.travel.
- Booking.com Demand gating and terms: developers.booking.com,
  affiliates.support.booking.com, vorplabs.com, track360.io.
- Expedia Rapid requirements: developers.expediagroup.com launch
  requirements, partner.expediagroup.com, altexsoft.com.
- Amadeus Self-Service decommission 17 July 2026 and Enterprise continuity:
  phocuswire.com, developers.amadeus.com, migration guides; corroborated by
  this repository's own `docs/ENVIRONMENT.md`.
- Hotelbeds APItude registration and certification:
  developer.hotelbeds.com, hbxgroup.com.
- RateHawk pAPI v3, net-rate model, registration, H1-2026 growth:
  docs.emergingtravel.com, github.com/api-evangelist/ratehawk,
  emergingtravel.com press.
- Hotels.ng and HotelOnline status: en.wikipedia.org/wiki/Hotels.ng,
  hotelonline.co.
- Google Maps Platform March 2025 repricing and per-SKU free caps:
  developers.google.com pricing pages via search, woosmap.com, radar.com,
  storerocket.io.
- Google Places caching/attribution policy (place IDs indefinite,
  coordinates 30 days, live-only content, Google-map display rule):
  developers.google.com policy pages via search, cloud.google.com service
  terms.
- Nominatim policy (1 rps, 4 rpm bulk, cache-your-results, ODbL):
  operations.osmfoundation.org via search, wiki.openstreetmap.org.
- Mapbox pricing shape and the Nigerian geocoder gap: mapbox.com pricing via
  search, github.com/mapbox/MapboxGeocoder.swift issue 183.
- Paystack fee shapes, DVA requirements and fees: paystack.com docs and
  support.paystack.com via search, mctaba.com guides.
- Flutterwave comparison figures: flutterwave.com support pricing via
  search, Nigerian comparison articles.
- Termii, Africa's Talking, Twilio Nigeria SMS/DND landscape: courier.com,
  twilio.com pricing page via search, arkesel.com, messagecentral.com.
- Capacitor push consensus (`@capacitor-firebase/messaging`, FCM/APNs/web
  VAPID): capacitorjs.com docs via search, capawesome.io, npmjs.com.
- Nigerian KYC providers: dojah.io, usesmileid.com/smile.id,
  doc.youverify.co, buildstudio.com.ng comparison.
- Foursquare Places 1 June 2026 pricing and caching terms: foursquare.com
  API licence agreement and docs via search, openplacesapi.com comparison.
- Analytics and CAPTCHA landscape: openpanel.dev, canadianwebhosting.com,
  prosopo.io.

**Could not be verified at all, said plainly:** LiteAPI webhook payloads and
signing; every provider's exact commission percentages and price cards;
Nigerian inventory depth for LiteAPI (beyond "non-zero"), RateHawk,
Hotelbeds, Expedia and Booking.com's API tier; Mapbox's current Nigerian
geocoding quality (the negative report is dated); MapTiler geocoding
coverage for Nigeria; Supabase image transform entitlement on this
project's plan; VerifyMe/QoreID's current product surface; Termii per-SMS
rates. Every one of these is an on-keys-day or on-application-day check,
and none of them is guessed anywhere in this document.
