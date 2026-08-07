# Data Sources

Every third-party data source considered for the hybrid inventory model, what
it actually gives us, and where the owner goes to get the key. Written after
each one was checked rather than from memory, on 2026-08-07.

The test applied to all of them is the owner's: **can we sign up on a developer
portal and hold a working key the same hour?** Anything needing a sales call, an
IATA number or a business vetting queue is out, and is listed under "Not worth
your time" with the reason, so nobody researches it a second time.

Read with `docs/HYBRID_INVENTORY.md`, which is the model these feed. The rule
that governs all of them: partner stock never carries the verified badge and
never opens in-platform messaging.

---

## 1. Go and get these

In priority order. The first two are the whole hotel and restaurant shelf.

### LiteAPI (Nuitée Connect): hotel rates and booking

| | |
|---|---|
| **Portal** | https://nuitee.com, then **Developers → API Keys** |
| **Env vars** | `LITEAPI_KEY`, and `LITEAPI_WHITELABEL_DOMAIN` for the booking step |
| **Key shape** | Sandbox `sand_…` instantly, production `prod_…` after the account is completed |
| **Card needed** | No |
| **Cost** | The core Rates → Prebook → Book workflow is free at a reasonable look-to-book ratio; they earn a commission on bookings |
| **Wired** | Yes. `apps/web/src/lib/inventory/providers/liteapi.ts`, shipped |

This is the important one, and it is the direct replacement for Amadeus. Until
it has a key, **every partner hotel on the platform shows no price at all**,
because the only live hotel feed is Google Places and Places reports a price
*level* rather than an amount. Paste a sandbox key in and hotel cards start
carrying real naira rates the same minute. The provider does not care whether
the key is sandbox or production, so nothing has to change when you swap it.

Get the sandbox key first. It costs nothing, it proves the integration, and the
production key is the same field.

**Then do the second step, which is what makes a hotel bookable.** In the same
dashboard, switch on the **Whitelabel** booking site, give it a name, and put
the host in `LITEAPI_WHITELABEL_DOMAIN` as `<yourname>.nuitee.link`. Partner
hotel cards then carry a Book action that opens their checkout on the same
dates the price was quoted for. The guest pays there, LiteAPI confirms with the
supplier and we earn the commission without ever holding the money, which is
what keeps us clear of the one failure that matters: a card charged here for a
room a supplier then refuses.

Until that second variable is set the platform is still correct, just smaller:
hotels carry a real naira price and the detail page says plainly that they
cannot be booked on RentMe yet.

### Google Places API (New): restaurants, hotel coverage, addresses

| | |
|---|---|
| **Portal** | https://console.cloud.google.com/apis/credentials, enable **"Places API (New)"** |
| **Env var** | `GOOGLE_PLACES_API_KEY` |
| **Card needed** | Yes, a billing account, though there is a standing monthly free allowance |
| **Wired** | Yes, and it has been for a while. `providers/places.ts` |

The single highest-value key we do not have, because one credential lights up
three things at once: the entire restaurants category, hotel coverage across all
37 covered states, and address autocomplete. Restaurants have **no other
source**. See section 3.

Attribution is a licence condition: "powered by Google" must render wherever
this data shows, and the mapped listing already carries the obligation so the UI
cannot forget.

#### Reading a refusal

Run `/api/admin/inventory?q=Lagos` signed in as an admin. It makes one live call
per feed and reports what came back. Every case below was hit for real while
getting this key working, in this order, and each one looks identical from the
app: a thin shelf and no explanation. The reason string is the only thing that
tells them apart, which is why the upstream's own message is now carried through
rather than reduced to a status code.

| What the reason says | What is actually wrong | Where to fix it |
|---|---|---|
| `no_key` | The variable is unset. No call was made. | Vercel env |
| `answered 403: ... has not been used in project N before or it is disabled` | The API is not switched on for that project. Note it must be **Places API (New)**; the legacy "Places API" is a different product and enabling it does nothing for us. | Console → the URL in the message |
| `answered 403: Requests to this API ... method ... are blocked` | The API is enabled, but the KEY is restricted to a set of APIs that does not include Places API (New). | Console → Credentials → the key → **API restrictions** |
| `answered 403: Requests from referer <empty> are blocked` | The key carries HTTP referrer restrictions. Every call we make is server side and sends no referrer, so a browser-restricted key can never pass. | Console → Credentials → the key → **Application restrictions**, unrestricted or IP |
| `answered 429` | Over quota for the day. | Console → Quotas, or wait |
| `outcome: ok` with `listings: 0` | The key works. There is genuinely nothing matching in that city. | Nothing. Try another `?q=` |

