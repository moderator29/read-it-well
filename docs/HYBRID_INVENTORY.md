# RentMe Hybrid Inventory Model

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

- **Hotels: Amadeus Self-Service APIs** (`AMADEUS_CLIENT_ID/SECRET`,
  test then production). Hotel Search returns live rates and availability;
  Hotel Booking places the reservation. Revenue is commission per booking.
  Partner hotel cards show a neutral "Partner" tag, never the verified badge,
  and their CTA is Book (through our checkout against the Amadeus order),
  not Message, because there is no agent to message.
- **Restaurants: Google Places API (New)** (`GOOGLE_PLACES_API_KEY`).
  Text and Nearby Search fill the restaurants category with real venues,
  photos, ratings and hours. Places policy allows caching `place_id`
  indefinitely but place details only briefly, so the provider layer stores
  place_ids and refetches details on view. Attribution "powered by Google"
  must render where Places data shows. Partner restaurant cards deep link to
  directions and the venue; no verified badge, no messaging.

## 3. The provider layer (build next)

`apps/web/src/lib/inventory/` with one interface, three providers:

- `providers/rentme.ts`: the existing repository (Supabase once live).
- `providers/amadeus.ts`: OAuth2 client-credentials token cache, hotel
  search mapped into `Listing` with `source: "partner"`, env-guarded so the
  provider silently contributes nothing until keys land.
- `providers/places.ts`: restaurant search mapped the same way, place_id
  cache table, attribution flag on the mapped listing.
- `search()` merges: first-party ranks above partner at equal relevance
  (verification is worth reach). Partner results are clearly tagged in the
  UI. All provider calls are server-side only; keys never reach the browser.

Failure rule: a provider that errors or has no key contributes zero results
and never breaks search.

## 4. Badges and actions by source

| | verified badge | message agent | reserve/book | inspection flow |
|---|---|---|---|---|
| rentme rental | yes | yes (primary) | no | yes |
| rentme lodging | yes | yes | yes | yes |
| partner hotel | never | no | yes (Amadeus order) | no |
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
