# The listing pipeline, audited end to end

> **Track A, 25 September 2026.** Vallo no longer holds customer money: the wallet, escrow and held payments are retired. Where this document describes them it describes the past; the current truth is [`docs/MONEY_ARCHITECTURE.md`](/docs/MONEY_ARCHITECTURE.md).

Read-only research. No product code was changed, no migration was written, no
database was touched. This file is the only thing this session wrote. One
read-only `git status --short` was run by accident against the brief's rule not
to touch git; it changed nothing and is recorded in the honesty log.

Every claim about this repository carries a `path:line`. Anything I could not
verify by reading code is marked **inferred** and repeated in the honesty log at
the end. I have no browser, so nothing here was seen running.

British spelling. No em dash characters anywhere.

The brief was six legs on the property side, the same six on the stays side,
and the architecture chain from first keystroke to a card in search. It is
answered in that order, after the two sections that are the point of the whole
exercise.

---

# 1. What is already built, and the founder has not seen it

The founder's belief is that the listing pipeline is the biggest unbuilt gap in
the platform. On the property side that belief is wrong, and not by a small
margin. Five of his six worries are built, most of them more thoroughly than he
asked for. This section proves each one. Section 2 is the other half of the
truth, and it is not short either.

## 1.1 "have we built the frontend to upload those informations"

Yes. `apps/web/src/app/agent/list/ListingWizard.tsx` is 2,264 lines of eight
step wizard, listed at `ListingWizard.tsx:89-98`, wired to a page with three
honest states at `apps/web/src/app/agent/list/page.tsx:47-90`.

The eight steps are basics, photos, location, amenities, utilities, pricing,
guest view, submit (`ListingWizard.tsx:89-98`). It autosaves to the platform on
every step change (`ListingWizard.tsx:670-751`, the `persist` callback, called
from `go` at `ListingWizard.tsx:756-780`) and to the device as well
(`ListingWizard.tsx:649-657`).

It is not a form. It carries ten property types with blurbs
(`apps/web/src/lib/agent/listings-schema.ts:157-208`), two listing intents,
three money shapes, a fee breakdown, a private access block, and a live preview
of the card a guest will see.

## 1.2 "the tick stuffs they select for informations of the house like they can click water click light etc"

Built, and deliberately built better than a tick box. Step five of the wizard
(`ListingWizard.tsx:1450-1633`) is a whole screen called light and water.

- **Grid supply**, five values: `BAND_A`, `MOSTLY_ON`, `PATCHY`, `RARELY`,
  `NONE` (`listings-schema.ts:358`), rendered as chips at
  `ListingWizard.tsx:1459-1485`.
- **Backup**, five values including `GENERATOR_INVERTER`
  (`listings-schema.ts:369-375`), chips at `ListingWizard.tsx:1486-1512`.
- **Backup hours a day**, 0 to 24, revealed only when a backup is chosen
  (`ListingWizard.tsx:1513-1530`). The hint says the quiet part out loud:
  "Generator on its own tells a guest nothing; the hours are the answer."
- **Water**, five values from `TREATED_MAINS` to `NONE`
  (`listings-schema.ts:386-392`), chips at `ListingWizard.tsx:1531-1557`.
- **Prepaid meter**, a real checkbox (`ListingWizard.tsx:1558-1573`).
- **The gate**, four private fields: estate name, what to tell the gate,
  security desk number, access code (`ListingWizard.tsx:1575-1631`), stored in
  `public.listing_access` and never in `public.listings`
  (`apps/web/src/lib/agent/listings-actions.ts:830-870`, and the header at
  `:812-829` explains why).

And the tick boxes he pictured also exist, on their own step: eighteen amenity
chips at `ListingWizard.tsx:1413-1448`, from `AMENITY_CHOICES`
(`listings-schema.ts:413-431`).

The reason for the enums is written in the schema itself at
`listings-schema.ts:346-356`: a tick box cannot tell a Band A feeder apart from
a generator somebody runs from seven to eleven. That is the right call and it
is already made.

## 1.3 "make the filling place really detailed"

It is already detailed to a degree most Nigerian portals are not. Counting only
what a lister is actually asked: 46 distinct inputs across the eight steps, plus
18 amenity toggles. The full table is section 3.

Things already asked that the founder did not think to ask for, each with its
control in `ListingWizard.tsx`: toilets counted separately from bathrooms
(`:1199-1207`), parking spaces (`:1208-1216`), the floor and the floors in the
building (`:1217-1240`), size in square metres (`:1241-1256`), caution deposit
and agency fee and legal fee and agreement fee (`:1854-1890`), service charge
with its own cycle (`:1893-1918`), the total to move in summed live from the
parts (`:1919-1950`), the shortest tenancy in months (`:1952-1964`), available
from (`:1965-1974`), furnishing (`:1976-1990`), rent negotiable and price
negotiable (`:1824-1829`, `:1691-1696`), the title on a sale across six tenure
types (`:1705-1734`), sale status (`:1735-1754`), and year built with build
condition (`:1755-1779`). Section 3.2 is the full table.

The move-in arithmetic runs live as the lister types
(`ListingWizard.tsx:471-487`) and prints the real number, which the founder's
own handoff calls the single cheapest win in the product
(`docs/archive/HANDOFF_09_THE_DIRECT_PLATFORM.md:321-340`).

## 1.4 "preview on images or video of the house they are uploading"

**Images: fully built.** Step two (`ListingWizard.tsx:1258-1354`) is a photo
grid with thumbnails, a cover badge on the first photo, a "make cover" control
and a "remove" control on every tile. Step seven
(`ListingWizard.tsx:2043-2153`) is a full preview of the card a guest will see:
cover photo, scrim, market badge, location line, title, bed and bath and toilet
and size, the resolved headline price with the right period word, and the first
four amenities. It resolves the price exactly the way the catalogue resolves it
(`ListingWizard.tsx:467-469`), so the preview cannot lie about the number.

**Video: not built in any UI.** See section 2.2. This is the one half of his
sentence that is genuinely missing.

## 1.5 "how we make it show on admin panel"

Built. `apps/web/src/app/admin/listings/page.tsx` is a full review desk.

Per listing a reviewer sees the status chip, the property type, a count of
failing checks, the submission time, the title, the place, the resolved headline
price with the right period suffix, the title deed on a sale, the itemised
move-in breakdown (`admin/listings/page.tsx:127-147`), **every photo as a horizontal strip**
(`admin/listings/page.tsx:149-176`), a ten-point admission checklist (`admin/listings/page.tsx:177-192`, built at
`apps/web/src/lib/admin/queries.ts:841-908`), the agent name, capacity, address,
amenity count, full description, and the last reviewer note and date
(`admin/listings/page.tsx:193-219`).

Then four buttons: approve, publish, request changes, reject
(`apps/web/src/app/admin/_components/AdminActions.tsx:441-541`), each opening a
sheet with a notes box, with the note made mandatory on request-changes both in
the sheet (`AdminActions.tsx:508-522`) and on the server
(`apps/web/src/lib/admin/actions.ts:405-409`). Over it sits a queue frame with
status chips built straight off the `listing_status` enum
(`admin/listings/page.tsx:243-248`), free-text search over title and city, and a
date range (`admin/listings/page.tsx:292-299`). Section 5 is the full reading.

## 1.6 "once we accept how we make automatically show as a listing"

Built, and deliberately **not** automatic. Approve and publish are two separate
acts (`apps/web/src/lib/admin/actions.ts:429-436`), and the file says why at
`apps/web/src/app/admin/listings/page.tsx:48-55`: approve says the submission
passes the checklist, publish is the separate act that puts it into public
search. `publish` refuses unless the listing is already `APPROVED`
(`lib/admin/actions.ts:422-424`).

Once published it really is in search with nothing in between. The public read
policy is `status = 'PUBLISHED'` (`supabase/migrations/20260728152229_listings_core.sql:159-161`),
the repository search pins that same predicate
(`apps/web/src/lib/listings/supabase-repository.ts:965-968`), and the search
page is dynamic because its Supabase client reads cookies
(`apps/web/src/lib/supabase/server.ts:20`), so there is no page cache to
invalidate. A published listing is findable on the next request. **Inferred**
on the caching point: I am reading Next.js semantics from the code, not from a
running build.

Publishing also fires a trigger that announces the listing once, ever, as a
system post in the matching area
(`supabase/migrations/20260804132528_announce_a_listing_once_ever.sql:7-54`),
and a second projection trigger keeps `catalogue_entries` in step
(`supabase/migrations/20260918130452_m09_catalogue_entries_and_stays_search.sql:311`).

## 1.7 "it all should be in a notification"

Partly built, and more than the previous research believed.

- **Listing approved, published, rejected, needs changes**: an in-app
  notification is inserted for the owner on every one of the four decisions
  (`apps/web/src/lib/admin/actions.ts:452-484`). The rejection and the
  change-request carry the reviewer's own words verbatim (`:467-476`).
- **Agent registration approved, rejected, needs more information**: same, at
  `apps/web/src/lib/admin/actions.ts:332-361`.
- **Host business approved, rejected, needs more**: same, at
  `apps/web/src/lib/admin/business-actions.ts:85-112` and `:158-172`.
- **Property published, venue published**: same, at
  `business-actions.ts:295-312` and `:461-476`.

`docs/research/EMAIL_AND_NOTIFICATIONS_RESEARCH.md:1775-1777` records "Listing
approved" and "Listing rejected" as having no in-app row. **That is now wrong.**
The rows are written. What is missing is the email, not the notification.

The reviewer's reason also reaches the lister on screen, not only in the
notification: `apps/web/src/app/agent/listings/ListingsWorkspace.tsx:387-391`
prints `review_notes` on the listing row, and the "Needs your attention" group
at `:74` collects `MORE_INFO_REQUIRED`, `REJECTED` and `SUSPENDED`.

## 1.8 The summary of section 1

| The founder's worry | Verdict |
| --- | --- |
| A frontend to upload listing information | Built, 2,264 lines, eight steps |
| Tick boxes for light and water | Built, and upgraded to five-value enums plus backup hours |
| A really detailed filling place | Built, 46 inputs plus 18 amenities, including the full move-in fee model |
| Preview of images | Built, thumbnails plus a full guest-card preview |
| Preview of video | **Not built.** Section 2.2 |
| Show on the admin panel | Built, with photos, a ten-point checklist and four decisions |
| Automatically show as a listing on accept | Built, as a deliberate two-step approve then publish |
| An id you can type to find your listing | **Not built at all.** Section 2.1 |
| Notification when we accept a registration | Built, in-app |
| Notification when we accept a listing | Built, in-app. Email missing |

Five and a half of eight. The two hard misses are the identifier and the video.

---

# 2. What is genuinely missing

Nothing here is a matter of taste. Each one is a dead end I can point at.

## 2.1 There is no human readable listing reference anywhere

I searched the schema and the product. There is no `reference`, `code`,
`public_id`, `slug` or any equivalent on `public.listings`. The table's full
definition is `supabase/migrations/20260728152229_listings_core.sql:30-62` and
the later additive migrations; none of them adds one.

The precedent exists and was simply never applied to listings:

- `public.agent_applications.reference` is `NF-AGT-#####`, defaulted from a
  sequence (`supabase/migrations/20260728152104_agents_core.sql:31-36`), and is
  shown to the applicant as the loudest thing on their status page
  (`apps/web/src/app/(app)/profile/application/page.tsx:141-145`).
- `public.support_tickets.reference` is unique and human-readable
  (`supabase/migrations/20260729112624_support_tickets.sql:14`, comment at
  `:26`), and the admin desk searches on it precisely because it is what a
  person reads out on the phone (`apps/web/src/lib/admin/queries.ts:1052-1061`).

