# Session 1 response: what exists, what is broken, what is missing

Written 13 October 2026 on `track/proposal`, read against `claude/rentme-v2-platform-audit-xuvg0a` at `e635763f` and the live database `uccixoonmbhrnyczyigt` (read only). This is the product and architecture audit behind [proposal/VALLO-UPGRADE-PROPOSAL.md](proposal/VALLO-UPGRADE-PROPOSAL.md). The older `docs/sessions/SESSION-1-RESPONSE.md` is a different, earlier session and is left as it is.

What I could not verify: nothing was run signed in, on a device, or against Paystack, LiveKit or Termii. "Verified by tests" below means unit tests with fixtures in the repo (`*.test.ts`), not an end-to-end run. Row counts are live on 13 October 2026.

## Defects found

Not fixed here. Each has a drafted fix where one is cheap; the lead routes them.

| # | Severity | What is wrong | Evidence | Fix |
|---|---|---|---|---|
| D-01 | High | Restaurant deposits are switched ON in production. HANDOFF section 2 says booking a table is free; DECISIONS_2026-10-13 lists deposits as "flag off". No rule rows yet, but any restaurant owner can insert one through RLS, and then the venue cannot confirm until the diner pays | `feature_flags.restaurant_deposits = true` (live); policy `restaurant_deposit_rules_owner_insert`; trigger `reservations_01_deposit_before_confirm`; `private.reservation_deposit_quote` reads the flag; `apps/web/src/lib/reservations/deposits.ts:7` | `supabase/migrations/pending/p1_a_restaurant_deposits_off.sql` (RESTAURANT-07) |
| D-02 | Medium | Restaurant covers can be oversold. `private.reservation_is_valid` sums party sizes and compares with `service_windows.covers` with no lock, so two inserts at the same moment both pass under READ COMMITTED | Live function body, the `select coalesce(sum(r.party_size), 0) into taken` block | `pending/p1_b_reservation_covers_lock.sql` (RESTAURANT-01). Hotel rooms are safe: `private.reserve_room_nights` uses one conditional UPDATE and checks the row count. Nightly listings are safe: exclusion constraint `bookings_no_overlap` |
| D-03 | Medium | "Ask me first" is enforced only in the app. `public.start_direct_conversation` checks profile and block only, and the `conversations_insert` policy lets a member insert a direct row. Calling either over REST opens a chat with somebody who asked for follow-first | `apps/web/src/lib/messages/direct.ts:90`, `apps/web/src/lib/social/message-door.ts:45`; live `start_direct_conversation`; policy `conversations_insert`. Already noted in HANDOFF section 6 item 5 | `pending/p1_g_direct_chat_contact_policy.sql` (SECURITY-03) |
| D-04 | Low today, blocking for assistant actions | The assistant accepts `assistant` turns from the browser and sends them to the model, so a client can put words in the assistant's mouth. Harmless while tools are read only; unsafe once tools can act | `apps/web/src/app/api/assistant/route.ts:896` (`parseTurns`), `:903`, `:1008` | AI-02 in batch 1 |
| D-05 | Medium | A viewing booked for later today gets a "Viewing tomorrow at ..." notice. The eve stage in `private.send_viewing_reminders` has a lower bound (19:00 the evening before) but no upper bound, so on the day itself, more than two hours before, it fires with the word "tomorrow" | Live `private.send_viewing_reminders`: `lagos >= ((r.slot_at at time zone 'Africa/Lagos')::date - 1) + time '19:00'` | Add `and lagos::date = (r.slot_at at time zone 'Africa/Lagos')::date - 1`. Route to `track/visit-ops`, which owns reminders. The drafted restaurant reminder avoids it |
| D-06 | Low | A restaurant on the listing spine (`reservations.listing_id`) skips the covers check entirely; the capacity block sits inside the business branch | Live `private.reservation_is_valid` | Only 2 demo listings use that spine and demo is refused (`refuse_transaction_on_demo_listing`). Retire the spine or copy the check when one goes live |
| D-07 | Medium | Leaked password protection is off in Supabase Auth | Supabase security advisor `auth_leaked_password_protection` (WARN) | Dashboard switch (SECURITY-01) |
| D-08 | Low | The host wizard asks before leaving on tab close, links and step jumps, but not on the browser or Android Back button | `apps/web/src/components/host/HostWizard.tsx:586` (beforeunload only, no popstate). HANDOFF section 6 item 4 | MOBILE-01 |
| D-09 | Low | Seven SECURITY DEFINER views are readable by anon. Two expose member ids: `person_badge` (every member with a role: user_id and tier) and `reviews_counted` (author_id) | Advisor `security_definer_view` (ERROR, 7 views); `has_table_privilege('anon', ...)` true for all seven | SECURITY-02 |
| D-10 | Low (docs) | Docs disagree with the live state: (a) DECISIONS "How it works" says the viewing ledger is `member_reminders`; live it is `viewing_reminders` via `private.send_viewing_reminders`. (b) MONEY_ARCHITECTURE says instant stay pay and room bookings are "off until" switched on; live `stays_instant_pay` and `room_bookings` are on. (c) DECISIONS row 15 says the ownership constraints still need widening; commit `af094569` says they were applied | `cron.job`, `feature_flags`, `git log` | Fixed on `track/docs`, 13 October 2026: DECISIONS names `viewing_reminders`, rows 15 and 20 to 23 updated; MONEY_ARCHITECTURE carries a live status block (switches on, d68d and d77 applied). ADMIN-02 guards flags in future |

