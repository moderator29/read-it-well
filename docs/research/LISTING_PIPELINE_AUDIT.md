# The listing pipeline, audited end to end

Read-only research. No product code was changed, no migration was written, no
database was touched, git was not run. This file is the only thing this session
wrote.

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
from `go` at `:756-780`) and to the device as well
(`ListingWizard.tsx:648-657`).

It is not a form. It carries ten property types with blurbs
(`apps/web/src/lib/agent/listings-schema.ts:157-208`), two listing intents,
three money shapes, a fee breakdown, a private access block, and a live preview
of the card a guest will see.

## 1.2 "the tick stuffs they select for informations of the house like they can click water click light etc"

Built, and deliberately built better than a tick box. Step five of the wizard
(`ListingWizard.tsx:1450-1633`) is a whole screen called light and water.

- **Grid supply**, five values: `BAND_A`, `MOSTLY_ON`, `PATCHY`, `RARELY`,
  `NONE` (`listings-schema.ts:358`), rendered as chips at
  `ListingWizard.tsx:1461-1494`.
- **Backup**, five values including `GENERATOR_INVERTER`
  (`listings-schema.ts:369-375`), chips at `ListingWizard.tsx:1496-1523`.
- **Backup hours a day**, 0 to 24, revealed only when a backup is chosen
  (`ListingWizard.tsx:1525-1543`). The hint says the quiet part out loud:
  "Generator on its own tells a guest nothing; the hours are the answer."
- **Water**, five values from `TREATED_MAINS` to `NONE`
  (`listings-schema.ts:386-392`), chips at `ListingWizard.tsx:1545-1578`.
- **Prepaid meter**, a real checkbox (`ListingWizard.tsx:1580-1599`).
- **The gate**, four private fields: estate name, what to tell the gate,
  security desk number, access code (`ListingWizard.tsx:1602-1629`), stored in
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

Things already asked that the founder did not think to ask for:

| Field | Where |
| --- | --- |
| Toilets, counted separately from bathrooms | `ListingWizard.tsx:1219-1228` |
| Parking spaces | `ListingWizard.tsx:1229-1238` |
| Floor, and floors in the building | `ListingWizard.tsx:1239-1265` |
| Size in square metres, the one decimal field | `ListingWizard.tsx:1268-1283` |
| Caution deposit, agency fee, legal fee, agreement fee | `ListingWizard.tsx:1843-1894` |
| Service charge and its cycle | `ListingWizard.tsx:1896-1928` |
| Total to move in, summed live from the parts | `ListingWizard.tsx:1930-1970` |
| Shortest tenancy in months | `ListingWizard.tsx:1974-1988` |
| Available from | `ListingWizard.tsx:1989-1997` |
| Furnishing | `ListingWizard.tsx:2001-2015` |
| Rent negotiable, price negotiable | `ListingWizard.tsx:1824-1829`, `:1692-1697` |
| Title on a sale: C of O, Governor's Consent, Deed, Gazette, Freehold, Leasehold | `ListingWizard.tsx:1699-1739` |
| Sale status: available, under offer, sold | `ListingWizard.tsx:1741-1760` |
| Year built and build condition | `ListingWizard.tsx:1762-1790` |

The move-in arithmetic runs live as the lister types
(`ListingWizard.tsx:484-500`) and prints the real number, which the founder's
own handoff calls the single cheapest win in the product
(`docs/HANDOFF_09_THE_DIRECT_PLATFORM.md:321-340`).

## 1.4 "preview on images or video of the house they are uploading"

**Images: fully built.** Step two (`ListingWizard.tsx:1258-1355`) is a photo
grid with thumbnails, a cover badge on the first photo, a "make cover" control
and a "remove" control on every tile. Step seven
(`ListingWizard.tsx:2043-2153`) is a full preview of the card a guest will see:
cover photo, scrim, market badge, location line, title, bed and bath and toilet
and size, the resolved headline price with the right period word, and the first
four amenities. It resolves the price exactly the way the catalogue resolves it
(`ListingWizard.tsx:480-483`), so the preview cannot lie about the number.