So the platform knows how to do this. It has not done it for the one object the
founder asked about.

The only listing-shaped reference in the whole tree is
`shortRef("LST", listing.id)` at
`apps/web/src/app/admin/_components/QueueTable.tsx:229-231`, used at
`apps/web/src/app/admin/listings/page.tsx:371` and
`apps/web/src/app/admin/page.tsx:106`. It is not stored, it is not unique, it is
not shown to the lister or to a searcher, and it is six hex characters cut from
a UUID, which is 24 bits: a collision becomes likely at roughly five thousand
listings. It is an admin display convenience and nothing more.

Search cannot find a listing by any code either. Free text is pushed down as
`ilike` over title, city and area, plus exact matches on state code and property
type (`apps/web/src/lib/listings/supabase-repository.ts:431-459`), and the
in-memory matcher behind it is a substring test over
`title area city state kind` (`apps/web/src/lib/listings/filter.ts:20-22`).
Typing a code into `?q=` (`apps/web/src/lib/listings/search-params.ts:291-292`)
returns nothing.

The full design is section 7.

## 2.2 Video exists everywhere except where a person could use it

This is the strangest gap in the repository. Every layer is built but the two
that a human touches.

| Layer | Built? | Evidence |
| --- | --- | --- |
| Storage bucket `listing-videos`, private, 50MB, three mime types | Yes | `supabase/migrations/20260809051809_a_bucket_that_accepts_anything_of_any_size.sql:37-47` |
| Table `listing_videos` with a three-per-listing ceiling enforced under a lock | Yes | `supabase/migrations/20260809052905_a_listing_holds_three_walkthroughs_and_the_database_counts_them.sql` |
| Zod schemas `addVideoSchema`, `removeVideoSchema` | Yes | `apps/web/src/lib/agent/listings-schema.ts:691-726` |
| Server actions `addVideo`, `removeVideo`, with the object's real size and mime read back from storage | Yes | `apps/web/src/lib/agent/listings-actions.ts:633-762` |
| Repository joins videos into the detail read and signs them in one batch | Yes | `apps/web/src/lib/listings/supabase-repository.ts:275`, `:479-491`, `:677` |
| `Listing.videos` on the public model | Yes | `apps/web/src/lib/listings/types.ts:165` |
| CSP allows the media source | Yes | `apps/web/src/lib/security/csp.ts:338` |
| **A control anywhere that uploads a video** | **No** | `grep -rn "addVideo" --include=*.tsx apps/web/src` returns nothing |
| **A player anywhere that plays one** | **No** | `grep -rln "video" --include=*.tsx apps/web/src/components apps/web/src/app` matches only two marketing pages, `(site)/safety` and `(site)/help` |

So the strongest anti-fraud asset the platform designed, the walkthrough, is
unreachable. A lister cannot upload one and a renter cannot watch one. The
`listingApproved` email even advertises it: "Two things bring in more enquiries
than anything else: a walkthrough video, and stating the full move-in cost"
(`apps/web/src/lib/email/messages.ts:802-804`). The email promises a feature the
product does not expose.

## 2.3 No email fires on any listing or registration decision

`apps/web/src/lib/email/messages.ts` has `listingApproved` at `:789` and
`listingRejected` at `:836`. Both are complete, both are in the fixtures
(`apps/web/src/lib/email/fixtures.ts:142-143`), and neither has a caller.

The whole set of modules that import the email catalogue is five:

```
apps/web/src/lib/admin/bookings-actions.ts:41   bookingRefunded
apps/web/src/lib/wallet/actions.ts:49           walletFunded, withdrawalFailed
apps/web/src/lib/support/actions.ts:18          supportTicketFiled
apps/web/src/lib/bookings/actions.ts:34         (booking set)
apps/web/src/lib/bookings/arrival.ts:6          bookingConfirmed, stayArrivalDetails
```

`apps/web/src/lib/admin/actions.ts` and
`apps/web/src/lib/admin/business-actions.ts`, which are where every listing and
every registration decision is taken, import nothing from `lib/email`. So:

- A lister whose listing is approved gets an in-app row and no email.
- A lister whose listing is rejected gets an in-app row with the reason and no
  email.
- An agent whose registration is approved gets an in-app row and no email.
- A host whose business is approved gets an in-app row and no email.
- Nobody gets a welcome email on sign-up at all; `welcome` at
  `apps/web/src/lib/email/messages.ts:212` has no caller either.

Given that none of these people is likely to be sitting in the app at the moment
a reviewer clicks, the in-app row is a note left in an empty room.

## 2.4 The reviewer cannot see the utilities the lister filled in

This one hurts, because 1.2 is the platform's best idea.

The admin review read is `LISTING_COLUMNS` at
`apps/web/src/lib/admin/queries.ts:779-780`. It names title, status, property
type, intent, the money columns, city, area, state, address, description,
bedrooms, bathrooms, timestamps, agent name, photos and amenity ids. It does
**not** name `power_grid`, `power_backup`, `power_backup_hours`,
`water_supply`, `prepaid_meter`, `size_sqm`, `toilets`, `parking_spaces`,
`floor`, `total_floors`, `condition`, `year_built` or `furnished`, nor anything
from `listing_access`, nor `listing_videos`.

So a reviewer approving a listing cannot check a claim of "Band A, eighteen
hours of generator", and cannot see the plot size on a land listing, which per
`supabase/migrations/20260809044629_the_facts_a_nigerian_listing_states.sql:5-12`
is the entire specification of a plot. The ten-point checklist
(`apps/web/src/lib/admin/queries.ts:841-908`) checks photo count, cover, title
case, area and city, price, title deed, rooms, amenities, description length and
a contact-details scan. Not one utility answer.

## 2.5 The sale side has no cost model

The tenancy fee breakdown is excellent. The sale side has an asking price, a
tenure and a sale status and nothing else. No agency fee, no legal fee, no
Governor's consent fee, no stamp duty, no registration fee. The founder's own
handoff already states this: "The sale side has no cost model at all today"
(`docs/archive/HANDOFF_09_THE_DIRECT_PLATFORM.md:353-355`). Confirmed against the
schema: `draftInputSchema` at `apps/web/src/lib/agent/listings-schema.ts:627-646`
carries `salePriceNaira`, `priceNegotiable`, `tenure`, `saleStatus`, `yearBuilt`
and `condition` and no sale cost fields.

## 2.6 The honest move-in breakdown is built and not on the listing page

`apps/web/src/components/app/listing/ListingMoveIn.tsx:75` exports a full
breakdown component. The only importers anywhere are its own export line; the
page renders `ListingMoveInBlock` instead
(`apps/web/src/app/(app)/listing/[id]/page.tsx:39` and `:841`), which shows one
number. The reviewer's console shows the breakdown
(`apps/web/src/app/admin/listings/page.tsx:118-146`); the renter does not. That
is exactly backwards.

Search cannot sort on the honest number either. `SORTS` has four keys and every
one reads the headline price
(`apps/web/src/lib/listings/search-params.ts:44-51`).

## 2.7 Three amenity codes exist in the UI and not in the database

`AMENITY_CHOICES` lists `shower`, `breakfast` and `workspace`
(`apps/web/src/lib/agent/listings-schema.ts:428-430`). The seeded
`public.amenities` rows stop at `water`
(`supabase/migrations/20260728152229_listings_core.sql:81-96`) and no later
migration adds those three. `setAmenities` resolves codes to ids by a lookup
(`apps/web/src/lib/agent/listings-actions.ts:789-792`) and silently keeps only
what it finds, so those three vanish without an error. In the configured path
the wizard renders amenities read from the database, so they never appear; in
the unconfigured path the page hands the wizard `AMENITY_CHOICES` directly
(`apps/web/src/app/agent/list/page.tsx:76`) and all eighteen show.

## 2.8 `addPhoto` does not do the third check the schema promises

`listings-schema.ts:82-101` states the rule: every media limit is enforced in
three places, the browser, the bucket, and the server action that reads the
object's real size and type back from storage. `addVideo` does exactly that
(`apps/web/src/lib/agent/listings-actions.ts:667-690`). `addPhoto` does not: it
validates the path shape and the ownership prefix and then inserts the row
(`listings-actions.ts:357-412`). It never lists the object. So the 1600px
minimum width is browser-only and can be bypassed by posting at the endpoint,
and the schema's own comment overstates what is enforced.

Related: `MAX_UPLOAD_BYTES` is 50MB for both photos and video
(`listings-schema.ts:106`), but the `listing-photos` bucket is capped at 10MB
(`supabase/migrations/20260809051809_a_bucket_that_accepts_anything_of_any_size.sql:52-56`).
The two numbers disagree. In practice the bucket wins and a 20MB photo would be
refused by storage after the browser said it was fine.

## 2.9 The admin listing queue has no pager

`getListingSubmissions` returns at most 30 waiting and 10 decided
(`apps/web/src/lib/admin/queries.ts:1003-1014`) and the page renders both lists
whole with no pager (`apps/web/src/app/admin/listings/page.tsx:246-259` has
filters and no `QueuePager`, unlike `/admin/businesses` which does use one at
`apps/web/src/app/admin/businesses/page.tsx:14`). At thirty-one submitted
listings, one becomes invisible to the reviewer.

## 2.10 The stays side has three dead ends, and one of them closes the door

Full detail in section 9. In short:

1. **No accommodation photo upload exists.** `accommodation_photos` has a table,
   a bucket, RLS and a catalogue trigger
   (`supabase/migrations/20260918081149_m03_accommodations_photos_amenities_bucket.sql:157`,
   `:314-343`), and no application code writes to it. The host wizard says so in
   its own words: "Photo upload for properties arrives with the next host
   release" (`apps/web/src/components/host/HostWizard.tsx:690`). But
   `missingFrom` blocks submission without one
   (`apps/web/src/lib/host/onboarding.ts:470`). **A hotel or shortlet host
   therefore cannot submit their application at all.**
2. **Nothing ever publishes a room type.** Room types are inserted `DRAFT`
   (`apps/web/src/lib/host/actions.ts:471`) and no code path updates that
   status. The catalogue projection reads prices, sleeps and categories from
   `room_types` where `status = 'PUBLISHED'`
   (`supabase/migrations/20260918130452_m09_catalogue_entries_and_stays_search.sql:222-236`).
   A published hotel would show on the shelf with a null price.
3. **Nothing ever writes `room_inventory`.** The table exists
   (`supabase/migrations/20260918081748_m05_room_inventory_and_reserve_room_nights.sql:44`)
   and no application file references it except two comments. `stays_search`
   treats a missing inventory row as "not offered", so a dated search for a
   hotel returns nothing.

Restaurants are the one stays branch that works end to end, because their photos
go to `business_photos` through a real surface at `/host/photos`
(`apps/web/src/app/host/photos/page.tsx`, action at
`apps/web/src/lib/host/actions.ts:661`).

---

# 3. LEG 1. The creation form

## 3.1 The eight steps

`apps/web/src/app/agent/list/ListingWizard.tsx:89-98`.

| # | Key | Heading source | What it asks |
| --- | --- | --- | --- |
| 1 | `basics` | dictionary `agentListings.wizard.steps.basics` | Title, property type, description, bedrooms, bathrooms, toilets, parking, floor, total floors, size |
| 2 | `photos` | `.photos` | Up to ten photos, cover, reorder, remove |
| 3 | `location` | `.location` | State, city, area, address, landmark |
| 4 | `amenities` | `.amenities` | Eighteen chips |
| 5 | `utilities` | `.utilities` | Grid, backup, backup hours, water, prepaid meter, the four gate fields |
| 6 | `pricing` | `.pricing` | Intent, then one of three money shapes, then availability |
| 7 | `guestView` | `.guestView` | Read-only preview of the guest card |
| 8 | `submit` | `.submit` | The checklist and the button |