The same route reports LiteAPI, whose 401 body says only "unauthorized". The
shape note beside it carries the diagnosis instead: a key that does not begin
`sand_` or `prod_` is the PUBLIC key, which their front-end SDK uses and which
these server calls refuse identically to a bad key.

### MapTiler: map tiles

| | |
|---|---|
| **Portal** | https://cloud.maptiler.com/account/keys |
| **Env var** | `NEXT_PUBLIC_MAPTILER_KEY` |

Listed here because it is a **licence exposure, not a feature**. Unset, the map
draws on CARTO's public basemaps, which are non-commercial use only, and a
platform taking money for bookings is a commercial use. This needs to be set
before money moves through the deployment, regardless of anything else on this
page.

---

## 2. Worth having, with the catch stated

None of these is needed to ship. Each is listed with the thing that makes it
less useful than it looks, so the decision is yours rather than a surprise
later.

### Hotelbeds APItude

- **Portal**: https://developer.hotelbeds.com/, an evaluation key in a few clicks.
- **Catch**: the key is instant, the *inventory* is not. The evaluation
  environment answers with static test data, and reaching live rates means a
  commercial agreement, which is exactly the gate we are avoiding. Worth
  registering to have the option; not worth building against before LiteAPI.

### Foursquare Places

- **Portal**: https://docs.foursquare.com/developer, instant key, standing free
  monthly credit.
- **Catch**: it duplicates what Google Places already does for us, and Google's
  Nigerian venue coverage is better. Only reach for this if attaching a Google
  billing account is a blocker; it would be a second provider file, not a
  change to the model.

### Termii: SMS and OTP

- **Portal**: https://accounts.termii.com, instant API key.
- **Env var**: `TERMII_API_KEY` (currently reads nothing, no SMS path has shipped)
- **Catch**: the key is instant but the **sender ID is not**. A Nigerian sender
  ID goes to their review queue, so start that request the day you register
  rather than the day you need it. Until it clears, messages send under a
  default sender or not at all.

### Flutterwave: second payment processor

- **Portal**: https://dashboard.flutterwave.com, test keys instantly under
  **Settings → API Keys**.
- **Catch**: Paystack is already wired end to end, including webhook signature
  verification, idempotent settlement, the wallet ledger and transfer payouts.
  A second processor is a real amount of work for redundancy we are not yet
  losing money to. Get the keys if you want them held; do not let this delay
  anything.

---

## 3. The two honest answers

These are the parts of the brief no key solves. Both were researched properly
before being written off, and both have a route that does not depend on anybody
else's portal.

### Shortlets have no API, anywhere

There is no Nigerian shortlet or vacation-rental platform offering self-serve
developer keys. Checked specifically, and against the names that came up:

- **RayProp**. The marketing site exists and describes API infrastructure for
  African shortlets. No public developer portal, no documentation, no published
  endpoints, and nothing on npm. There is nothing here to write code against
  today. If they publish docs, this is worth revisiting; approach them directly
  rather than waiting for a portal.
- **Temivilla / `@temivilla/sdk`**. The npm registry returns **404** for that
  package and for anything matching "temivilla". The SDK does not exist.
- **Airbnb / Vrbo scrapers** (RapidAPI, Apify). These are real and the tokens
  are instant, but they are the wrong shape twice over. They are **read-only**,
  so there is no booking to place and we would be advertising stock we cannot
  sell; and republishing scraped listings as our own inventory is against the
  source platforms' terms in a way that puts the whole catalogue at risk. Not
  a foundation for a marketplace.

**So shortlets are ours to win, and that is not a consolation prize.** Shortlets
are the category with no aggregator, which means whoever builds the supply owns
it, and the supply machinery is already built and working: agent application,
verification tiers, the listing wizard, admin approval, availability, booking
holds, payment and settlement. Shortlet density is an operations problem
(recruiting Lekki, VI, Ikeja and Maitama hosts) rather than an engineering one.
The one thing engineering can add is making that onboarding fast enough that a
host completes it in a sitting.

### Restaurant bookings need our own engine