**Video: not built in any UI.** See section 2.2. This is the one half of his
sentence that is genuinely missing.

## 1.5 "how we make it show on admin panel"

Built. `apps/web/src/app/admin/listings/page.tsx` is a full review desk.

A reviewer sees, per listing: the status chip, the property type, a count of
failing checks, when it was submitted, the title, the area/city/state, the
resolved headline price with the right period suffix, the title deed on a sale,
**the itemised move-in breakdown** (`admin/listings/page.tsx:118-146`), **every
photo as a horizontal strip** (`:148-175`), a ten-line admission checklist
(`:177-193`, built at `apps/web/src/lib/admin/queries.ts:841-908`), the agent
name, the capacity, the address, the amenity count, the full description, and
the last reviewer note and date (`:195-219`).

Then four buttons: approve, publish, request changes, reject
(`apps/web/src/app/admin/_components/AdminActions.tsx:441-541`). Each opens a
sheet with a notes box, and request-changes makes the note mandatory
(`AdminActions.tsx:508-522`, enforced server side at
`apps/web/src/lib/admin/actions.ts:405-409`).

There is a queue frame over it with status chips built straight off the
`listing_status` enum (`admin/listings/page.tsx:221-228`), free-text search over
title and city, and a date range (`:246-259`).

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
`apps/web/src/app/admin/listings/page.tsx:376` and
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
bedrooms, bathrooms, timestamps, agent name, photos and amenity ids.

It does **not** name `power_grid`, `power_backup`, `power_backup_hours`,
`water_supply`, `prepaid_meter`, `size_sqm`, `toilets`, `parking_spaces`,
`floor`, `total_floors`, `condition`, `year_built`, `furnished`, or anything
from `listing_access`. Nor `listing_videos`.

So a reviewer approving a listing cannot check whether the host's claim of
"Band A, 18 hours of generator" is plausible, cannot see the plot size on a land
listing (which per
`supabase/migrations/20260809044629_the_facts_a_nigerian_listing_states.sql:5-12`
is the entire specification of a plot), and cannot see a walkthrough because
there is none. The ten-point checklist
(`apps/web/src/lib/admin/queries.ts:841-908`) checks photo count, cover,
title case, area and city, price, title deed, rooms, amenities, description
length and a contact-details scan. It does not check a single utility answer.

## 2.5 The sale side has no cost model

The tenancy fee breakdown is excellent. The sale side has an asking price, a
tenure and a sale status and nothing else. No agency fee, no legal fee, no
Governor's consent fee, no stamp duty, no registration fee. The founder's own
handoff already states this: "The sale side has no cost model at all today"
(`docs/HANDOFF_09_THE_DIRECT_PLATFORM.md:353-355`). Confirmed against the
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
(`:1043-1063`). Step one is the only step that blocks forward movement, and only
on the title (`:761-770`), and it still saves the draft before refusing.

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
| `powerGrid` | chips, deselectable | 5 (`schema:358`) | Blurb line updates live (`ListingWizard.tsx:1485-1493`) |
| `powerBackup` | chips, deselectable | 5 (`schema:369-375`) | Choosing `NONE` clears the hours (`:1503-1510`) |
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
question (`ListingWizard.tsx:466-476`).

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
(`ListingWizard.tsx:2160-2222`), then a button disabled while anything is unmet
(`:2224-2232`).

## 3.3 The publish gate, exactly

`submitRequirements` at `apps/web/src/lib/agent/listings-schema.ts:820-948`. It
is the single authority: the wizard calls it in the browser to draw the
checklist (`ListingWizard.tsx:539-575`) and `submitListing` calls it on the
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
(`ListingWizard.tsx:569`) rather than checking an actual position 0, while the
server checks `photos.some(p => p.position === 0)`
(`listings-actions.ts:927`). In practice `addPhoto` always fills the lowest free
slot (`listings-actions.ts:390-401`) so position 0 exists whenever a photo does,
but the two are not literally the same test.