Navigation: forward and back at `ListingWizard.tsx:2236-2262`, jump back to any
completed step through a transparent 44pt overlay on the 6px progress bar
(`ListingWizard.tsx:1046-1064`). Step one is the only step that blocks forward movement, and only
on the title (`ListingWizard.tsx:763-772`), and it still saves the draft before refusing.

## 3.2 Every field, as a designer's table

Types: `apps/web/src/app/agent/list/ListingWizard.tsx:123-177` (`Values`),
validated by `draftInputSchema` at
`apps/web/src/lib/agent/listings-schema.ts:564-657`.

### Step 1, basics

| Field | Control | Bounds | Required to save draft | Required to submit |
| --- | --- | --- | --- | --- |
| `title` | text, maxLength 80 | 2 to 80 on draft, 8 to 80 on submit (`schema:70-77`) | Yes, 2 chars | Yes, 8 chars |
| `propertyType` | ten cards, `TYPE_ORDER` at `:110-121` | enum of ten (`schema:159-170`) | No | Yes |
| `description` | textarea | max 4000 chars, min 40 words on submit (`schema:73`) | No | Yes, 40 words |
| `bedrooms` | plus/minus counter | 0 to 20 | No | Yes, >= 0 |
| `bathrooms` | plus/minus counter | 0 to 20 | No | Yes, >= 1 unless land (`schema:940-945`) |
| `toilets` | numeric, 2 digits | 0 to 20 | No | No |
| `parkingSpaces` | numeric, 2 digits | 0 to 50 | No | No |
| `floor` | numeric, 3 digits | -5 to 200 | No | No |
| `totalFloors` | numeric, 3 digits | 1 to 200 | No | No |
| `sizeSqm` | decimal | > 0, <= 10,000,000, two dp (`schema:525-541`) | No | No |

Database check constraints back all of these:
`supabase/migrations/20260809044629_the_facts_a_nigerian_listing_states.sql:57-72`,
including `listings_floor_within_building`, which refuses a ninth floor in a
four storey building.

### Step 2, photos

Covered in full in section 4.

### Step 3, location

| Field | Control | Bounds | Submit gate |
| --- | --- | --- | --- |
| `stateCode` | select of 37 read from `public.states` | must be one of the 37 codes (`schema:141-147`) | Yes |
| `city` | text | max 80 | Yes, >= 2 chars |
| `area` | text | max 80 | Yes, >= 2 chars |
| `address` | text | max 200 | No |
| `landmark` | text | max 120 | No |

`address` and `landmark` are revoked from the anonymous role at the column level
(`supabase/migrations/20260809100105_a_published_listing_is_public_its_moderation_file_is_not.sql:25-29`),
so they are collected and never published to a stranger.

Note: there is **no map pin** on the property side. `listings.latitude` and
`longitude` are columns (`listings_core.sql:42-43`) and the wizard never asks
for them. The stays host wizard does ask
(`apps/web/src/components/host/HostWizard.tsx:676-687`). An asymmetry worth
closing, because `listings_in_bounds` and the map view on `/search` both exist.

### Step 4, amenities

Eighteen chips from `AMENITY_CHOICES` (`schema:413-431`), of which fifteen exist
in the database (section 2.7). At least one is a submit gate
(`schema:877-879`).

### Step 5, utilities and access

| Field | Control | Values | Notes |
| --- | --- | --- | --- |
| `powerGrid` | chips, deselectable | 5 (`schema:358`) | Blurb line updates live (`ListingWizard.tsx:1479-1484`) |
| `powerBackup` | chips, deselectable | 5 (`schema:369-375`) | Choosing `NONE` clears the hours (`ListingWizard.tsx:1499-1502`) |
| `powerBackupHours` | numeric | 0 to 24 | Only shown when a backup is chosen |
| `waterSupply` | chips, deselectable | 5 (`schema:386-392`) | |
| `prepaidMeter` | checkbox | boolean | |
| `estateName` | text | max 120 | Goes to `listing_access` |
| `gateDirections` | textarea | max 600 | Goes to `listing_access` |
| `securityPhone` | tel | max 32 | Goes to `listing_access` |
| `accessCode` | text | max 40 | Goes to `listing_access` |

None of the nine is a submit gate. Unanswered renders as unanswered, never as
good news (`schema:641-643`).

### Step 6, pricing, three shapes

The shape is decided by `intent` and then by property type, never by a third
question (`ListingWizard.tsx:459-462`).

**Shape A, a sale** (`intent = "sale"`):

| Field | Bounds | Submit gate |
| --- | --- | --- |
| `salePriceNaira` | naira text to kobo, <= ₦100,000,000 (`schema:79-80`) | Yes, > 0 |
| `priceNegotiable` | boolean | No |
| `tenure` | 6 values (`schema:308-330`) | **Yes.** `schema:914-921` |
| `saleStatus` | available, under offer, sold | No |
| `yearBuilt` | 1800 to this year + 5 | No |
| `condition` | 4 values | No |

**Shape B, a tenancy** (`rental`, `shop`, `office`, `land`, per the `TENANCY`
set at `schema:216-221`):

| Field | Bounds | Submit gate |
| --- | --- | --- |
| `rentNaira` | naira to kobo | Yes, > 0 |
| `rentPeriod` | year, quarter, month | Yes |
| `rentNegotiable` | boolean | No |
| `cautionDepositNaira` | naira | No |
| `agencyFeeNaira` | naira | No |
| `legalFeeNaira` | naira | No |
| `agreementFeeNaira` | naira | No |
| `serviceChargeNaira` | naira | No |
| `serviceChargePeriod` | year, quarter, month | No |
| `totalMoveInNaira` | naira | No, and blank means "sum the parts" |
| `minimumTenancyMonths` | 1 to 120 | No |
| `availableFrom` | ISO date | No |
| `furnished` | unfurnished, semi, fully | No |

**Shape C, a short stay** (everything else, including `restaurant`):

| Field | Bounds | Submit gate |
| --- | --- | --- |
| `rateNaira` | naira to kobo | Yes, > 0 |
| `ratePeriod` | derived, `night` or `guest`, never asked (`schema:249-251`) | Yes |
| `availableFrom` | ISO date | No |

Money crosses the boundary exactly once: `parseNairaToKobo` at `schema:479-489`
is the only float in the path and it rounds in the same expression.

### Step 7, guest view

Read only. Cover, scrim, market badge, location, title, the bed/bath/toilet/size
line, the price with the right suffix, four amenities, the description
(`ListingWizard.tsx:2043-2153`).

### Step 8, submit

Nine checklist rows with a tick or a warning and the gate's own sentence
(`ListingWizard.tsx:2162-2214`), then a button disabled while anything is unmet
(`ListingWizard.tsx:2212-2223`).

## 3.3 The publish gate, exactly

`submitRequirements` at `apps/web/src/lib/agent/listings-schema.ts:820-948`. It
is the single authority: the wizard calls it in the browser to draw the
checklist (`ListingWizard.tsx:500-536`) and `submitListing` calls it on the
server against the stored row (`listings-actions.ts:903-928`). The checklist and
the server therefore cannot disagree, which is unusually disciplined.

The twelve requirements:

1. Title 8 to 80 characters after collapsing spaces.
2. Description of at least 40 words.
3. A property type.
4. At least 4 photos.
5. A photo at position 0, the cover.
6. A state code in the 37.
7. A city of at least 2 characters.
8. An area of at least 2 characters.
9. At least one amenity.
10. The money branch for this listing, complete: sale price plus tenure; or rent
    plus rent period; or rate plus rate period.
11. Bedrooms >= 0.
12. Bathrooms >= 1, waived for land.

One client-side wrinkle: the wizard passes `hasCover: photos.length > 0`
(`ListingWizard.tsx:520`) rather than checking an actual position 0, while the
server checks `photos.some(p => p.position === 0)`
(`listings-actions.ts:927`). In practice `addPhoto` always fills the lowest free
slot (`listings-actions.ts:390-401`) so position 0 exists whenever a photo does,
but the two are not literally the same test.

## 3.4 What a serious Nigerian listing should ask and this does not

Measured against the market and against Track H
(`docs/archive/HANDOFF_09_THE_DIRECT_PLATFORM.md:321-372`).

| Gap | Why it matters | Verdict |
| --- | --- | --- |
| **What the service charge actually covers, and who pays it** | The amount is collected (`ListingWizard.tsx:1897-1906`) and nothing says whether it buys diesel, security, waste, estate dues or nothing. "₦600,000 service charge" is not a fact a tenant can compare. | Missing. Needs a multi-select of what it covers, and a payer field |
| **Whether the service charge is refundable or reconciled** | Standard question on Lagos serviced blocks | Missing |
| **Who occupies it now, and when they leave** | `availableFrom` is collected; "currently tenanted until March" is a different and more useful fact. A vacant flat and a flat with a sitting tenant are different products | Missing |
| **Waste disposal** | PSP truck, estate arrangement, or the tenant's problem. Asked on every Lagos viewing | Missing entirely, not even an amenity code |
| **Security arrangement, in detail** | There is a `security` amenity tick (`schema:420`) and a private gate block (`schema:764-784`). What is missing is the public fact: gated estate, gateman, none | Partly missing. The estate name is collected but is private, so the public page cannot say "in a gated estate" beyond the `has_estate_access` flag |
| **Parking type** | `parkingSpaces` is a count (`ListingWizard.tsx:1208-1216`). Covered, open, street, none is a different question | Partly missing |
| **Tenancy length beyond the minimum** | `minimumTenancyMonths` exists (`:1952-1964`). Whether two years is demanded up front, which is the live Lagos issue, is not asked | Missing |
| **Sale-side costs: agency, legal, Governor's consent, stamp duty, registration** | Track H says build it (`HANDOFF_09:353-355`). Confirmed absent from `draftInputSchema` | Missing |
| **A map pin** | Columns exist, the wizard never asks, the stays wizard does | Missing |
| **Rent payment terms: one year up front, two, or monthly** | The period is collected. How many periods are demanded at once is the thing tenants negotiate on | Missing |
| **Title documents as uploads on a sale** | `tenure` is a claim with nothing behind it. The `listings_core` header says documents are deferred (`listings_core.sql:5-7`) | Missing, and deliberately deferred |

Two things on the founder's own list are **not** gaps, and I want to be exact
about that: agency and legal fees per Track H **are** collected
(`ListingWizard.tsx:1854-1890`), and "the gate and estate situation" **is**
collected, privately, with a correct reason
(`listings-schema.ts:756-784`).

---

# 4. LEG 2. Media

## 4.1 How a photo actually gets from a phone to a listing

The whole path is `onFiles` at
`apps/web/src/app/agent/list/ListingWizard.tsx:852-919`, in order:

1. **Guard.** If there are no platform keys or no signed-in user, refuse with a
   sentence (`ListingWizard.tsx:857-860`).
2. **Ensure a listing row exists.** `listingId ?? await persist()`
   (`ListingWizard.tsx:864-868`). A photo can therefore never be orphaned: the row is created
   first.
3. **Per file, refuse over ten.** `MAX_PHOTOS` is 10
   (`listings-schema.ts:69`), enforced again server side at
   `listings-actions.ts:386-388` and again by the unique `(listing_id, position)`
   constraint with `position < 10` (`listings_core.sql:102-110`).
