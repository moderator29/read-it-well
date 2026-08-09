# RentMe Hybrid Inventory Model

> **ARCHIVED 2026-08-09. This does not govern any current decision.** Where it
> disagrees with the code, the database, `docs/PRODUCT.md`, `RECOMMENDATIONS.md`,
> `ROADMAP.md`, `KNOWN_GAPS.md` or `ARCHITECTURE_DECISIONS.md`, this file is
> wrong. See `docs/archive/README.md` for why it was retired and what survived it.


How RentMe blends first-party agent inventory with third-party hotel and
restaurant stock, the way the industry actually does it, without ever diluting
the trust badge. Owner-approved direction, 2026-07-29.

## 1. The two-market structure

RentMe runs two distinct markets plus discovery categories:

- **RENT** (`/rent`, kind `rental`): the serious market. Real homes at real
  annual rent. First-party only, always verified, priced per year, NO Reserve
  button. The path is message the agent inside the platform, inspect the
  property, then pay. The disclaimer is stated on the page and on every rental
  detail: chats and payments stay inside RentMe; anything agreed outside the
  platform is not protected by us.
- **LODGING** (hotels, apartments as shortlet lodging, homes, shortlets,
  villas): nightly stays with Reserve and Instant Book.
- **FOOD AND EXPERIENCES** (restaurants, experiences): per-head discovery.

## 2. Where inventory comes from

Every listing carries `source: "rentme" | "partner"` (types.ts).

**First party (`rentme`)**: agents apply, get approved, list properties
through the agent flow, admin approves each listing. These are the ONLY
listings that may carry the verified badge and the ONLY ones with in-platform
messaging, inspections and the trust pipeline. This is how the marketplace
core works on Airbnb and Jiji: supply is owned, quality is enforced at
admission.

**Third party (`partner`)**: aggregated stock that fills the catalogue while
first-party supply grows, the way Trip.com and Google Travel blend partner
feeds:

- **Hotels: LiteAPI / Nuitée Connect** (`LITEAPI_KEY`, sandbox then
  production). `GET /data/hotels` for static content near a covered city,
  `POST /hotels/rates` for live naira rates. Revenue is commission per booking.
  Partner hotel cards show a neutral "Partner" tag, never the verified badge,
  and never a Message action, because there is no agent to message.

  This section named **Amadeus Self-Service** until 2026-08-07 and that is no
  longer a thing anybody can sign up for: the portal was decommissioned on
  17 July 2026 and the keys were disabled with it. `providers/amadeus.ts`
  survives as dead code and is recorded as such in KNOWN_GAPS.md. LiteAPI was
  chosen on the same test the owner set for everything else, a working key
  without a sales call, and the full comparison is in docs/DATA_SOURCES.md.

  Note what partner hotels do NOT do yet: they carry a price and no Reserve
  button. LiteAPI has a real prebook/book pair, but the platform's checkout
  settles money against a first-party booking row, and selling a night we
  cannot confirm is the worst promise this platform could make. Section 7 has
  the shape of the missing half.

- **Hotels, coverage: Google Places** (same key as restaurants). Places answers
  with a price LEVEL rather than an amount, so its hotels carry no price. It
  exists on this shelf for reach: every covered state, including ones a rate
  feed has thin stock in. Where both feeds return the same hotel, the priced
  record wins (`lib/inventory/dedupe.ts`).
- **Restaurants: Google Places API (New)** (`GOOGLE_PLACES_API_KEY`).
  Text and Nearby Search fill the restaurants category with real venues,
  photos, ratings and hours. Places policy allows caching `place_id`
  indefinitely but place details only briefly, so the provider layer stores
  place_ids and refetches details on view. Attribution "powered by Google"
  must render where Places data shows. Partner restaurant cards deep link to
  directions and the venue; no verified badge, no messaging.

## 3. The provider layer

`apps/web/src/lib/inventory/`, one interface and one registry. Places is
registered twice, once per shelf, so the two kill switches move independently:

- `providers/rentme.ts`: the existing repository (Supabase once live).
- `providers/liteapi.ts`: static content cached for hours, live rates never
  cached, both hops sharing one time budget. Env-guarded so the provider
  silently contributes nothing until a key lands.
- `providers/places.ts`: restaurant AND hotel search mapped the same way,
  place_id cache table, attribution flag on the mapped listing.
- `providers/amadeus.ts`: REMOVED on 2026-08-07. It was dead, registered, permanently keyless, and kept only
  because deleting a complete module is the owner's call.
- `search()` merges: first-party ranks above partner at equal relevance
  (verification is worth reach). Partner results are clearly tagged in the
  UI. All provider calls are server-side only; keys never reach the browser.
- `dedupe.ts`: one entry per real place. Two feeds describing one hotel
  collapse to one card, and a first-party listing is never displaced by a
  feed. Section 8.

Failure rule: a provider that errors or has no key contributes zero results
and never breaks search.

## 4. Badges and actions by source

