# R2 functionality audit: what is broken or half done

**Written 19 September 2026 by R2, the functionality auditor.** The rules of
section 0 of `docs/BUILD_06_LEDGER.md` are restated at the head of the report
this accompanies. R2 owns no product code and has fixed nothing; every entry
below is a finding for the worker whose scope holds it.

Ranked most serious first. Severity is about what a person loses, not about
how hard it is to fix.

**Tree state when this was written:** `npx tsc --noEmit -p apps/web` exit 0.
The CSS token check result is recorded in the report. No product file was
edited by R2; the four scripts under `scripts/audit/`, this folder, and
nothing else.

**What could not be tested, said plainly.** This sandbox reaches no Supabase
and holds no session. So: no signed-in surface was walked against live data,
no write path was exercised, no RLS refusal was observed, and no notification
was watched to fire. Every finding below is either read off the code that
makes the behaviour, or produced by one of the four scripts. Where a claim
rests on reading rather than watching, it says so.

---

## 1. The side law is broken on the busiest surface in the product: `/search` offers Hotels, Shortlets and Villas, and every card opens in the Property shell

**FINDING.** `ListingCard` builds its href as
`side === "stays" ? "/stay" : "/listing"`, `side` defaults to `"property"`,
and **no call site anywhere in the product passes `side`**. Meanwhile the
property search's own category rail offers `shortlet`, `apartment`, `villa`
and `hotel` as tiles. So tapping Hotels on `/search` and then tapping a hotel
lands on `/listing/<id>`, which `sideOfPath` classifies as Property, and the
Stays object opens in the Property shell. The same card is used on `/saved`
and `/rent`, so a saved hotel opens in Property too.

**EVIDENCE.**
- `apps/web/src/components/app/ListingCard.tsx:85` - the href
- `apps/web/src/components/app/ListingCard.tsx:59` - `side = "property"` default
- `apps/web/src/components/app/search/CategoryRail.tsx:78-86` - the nine tiles, four of them Stays kinds
- `apps/web/src/lib/side.constants.ts:56-58` - `/listing` is a Property path, `/stay` a Stays path
- No call site passes `side`: the three product call sites are
  `app/(app)/search/page.tsx:247`, `app/(app)/saved/page.tsx:63` and
  `app/(app)/rent/page.tsx:131`, none with the prop.

**SEVERITY.** Critical. This is the law the founder named first, broken on
the surface most people will use, for four of the nine markets offered.

**RECOMMENDED FIX.** One function, not a prop threaded through three pages.
Put `hrefForListing(kind, id)` beside `stayCardFromListing` in
`components/app/stays/stay-card-model.ts` (or in `lib/listings`), have it
return `/stay/<id>` for `hotel | shortlet | villa | apartment`,
`/restaurant/<id>` for `restaurant`, `/listing/<id>` otherwise, and call it
from `ListingCard` off `listing.kind` rather than off a `side` prop a caller
can forget. `/stay/[id]` already falls through to the listing page when no
accommodation row exists (`app/(app)/stay/[id]/page.tsx:11,29`), so nothing
breaks while hosts are still onboarding. Then delete the `side` prop, because
a prop nobody passes is how this happened.

**EFFORT.** Half a day, most of it re-proving the four card surfaces.

---

## 2. Sharing a booking into a chat produces a card whose primary button 404s

**FINDING.** `shareHref` returns `/bookings/<id>` for a booking, and its own
comment calls that "the trips hub's own detail route". There is no
`app/(app)/bookings/[bookingId]/page.tsx`. The only route under that segment
is `.../[bookingId]/review/page.tsx`. So the shared booking card's primary
action, and the booking thread's context banner primary action, both land on
a 404. Both are `nf-btn--primary`: the most prominent control on the card.

**EVIDENCE.**
- `apps/web/src/components/app/messages/share.ts:52` - the booking href
- `apps/web/src/components/app/messages/ChatCard.tsx:266` - "View booking details", primary
- `apps/web/src/components/app/threads/ThreadContextBanner.tsx:147` - the same href, primary
- `node scripts/audit/route-inventory.mjs` reports `/bookings/*` under
  "Links to paths this build does not serve"

**SEVERITY.** Critical. It is inside the reservations-and-threads journey the
founder named as a dead end he wants closed, and it is the one tap that
journey ends on.