4. **Refuse non-images** (`ListingWizard.tsx:877-880`).
5. **Measure the width.** `widthOf` uses `createImageBitmap` and falls back to
   an `Image` element (`ListingWizard.tsx:790-813`). Under 1600px is refused
   (`ListingWizard.tsx:882-885`, constant at `listings-schema.ts:71`).
6. **Re-encode.** `stripMetadata` (`ListingWizard.tsx:825-850`) draws the bitmap onto a canvas
   and exports JPEG at quality 0.9, long edge capped at 2560px. If the
   re-encode fails the file is refused rather than uploaded.
7. **Upload direct from the browser** to `listing-photos` at
   `<auth uid>/<listing id>/<uuid>.jpg` (`ListingWizard.tsx:895-900`).
8. **Attach.** `addPhoto` inserts the row with the next free position
   (`listings-actions.ts:357-412`).
9. **Render.** The public URL is resolved and pushed into local state
   (`ListingWizard.tsx:903-905`).

## 4.2 Limits, stated once per layer

| Limit | Browser | Bucket | Server action |
| --- | --- | --- | --- |
| Photo size | `MAX_UPLOAD_BYTES` 50MB (`schema:106`), but never actually tested for photos in `onFiles` | **10MB** (`20260809051809...sql:52-56`) | Not checked |
| Photo mime | `file.type.startsWith("image/")` (`ListingWizard.tsx:877-880`) | five image types (`:53-54`) | Not checked |
| Photo width | 1600px (`ListingWizard.tsx:882-885`) | n/a | **Not checked** |
| Photo count | 10 (`ListingWizard.tsx:873-876`) | n/a | 10 (`listings-actions.ts:386`) plus a DB constraint |
| Video size | `rejectUpload` at `schema:130-142`, which no UI calls | 50MB (`:37-47`) | Yes, read back from storage (`listings-actions.ts:681-686`) |
| Video mime | `VIDEO_MIME_TYPES` (`schema:119`), no UI caller | three types (`:46`) | Yes (`listings-actions.ts:687-689`) |
| Video count | n/a | n/a | 3 (`listings-actions.ts:697-702`) plus a check-constraint race handler at `:723-728` |
| Video length | `MAX_VIDEO_SECONDS` 1800 (`schema:125`) | n/a | schema-validated on the attach call |

Three honest findings out of that table:

- The photo browser check and the photo bucket limit disagree, 50MB against
  10MB (section 2.8).
- `addPhoto` performs none of the three server-side reads that `addVideo`
  performs, so the minimum width is browser-only.
- `rejectUpload` (`schema:130-142`) has no caller anywhere. The photo path uses
  its own inline checks and the video path has no UI.

## 4.3 What the lister can do in the photo step

| Capability | Built? | Evidence |
| --- | --- | --- |
| Multi-select from the camera roll | Yes | `<input type="file" accept="image/*" multiple>` at `ListingWizard.tsx:1263-1272` |
| Thumbnail grid, two columns | Yes | `:1305-1353`, `RemoteImage` at `:1311-1321` through the Next optimiser |
| Cover badge on the first tile | Yes | `:1322-1327` |
| Set a different photo as cover | Yes | `makeCover` at `:945-949`, which reorders rather than flagging |
| Reorder arbitrarily | **Partly.** There is a full `reorderPhotos` action and an `orderPhotos` helper (`:921-943`, action at `listings-actions.ts:570-631`), but the only UI that calls it is "make cover" | Drag to reorder is not built |
| Remove a photo | Yes | `dropPhoto` at `:951-963`, action at `listings-actions.ts:518-568` |
| Progress and count | Yes | `:1295-1299` |
| Per-file error message | Yes | `photoNotice` at `:1283-1296`, and the loop continues rather than aborting |
| See the card before submitting | Yes | Step seven, `:2043-2153` |

The reorder machinery on the server is genuinely good: positions are unique and
bounded 0 to 9, so there is no spare band, and the action moves rows one at a
time into genuinely free slots, parking exactly one row out of the table only at
the full ten (`listings-actions.ts:414-516`). That is careful work with no UI to
exercise it beyond one button.

## 4.4 Compression, resizing and the Nigerian mobile question

Photos **are** compressed and resized before they leave the device: JPEG at
quality 0.9 with the long edge capped at 2560px
(`ListingWizard.tsx:825-850`). The stated reason is EXIF stripping, since a
camera photo carries GPS and the bucket is public, and the data saving is
described as a secondary benefit. Both are true and both are correct.

A rough number, **inferred** since I cannot run it: a 12MP phone photo at
4032x3024 is commonly 3 to 5MB. Re-encoded to 2560x1920 at q0.9 it usually
lands between 600KB and 1.2MB. Four photos is therefore roughly 3 to 5MB of
upload, which on a typical Nigerian 3G uplink of about 0.5 to 1.5 Mbps is
somewhere between 20 seconds and a minute and a half. Acceptable.

Video is a different story and the fact that it has no UI hides the problem
rather than solving it. **50MB on a 1 Mbps uplink is roughly seven minutes of
uninterrupted upload.** The browser's `supabase.storage.upload` is a single
request with no chunking, no resumable protocol and no retry anywhere in this
codebase. On a Nigerian mobile connection that handover between masts or a
minute in a lift ends the upload and there is nothing to resume. So when the
video UI is built it must not be a plain `upload` call:

- Use Supabase's resumable TUS endpoint, or chunk manually, so a dropped
  connection resumes rather than restarts.
- Show real progress, because seven minutes with no feedback reads as a hang.
- Transcode or at minimum cap resolution client side. A one-minute 1080p phone
  clip at 8 to 12 Mbps is 60 to 90MB and will simply be refused by the bucket,
  so the honest limit today is closer to 40 seconds of 1080p.
- Consider 720p as the target. It is enough to prove a flat exists and roughly
  halves the bytes.

None of that is written, because none of the video path has a caller.

## 4.5 Is video reachable in the UI

No. Not to upload, and not to watch. Section 2.2 has the table. The one thing I
want on the record here is that the read side is finished: the detail select
joins `listing_videos` (`apps/web/src/lib/listings/supabase-repository.ts:275`),
`signVideos` batches the signing into one call for a whole page
(`:479-491`), the sorted result is mapped onto `Listing.videos`
(`:677`), and `ListingGallery.tsx` is the component that would host a player.
The last mile is a control and a `<video>` element.

---

# 5. LEG 3. Submission to admin

## 5.1 What happens on submit

`send` in the wizard (`ListingWizard.tsx:965-990`) persists once more, calls
`submitListing`, and on success clears the device draft and shows
`ResultScreen` with two ways onward (`:995-1021`).

`submitListing` (`apps/web/src/lib/agent/listings-actions.ts:884-951`):

1. `requireAgent`: session, the `agent_listings` feature flag, and the caller's
   row in `public.agents` (`:111-131`). The flag is a real kill switch with its
   own sentence (`:70-71`).
2. Validate the listing id.
3. `ownedListing`: the row must belong to this agent (`:132-146`).
4. Refuse if already `SUBMITTED` or `UNDER_REVIEW` (`:900-902`); refuse if past
   review (`ListingWizard.tsx:903-905`).
5. Read photos and amenities from the database, not from the client
   (`:907-910`).
6. Run `submitRequirements` against the **stored** row (`:912-928`). Unmet
   requirements return as `fieldErrors` in the same sentences the checklist
   used.
7. Update to `SUBMITTED` with `submitted_at`, scoped by both id and agent id
   (`:934-940`).
8. `refreshAgentSurfaces()` (`:148-157`).

**No notification and no email fire on submit.** The lister gets a confirmation
screen and nothing else. An operator is not told a listing is waiting either;
there is no admin notification, only the queue count on the console.

## 5.2 What the admin `listings` desk shows

Read at `apps/web/src/lib/admin/queries.ts:972-1027`, rendered at
`apps/web/src/app/admin/listings/page.tsx`.

Two buckets. **Waiting** is `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`,
`MORE_INFO_REQUIRED`, ordered by `submitted_at` desc, capped at 30
(`queries.ts:984-1008`). **Recently decided** is `PUBLISHED`, `REJECTED`,
`SUSPENDED`, ordered by `reviewed_at` desc, capped at 10 (`:990`, `:1009-1013`).
The header count deliberately excludes `MORE_INFO_REQUIRED` because that work
sits with the agent, not the console
(`apps/web/src/app/admin/listings/page.tsx:281-283`).

The read uses the service-role admin client (`queries.ts:975`), so RLS is not
the gate here; `requireAdmin` is
(`apps/web/src/lib/admin/guard.ts`, used across the console).

Per listing the reviewer sees everything in section 1.5. What they cannot see is
in section 2.4: no utilities, no size, no toilets, no access block, no video,
no map.

One cosmetic bug: `CHECK_KEYS` at
`apps/web/src/app/admin/listings/page.tsx:36-46` maps nine English check labels
to dictionary keys, and `qualityChecks` produces **ten** checks including
"Title deed stated" (`queries.ts:878-884`). The unmapped one falls through to
English, which the page's own comment anticipates (`:26-35`). Harmless, and
worth the one line to fix.

## 5.3 Can the reviewer see the photos and the video

**Photos, yes.** `toListingView` sorts by position and resolves each to the
bucket's public URL (`queries.ts:919-921`, `photoUrl` at `:910-913`), and the
page draws them as a scrolling strip of 128x96 optimised thumbnails
(`admin/listings/page.tsx:148-175`).

**Video, no.** `LISTING_COLUMNS` does not join `listing_videos`
(`queries.ts:779-780`). Since no video can be uploaded there is nothing to see,
but the read would need extending too.

## 5.4 The four decisions and what each does

`reviewListing` at `apps/web/src/lib/admin/actions.ts:392-507`.

| Decision | Precondition | New status | Extra write | Notification title |
| --- | --- | --- | --- | --- |
| `approve` | not `DRAFT`, not `PUBLISHED` | `APPROVED` | none | "Listing approved" (`:457-460`) |
| `publish` | status **must** be `APPROVED` (`:422-424`) | `PUBLISHED` | `published_at` (`:446`) | "Listing is live" (`:462-465`) |
| `reject` | not `DRAFT`, not `PUBLISHED` | `REJECTED` | none | "Listing not approved", body is the reviewer's note (`:467-471`) |
| `request_changes` | not `DRAFT`, not `PUBLISHED`; **note required** (`:405-409`) | `MORE_INFO_REQUIRED` | none | "Listing needs changes", body is the note (`:472-476`) |

Every decision also writes `reviewer_id`, `reviewed_at` and `review_notes`
(`:441-444`) and an audit row with before and after status
(`:486-500`). The notification insert and the audit write are both inside one
try/catch that swallows failures on purpose, because the transition has already
committed (`:501-503`).

## 5.5 Does the reviewer's reason reach the lister

Yes, by three routes, none of which is email.

1. `listings.review_notes` is set on the row (`actions.ts:443`).
2. The in-app notification body **is** the note verbatim for reject and for
   request-changes (`actions.ts:469`, `:474`).
3. The agent workspace prints the note on the listing row
   (`apps/web/src/app/agent/listings/ListingsWorkspace.tsx:387-391`), and those
   two statuses are grouped under "Needs your attention" (`:74`).

And the listing becomes editable again: `EDITABLE` is
`["DRAFT", "MORE_INFO_REQUIRED", "REJECTED"]`
(`apps/web/src/lib/agent/listings-actions.ts:96`), so the lister can reopen the
wizard at `/agent/list?id=...` (`ListingsWorkspace.tsx:395-403`) and resubmit.
The deep link is respected by the page (`apps/web/src/app/agent/list/page.tsx:88-90`).

