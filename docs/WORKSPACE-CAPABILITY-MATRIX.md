# Workspace capability matrix

13 October 2026, branch base `e635763f`, live database read only. States follow [SESSION-1-RESPONSE.md](SESSION-1-RESPONSE.md). Decisions point at proposal IDs in [proposal/VALLO-UPGRADE-PROPOSAL.md](proposal/VALLO-UPGRADE-PROPOSAL.md). Paths are under `apps/web/src/` unless they start with `supabase/`.

| Feature | State | Code | Tables | Depends on | Tests | Decision |
|---|---|---|---|---|---|---|
| Global assistant | Verified | `app/api/assistant/route.ts`, `components/app/assistant/*` | `ai_conversations`, `ai_messages` | `ANTHROPIC_API_KEY`, flag `assistant` | `lib/ai/*.test.ts`, `app/api/assistant/example-listings.test.ts` | Keep; AI-01, AI-02 |
| Workspace assistants | Incomplete | `lib/assistant/workspace.ts`, `app/agent/assistant`, `app/host/assistant` | same | as above | `lib/assistant/workspace.test.ts` | AI-05, AI-06 |
| Tool registry | Missing | tools inline in `route.ts` | none | none | none | AI-01 |
| Approval-bound actions | Missing | none | reuse `idempotency_records`, `audit_log` | AI-01, AI-02 | none | AI-03 |
| True-cost discovery | Incomplete | `lib/listings/upfront.ts`, `lib/rent/ledger.ts`, `lib/stays/door-total.ts` (not wired to the tool) | `listings` | AI-01 | `upfront.test.ts`, `door-total.test.ts` | AI-04 |
| Route help | Missing (registry exists) | `lib/nav/route-labels.ts`, `lib/routing/known-routes.ts` | none | AI-01 | `known-routes.test.ts` | AI-05 |
| Landlord portfolio | Verified | `app/agent/portfolio`, `lib/landlord/portfolio*.ts` | RPC `my_buildings`, `mandate_*` | listings | `portfolio.test.ts` | Keep |
| Tenancy (paid through Vallo) | Verified, untested end to end | `lib/tenancy/*`, `app/(app)/tenancy/[id]` | `rent_payments`, `tenancy_*`, `caution_*` | Paystack | 9 test files | Keep; TEST-01 |
| Recorded rent (outside Vallo) | Missing | none | none | founder pick 2 | none | LANDLORD-01 |
| Maintenance | Missing | none | none | LANDLORD-01 | none | LANDLORD-02 |
| Renewals | Verified (Vallo tenancies) | `lib/tenancy/renewal.ts` | `tenancy_renewal_*` | cron `vallo_remind_renewals` | `renewal.test.ts` | LANDLORD-03 extends |
| Landlord SMS line | Backend only, off | `lib/landlord/sms-channel.ts` | `owner_heartbeats` | Termii, flag `landlord_line` | `sms-channel.test.ts` | Leave off |
| Enquiry desk | Verified | `lib/enquiry/*`, `components/app/messages/StageControl.tsx`, `components/agent/EnquiryDesk.tsx` | `enquiry_stages` | messaging | `stage.test.ts` | Keep; AGENT-01 adds dates |
| Follow-ups | Missing | none | none | none | none | AGENT-01 (`p1_e`) |
| Briefs | Verified | `lib/briefs/*`, `components/agent/BriefsDesk.tsx` | `briefs`, `brief_answers` | none | `brief.test.ts` | AGENT-02 later |
| Viewing day route | Verified | `lib/viewings/route.ts`, `components/agent/SaturdayRoute.tsx` | `inspection_requests` | none | `route.test.ts` | Keep (visit-ops area) |
| Room types, rates, inventory | Verified | `lib/host/rate-calendar*.ts`, `components/host/RoomNightsEditor.tsx` | `room_types`, `rate_plans`, `rate_calendar`, `room_inventory` | none | `rate-calendar.test.ts`, `inventory.test.ts` | Keep |
| Room booking concurrency | Verified in SQL | `private.reserve_room_nights` | `room_inventory` | none | probe `room-bookings.sql` | Keep; TEST-02 adds two-session probe |
| Front desk (arrivals, in house, departures) | Missing | `app/host/bookings`, `app/host/today.ts` (lists only) | none | none | `today.test.ts` | HOTEL-01 (`p1_f`) |
| Housekeeping | Missing | none | `units` (0 rows, unused) | HOTEL-01 | none | HOTEL-02 |
| Hotel staff roles | Missing | none | `businesses.owner_id` only | none | none | HOTEL-03 (future) |
| Short-let calendar | Verified | `app/agent/listings/[listingId]/calendar`, `lib/agent/calendar-*.ts` | `availability`, `bookings` | none | none found | Keep |
| No double booking (nightly) | Verified in SQL | constraint `bookings_no_overlap` | `bookings` | none | probe `calendar-holds.sql` | Keep |
| Preparation nights | Missing | none | none | none | none | SHORTLET-01 |
| Restaurant reservation centre | Verified | `app/host/reservations/*`, `lib/reservations/*` | `reservations`, `service_windows` | none | `actions.test.ts`, `board.test.ts`, `seating.test.ts` | Keep |
| Covers check | Broken under concurrency | `private.reservation_is_valid` | `reservations`, `service_windows` | none | none | RESTAURANT-01 (`p1_b`) |
| Seated fee | Verified | `lib/reservations/seating.ts`, `app/admin/restaurant-fees` | `reservation_seatings`, `restaurant_money_settings` | none | `seating.test.ts` | Keep |
| Deposits | Broken (live on) | `lib/reservations/deposit*.ts` | `restaurant_deposit_rules`, `reservation_deposits` | flag | `deposits.test.ts`, probe `d75a` | RESTAURANT-07 (`p1_a`) |
| Diner reminders | Missing | none | none | cron | none | RESTAURANT-02 (`p1_c`) |
| Tables, waitlist | Missing | none | none | founder pick 5 | none | RESTAURANT-03, 04 |
| Diner kept and missed counts | Missing | none | `reservations` | founder pick 3 | none | RESTAURANT-06 (`p1_d`) |
| Bill payment | Blocked | `lib/reservations/seating-actions.ts` (`payTableBill`) | `restaurant_bills` | Paystack keys, subaccounts | `seating.test.ts` | RESTAURANT-08 |
| Inspections | Verified | `lib/inspections/*` | `inspection_requests`, `viewing_windows` | none | 14 test files | Keep (other tracks) |
| Visit mode | In progress | column `visit_mode` | `inspection_requests` | `track/visit-flow` | none yet | Not proposed |
| Viewing reminders | Verified, wording bug | `private.send_viewing_reminders` | `viewing_reminders` | cron | none | D-05 to visit-ops |
| Video calls | Verified, blocked here | `lib/calls/*` | `calls`, `call_*` | LiveKit, flag `video_calls` | 6 test files, probe `vc1-video-calls.sql` | VISIT-01 |
| Trust page | Verified | `app/(app)/listing/[id]/trust`, `lib/trust/*` | views `listing_credentials`, `door_honesty`, `listing_truth_summary` | none | `lib/trust/*.test.ts` | PASSPORT-01 |
| Ownership seen mark | Incomplete | `components/trust/OwnershipSeenMark.tsx` | `listing_ownership_seen_at` | none | none found | PASSPORT-02 |
| PWA and offline | Verified | `public/sw.js`, `lib/offline/*` | none | none | 8 test files | MOBILE-02 adds shortcuts |
| Native shells | Verified | `lib/native/*`, `apps/web/android`, `apps/web/ios` | `push_tokens` (0 rows) | store review, device | 17 test files | MOBILE-03 blocked |
| Host wizard leave guard | Incomplete | `components/host/HostWizard.tsx:586` | none | none | none for popstate | MOBILE-01 |
| Admin console | Verified | `app/admin/*`, `lib/admin/*` | `staff_grants`, `audit_log` | none | 40+ test files | ADMIN-01, ADMIN-02 |
| Direct chat contact policy | Incomplete (app only) | `lib/messages/direct.ts`, `lib/social/message-door.ts` | `conversations`, `social_profiles`, `follows` | none | `direct.test.ts`, `message-door.test.ts`, probe `direct-messages.sql` | SECURITY-03 (`p1_g`) |
| Auth password checks | Incomplete | Supabase Auth setting | none | dashboard | none | SECURITY-01 |
| Anon views with member ids | Incomplete | views `person_badge`, `reviews_counted` | as named | none | none | SECURITY-02 |
| Signed-in end-to-end tests | Missing | `lib/testing/*` (Playwright helpers exist) | none | seeded accounts | none | TEST-01 |