Discovery is solved by Google Places. Bookings are not, and no aggregator will
solve them:

- **OpenTable** has no self-serve public tier.
- **resOS** is real, the API is good, and the key is instant, but the key
  belongs to *a restaurant that already runs resOS as its booking system*. It is
  a per-merchant integration, not an aggregator. Nigerian restaurants
  overwhelmingly do not run one. Worth wiring only when a specific venue we have
  signed tells us they use it.

Which leaves a lean slot engine of our own, built on what already exists: the
booking state machine, the hold-and-release logic, Paystack, and the
notification triggers. It needs new tables (a venue's service windows, table
inventory, and a reservation that is a party size and a slot rather than a date
range) and therefore a migration. That is a build I can do. It is scoped and it
reuses most of the stay-booking machinery, but it is a separate piece of work
from data sourcing, so it is not started here.

---

## 4. Not worth your time

Recorded with reasons so none of these gets researched twice.

| Source | Why not |
|---|---|
| **Amadeus Self-Service** | **Dead.** The portal was decommissioned on 17 July 2026 and existing keys were disabled with it; new registration had already been paused that spring. Amadeus Enterprise is a different portal, a different auth flow and a signed agreement. Our `providers/amadeus.ts` could never work again, so it was removed on 2026-08-07 rather than carried as dead code. |
| **Booking.com / Expedia EPS / RateHawk direct** | All real, none self-serve. Affiliate or partner review before keys, which is the gate the brief rules out. LiteAPI resells overlapping inventory without the queue. |
| **RapidAPI "Booking.com" wrappers** | Unofficial scrapers. Read-only, no booking, terms risk. The endpoint in the original plan (`POST https://rapidapi.com`) is not an endpoint at all. RapidAPI is a marketplace, and each listed API has its own host. |
| **Travelpayouts / Hotellook** | Instant token, genuinely self-serve, but it is an **affiliate deep-link** programme: you send the traveller to a partner site to book. There is no booking API, so it cannot fill a marketplace shelf. Only interesting as a revenue experiment. |
| **Wakanow / BuildStudio** | No official public developer portal. What exists is a community Postman collection and an unmaintained third-party Node wrapper. Not a foundation for inventory. |

---

## 5. What happens when a key lands

Nothing has to be deployed differently, and this is by design:

- **No key, no calls.** `partnerProvidersConfigured()` is a synchronous
  environment read. With no keys the listing repository never wraps itself in
  the partner decorator and nothing in `lib/inventory/` executes at all.
- **A key alone turns it on.** Add `LITEAPI_KEY` and the hotel shelf gains
  priced partner stock on the next request.
- **Failure is never the visitor's problem.** Each provider runs behind a hard
  2.5s timeout and is collected with `allSettled`. A provider that is down, slow
  or misconfigured contributes zero listings and cannot delay or break a search.
- **Kill switches are in the database, not in a deploy.** `hybrid_hotels` and
  `hybrid_restaurants` in `public.feature_flags` turn a shelf off without
  touching the environment.
- **Duplicates are handled.** Two feeds describing one hotel collapse to one
  card, and a first-party listing always wins against a feed
  (`lib/inventory/dedupe.ts`).

## 6. Checking whether a key actually works

A key that parses is not a key that works, and this layer hides the difference
on purpose: a partner feed must never break a search, so a 401 produces exactly
the same empty shelf as a city with no supply. Two ways to tell them apart.

**Signed in as an admin, open `/api/admin/inventory`.** It runs a real search
through every provider and answers JSON: whether each has credentials, whether
its kill switch is on, what the call actually returned, how many listings came
back and how long it took. Add `?q=Abuja` to point it at a specific city.

A healthy LiteAPI looks like `"outcome": "ok"` with a non-zero `listings`.
The four failures and where each is fixed:

| `outcome` | Means | Fix it in |
|---|---|---|
| `no_key` | The environment variable is missing or empty | Vercel, then redeploy |
| `disabled` | The key is fine, the kill switch is off | `public.feature_flags` |
| `error` | Upstream refused or was unreachable. `reason` carries the status code and host | Usually the key itself |
| `timeout` | Upstream took longer than the budget | Upstream, or raise the budget |

**Or read the deployment log.** Any provider outcome that is not `ok` writes one
`[inventory]` line, throttled to once a minute per provider so a broken key
cannot bury the log. A key that is refused says so on the first search after
deploy.