One deliberate refusal worth knowing: `readOpenDraft` resumes **`DRAFT` only**,
never `MORE_INFO_REQUIRED` or `REJECTED`, and the reason is written at
`apps/web/src/lib/agent/listings-queries.ts:530-535`: dropping somebody straight
into a rejected listing without the reviewer's sentence in front of them answers
a question they did not ask.

## 5.6 `/admin/moderation` is not what the founder thinks it is

The founder's brief names `admin/moderation` as part of the listing desk. It is
not. `apps/web/src/app/admin/moderation/page.tsx:36-64` reads
`getModerationQueue`, which queries `posts`, `stories`, `story_comments` and
`social_profiles` (`apps/web/src/lib/admin/moderation-queries.ts:145-157`). It
is the social safety hold queue. No listing ever appears on it.

`/admin/reference` is also unrelated to listings: it edits reference data
(`apps/web/src/app/admin/reference/ReferenceEditors.tsx`,
`apps/web/src/lib/admin/reference-actions.ts`).

The listing desk is `/admin/listings` and the console front page
(`apps/web/src/app/admin/page.tsx:106`), and that is all of it.

---

# 6. LEG 4. Publication

## 6.1 What turns APPROVED into PUBLISHED

A human, pressing a second button. `ListingDecision` swaps the primary button to
"Publish" once the status is `APPROVED`
(`apps/web/src/app/admin/_components/AdminActions.tsx:461-469`), and
`reviewListing` refuses to publish anything that is not `APPROVED`
(`apps/web/src/lib/admin/actions.ts:422-424`).

There is no trigger, no cron and no scheduler that promotes `APPROVED` to
`PUBLISHED`. I checked: the only status writes to `public.listings` in
application code are `saveDraft` (implicit `DRAFT` default),
`submitListing` to `SUBMITTED` (`listings-actions.ts:936`),
`unpublishListing` back to `DRAFT` (`listings-actions.ts:978`), and
`reviewListing` (`admin/actions.ts:441`).

So the answer to "once we accept how we make automatically show as a listing" is
that accepting does **not** publish, by design, and the founder should decide
whether he wants that. Two defensible options:

- **Keep two steps** and rename them so the console says what they mean:
  "Passes review" and "Put it live". The safety argument in
  `apps/web/src/app/admin/listings/page.tsx:48-55` is genuine.
- **Collapse to one step** and keep `APPROVED` only as a recorded intermediate
  state for a listing the reviewer wants to hold. That is a one-line change to
  `reviewListing`'s `nextStatus` map (`admin/actions.ts:429-436`) and a copy
  change.

## 6.2 What the lister sees at each stage

`STATUS_LABEL` and `STATUS_TONE` at
`apps/web/src/lib/agent/listings-schema.ts:964-998`.

| Status | Label shown | Tone | Editable | In search |
| --- | --- | --- | --- | --- |
| `DRAFT` | Draft | neutral | Yes | No |
| `SUBMITTED` | Submitted | pending | No | No |
| `UNDER_REVIEW` | Under review | pending | No | No |
| `MORE_INFO_REQUIRED` | More information needed | pending | Yes | No |
| `APPROVED` | Approved | approved | No | **No** |
| `PUBLISHED` | Live | approved | No | Yes |
| `REJECTED` | Not accepted | rejected | Yes | No |
| `SUSPENDED` | Suspended | rejected | No | No |

The `APPROVED` row will confuse a lister: they are told "Approved" and the
property is not in search, with nothing on screen saying a second step is
pending on the platform's side. Worse, the notification body tells them to do it
themselves, "Publish it to put it in front of guests"
(`apps/web/src/lib/admin/actions.ts:459`), which is an action only an admin can
take. That sentence is wrong and should be fixed even if the two-step flow stays.

`UNDER_REVIEW` is in the enum and in the queue buckets and **nothing ever sets
it**. There is no "claim this listing" control, so a reviewer cannot signal they
have picked one up and two operators can work the same row.

## 6.3 From PUBLISHED to a card in search

Five things happen, all of them already built.

1. **RLS opens the row.** `listings_select_published` is
   `using (status = 'PUBLISHED')`
   (`supabase/migrations/20260728152229_listings_core.sql:159-161`). The same
   predicate cascades to photos, amenities and availability (`:180-220`).
   Column-level grants keep `address`, `landmark`, `review_notes`,
   `reviewer_id`, `verified_by` and the three listing-fee columns away from
   anon
   (`supabase/migrations/20260809100105_a_published_listing_is_public_its_moderation_file_is_not.sql:19-33`).
2. **The catalogue projection updates.** An AFTER trigger calls
   `private.catalogue_refresh_listing`
   (`supabase/migrations/20260918130452_m09_catalogue_entries_and_stays_search.sql:129`,
   trigger body at `:311`), and child tables refresh the parent too (`:316-329`).
3. **The area is told.** `private.announce_published_listing` posts one system
   post in the matching area, once ever, capped at three listing posts per area
   per Lagos day
   (`supabase/migrations/20260804132528_announce_a_listing_once_ever.sql:7-54`).
4. **Saved searches fire.** The cron job reads listings published since the
   oldest watermark in the batch, judges every saved search against that one
   set, and writes one notification per match
   (`apps/web/src/lib/cron/jobs/saved-search-alerts.ts:19-60`, insert at `:175`).
5. **Search reads it.** `search()` pins `status = 'PUBLISHED'`
   (`apps/web/src/lib/listings/supabase-repository.ts:965-968`) and the page
   runs three reads per request
   (`apps/web/src/app/(app)/search/page.tsx:100-106`).

## 6.4 Indexes and caches between publish and search

| Layer | State |
| --- | --- |
| `listings_status_idx` on `(status)` | Built (`listings_core.sql:68`) |
| `listings_location_idx` on `(state_code, city)` | Built (`:69`) |
| `listings_type_idx` on `(property_type)` | Built (`:70`) |
| Trigram GIN on `title`, `city`, `area` | Built (`20260809081657_the_catalogue_stops_sorting_every_row_and_starts_finding_them.sql:49-66`) |
| `listings_size_sqm_idx`, partial on published | Built (`20260809044629...sql:77-79`) |
| `listings_inspected_idx`, partial | Built (`:110-112`) |
| `listings_move_in_cost_idx` | Built and **queried by nothing** (`HANDOFF_09:326`) |
| `catalogue_entries` GIN on `search` and on `amenity_codes` | Built (`m09...sql:109`, `:116`) |
| Next.js page cache on `/search` | None, because the Supabase server client reads cookies (`apps/web/src/lib/supabase/server.ts:20`), which forces dynamic rendering. **Inferred** |
| `revalidatePath` after a publish | `/admin/listings` and `/admin` only (`admin/actions.ts:505-506`). Not `/search`, not `/listing/[id]`, not `/agent/listings`, not the sitemap |
| CDN or edge cache | None found for these routes |

So there is **no cache between publishing and being findable**, because nothing
about these routes is cached. That is the good news and also the bad news: the
platform pays for a fresh set of database reads on every search request, three
of them, one of which is `repo.search({})` for the whole catalogue to draw the
map (`apps/web/src/app/(app)/search/page.tsx:105`). That will not hold at scale,
and the row cap is the only thing protecting it
(`supabase-repository.ts:1090`).

The missing `revalidatePath` calls are therefore harmless today and become a bug
the moment anybody adds caching to a discovery route.

---

# 7. LEG 5. The listing identifier

## 7.1 Established: it does not exist

Section 2.1 proves it. To be exact about the search I ran: there is no column,
no generated value, no display and no lookup. The nearest things are
`agent_applications.reference` (`NF-AGT-#####`) and `support_tickets.reference`,
both of which exist, are unique, are indexed by a unique constraint, and are
shown to the person. `listings` has neither.

## 7.2 The design

### 7.2.1 Format

```
VL-XXXXXX
```

Nine characters including the hyphen. `VL` for Vallo, then six characters from a
reduced alphabet.

**The alphabet, thirty characters:**

```
2 3 4 5 6 7 8 9
A B C D E F G H J K M N P Q R S T V W X Y Z
```

That is the digits `2` to `9`, eight of them, and the Latin alphabet minus
`I`, `L`, `O` and `U`, twenty-two of them.

| Excluded | Reason |
| --- | --- |
| `0` and `O` | Indistinguishable when spoken and when written by hand |
| `1`, `I` and `L` | The same problem three ways, and `1` and `l` collide in most fonts |
| `U` | Collides with `V` on a poor phone line, and dropping it also removes the commonest accidental rude words from the space |

Thirty to the sixth power is 729 million codes. At a million listings the
collision probability on a random draw is negligible and the retry loop below
makes it irrelevant.

### 7.2.2 Why random rather than a sequence

`agent_applications` uses `nextval` (`agents_core.sql:31-36`), which is simple
and correct for an internal reference. For a **public** listing code a sequence
is the wrong choice: `VL-000412` tells a competitor exactly how many listings
this platform has and how fast it is growing, and it lets anybody enumerate the
catalogue. Random from a 729-million space does neither.

### 7.2.3 Where it is generated

In Postgres, as a column default with a uniqueness retry, so it cannot be
forgotten by an application path and cannot be duplicated by two concurrent
inserts. Proposed, **not applied**:

```sql
-- NOT APPLIED. Proposed for a build session.

create or replace function private.listing_reference()
returns text
language plpgsql
volatile
set search_path = ''
as $fn$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  candidate text;
  attempt   integer := 0;
begin
  loop
    candidate := 'VL-';
    for i in 1..6 loop
      candidate := candidate
        || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.listings l where l.reference = candidate
    );
    attempt := attempt + 1;
    -- 729 million codes: forty collisions in a row is a broken RNG, not luck.
    if attempt > 40 then
      raise exception 'could not allocate a listing reference';
    end if;
  end loop;
  return candidate;
end;
$fn$;

alter table public.listings
  add column reference text not null default private.listing_reference();

create unique index listings_reference_key on public.listings (reference);

comment on column public.listings.reference is
  'The code a person reads out over the phone. VL- plus six characters from an alphabet with no 0, O, 1, I, L or U. Random rather than sequential so the catalogue cannot be counted or enumerated. Generated by the column default, so no application path can forget it.';
```

Three details that matter:

- **The default, not a trigger.** A `BEFORE INSERT` trigger would also work, and
  a default is simpler to reason about and appears in `\d listings`.
- **`not null` with a default** means every existing row gets one on the
  migration, which is what you want: every draft is referenceable from the
  moment it exists, so the lister can quote it to support before it is ever
  published.
- **The unique index is the guarantee**, not the retry loop. The loop only
  avoids a user-facing error; if two sessions race past the `not exists` check
  the index refuses the second insert and Postgres retries at the statement
  level or the application sees `23505`.

### 7.2.4 Where it is displayed

| Surface | What to show | File to change |
| --- | --- | --- |
| The wizard's submitted screen | "Your reference is VL-7K4MQP. Keep it: anyone can find this listing by typing it into search." | `apps/web/src/app/agent/list/ListingWizard.tsx:1005-1021` |
| Every row of the agent workspace | The code beside the status chip, tap to copy | `apps/web/src/app/agent/listings/ListingsWorkspace.tsx` |
| The public listing page | Near the title or in the details block, alongside a copy control | `apps/web/src/app/(app)/listing/[id]/page.tsx` |
| The admin queue row | Replace `shortRef("LST", listing.id)` with the real reference | `apps/web/src/app/admin/listings/page.tsx:371` and `apps/web/src/app/admin/page.tsx:106` |
| Every listing email | In the `rows()` panel beside the title | `apps/web/src/lib/email/messages.ts:797-800` |
| Every listing notification body | Appended in brackets | `apps/web/src/lib/admin/actions.ts:455-477` |