**RECOMMENDED FIX.** Either build `app/(app)/bookings/[bookingId]/page.tsx`
(the data is already there: `lib/bookings/queries.ts` has the view model and
the rent branch), or point both call sites at `/trips?booking=<id>` and make
the list scroll to and highlight the row. Building the detail page is the
better answer, because the review route below it already assumes one exists.

**EFFORT.** A day for the detail page; two hours for the redirect answer.

---

## 3. The assistant's cards break the side law for every stay and every restaurant it recommends

**FINDING.** `/api/assistant` builds every result card's href as
`/listing/<id>` regardless of kind, and the type says so in its own docstring:
"In-app link, always `/listing/<id>`". Ask the assistant for a hotel in Lekki
and every card it returns opens in the Property shell. The content truth sweep
(ledger 10.4) explicitly requires the opposite: "its cards obey the side law
so a hotel opens in the Stays shell".

**EVIDENCE.**
- `apps/web/src/app/api/assistant/route.ts:475` - the search result cards
- `apps/web/src/app/api/assistant/route.ts:514` - the comparison cards
- `apps/web/src/lib/assistant/types.ts:37` - the docstring that admits it
- `apps/web/src/components/app/assistant/AssistantChat.tsx:832` - the card renders it unchanged

**SEVERITY.** High.

**RECOMMENDED FIX.** The same `hrefForListing(kind, id)` from finding 1,
called in both places. The row already carries `l.kind` two lines above each
href.

**EFFORT.** An hour once finding 1's helper exists.

---

## 4. A hearted listing comes back unlit after a reload on every card surface, including the Saved board itself

**FINDING.** `useSaveControl(listingId, initialSaved = false, place?)` takes
the stored truth as its second argument. The three detail pages pass it.
**`ListingCard` does not accept it at all** - it calls
`useSaveControl(listing.id)` with nothing - so on `/search`, `/rent` and
`/saved` the heart renders from the device store only. For a signed-in reader
whose save went to `saved_items`, the heart is empty after a reload.

On `/saved` this is visible in one screen: the `StayCard` half passes
`saved` and draws a filled heart, the `ListingCard` half passes nothing and
draws an empty one, side by side, on the board whose entire job is the
shortlist.

The `/stays` restaurants rail has the same gap: the second `StayCard` there
passes no `saved`.

**EVIDENCE.**
- `apps/web/src/components/app/ListingCard.tsx:145` - `useSaveControl(listing.id)`
- `apps/web/src/components/app/SaveControl.tsx:174,197` - `initialSaved = false`, and `saved = override ?? (initialSaved || onDevice)`
- `apps/web/src/app/(app)/saved/page.tsx:63` - `<ListingCard>` with no `saved`
- `apps/web/src/app/(app)/search/page.tsx:247`, `app/(app)/rent/page.tsx:131` - the same
- `apps/web/src/app/(app)/saved/SavedBoard.tsx:78` - the places half, which does pass it
- `apps/web/src/app/(app)/stays/page.tsx:162` - the restaurants rail `StayCard`, no `saved`
- `apps/web/src/app/(app)/listing/[id]/page.tsx:315,696` - the shape to copy

**SEVERITY.** High. The heart writes correctly; it is the read back that is
missing, which is the half of the ONE LAW that says "the UI showing the new
reality". Not verified live: no session exists here, so this is read off the
code rather than watched.

**RECOMMENDED FIX.** Give `ListingCard` a `saved?: boolean` prop and thread it
from the three pages, all of which already hold or can cheaply read the
answer. Then pass `saved` on the `/stays` restaurants rail.

**EFFORT.** Half a day.

---

## 5. Three dead links the product offers and this build does not serve

**FINDING.** `node scripts/audit/route-inventory.mjs` finds three paths
written in a navigation context with no route and no redirect behind them.

| Path | Offered from | Severity |
| --- | --- | --- |
| `/support` | `app/agent/verification/page.tsx:167`, a full-width `ButtonLink` | High: it is the fallback an agent is given when verification stalls, which is precisely when they need it |
| `/reviews` | `app/(app)/profile/AccountBody.tsx:225` | Medium: a row on the account page that goes nowhere |
| `/bookings/*` | `components/app/threads/ThreadContextBanner.tsx:147` | see finding 2 |