Checked and clean: all `admin_*`, `staff_*`, `str_*` and `sanctions_*` SECURITY DEFINER functions that anon can execute contain an auth or role check (query over `pg_proc`); restaurant reservation writes are column-guarded by `private.guard_reservation_write`; booking prices are fixed by `private.price_booking_from_listing` and the guest service fee is forced to 0; the assistant checks same origin, consent, the `assistant` flag and a rate limit before calling the model.

## Classification of every relevant feature

States: **Verified** = implemented and covered by unit tests; **Incomplete** = implemented but missing part of the job; **Broken**; **UI only** = UI without backend; **Backend only** = backend without UI; **Untested**; **Missing**; **Blocked** = waits on an outside dependency; **Not now** = not for this release.

### AI layer

| Feature | State | Evidence |
|---|---|---|
| Global assistant (`/assistant`), streamed, persisted threads | Verified | `app/api/assistant/route.ts`, `components/app/assistant/AssistantChat.tsx`, `ai_conversations` (26), `ai_messages` (110); tests `lib/ai/*.test.ts`, `app/api/assistant/example-listings.test.ts` |
| Workspace assistants (agent, host) | Incomplete | `lib/assistant/workspace.ts`; `/agent/assistant`, `/host/assistant`. Only the prompt and starters change; no workspace data tools |
| Consent before any model call | Verified | `lib/ai/consent*.ts` and tests |
| Tools: search, compare, area posts | Verified (read only) | `route.ts` SEARCH_TOOL, COMPARE_TOOL, AREA_TOOL; `hrefForListing` keeps the side law |
| Typed tool registry | Missing | Tools are constants inside a 1,128 line route |
| Approval before any mutation, bound to the exact proposal | Missing | No mutating tool exists; no proposal table |
| Server revalidation, idempotency, audit for AI actions | Missing (parts exist to reuse) | `idempotency_records`, `audit_log`, server actions |
| Prompt-injection resistance | Incomplete | System rules and key-only workspace frames exist; client-sent assistant turns are trusted (D-04); tool output is not fenced |
| Grounded discovery with true cost | Incomplete | Search bounds rent only (tool description says so); prompt rule 4 tells the model to mention extra costs; `lib/listings/upfront.ts` and `lib/stays/door-total.ts` exist but are not used by the tool |
| Navigation help from a route registry | Missing as a tool | Registry exists: `lib/nav/route-labels.ts`, `lib/routing/known-routes.ts`; prompt hand-lists screens |

### Landlord and owner