| | verified badge | message agent | reserve/book | inspection flow |
|---|---|---|---|---|
| rentme rental | yes | yes (primary) | no | yes |
| rentme lodging | yes | yes | yes | yes |
| partner hotel | never | no | not yet: priced, no Reserve (section 7) | no |
| partner restaurant | never | no | no (directions/menu) | no |

## 5. Listing quality at admission (first party)

When an agent submits a listing, acceptance is the quality gate so accepted
listings look professional in search:

- Minimum 4 photos, minimum 1600px wide, cover photo landscape.
- Server pipeline on accept: auto-enhance (exposure and white balance
  normalisation), crop preview to the 4:3 card frame, generate blurhash,
  strip EXIF location, order photos cover-first.
- Required fields before submit: title in title case, area and city from the
  location tables, price in naira (stored kobo), bedrooms, bathrooms,
  amenities, 40+ word description.
- Admin approval checklist rejects: watermarked images, phone numbers or
  account numbers in text or images (the trust scanner runs on listing text
  too), duplicate photos across listings.

## 6. Safety copy (canonical wording)

Shown on `/rent`, on every rental detail, and in first-message education:

"For your safety, keep every chat and payment inside RentMe. Deals made
outside the platform are not protected by us. Pay only after you have
inspected the property."

## 7. Booking a partner hotel: the half that is not built

Partner hotels currently carry a price and no Reserve button. That is a
deliberate stop, not an oversight, and this section says exactly what closing it
needs so the decision is costed rather than discovered.

The platform's money path assumes it owns the thing being sold. `reserve()`
writes a `bookings` row against a first-party listing, a Paystack charge settles
against that row, and `ledger_entries` decomposes the take. A partner hotel has
no listing row, so every one of those steps has nothing to point at.

**What exists now, and what it deliberately stops short of.** A partner hotel's
Book control no longer just opens a link. It revalidates the rate through
`POST /rates/prebook` at the moment of the tap, records the intent in
`public.partner_stay_intents` so the guest has a history, and only then hands
over. Rooms reprice continuously, so the price on a card is a photograph, and
this is what makes the number somebody leaves with a true one. A price that
moved past two per cent is said out loud; a revalidation that could not be
reached says nothing at all, because a warning about a move nobody measured is
worse than silence.

That is everything that can be built without a commercial decision. The rest
needs one, and it is this: `POST /rates/book` with `ACC_CREDIT_CARD` makes
RentMe the MERCHANT OF RECORD. We would pay LiteAPI from a funded wallet,
collect naira ourselves through Paystack, and owe the guest a refund out of our
own pocket every time a supplier failed after we had taken their card. It is a
funded account and an accepted liability before it is a line of code. Until
somebody makes that call, the guest pays on the whitelabel, where LiteAPI
carries both the supplier risk and the refund obligation.

Closing it means four things, in this order:

1. **A booking row that can represent stock we do not own**, carrying the
   provider, the upstream hotel id and the prebook transaction id, and a status
   that can express "guest paid, supplier not yet confirmed".
2. **Prebook before charge, never after.** LiteAPI's `POST /rates/prebook`
   revalidates the rate and returns a transaction id. Taking a card first and
   discovering the rate moved is how a guest ends up paid-up with no room.
3. **Confirm inside the webhook, on the same idempotency key** the existing
   `charge.success` path uses, so a replayed delivery cannot book twice.
4. **A refund path for the case that will happen**: money captured, supplier
   confirmation failed. It needs to be automatic and it needs to be fast,
   because the guest is standing at a desk.

Until all four exist, a partner hotel is a price and a link, and the honest
version of that is no Reserve button. The failure this avoids is not
hypothetical: it is the original plan's flow, where a Paystack webhook fired a
booking call at a third party and had no answer for what happens when that call
returns 500 after the money is taken.

## 8. De-duplication

Three sources now overlap on the same buildings, and in Lagos and Abuja the
overlap is most of the shelf rather than an edge case. `lib/inventory/dedupe.ts`
collapses them to one entry per real place.

A pair is the same place when **both** signals agree: within 150 metres by
haversine, and the names match on token containment once category nouns and
place names are stripped. Requiring both is the safety argument. Name alone
merges the Bogobiri House in Ikoyi with the one in Calabar; distance alone merges
a hotel with the shortlet block next door. Where a coordinate is missing
(`listings.latitude` is nullable and the wizard does not force a pin), the rule
tightens to identical name and identical city rather than falling back to the
unsafe half.

Which record survives is the trust rule as a number: first party always wins and
is never displaced by a feed; between two partner records, the one carrying a
real naira price wins, so a LiteAPI rate beats a priceless Places card for the
same hotel. Position belongs to the first record seen, so a feed can never
reorder the shelf by answering better.

The asymmetry that governs the thresholds: a missed duplicate shows a hotel
twice, which is untidy and self-evident. A wrong merge deletes a real agent's
listing from search while their dashboard still says published, and nobody finds
out. The rules are tuned to prefer the first failure.