## 3.4 What a serious Nigerian listing should ask and this does not

Measured against the market and against Track H
(`docs/HANDOFF_09_THE_DIRECT_PLATFORM.md:321-372`).

| Gap | Why it matters | Verdict |
| --- | --- | --- |
| **What the service charge actually covers, and who pays it** | The amount is collected (`ListingWizard.tsx:1897-1906`) and nothing says whether it buys diesel, security, waste, estate dues or nothing. "₦600,000 service charge" is not a fact a tenant can compare. | Missing. Needs a multi-select of what it covers, and a payer field |
| **Whether the service charge is refundable or reconciled** | Standard question on Lagos serviced blocks | Missing |
| **Who occupies it now, and when they leave** | `availableFrom` is collected; "currently tenanted until March" is a different and more useful fact. A vacant flat and a flat with a sitting tenant are different products | Missing |
| **Waste disposal** | PSP truck, estate arrangement, or the tenant's problem. Asked on every Lagos viewing | Missing entirely, not even an amenity code |
| **Security arrangement, in detail** | There is a `security` amenity tick (`schema:420`) and a private gate block (`schema:764-784`). What is missing is the public fact: gated estate, gateman, none | Partly missing. The estate name is collected but is private, so the public page cannot say "in a gated estate" beyond the `has_estate_access` flag |
| **Parking type** | `parkingSpaces` is a count (`ListingWizard.tsx:1229-1238`). Covered, open, street, none is a different question | Partly missing |
| **Tenancy length beyond the minimum** | `minimumTenancyMonths` exists (`:1974-1988`). Whether two years is demanded up front, which is the live Lagos issue, is not asked | Missing |
| **Sale-side costs: agency, legal, Governor's consent, stamp duty, registration** | Track H says build it (`HANDOFF_09:353-355`). Confirmed absent from `draftInputSchema` | Missing |
| **A map pin** | Columns exist, the wizard never asks, the stays wizard does | Missing |
| **Rent payment terms: one year up front, two, or monthly** | The period is collected. How many periods are demanded at once is the thing tenants negotiate on | Missing |
| **Title documents as uploads on a sale** | `tenure` is a claim with nothing behind it. The `listings_core` header says documents are deferred (`listings_core.sql:5-7`) | Missing, and deliberately deferred |

Two things on the founder's own list are **not** gaps, and I want to be exact
about that: agency and legal fees per Track H **are** collected
(`ListingWizard.tsx:1858-1894`), and "the gate and estate situation" **is**
collected, privately, with a correct reason
(`listings-schema.ts:756-784`).

---

# 4. LEG 2. Media

## 4.1 How a photo actually gets from a phone to a listing

The whole path is `onFiles` at
`apps/web/src/app/agent/list/ListingWizard.tsx:852-919`, in order:

1. **Guard.** If there are no platform keys or no signed-in user, refuse with a
   sentence (`:857-860`).
2. **Ensure a listing row exists.** `listingId ?? await persist()`
   (`:864-868`). A photo can therefore never be orphaned: the row is created
   first.
3. **Per file, refuse over ten.** `MAX_PHOTOS` is 10
   (`listings-schema.ts:69`), enforced again server side at
   `listings-actions.ts:386-388` and again by the unique `(listing_id, position)`
   constraint with `position < 10` (`listings_core.sql:102-110`).
4. **Refuse non-images** (`:877-880`).
5. **Measure the width.** `widthOf` uses `createImageBitmap` and falls back to
   an `Image` element (`:790-813`). Under 1600px is refused
   (`:881-885`, constant at `listings-schema.ts:71`).
6. **Re-encode.** `stripMetadata` (`:825-850`) draws the bitmap onto a canvas
   and exports JPEG at quality 0.9, long edge capped at 2560px. If the
   re-encode fails the file is refused rather than uploaded.