| Feature | State | Evidence |
|---|---|---|
| Portfolio (buildings from my listings, let or vacant, mandate pitches) | Verified | `app/agent/portfolio`, `lib/landlord/portfolio*.ts`, RPC `my_buildings`, `mandate_*`; `portfolio.test.ts` |
| Units as a first-class record | Missing for property | `properties` (0 rows) is a dedupe key; `units` (0 rows) belongs to hotel room types |
| Tenancy created by a Vallo payment (reports, caution register, renewal clock, exit account, complaint pack) | Verified, Untested end to end | `lib/tenancy/*`, `app/(app)/tenancy/[id]`, `caution_*`, `tenancy_*` tables (all 0 rows); unit tests |
| Rent records kept apart from payments through Vallo | Missing | Only Vallo charges exist (`rent_payments`, `transactions`); no way to record rent received elsewhere |
| Renewals | Verified for Vallo tenancies | `offer_renewal`, `answer_renewal`, cron `vallo_remind_renewals`; `renewal.test.ts` |
| Maintenance lifecycle | Missing | No table, no route (the word appears only as "paused for maintenance") |
| Documents | Incomplete | Receipts (`receipt_codes`), tenancy reports, complaint pack page; no document shelf |
| Landlord line (SMS reconfirm to owners) | Backend only, switched off | `lib/landlord/sms-channel.ts`, flag `landlord_line = false` |
| Ownership document and "Ownership seen" | Incomplete | `OwnerRegisterForm`, `components/trust/OwnershipSeenMark.tsx`; not on search cards (HANDOFF) |

### Agent and realtor CRM

| Feature | State | Evidence |
|---|---|---|
| Enquiry desk (stage per thread, lost reasons) | Verified | `lib/enquiry/stage.ts`, `components/app/messages/StageControl.tsx`, `components/agent/EnquiryDesk.tsx`, `set_enquiry_stage`; `stage.test.ts` |
| Buyer and renter briefs | Verified | `lib/briefs/*`, `components/agent/BriefsDesk.tsx`; `brief.test.ts` |
| New-listing matching to saved searches | Verified | `listing_match_queue`, cron job runs (`cron.new-match-alerts.ok` in `audit_log`) |
| Broadcast import of WhatsApp listings | Verified | `lib/agent/broadcast*.ts` and tests |
| Viewing route for a day | Verified | `lib/viewings/route.ts`, `components/agent/SaturdayRoute.tsx`; `route.test.ts` |
| Follow-up reminders on leads | Missing | No date or task on an enquiry |
| Firm (agency) team and routing | Verified | `firm_members`, `firm_routing`, `app/agent/firm` |
| Analytics funnel | Verified | `app/agent/analytics`, `lib/agent/analytics-queries.ts` |

### Hotel

| Feature | State | Evidence |
|---|---|---|
| Room types, rate plans, rate calendar, inventory | Verified | `room_types` (11), `rate_plans` (22), `rate_calendar` (1,980), `room_inventory` (990); `lib/host/rate-calendar*.ts`, `RoomNightsEditor.tsx` |
| Concurrency-safe availability | Verified in SQL | `private.reserve_room_nights` (one conditional UPDATE, row count check); trigger `room_inventory_open_within_total` |
| Reservations (room requests, accept, decline, instant pay) | Verified, Untested end to end | `lib/host/room-booking-actions.ts`, `lib/stays/room-booking-actions.ts`; flags `room_bookings`, `stays_instant_pay` on |
| iCal import and export | Verified | `lib/host/ical.ts`, `calendar-sync.ts`, `calendar_feeds`, `calendar_imports` |
| Today view (waiting, upcoming) | Verified | `app/host/today.ts`, `HostTodayView.tsx`; `today.test.ts` |
| Arrivals, in house, departures with check-in and check-out | Missing | `booking_status` has no in-house state; no event table |
| Housekeeping | Missing | `units` table exists with 0 rows and no status |
| Charges at the door, arrival check | Verified | `lib/stays/arrival-*.ts`, `booking_arrival_checks` |
| Staff roles inside a hotel | Missing | Only `businesses.owner_id` |

### Short-let

| Feature | State | Evidence |
|---|---|---|
| Nightly calendar, block and open nights | Verified | `app/agent/listings/[listingId]/calendar`, `lib/agent/calendar-*.ts`, `availability` |
| No double booking | Verified in SQL | `bookings_no_overlap` (gist exclusion) |
| Pricing per night, cleaning fee | Verified | `price_booking_from_listing`, `bookings_total_chk` |
| Preparation nights between stays | Missing | Exclusion uses `during` only |
| Turnover tasks | Missing | |
| Cancellation presets | Verified | `lib/host/cancellation-presets.ts` and test |