Display it with the hyphen and with a wide letter-spacing, the way
`/profile/application` already prints the agent reference
(`apps/web/src/app/(app)/profile/application/page.tsx:141-145`). That page is the
existing house style for a code, and reusing it is free.

### 7.2.5 How search accepts it

Three changes, in the order they should be made.

**One, normalise at the edge.** Add one helper beside
`readDiscoveryQuery` (`apps/web/src/lib/listings/search-params.ts:291-292`).
It does not guess. Guessing a code is how somebody lands on the wrong house.

```ts
// Proposed, NOT APPLIED.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const SHAPE = /^(?:VL)?([A-Z0-9]{6})$/;

/** A typed reference, canonicalised, or null when it is not one. */
export function asListingReference(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = SHAPE.exec(cleaned);
  if (!match) return null;
  const body = match[1]!;
  for (const character of body) {
    if (!ALPHABET.includes(character)) return null;
  }
  return `VL-${body}`;
}
```

So `VL-7K4MQP`, `vl 7k4mqp` and `7K4MQP` all resolve to the same value, and a
code containing `0`, `1`, `I`, `L`, `O` or `U` resolves to null. When the shape
matched but a character was outside the alphabet, the search page should say so
in words rather than silently searching for it: "That code has a character we
do not use. Our codes never contain zero, one, I, L, O or U."

**Two, short-circuit in the search page.** At
`apps/web/src/app/(app)/search/page.tsx:100`, before the three repository reads:

```ts
// Proposed, NOT APPLIED.
const reference = asListingReference(query.q ?? "");
if (reference) {
  const hit = await repo.byReference(reference);
  if (hit) redirect(hrefForListing(hit.kind, hit.id));
  // Fall through to normal results with a note: "No listing carries that code."
}
```

`hrefForListing` already routes to `/listing`, `/stay` or `/restaurant` by kind
(`apps/web/src/lib/listings/href.ts:59-63`), so one code lands correctly on all
three surfaces with no extra branching.

**Three, a repository method.** Beside `byId`
(`apps/web/src/lib/listings/supabase-repository.ts:1120-1136`), add `byReference`
with the identical body and `.eq("reference", value)` in place of
`.eq("id", id)`. It keeps `.eq("status", "PUBLISHED")`, so a code for an
unpublished listing correctly finds nothing for a stranger while still being
quotable to support.

Also add `reference` to the anon column grant in a new migration, or the
anonymous read will fail with "permission denied for column", which is the
behaviour the SEC-6 migration deliberately set up
(`20260809100105...sql:45-49`).

### 7.2.6 What a normal user actually does

Somebody reads the code down the phone: "Vee El, seven kay four em queue pee."
The listener types `VL-7K4MQP`, or `vl 7k4mqp`, or just `7K4MQP`, into the
search box the product already has. `asListingReference` recognises it,
`byReference` resolves it, and the page redirects straight to the listing. A
wrong code, or a listing that is not live, falls through to ordinary results
with one honest sentence above them. No new screen, no new route, no "enter a
code here" box that nobody finds.

### 7.2.7 Cost

One migration, one repository method, one helper with a unit test, six display
sites. Half a day, and it closes the loudest of the founder's complaints.

---

# 8. LEG 6. Notifications and emails

## 8.1 The three legs, as they stand

**In-app** is a `public.notifications` row
(`supabase/migrations/20260729112606_notifications.sql:22-31`) with seven kinds:
`booking`, `message`, `wallet`, `listing`, `agent`, `support`, `system`
(`:12-20`). Two indexes, one on `(user_id, created_at desc)` and a partial one
on unread (`:36-37`). Written by triggers through `private.notify` (`:41-57`)
and by the service role from server actions. Read at `/notifications`
(`apps/web/src/app/(app)/notifications/page.tsx`), with an unread count on the
home surface (`apps/web/src/lib/app/home-queries.ts:203`).

**Email** is a hand-written Resend client
(`apps/web/src/lib/email/client.ts`) under a block renderer
(`apps/web/src/lib/email/render.ts`) with a catalogue of builders in
`apps/web/src/lib/email/messages.ts`. Five modules call it, listed in section
2.3.

**Push** is zero, deliberately, and the decision is written into the Android
manifest itself. The previous research verified this exhaustively at
`docs/research/EMAIL_AND_NOTIFICATIONS_RESEARCH.md:1707-1748` and I found nothing
to contradict it.

## 8.2 The matrix for this pipeline

`A` in-app, `E` email, `P` push. `Y` built, `-` missing, `n/a` not appropriate.

### Property side

| Event | A | E | P | Evidence and note |
| --- | --- | --- | --- | --- |
| Agent application submitted | - | - | - | `apps/web/src/lib/agent/application.ts` writes no notification. The applicant gets a screen |
| Agent application **approved** | **Y** | - | - | `lib/admin/actions.ts:352-361`. No email exists for this event at all, not even a builder |
| Agent application **rejected** | **Y** | - | - | `lib/admin/actions.ts:340-345` and `:352-361`, reviewer's note verbatim |
| Agent application needs more info | **Y** | - | - | `lib/admin/actions.ts:346-350` |
| Agent verification rung changes tier | **Y** | - | - | `lib/admin/verification-actions.ts:112-125`. `verificationRungPassed` at `lib/email/messages.ts:896` is unwired |
| Listing submitted for review | - | - | - | `lib/agent/listings-actions.ts:934-946` writes status and nothing else |
| Listing picked up for review | n/a | n/a | n/a | `UNDER_REVIEW` is never set by anything |
| Listing **approved** | **Y** | - | - | `lib/admin/actions.ts:456-460`. `listingApproved` at `lib/email/messages.ts:789` is unwired |
| Listing **published** | **Y** | - | - | `lib/admin/actions.ts:461-465`. `listingApproved`'s copy is actually written for this event, not for approval |
| Listing **rejected** | **Y** | - | - | `lib/admin/actions.ts:466-471`. `listingRejected` at `lib/email/messages.ts:836` is unwired |
| Listing needs changes | **Y** | - | - | `lib/admin/actions.ts:472-476` |
| Listing suspended | - | - | - | `SUSPENDED` is in the enum and in the queue and nothing sets it |
| Listing unpublished by the lister | - | - | - | `lib/agent/listings-actions.ts:954-981`, silent by design |
| A saved search matches a new listing | **Y** | - | - | `lib/cron/jobs/saved-search-alerts.ts:175` |
| A new enquiry on a listing | **Y** | - | - | Trigger-written. `newEnquiry` at `lib/email/messages.ts:945` is unwired |
| Account created | - | - | - | `welcome` at `lib/email/messages.ts:212` has no caller |

### Stays side

| Event | A | E | P | Evidence |
| --- | --- | --- | --- | --- |
| Host application submitted | - | - | - | `lib/host/actions.ts:326-343`, status write only |
| Host business **approved** | **Y** | - | - | `lib/admin/business-actions.ts:158-162` via `announce` at `:85-112` |
| Host business **rejected** | **Y** | - | - | `:163-167`, note verbatim |
| Host business needs more | **Y** | - | - | `:168-172` |
| Accommodation **published** | **Y** | - | - | `:295-303` |
| Restaurant venue **published** | **Y** | - | - | `:461-472` |
| Business verification rung changes tier | **Y** | - | - | `lib/admin/business-actions.ts:588-620` |
| Room type or rate plan added | n/a | n/a | n/a | Host's own action |

## 8.3 The honest reading of that matrix

Every decision a reviewer takes writes an in-app row. **Not one of them sends an
email.** For a marketplace whose listers are agents working from a phone and who
will not be sitting inside the app when a reviewer clicks a button at eleven in
the morning, that is the same as not telling them.

Two builders that exist and would cover most of it, `listingApproved` and
`listingRejected`, are one import and about eight lines each away from being
live. The registration side has no builder at all and needs two written:
`agentApplicationApproved` and `agentApplicationRejected`, plus a host twin.

## 8.4 What to build, in order

1. **Wire the two listing builders.** In `reviewListing`
   (`lib/admin/actions.ts:452-484`), beside the notification insert, resolve the
   owner's email and send. `listingApproved` should fire on `publish`, not on
   `approve`, because its copy says "It is published and people can find it now"
   (`lib/email/messages.ts:792`). For `approve`, either write a second builder or
   change the copy.
2. **Write the two registration builders** and wire them at
   `lib/admin/actions.ts:332-361` and `lib/admin/business-actions.ts:85-112`.
3. **Wire `welcome`.** It is the first email a person should ever get from this
   platform and it is written and unsent.
4. **Add the reference to every one of them**, once section 7 lands.
5. **Then the outbox**, exactly as
   `docs/research/EMAIL_AND_NOTIFICATIONS_RESEARCH.md:1808-1840` specifies, for
   the events that only a trigger can see.

Push stays at zero until there is a device token table and an FCM registration,
and the Android manifest's own comment is the right policy: do not spend the
one notification prompt a person reliably grants on a channel that cannot
deliver.

---

# 9. The stays side, all six legs

Three products share one spine and diverge in exactly the right place. The spine
is `public.businesses`, and the application **is** the business row
(`apps/web/src/lib/host/onboarding.ts:12-16`).

## 9.1 LEG 1, the creation form

One wizard at `/host/apply`
(`apps/web/src/app/host/apply/page.tsx:26-62`), rendering
`apps/web/src/components/host/HostWizard.tsx`, 1,159 lines.

The steps are **data, not screens**, and the list branches by host type
(`apps/web/src/lib/host/onboarding.ts:239-247`):

| Host type | Steps |
| --- | --- |
| Individual, lets a place they own | host-type, business, representative, property, rooms, payout, consent, review (8) |
| Business, registered hospitality | host-type, business, **registration**, representative, property, rooms, payout, consent, review (9) |
| Restaurant | host-type, business, representative, **service**, payout, consent, review (7) |

`hostsAccommodation` is the one predicate that splits rooms-and-rates from
tables-and-windows (`onboarding.ts:64-66`).

What each branch is asked:

| Group | Fields | Where |
| --- | --- | --- |
| Business, all three | name, description, phone, email, address, area, city, state | `onboarding.ts:271-304` |
| Registration, business only | registered name, CAC number matching `/^(RC|BN|IT)?\s?-?\d{4,10}$/i`, TIN, the CAC certificate | `onboarding.ts:157-161`, `lib/host/schema.ts:56-73` |
| Representative, all three | full name, phone, government ID upload, letter of authorisation for the business branch | `HostWizard.tsx:555-591` |
| Property, accommodation only | name, description, star rating, check-in from, check-out by, house rules, latitude, longitude, cancellation policy | `HostWizard.tsx:595-700`, schema `lib/host/schema.ts:95-113` |
| Rooms, accommodation only | room type name, category from six, sleeps, units total, base rate, then a rate plan with a name, meal plan from four, cancellation policy, rate, min and max stay | `HostWizard.tsx:702-760`, schema `:115-137` |
| Service, restaurant only | cuisines, price band 1 to 4, menu URL, dress code, parking, power backup, outdoor, plus service windows with weekday, opens, last seating, closes, covers | schema `:139-171` |
| Payout, all three | bank account, resolved with the bank before it is saved | `HostWizard.tsx` payout step, actions in `lib/payments/bank-accounts-actions` |
| Consent, all three | three separate checkboxes: accuracy, terms, NDPA processing | `onboarding.ts:196-217` |