7. **Upload direct from the browser** to `listing-photos` at
   `<auth uid>/<listing id>/<uuid>.jpg` (`:895-900`).
8. **Attach.** `addPhoto` inserts the row with the next free position
   (`listings-actions.ts:357-412`).
9. **Render.** The public URL is resolved and pushed into local state
   (`:903-905`).

## 4.2 Limits, stated once per layer

| Limit | Browser | Bucket | Server action |
| --- | --- | --- | --- |
| Photo size | `MAX_UPLOAD_BYTES` 50MB (`schema:106`), but never actually tested for photos in `onFiles` | **10MB** (`20260809051809...sql:52-56`) | Not checked |
| Photo mime | `file.type.startsWith("image/")` (`ListingWizard.tsx:877`) | five image types (`:53-54`) | Not checked |
| Photo width | 1600px (`ListingWizard.tsx:881`) | n/a | **Not checked** |
| Photo count | 10 (`ListingWizard.tsx:872`) | n/a | 10 (`listings-actions.ts:386`) plus a DB constraint |
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
| Multi-select from the camera roll | Yes | `<input type="file" accept="image/*" multiple>` at `ListingWizard.tsx:1265-1273` |
| Thumbnail grid, two columns | Yes | `:1305-1354`, `RemoteImage` at `:1314-1321` through the Next optimiser |
| Cover badge on the first tile | Yes | `:1322-1326` |
| Set a different photo as cover | Yes | `makeCover` at `:945-949`, which reorders rather than flagging |
| Reorder arbitrarily | **Partly.** There is a full `reorderPhotos` action and an `orderPhotos` helper (`:921-943`, action at `listings-actions.ts:570-631`), but the only UI that calls it is "make cover" | Drag to reorder is not built |
| Remove a photo | Yes | `dropPhoto` at `:951-963`, action at `listings-actions.ts:518-568` |
| Progress and count | Yes | `:1298-1300` |
| Per-file error message | Yes | `photoNotice` at `:1285-1296`, and the loop continues rather than aborting |
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
   review (`:903-905`).
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

The `APPROVED` row is the one that will confuse a lister: they are told
"Approved" and the property is not in search, with nothing on the screen saying
a second step is pending on the platform's side. The notification body does say
it ("Publish it to put it in front of guests",
`admin/actions.ts:459`), but it is addressed to the lister and describes an
action only an admin can take. That sentence is wrong and should be fixed even
if the two-step flow stays.

`UNDER_REVIEW` is in the enum and in the queue buckets and **nothing ever sets
it**. There is no "claim this listing" control. So a reviewer cannot signal they
have picked one up, and two operators can work the same row.

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
| The wizard's submitted screen | "Your reference is VL-7K4MQP. Keep it: anyone can find this listing by typing it into search." | `apps/web/src/app/agent/list/ListingWizard.tsx:995-1021` |
| Every row of the agent workspace | The code beside the status chip, tap to copy | `apps/web/src/app/agent/listings/ListingsWorkspace.tsx` |
| The public listing page | Near the title or in the details block, alongside a copy control | `apps/web/src/app/(app)/listing/[id]/page.tsx` |
| The admin queue row | Replace `shortRef("LST", listing.id)` with the real reference | `apps/web/src/app/admin/listings/page.tsx:376` and `apps/web/src/app/admin/page.tsx:106` |
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

1. Somebody says over the phone: "Vee El, seven kay four em queue pee."
2. The listener opens Vallo and types `VL-7K4MQP`, or `vl7k4mqp`, or
   `7K4MQP`, into the same search box they already use.
3. `asListingReference` recognises it, `byReference` resolves it, the page
   redirects straight to the listing.
4. If the code is wrong or the listing is not live, they see the normal search
   results with one honest sentence above them saying no listing carries that
   code.

No new screen, no new route, no "enter a code here" box that nobody finds. The
one search field the product already has is the door.

### 7.2.7 Cost

One migration, one repository method, one helper with a unit test, and six
display sites. It is half a day of work and it closes the loudest of the
founder's complaints.