### Restaurant

| Feature | State | Evidence |
|---|---|---|
| Reservation centre (requests, upcoming, past; confirm, decline, seated, no-show) | Verified | `app/host/reservations/*`, `lib/reservations/actions.ts`, `seating.ts`; tests |
| Service windows with covers | Verified, Broken under concurrency | `service_windows` (22); D-02 |
| Check-in code, did-you-dine, seating disputes, seated-only reviews | Verified | `lib/reservations/seating*.ts`, `reservation_seatings`, `reservation_reviews` |
| Fee per seated table (1,000 naira default) | Verified | `restaurant_seated_fees`, admin `restaurant-fees` |
| Deposits | Broken (on, should be off) | D-01 |
| Diner reminders | Missing | `send_member_reminders` covers viewings and rent only |
| Tables and sections, table assignment | Missing | No table entity |
| Waitlist and walk-ins | Missing | |
| No-show history visible to the venue | Missing | |
| Bill payment through Vallo | Blocked | Needs Paystack keys and venue subaccounts (HANDOFF section 6 item 2) |

### Inspections and visits

| Feature | State | Evidence |
|---|---|---|
| Request, propose, confirm, decline, withdraw, complete with outcome | Verified | `lib/inspections/*`, `inspection_requests` triggers (`guard_inspection_transition`, `inspection_columns_belong`) |
| Free slots from viewing windows | Verified | `viewing_windows`, `book_viewing_slot`, `viewing_slots` |
| Visit mode in person or video | Backend only, in progress | Column added (`20261013082713`); `track/visit-flow` builds the screen |
| Reminders both sides | Verified with a wording bug | D-05 |
| No-show report and dispute | Verified | `lib/inspections/no-show-actions.ts`, `no-show.test.ts` |
| Inspection report with photos, truth survey | Verified | `inspection_reports`, `inspection_truth`, tests |
| Video calls | Verified, Blocked here | `lib/calls/*`, flag `video_calls` on; LiveKit unreachable from the sandbox |
| Lister and admin calendars | In progress | `track/visit-ops` |

### Space Passport and trust

| Feature | State | Evidence |
|---|---|---|
| "Why trust this space" page | Verified | `app/(app)/listing/[id]/trust/page.tsx`, `lib/trust/*`, tests |
| Renter passport (shared in a thread) | Verified | `renter_passports`, `passport_shares`, `lib/trust/passport*.ts` |
| Named, shareable Space Passport with full cost | Missing | Trust page has no cost block and no share action |

### Browser, PWA and Capacitor

| Feature | State | Evidence |
|---|---|---|
| Service worker, offline shell, saved screens | Verified | `public/sw.js`, `lib/offline/*` tests |
| Native shells, deep links, back button, splash | Verified | `lib/native/*` (17 tests), `apps/web/android`, `apps/web/ios` |
| Push on iPhone | Blocked | `push_tokens` has 0 rows; needs Seyi's device (HANDOFF) |
| Manifest shortcuts for workspaces | Missing | `app/manifest.ts` |

### Admin, security, tests

| Feature | State | Evidence |
|---|---|---|
| Admin console with scoped staff | Verified | `docs/ADMIN_CONSOLE.md`, `staff_scope` enum, `lib/admin/*` (40+ tests) |
| Feature switches | Verified | `/admin/switches`; drift from docs found (D-01, D-10) |
| RLS on public tables | Verified with notes | 107 tables across `public` and `private` have RLS on and no policy (deny-all, server-only by design); D-09 |
| Auth hardening | Incomplete | D-07 |
| End-to-end signed-in tests | Missing | HANDOFF section 6 item 1 |
| Database probes | Verified (single session) | `supabase/tests/probes/` (about 110 SQL probes, `db-probes` CI job); `room-bookings.sql`, `d75a-restaurant-deposits.sql`, `direct-messages.sql` among them |
| Two-session concurrency probes | Missing | No probe opens two sessions; D-02 was found by reading the function |