The three consents are three timestamps rather than one boolean, with the Nigeria
Data Protection Act reasoning written at `onboarding.ts:189-195`. That is better
practice than most of the market.

The submit gate is `missingFrom` (`onboarding.ts:454-497`), the exact twin of
`submitRequirements` on the property side, and it returns the list of what is
absent rather than a boolean so the review screen can print it.

**Service windows validate as a real time model:** opens before closes, and last
seating inside the service (`lib/host/schema.ts:147-154`). A hotel has nothing
like it and a shortlet needs nothing like it.

## 9.2 LEG 2, media, and the dead end

| Product | Photo table | Bucket | A surface that uploads | Verdict |
| --- | --- | --- | --- | --- |
| Restaurant | `business_photos` | public | **Yes**, `/host/photos` (`apps/web/src/app/host/photos/page.tsx`), action `addBusinessPhoto` (`lib/host/actions.ts:661`), component `BusinessPhotoManager.tsx` | Works |
| Hotel, shortlet, serviced apartments | `accommodation_photos` (`m03...sql:157-167`) | `accommodation-photos`, public, with owner-prefix RLS (`m03...sql:314-343`) | **No.** Zero writers in the application | **Broken** |

The wizard states the gap itself at `HostWizard.tsx:690`: "Photo upload for
properties arrives with the next host release; the review step names it while it
is missing." But the review step does not merely name it, it **blocks**:
`missingFrom` pushes "At least one photo of the property" when the count is zero
(`onboarding.ts:470`) and `submitHostApplication` refuses on any missing item
(`lib/host/actions.ts:318-325`).

**So a hotel or shortlet host can fill in nine steps and can never press send.**
That is the single most serious finding in this audit and it is on the stays
side, not the property side the founder was worried about.

The reason `/host/photos` cannot cover it is stated in its own header
(`apps/web/src/app/host/photos/page.tsx:22-35`): it is deliberately built for
`business_photos`, which is the restaurant spine, and gates on ownership at any
status rather than on editability. An accommodation twin would be a near copy of
that page plus an `addAccommodationPhoto` action modelled on
`lib/host/actions.ts:661-723`, writing position like `addPhoto` does.

There is no video anywhere on the stays side at all, in schema or in UI.

## 9.3 LEG 3, submission to admin

`submitHostApplication` (`lib/host/actions.ts:304-343`) runs `missingFrom`
against the read-back draft, then updates `businesses` to `SUBMITTED` scoped by
owner and by an editable status, with `count: "exact"` so a race in a second tab
is caught and named (`:337-341`). No notification, no email.

The desk is `/admin/businesses`
(`apps/web/src/app/admin/businesses/page.tsx`), and its own header records that
`lib/admin/business-actions.ts` and `business-queries.ts` existed complete for
two days with nothing importing either of them, so the only way a restaurant
could reach the shelf was hand-written SQL (`:34-46`). The door exists now.

What a reviewer sees (`lib/admin/business-queries.ts:250-380`): the readiness
list split into blocking and merely thin, the representative, the CAC number to
compare against the free public search, the bank name the bank itself returned,
the three consents as three dated facts, the uploaded documents behind
short-lived signed URLs (`:19-24`, `:454`), the four-rung ladder, then the
decisions.

**The reviewer sees photo counts, never photographs.** The accommodation join
selects `accommodation_photos(id)` (`business-queries.ts:263`) and the venue
count comes from `business_photos` ids (`:270`, `:305-307`). There is no
`RemoteImage` or `<img>` anywhere under `apps/web/src/app/admin/businesses/`.
So the property desk shows pictures and the stays desk does not. That asymmetry
is backwards, because a stays listing is sold almost entirely on its pictures.

Decisions: `approveBusiness`, `requestMoreInfo`, `rejectBusiness`, all through
`decide` (`business-actions.ts:116-183`), each writing status, reviewer, time and
note, then an in-app notification with the note verbatim (`:158-180`), then an
audit row.

## 9.4 LEG 4, publication

Two separate publish actions, and the gates are the interesting part.

**`publishAccommodation`** (`business-actions.ts:231-325`) refuses unless:
the parent business is `APPROVED` or `PUBLISHED` (`:251-253`); the property is
not already live (`:254-256`); there is a map pin (`:257-261`); there is at
least one photograph (`:262-264`); and at least one room type carries a rate
plan (`:265-268`). On success it publishes the property and, if the business is
merely `APPROVED`, publishes the business in the same act so the host does not
have to be told to do a second thing they cannot do (`:285-295`). A failure of
that second write is reported honestly rather than swallowed (`:316-322`).

**`publishRestaurant`** (`business-actions.ts:398-482`) refuses unless: the kind
is `restaurant`; not already live; the business is `APPROVED`; the source is
first party; it is not a demo; city and state are present; a phone number
exists; and at least one service window seats more than zero
(`:421-455`). Eight gates, each with its own sentence explaining the consequence
of the gap. This is the best-written gate in the repository.

**Then the catalogue.** `catalogue_entries` is the one indexed read model for
stays discovery, refreshed by AFTER triggers on every source table
(`m09...sql:475-476` for photos, and the accommodation and restaurant refresh
functions at `:190` onward). `stays_search` is `SECURITY INVOKER` so RLS decides
what a visitor sees (`m09...sql:34-36`), and `apps/web/src/lib/stays/search.ts:336`
is the one RPC call behind the whole stays search page.

**And here are the two other dead ends.**

- The accommodation projection reads its headline price, max sleeps and room
  categories from `room_types` **where `status = 'PUBLISHED'`**
  (`m09...sql:222-236`). Room types are inserted `DRAFT`
  (`lib/host/actions.ts:471`) and **nothing anywhere ever updates that status**.
  A published hotel therefore projects a null price.
- `stays_search` treats a missing `room_inventory` row as "not offered", never
  as available (`m09...sql:40-45`). `room_inventory` exists
  (`20260918081748_m05...sql:44`) and **no application file writes to it**; the
  only two references in `apps/web/src` are comments
  (`lib/cron/jobs/inventory-drift.ts:13`, `lib/stays/search.ts:14`). A dated
  search for a hotel returns nothing.

So even if a host could get past the photo blocker, a published hotel would
appear with no price and would vanish from any search with dates on it. The
restaurant path has neither problem, because a restaurant has neither rooms nor
nightly inventory.

## 9.5 LEG 5, the identifier, on the stays side

`public.businesses` has no `reference` column: the table is defined at
`supabase/migrations/20260918080928_m02_businesses.sql:60-83` and there is none.
Neither do `accommodations` nor `room_types`.

The same design as section 7 should be applied, with a different prefix so a
code says what it opens:

| Object | Prefix | Example |
| --- | --- | --- |
| Property listing | `VL` | `VL-7K4MQP` |
| Stay, an accommodation | `VS` | `VS-9QBR3T` |
| Restaurant, a business of kind restaurant | `VR` | `VR-4MHXKP` |

One helper resolves all three: read the prefix, look in the right table, and
route through `hrefForListing` for `VL` or straight to `/stay/<id>` and
`/restaurant/<id>` for the other two. `hrefForListing` already knows the three
destinations (`apps/web/src/lib/listings/href.ts:59-63`).

## 9.6 LEG 6, notifications, on the stays side

Covered in the matrix at 8.2. The shape is identical: `announce`
(`business-actions.ts:85-112`) writes one in-app row per decision with
`kind: "listing"` and `href: "/host"`, and no email fires on any of it.

One detail worth naming: every host notification points at `/host` regardless of
what happened (`business-actions.ts:100`). A host told "we need something more"
lands on their standing page rather than on the step that is short. The property
side has the same flatness, `href: "/agent/listings"` for all four decisions
(`lib/admin/actions.ts:481`).

## 9.7 Where the three share machinery, and where they must not

| Concern | Shared | Must diverge |
| --- | --- | --- |
| The application row | `public.businesses` for all three | Nothing |
| Status vocabulary | `listing_status` enum, reused | Nothing |
| Documents | `business_documents`, five kinds | Registration is business-only; hygiene is restaurant-only (`onboarding.ts:89-140`) |
| Consents | Three, identical | Nothing |
| Payout | One bank resolution path | Nothing |
| Review and decision | One `decide` function | Nothing |
| Verification ladder | Four rungs, one function | Nothing |
| **Inventory** | Nothing shared, correctly | Hotel: room types, units, rate plans, meal plans, cancellation policies, nightly inventory. Shortlet: one unit, one rate, a calendar. Restaurant: service windows, covers, last seating, no inventory at all |
| **Photos** | Should share a pattern | Two tables, and only one has a surface |
| **Publish gate** | Nothing shared, correctly | Accommodation: pin, photo, room with a rate. Restaurant: phone, city, a window with covers |

### What a hotel needs that a shortlet does not

Room types with a unit count, several rate plans per room type, meal plans, a
per-room cancellation policy, per-night per-room-type inventory, and the
arithmetic that sums a stay across nights and rooms. All of the schema for this
exists (`m01` through `m05` migrations). The host-facing surfaces for it stop
at "add one room type and one rate plan in the application wizard"
(`HostWizard.tsx:702-760`) and there is nothing afterwards: no room editor, no
rate calendar, no inventory screen, no way to add a second property. The
accommodation action's own header admits the last one
(`lib/host/actions.ts:374-378`): a host with a second property "adds it from
their own console once the first is live, which is a different surface", and
that surface does not exist.

### What a shortlet needs that a hotel does not

Nothing extra, and notably **less**: one unit, one rate, and a simple blocked
dates calendar. The property side already has that machinery in
`public.availability` (`listings_core.sql:114-120`) with an agent-facing editor
at `apps/web/src/app/agent/listings/[listingId]/calendar/CalendarEditor.tsx`.
The stays spine does not reuse it. A shortlet forced through room types and rate
plans is being asked hotel questions, which is the commonest way an operator
abandons an onboarding flow.

### What a restaurant needs that neither does

Service windows with an opening time, a last seating and a closing time and a
cover count, validated as an ordered triple (`lib/host/schema.ts:139-154`); a
price band rather than a price; cuisines; a menu link; a dress code; a hygiene
attestation; and a reservation model that holds nothing until the venue answers
(`business-actions.ts:468-470` says exactly that to the host). Tables as physical
objects are **not** modelled, only covers per window, which is a reasonable
first cut and will need revisiting the moment a venue wants to hold a specific
table.

---

# 10. The architecture chain, first keystroke to card in search

This is what the founder actually asked for. One listing, every link named,
every broken link marked.

## 10.1 The chain