There is also `/agent` from `app/(dev)/preview/f1/notifications/page.tsx`,
which is the dev harness only and costs a customer nothing.

**EVIDENCE.** `node scripts/audit/route-inventory.mjs --orphans`, section
"Links to paths this build does not serve". Confirmed against a running dev
server on port 3111: neither path resolves.

**A CORRECTION, AND IT IS THE REASON TO RUN THINGS RATHER THAN READ THEM.**
An earlier version of this finding listed `/agents` and `/agents/status` as
404s from the in-app home screen and the site footer. They are not.
`apps/web/next.config.ts:114-119` 307s `/agents` to `/profile?switch=owner`,
`/agents/apply` to `/profile/setup/owner` and `/agents/status` to
`/profile/application`. A live request confirms it: `/agents` returns
`307 -> /profile?switch=owner`. The script had not been taught to read
`next.config.ts`, so it cried wolf about the product's own front door. It has
been taught (`route-inventory.mjs`, the block beginning "next.config.ts
REDIRECTS AND REWRITES ARE ROUTES TOO") and the corrected run is what the
table above reports. Nothing else in this document rested on that mistake.

**RECOMMENDED FIX.** Each is a decision, not a patch. `/support` most likely
means `/help` or `/contact`; `/reviews` most likely means the reviews tab on
`/u/<handle>`. Point them at the real destination, or add two lines to the
`next.config.ts` redirect table beside the three that are already there, which
is the pattern this codebase has already chosen for exactly this problem.
Then keep the script in CI so the fourth cannot land.

**EFFORT.** An hour, given someone decides where each goes.

---

## 6. A restaurant reservation cannot be completed against any inventory that exists

**FINDING.** The reservation trigger refuses an example restaurant, and
`lib/reservations/actions.ts` says in its own header that "every listing in
the catalogue today is one". The live database holds 64 listings, all
`is_demo`, and 0 businesses. So the whole flow - ask, thread, host answers -
is built, wired and honest, and there is nothing on the platform it can be run
against. The refusal is worded properly and does not leak a constraint name,
which is right; but "reservations visible and threaded" is closed in code and
open in fact.

**EVIDENCE.**
- `apps/web/src/lib/reservations/actions.ts:25-27` - the trigger's refusal and the "every listing in the catalogue today is one" note
- `docs/BUILD_06_LEDGER.md` section 1 - 64 listings, all `is_demo`, 0 businesses
- The guest side is genuinely built: `app/(app)/trips/page.tsx:39` reads
  `getMyReservations()`, `app/(app)/trips/TripSpine.tsx:121-124` threads each
  one to `/messages/<conversationId>` and falls back to `/restaurant/<id>`,
  which is the correct side.

**SEVERITY.** High, and it is a data finding rather than a code one.

**RECOMMENDED FIX.** One real (non-demo) first-party restaurant, or the M7
business rows, so the journey can be walked end to end once. Until then no
screenshot of this flow proves anything.

**EFFORT.** Hours, once the founder's word on seeding arrives.

---

## 7. The host has no reservations desk, and an action revalidates a route that does not exist

**FINDING.** `lib/reservations/actions.ts:260` calls
`revalidatePath("/host/reservations")`. There is no such route; `app/host`
holds only `page.tsx` and `apply/page.tsx`. The call is a silent no-op, and
what it points at is the gap: a venue owner on the Stays side has no surface
of their own for table requests. The agent console has one
(`app/agent/bookings/ReservationsBoard.tsx`), so an owner who is not an agent
has nowhere to accept a table.

**EVIDENCE.**
- `apps/web/src/lib/reservations/actions.ts:260`
- `app/host` holds two page files, neither of them reservations

**SEVERITY.** Medium. Nothing is broken on screen; a role is unserved and a
line of code points at a plan.

**RECOMMENDED FIX.** Either build `/host/reservations` reusing
`ReservationsBoard`, or delete the `revalidatePath` line and state in the host
landing that table requests are handled in the agent workspace.

**EFFORT.** A day to build it, minutes to remove the dead line.

---

## 8. The feed pages on `/around` and nowhere else

**FINDING.** `Feed` has a real cursor, a real sentinel and a real
`IntersectionObserver`. `/around` and `/around/[slug]` pass `pageCursor` and
`loadMore`. The three profile surfaces that render the same component pass
neither, so a profile's posts and replies stop at the first read and there is
no way to see older ones. The read is capped at 30.

**EVIDENCE.**
- `apps/web/src/components/social/feed/Feed.tsx:86-87,198-246` - the paging machinery
- `apps/web/src/app/(app)/around/page.tsx:193-196` and `around/[slug]/page.tsx:143-146` - wired
- `apps/web/src/components/social/profile/ProfileTabs.tsx:267` - `<Feed key={tab} initial={posts} ...>`, no cursor
- `apps/web/src/components/social/profile/ProfilePosts.tsx:142`, `ActivityList.tsx:67` - the same
- `apps/web/src/lib/social/profile-tabs-queries.ts:33` - `const LIMIT = 30;`

**SEVERITY.** Medium. The dead end the founder named is closed where it was
named; this is the same dead end one surface over, and it only bites a person
with more than thirty posts.

**RECOMMENDED FIX.** `lib/social/profile-tabs-queries.ts` already returns a
list ordered by `created_at`; give it the same cursor shape `loadMoreAround`
uses and pass it through the three call sites.

**EFFORT.** Half a day.

---

## 9. Six surfaces render a collection and draw nothing when it is empty

**FINDING.** `node scripts/audit/states-checklist.mjs` reports the product at
122 surfaces with **no missing loading state, no missing error state and no
missing signed-out state** - which is a genuinely good result and worth saying
- and six surfaces that map over a collection with no designed empty state.

| Surface | The empty case |
| --- | --- |
| `/messages/[id]` | a thread with no messages yet, which is every thread at the moment it opens. `ThreadView.tsx:686` is a bare `bundles.map(...)` with no zero branch, so a new thread shows the safety strip, then nothing, then the composer |
| `/listing/[id]` | a listing with no photographs, no amenities, no reviews |
| `/restaurant/[id]` | a venue with no menu and no hours |
| `/messages/share/[kind]/[id]` | nothing to share into: no threads yet |
| `/profile/setup` | no roles offered |
| `/agent/listings/[listingId]/calendar` | no dates blocked |

**EVIDENCE.** `node scripts/audit/states-checklist.mjs`, section "Surfaces
that read data and draw nothing when it is empty". Nine further surfaces
carry an *accidental* state (a length check that omits the section rather than
drawing one); the script's full table marks those `~~`.

**SEVERITY.** Medium, except `/messages/[id]` and
`/messages/share/[kind]/[id]`, which are High: a brand-new account opening its
first thread, or trying to share its first listing, gets a column with nothing
in it but the safety line. That is exactly the "screen with nothing on it is
where products feel abandoned" the founder named, and it lands on the very
first message somebody ever sends on this platform.

**RECOMMENDED FIX.** `EmptyState` from `components/app/Screen.tsx` already has
the right anatomy and is used well elsewhere (`/trips`, `/saved`,
`/notifications`). Six instances of it, each with a real way onward.

**EFFORT.** Half a day for all six.

---

## 10. The only dead controls in the whole tree are in the styleguide, and one of them is permanently disabled

**FINDING.** The dead control sweep parsed 544 `.tsx` files outside the dev
harness and found four faults, all in one file: three `<Button>` elements with
no `onClick`, no submit type and no enclosing form action, one of which also
carries `disabled` as a literal. This is a specimen page, so nothing a
customer touches is affected.

The headline is the absence: **no dead button, no `href="#"`, no no-op
handler and no un-typeable field anywhere in the product surfaces.** That is a
real result and it should be recorded as one.

**EVIDENCE.**
- `node scripts/audit/dead-controls.mjs`
- `apps/web/src/app/(site)/styleguide/page.tsx:239,249,252`

**SEVERITY.** Low.

**RECOMMENDED FIX.** Give the styleguide's specimens a `type="button"` and a
no-argument handler, or render them as links, so the sweep can run clean and a
future real fault is not lost in a known noise floor.

**EFFORT.** An hour.

---

## 11. `ComingSoon` is dead code carrying copy rule 13 bans

**FINDING.** `components/app/ComingSoon.tsx` renders a placeholder that says a
destination "will do" something and shows "a small mocked-up slice of the
future surface, clearly badged as a preview". Rule 13 bans *coming soon*, *not
live* and *preview* in UI copy outright. Nothing renders it any more - three
files mention it only in comments explaining what replaced it - so nobody sees
it, but it is a loaded gun in the tree and a component named after a promise.

**EVIDENCE.**
- `apps/web/src/components/app/ComingSoon.tsx:7-25`
- The only other mentions are comments: `app/admin/_components/AccessScreen.tsx:83`,
  `app/agent/verification/page.tsx:21`, `app/agent/analytics/page.tsx:20`

**SEVERITY.** Low.

**RECOMMENDED FIX.** Delete the file. `Unreachable` and `EmptyState` cover
every case it was reached for, honestly.

**EFFORT.** Minutes.

---

## 12. `/admin/audit` has no door from anywhere except itself and the dev harness

**FINDING.** The route inventory classes `/admin/audit` as reachable only from
inside its own folder and from `app/(dev)/preview/bc/audit`. An admin who does
not know the URL cannot find the audit desk from the console.

**EVIDENCE.** `node scripts/audit/route-inventory.mjs`, the row for
`/admin/audit` and its referrer list.

**SEVERITY.** Low, and it is an internal console.

**RECOMMENDED FIX.** Add it to the admin desk index the way the other desks
are listed.

**EFFORT.** Minutes.

---

## Things checked and found genuinely closed

Recorded because "we already fixed that" deserves evidence too, and because
four items `docs/HANDOFF_06.md` section 4 lists as outstanding are not.

- **The rent dead end.** `/rent/pay/[inspectionId]` exists, is reachable from
  `components/app/threads/RentalFace.tsx:247`,
  `app/(app)/rent/move-in/[listingId]/page.tsx:74` and
  `components/app/bookings/TenancyCard.tsx`, and every non-payable state is a
  designed screen (`app/(app)/rent/pay/[inspectionId]/page.tsx:36-38`). Card
  payment returns to the same route and settles through the same function the
  webhook calls (`lib/rent/return-path.ts:34`).
- **HANDOFF 06 item 7, the rent booking drawn as a one-night stay.** Closed.
  `lib/bookings/queries.ts:89,207,219` now branches on `rent_payments` and
  builds a separate `groups.rent` in tenancy words pointing at `/rent/pay`.
- **HANDOFF 06 item 6, the call control with no number.** Closed.
  `lib/messages/live.ts:448-458` loads `counterpartPhone`,
  `app/(app)/messages/[id]/ThreadView.tsx:620` renders the `tel:` control only
  when one exists, and `components/app/inspections/InspectionSheet.tsx:209`
  guards the same way.
- **HANDOFF 06 item 8, `lib/saved/places-actions.ts` with no UI caller.**
  Closed. Eight files import it, including `SaveControl`, `SavedBoard` and the
  four catalogue pages.
- **HANDOFF 06 item 12, `StayCategoryRail` as dead code.** Gone; nothing
  imports it.
- **The stays filter sheet.** Every one of the twelve filters reaches the RPC
  (`lib/stays/search.ts:146-165,261-276`), and the one filter that cannot be
  honoured - `near` a landmark, with zero landmarks seeded - says so on screen
  instead of silently ignoring it (`app/(app)/stays/search/page.tsx:91-93`).
  That is the right shape and the model for every other unhonourable filter.
- **"Clear all" on both surfaces.** `components/app/filters/ActiveFilters.tsx:235`
  renders only when `activeFilterCount(query) > 0` and clears through a real
  href; `components/app/assistant/AssistantSettingsSheet.tsx:104-113` disables
  itself at zero and says "No conversations to clear".
- **There is no Export control anywhere in the product**, so there is nothing
  to export nothing from.
- **Notifications.** `/notifications` reads real rows under RLS, has designed
  signed-out and unconfigured states, and the invented five-notification
  fallback is gone (`app/(app)/notifications/page.tsx:19-27`). Whether a row
  is written for each event could not be watched here.
- **Every route renders.** 231 routes, zero without a default export or an
  HTTP verb. Zero orphan pages. The nine orphan API routes are webhooks and
  cron endpoints, called from outside the tree by design.