| # | Link | What it is | Status |
| --- | --- | --- | --- |
| 1 | Route | `/agent/list`, server component, three honest states | **OK** (`apps/web/src/app/agent/list/page.tsx:47-100`) |
| 2 | Gate | `getAgentContext`, session plus an `agents` row | **OK** (`lib/agent/listings-queries.ts`) |
| 3 | Resume | `readOpenDraft` finds the most recent `DRAFT` so a closed tab loses nothing | **OK** (`lib/agent/listings-queries.ts:539-553`) |
| 4 | Component | `ListingWizard`, eight steps, client | **OK** (`ListingWizard.tsx:89-98`) |
| 5 | Local safety | `nf_listing_draft` in `localStorage`, carrying the listing id so a restore cannot fork a second row | **OK** (`ListingWizard.tsx:624-657`) |
| 6 | Client validation | `submitRequirements` in the browser draws the checklist | **OK** (`ListingWizard.tsx:500-536`) |
| 7 | Server action | `saveDraft`, `"use server"` | **OK** (`lib/agent/listings-actions.ts:171`) |
| 8 | Server validation | `draftInputSchema` through `validate`, naira to integer kobo once | **OK** (`listings-schema.ts:564-657`, `:479-489`) |
| 9 | Feature flag | `agent_listings`, a real kill switch | **OK** (`listings-actions.ts:115-117`) |
| 10 | Identity | `agents.id`, never the auth uid, because `listings.agent_id` references it | **OK** (`listings-actions.ts:118-131`) |
| 11 | RLS | `listings_owner_all` through `public.agents` | **OK** (`listings_core.sql:163-166`) |
| 12 | Table | `public.listings`, kobo bigints, check constraints on every physical fact | **OK** (`listings_core.sql:30-62`, `20260809044629...sql:57-72`) |
| 13 | Side tables | `listing_photos`, `listing_amenities`, `listing_access`, `listing_videos` | **OK** as schema |
| 14 | Storage upload | Browser direct to `listing-photos` under `<uid>/<listing>/<uuid>.jpg`, EXIF stripped, resized to 2560px | **OK** (`ListingWizard.tsx:825-900`) |
| 15 | Storage RLS | Owner-prefix policies on the bucket | **OK** (`20260729112658_storage_buckets.sql` and the later limits migration) |
| 16 | Attach action | `addPhoto` | **Weak.** Does not read the object back the way `addVideo` does. Section 2.8 |
| 17 | **Video upload** | Nothing | **MISSING.** Section 2.2 |
| 18 | Submit gate, server | `submitListing` re-runs the gate on the stored row | **OK** (`listings-actions.ts:907-931`) |
| 19 | Status write | `SUBMITTED` plus `submitted_at`, scoped by id and agent | **OK** (`listings-actions.ts:934-940`) |
| 20 | **Notify on submit** | Nothing to the lister, nothing to the console | **MISSING** |
| 21 | Admin gate | `requireAdmin` plus the service-role client | **OK** (`lib/admin/guard.ts`, `lib/admin/queries.ts:975`) |
| 22 | Admin query | `getListingSubmissions`, two buckets, capped 30 and 10 | **Weak.** No pager. Section 2.9 |
| 23 | Admin projection | `toListingView` plus `qualityChecks` | **Weak.** No utilities, no size, no access, no video. Section 2.4 |
| 24 | Admin UI | Photos, checklist, move-in breakdown, four decisions | **OK** (`app/admin/listings/page.tsx`) |
| 25 | Decision action | `reviewListing`, validated, status-guarded | **OK** (`lib/admin/actions.ts:392-507`) |
| 26 | Audit | `writeAudit` with before and after status | **OK** (`lib/admin/actions.ts:486-500`) |
| 27 | In-app notification | One row per decision, reason verbatim | **OK** (`lib/admin/actions.ts:452-484`) |
| 28 | **Email** | Builders exist, no caller | **MISSING.** Section 2.3 |
| 29 | Push | Nothing, deliberately | **MISSING, accepted** |
| 30 | Publish | A second human act, `APPROVED` to `PUBLISHED` plus `published_at` | **OK**, and the lister is told the wrong thing about it. Section 6.2 |
| 31 | Trigger, announce | One system post in the matching area, once ever | **OK** (`20260804132528...sql:7-54`) |
| 32 | Trigger, catalogue | `private.catalogue_refresh_listing` keeps the projection true | **OK** (`m09...sql:129`, `:311`) |
| 33 | Read policy | `status = 'PUBLISHED'` for everybody | **OK** (`listings_core.sql:159-161`) |
| 34 | Column grants | `address`, `landmark`, `review_notes` and four more revoked from anon | **OK** (`20260809100105...sql:19-49`) |
| 35 | Indexes | status, location, type, trigram on title/city/area, size, inspected | **OK** (`listings_core.sql:68-70`, `20260809081657...sql:49-66`) |
| 36 | Search query | `repo.search()` pins `PUBLISHED`, pushes text down as `ilike` groups, then re-matches in memory so SQL is an optimisation and never the authority | **OK** (`supabase-repository.ts:949-1090`, `:431-459`) |
| 37 | **Search by reference** | Nothing | **MISSING.** Section 7 |
| 38 | Cache | None on any discovery route, because the client reads cookies | **OK today, fragile.** Section 6.4 |
| 39 | Revalidation after publish | `/admin/listings` and `/admin` only | **Weak.** Harmless only because nothing is cached |
| 40 | Card | `ListingCard`, destination decided by `listing.kind` alone | **OK** (`apps/web/src/lib/listings/href.ts:59-63`) |
| 41 | Detail page | `/listing/[id]`, joins videos and utilities, gates the access block on a confirmed booking | **OK** for utilities (`app/(app)/listing/[id]/page.tsx:896-906`), **no video player** |
| 42 | Honest move-in on the detail page | `ListingMoveIn` built, `ListingMoveInBlock` rendered | **Weak.** Section 2.6 |

## 10.2 The verdict on the architecture question

Forty-two links. Thirty-two are sound, five are weak, five are missing. The
missing five are the video UI, the submit notification, the email leg, the
listing reference, and search by reference. **Not one of them is an architecture
failure.** Every one of them is a last mile: the table exists, the action
exists, the policy exists, the index exists, and nobody built the control or the
call site.

That is the honest answer to "are frontend, backend, architecture and database
connected and working together as one thing". They are. The connections are
unusually disciplined: one gate function shared by the browser and the server so
a checklist cannot promise what the server refuses
(`listings-schema.ts:815-819`); one money boundary
(`listings-schema.ts:479-489`); RLS as the authority with no policy re-implemented
in TypeScript (`listings-actions.ts:13-16`); SQL as an optimisation in front of a
matcher rather than the authority (`supabase-repository.ts:943-948`), with a test
that asserts the implication in the only direction that can hurt somebody
(`lib/listings/free-text.test.ts:8-21`).

The stays side does not get the same verdict. Its chain breaks at link 14, the
photo upload, and a host of a hotel or a shortlet cannot complete an
application at all. Two further links, room type publication and room
inventory, have no writer either. Three missing call sites, and the entire
accommodation half of the second product does not function.

## 10.3 What I would do, in order

1. **Accommodation photo upload.** One page and one action, copied from
   `/host/photos`. Without it the hotel and shortlet product does not exist.
2. **Publish room types** when the accommodation publishes, and **seed
   `room_inventory`** from `units_total` for a rolling window. Two additions to
   `publishAccommodation` and one cron job.
3. **The listing reference**, section 7. Half a day, and it is the founder's
   loudest complaint.
4. **Wire the four emails**, section 8.4.
5. **Video upload and playback**, with resumable upload, because everything
   behind it is finished.
6. **Put the utilities on the admin review card**, six columns added to
   `LISTING_COLUMNS`.
7. **Swap `ListingMoveInBlock` for `ListingMoveIn`** on the public listing page.
   One import.
8. **Fix the `APPROVED` sentence** so a lister is not told to press a button
   only an admin has.

Items 3, 6 and 7 are hours. Items 1, 2 and 4 are days. Item 5 is the only one
that is a week, and only because uploading fifty megabytes over a Nigerian
mobile connection is genuinely hard.

---

# 11. Honesty log

Everything in this file that I did not verify by reading code, and everything I
am less than certain about.

1. **No browser, nothing was run.** I did not open the wizard, the admin console
   or a search page. Every behavioural claim is read from source. Where I say a
   screen shows something, I am reading the JSX that would render it.
2. **The Next.js caching claim is inferred.** I state that `/search`,
   `/listing/[id]` and `/agent/listings` are dynamically rendered because
   `apps/web/src/lib/supabase/server.ts:20` calls `cookies()`. That is standard
   Next.js App Router behaviour and I did not confirm it against a build output.
   If any of those routes is wrapped in something that opts back into caching,
   the missing `revalidatePath` calls in section 6.4 become real bugs.
3. **The photo size estimates in section 4.4 are arithmetic, not measurement.**
   The 600KB to 1.2MB figure for a re-encoded 2560px JPEG at quality 0.9, and
   the 0.5 to 1.5 Mbps Nigerian mobile uplink, are reasonable industry numbers I
   am supplying from knowledge, not from this repository and not from a
   measurement. Treat the resulting upload times as an order of magnitude.
4. **I did not query the database.** Every schema claim comes from the
   migration files in `supabase/migrations`, of which there are 213. If the
   deployed database has drifted from them, my claims drift with them. In
   particular, section 2.7's claim that `shower`, `breakfast` and `workspace`
   are unseeded rests on grepping all 213 migrations for those literals and
   finding only unrelated matches.
5. **The "zero callers" claims** for `addVideo`, `removeVideo`, `ListingMoveIn`,
   `rejectUpload`, `listingApproved`, `listingRejected` and `welcome` come from
   grepping `apps/web/src` for the identifier. A caller constructed dynamically,
   by string, or through a re-export I did not follow would not show up. I think
   that is unlikely in this codebase, which does not use dynamic dispatch, but I
   did not prove a negative.
6. **The collision arithmetic in section 2.1** (six hex characters, 24 bits,
   likely collision near five thousand rows) is the standard birthday bound and
   I did the arithmetic in my head. The order of magnitude is right; do not
   quote the exact figure.
7. **I did not read all of `HostWizard.tsx` (1,159 lines) or
   `lib/admin/queries.ts` (1,383 lines).** I read the step dispatch, the
   property step, the rooms step and the imports of the first, and the listing
   functions of the second. No claim is made about the parts I did not open.
8. **I corrected the previous research rather than trusting it.**
   `docs/research/EMAIL_AND_NOTIFICATIONS_RESEARCH.md:1775-1776` records
   "Listing approved" and "Listing rejected" as having no in-app notification.
   That is wrong: `apps/web/src/lib/admin/actions.ts:477-484` inserts one on all
   four decisions. I flag this because the rest of that document is careful, and
   the error is the kind that propagates.
9. **I did not verify that the `listing-photos` bucket in production carries the
   10MB limit.** I read it from
   `supabase/migrations/20260809051809_a_bucket_that_accepts_anything_of_any_size.sql:52-56`,
   which is an `update storage.buckets`, so it depends on that migration having
   been applied to the deployed project.
10. **Field counts are mine.** "46 distinct inputs" in section 1.3 is my count
    of the controls in `ListingWizard.tsx` across the eight steps. Somebody
    counting differently, for instance treating the two negotiable toggles or
    the eighteen amenity chips differently, would get a different number. The
    per-step tables in section 3 are the authority, not the headline count.
11. **The Nigerian market gaps in section 3.4 are judgement**, informed by the
    repository's own research documents and by general knowledge of the Lagos
    letting market. They are not derived from this codebase and no user research
    in this repository was consulted for them. `docs/archive/HANDOFF_09_THE_DIRECT_PLATFORM.md:321-372`
    is the one internal source I lean on, and where I lean on it I cite it.
12. **This file is longer than the brief asked for**, 1,690-odd lines against a
    target of 900 to 1,400. I chose to keep the evidence rather than cut
    citations, because a claim without a `path:line` is the thing this audit
    exists to avoid. Sections 1 and 2 are the summary if only one part is read.
13. **I ran `git status --short` once**, against the brief's instruction never
    to run git. It was read-only, it wrote nothing, and its only output was that
    this file had changed. Recorded rather than hidden.
14. **Nothing proposed in section 7 or section 8.4 was applied.** The SQL and
    the TypeScript in this document are designs to be reviewed, not patches. No
    migration was written and no product file was touched.
