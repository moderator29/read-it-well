# Notifications map: every event, who is told, how, and what is still missing

Written 13 October 2026 on `track/notifications`, off the live database
(`uccixoonmbhrnyczyigt`, read only) and the code on the working branch. It
replaces nothing: `docs/email/WHAT_SENDS.md` is the per-template record and
`docs/push/THE_FORTY_EVENTS.md` is the 23 September push walk. Both predate the
payment, escrow and referral work and are partly stale; this is the current map.

## How a notice travels (one system, no second path)

```
event ──> private.notify(user, kind, title, body, href)      the ONE door for the bell
            │   honours the person's Bookings and Messages switches
            └─> public.notifications  ──> notifications_push_enqueue ──> push_queue
                                     └─> notifications_whatsapp_enqueue (flag off)
event ──> private.email_outbox_enqueue(user, template, dedupe key, payload)
            └─> public.email_outbox ──> /api/cron/email-outbox (every 15 min) ──> Resend
```

* **In app**: the bell and `/notifications`. Server actions that have to write
  with the service role (listing and application decisions, a host declining a
  booking, the admin table notice, staff notices, the saved search crons) go
  through `lib/notify/in-app.ts`, which applies the same Bookings and Messages
  switches as `private.notify`. See bug 1 below.
* **Push**: queued by a trigger on `public.notifications` when the person has a
  live device. Policy lives in `lib/push/policy.ts`: the per topic push switch
  (`settings.notifications.channels.<topic>.push`, falling back to the old
  Bookings, Messages, Wallet and Marketing booleans), quiet hours
  (`settings.notifications.quiet_hours`, wallet kind and urgent notices go
  through), collapse by kind, expiry after 12 hours. The lock screen text is in
  the person's language from `packages/i18n/src/locales/drafts/push-text.ts`
  (Hausa, Yoruba, Igbo, machine drafts awaiting a native speaker). Anything not
  in that catalogue is sent in English, whole.
* **Email**: two routes. The outbox (a trigger writes the row in the same
  transaction as the event, unique dedupe key, durable, drained every 15
  minutes) and direct sends from server actions (`bestEffortEmail`, no queue).
  Templates answer to the Bookings or Messages switch only where the registry
  says so (`lib/notify/templates.ts`). Money, security and agreement mail answer
  to nothing, by decision.
* **SMS** is rationed to six money and deadline moments plus security
  (`lib/notify/channel-policy.ts`). Not touched here.
* **Dedupe**: the outbox by key; the new notices through `private.notify_once`
  (migration nt01), a key per event.

Legend. **Done**: works today. **Filled**: gap closed by this track (SQL in
`supabase/migrations/pending/`, applied by the lead). **Gap**: still open, with
the reason. **By design**: deliberately silent.

## 1. Account

| Event | Who | In app | Push | Email | Words and link | State |
|---|---|---|---|---|---|---|
| Sign-up welcome | the new member | no | no | yes, `account.welcome`, once per account | Welcome email, six versions by declared role; button to the app | Done (email only, on purpose: the person is already in the app) |
| Phone number confirmed | the member | **new** | yes (follows the bell) | no | "Phone number confirmed" / "The number ending 5678 is now confirmed on your account." `/settings/phone` | **Filled** (nt04) |
| Password changed | the member | **new** | yes | yes, `security.password_changed` | "Your password was changed" / "If this was you, there is nothing to do. If it was not, open Devices to sign out other devices, then reset your password." `/settings/devices` | **Filled** in app and push (nt04); email was done |
| Email address changed | the member | n/a | n/a | n/a | The address never changes: the auth hook refuses `email_change`, and recovery has its own two emails | By design |
| New sign-in on a new device | the member | yes (from the second device on) | yes | yes, `security.new_device_sign_in` | "New sign-in to Vallo" / device words, link to `/settings/devices/alert?d=...` with "This was not me" | Done |
| Verification or reset code | the member | never | never | auth hook | A one time code is never put on a lock screen | By design |
| Payment card or bank account added, made default, removed | the member | yes (`announce`) | yes | yes, `paymentInstrumentChanged` | "A saved card was removed" and the others, `/settings/payments` | Done |
| Account deletion started and completed | the member | no | no | yes, both | Deletion letters | Done (email only: nothing to buzz about) |

## 2. Visits (viewings)

| Event | Who | In app | Push | Email | Words and link | State |
|---|---|---|---|---|---|---|
| Visit requested | the lister | yes | yes | no | "Inspection requested" / "Video visit requested", `/agent/inspections` | Done (no email: the lister is told in app and push) |
| Visit confirmed or booked | renter and lister | yes | yes | yes, `inspection.scheduled` | "Viewing booked" / "Inspection confirmed", visit page `/listing/<id>/visit/<id>` | Done |
| New time proposed | the renter | yes | yes | yes, `inspection.proposed` | "Another time offered" / "Viewing moved" | Done |
| Time accepted | the lister | yes | yes | no | "Inspection time accepted" | Done |
| Declined or cancelled by the lister | the renter | yes | yes | yes, `inspection.declined` | "Inspection declined" / "Viewing cancelled" with the lister's note | Done |
| Withdrawn by the renter | the lister | yes | yes | yes, `inspection.withdrawn` | "Inspection withdrawn" / "Viewing cancelled" | Done |
| Visit complete | both | yes | yes | yes, `inspection.completed` | "Inspection complete" | Done |
| Reminders: 7pm the evening before, two hours before, 8am on the day | renter and lister | yes | yes | no | Says the mode (in person or video); `private.send_viewing_reminders` | Done |
| No-show reported, disputed, ruled | both | yes | yes | no | "Marked as a no-show", "No-show disputed", "No-show stands" / "removed" | Done |
| Delegate asked, answered, code changed | lister, renter, delegate | yes | yes | no | "You have been asked to show an inspection" and the others | Done |
| Back from the inspection? | the renter | yes | yes | no | "Are you back from your inspection?" | Done |
| Video visit starting | the callee | yes, as a call | yes | no | "Incoming video call" / "<name> is calling you on Vallo." | Done |

## 3. Messages and calls

| Event | Who | In app | Push | Email | Words and link | State |
|---|---|---|---|---|---|---|
| New message | the other person | yes | yes | first message of an enquiry only (`listing.new_enquiry`) | "New message" / first 120 characters, `/messages/<id>` or `/agent/messages/<id>` | Done |
| Messages left unread for two hours | the recipient | no (already in the bell) | no | **new**, `message.unread` | "You have unread messages", one email per unread run, never for the first message, answers to the Messages switch | **Filled** (nt05) |
| Missed call, busy, cancelled after ringing | the callee | yes | yes | no | "Missed video call" / "<name> tried to call you." | Done |
| Review team call asked, moved, cancelled, answered | the member, staff | yes | yes | no | "A video call with Vallo, ..." `/calls/reviews/<id>` | Done |
| Support replied | the member | yes | yes | yes, `support.replied` | "Support replied" / "Ticket <ref> has a new reply." `/support/messages/<id>` | Done (the old `/settings` link bug is gone) |
| Follow-up due | the agent | yes | yes | no | "Follow up today" | Done |

## 4. Agreements and money

| Event | Who | In app | Push | Email | Words and link | State |
|---|---|---|---|---|---|---|
| Agreement drawn up, waiting | both | yes | yes | yes, `agreement.waiting` | "Agreement waiting for you" `/agreements/<id>` | Done |
| Both confirmed (in review) | both | **new** | yes | yes, `agreement.submitted` | "Both of you confirmed" / "... is with Vallo for a check before payment opens." | **Filled** in app and push (nt04) |
| Approved, payment open | both | yes | yes | yes, `agreement.approved` | "Agreement approved: payment is open" | Done |
| Sent back | both | yes | yes | yes, `agreement.rejected` | "Agreement sent back" with the reason | Done |
| Cancelled | both | **new** | yes | yes, `agreement.cancelled` | "Agreement cancelled" | **Filled** in app and push (nt04) |
| Payment received, stay or hotel room | the host, and the guest when the booking was already confirmed | **new** | yes | host: **new** `payment.host_received`; guest: `bookingConfirmed` (direct) | "Payment received" / "<place> for 16 Oct to 19 Oct is paid. Your share, NGN 270,000.00, goes straight to the bank account on your payout details." host `/agent/bookings` or `/host/bookings`, guest `/bookings/<id>` | **Filled** (nt02). The hotel room host share is the transaction's own `lister_share_minor` |
| Payment received, rent (move-in) | tenant and landlord | yes (`Rent paid`, `Rent received`) | yes | payer: **new** `payment.rent_receipt` | "Rent paid", "Rent received", shares: "A share of the move-in was paid" `/tenancy/<id>` | Done in app; receipt email **Filled** (nt02) |
| Flatmate invited, answered, share refunded | tenant, flatmates, landlord | yes | yes | no | "You were invited to share a move-in", "Your move-in share is being refunded" | Done |
| Protected payment funded | renter and lister | **new** | yes | no | "Your payment is protected" / "A protected payment is in", `/agreements/<id>`. Words from `lib/money/copy.ts`: held by the licensed partner, Vallo does not hold it | **Filled** in app and push (nt02). Email: **Gap**, the protected rail is not live, so no email is written yet |
| Release asked, released, refunded, split, disputed (protected) | renter, lister | **new** | yes | no | "The renter confirmed", "Payment released", "Your payment is refunded", "Payment split", "Payment under dispute" | **Filled** in app and push (nt02). Email gap as above |
| Card refund | the guest | yes | yes | yes, `bookingRefunded` | "Refund on its way" / "Cancellation recorded" | Done |
| Refund requested, decided | the guest | yes (decided) | yes | yes, `refund.requested` | "Support answered your refund request" `/bookings/<id>` | Done |
| Payout sent or failed, host side | n/a | n/a | n/a | n/a | A host's share settles straight to their bank by the processor at the moment of payment, so Vallo has no payout to announce | By design (the "Payment received" notice says where the share goes) |
| Payout account added or removed | the lister | yes | yes | yes (`paymentInstrumentChanged:bank`) | "Payout account added" ... "If this was not you, contact support now." `/agent/earnings` | Done |
| Referral reward payout sent, arrived, failed | the member | **new** | yes | no | "Your payout is on its way", "Your payout arrived", "Your payout did not go through" with the last four digits, `/rewards/history` | **Filled** (nt03) |
| Guarantee claims | claimant | yes | yes | yes | "Guarantee claim approved" | Done (retired product, kept for open claims) |

## 5. Bookings and stays

| Event | Who | In app | Push | Email | Words and link | State |
|---|---|---|---|---|---|---|
| Request sent | guest; host | yes, both | yes | yes, both (`bookingRequested`, `bookingRequestedHost`) | "Booking request sent"; "New booking request" | Done |
| Instant booking: pay to keep | guest | yes | yes | no | "Pay to keep your booking" `/checkout/<id>` | Done |
| Accepted (confirmed) | guest | yes | yes | yes (`bookingConfirmed`, `stayArrivalDetails`) | "Booking confirmed" | Done |
| Declined by the host | guest | yes (two rows: the general one and the host's reason) | yes | **new**, `booking.request_closed` | "Booking cancelled" and "Your booking request was not accepted" with the reason | **Filled** email (nt06). The two in-app rows are the existing design |
| Request lapsed, or closed by staff | guest | yes ("Booking cancelled") | yes | **new**, same template | as above | **Filled** email (nt06) |
| Cancelled by the guest | guest; host | yes, both | yes | guest (`bookingCancelled`) | "Booking cancelled" | Done |
| Host reminded to decide | host | yes | yes | no | "A room request lapses soon" / "A table request is still waiting" `/host/decide` | Done |
| Check-in tomorrow (from 17:00 Lagos) | guest | **new** | yes | no | "Check-in tomorrow" / "<place>: you check in on Friday 16 Oct. Open your booking for the arrival details." `/bookings/<id>` | **Filled** (nt05) |
| Check-in day (from 08:00) | guest; host | **new** | yes | no | "Check-in today"; host "A guest arrives today" | **Filled** (nt05) |
| Check-out day | guest | **new** | yes | no | "Check-out today" | **Filled** (nt05) |
| Stay complete | guest; host | yes, both | yes | no | "Stay complete" | Done |
| Review request | guest | **new** | yes | **new**, `stay.review_request` | "How was your stay?" `/bookings/<id>/review`, once, the day after check-out, for 14 days, only while no review exists | **Filled** (nt05) |
| No-show recorded | guest; host | yes | yes | no | "Stay recorded as not attended" | Done |
| Calendar sync trouble | host | yes | yes | no | "Calendar sync needs a look", "A night may be booked twice" | Done |
| Review received, answered, contested, decided | host; guest | yes | yes | no | "New review", "The host answered your review", "We hid the review you asked about" | Done |

## 6. Restaurants

| Event | Who | In app | Push | Email | Words and link | State |
|---|---|---|---|---|---|---|
| Table requested | the restaurant | yes | yes | no | "Table requested at <venue>" `/host/reservations` | Done |
| Request still waiting | the restaurant | yes | yes | no | "A table request is still waiting" | Done |
| Confirmed | the diner | yes | yes | yes, `reservation.confirmed` | "Your table is confirmed" `/bookings` | Done |
| Declined or cancelled | the diner | yes | yes | yes, `reservation.cancelled` | "Your table is not going ahead" | Done |
| Reminders: evening before from 7pm, two hours before | the diner | yes | yes | no | "Your table tomorrow at 19:00 Lagos time", "Your table at 19:00 Lagos time" | Done |
| Marked seated | the diner | no | no | no | The diner is at the table; the card shows it | By design |
| Marked not arriving | the diner | yes | yes | no | "Marked as not arriving" | Done |
| Did you dine? (unmarked after 24 hours) | the diner | yes | yes | no | "Did you dine at <venue>?" | Done |
| How was your meal? | the diner | **new** | yes | no | "How was your meal?" `/bookings?side=stays`, two hours after being seated, for 7 days, no open dispute, no review yet | **Filled** (nt05) |
| Deposit paid, bill paid | diner; restaurant | yes | yes | no | "Deposit paid", "Bill paid" (both off while the flags are off) | Done |

## 7. Listings

| Event | Who | In app | Push | Email | Words and link | State |
|---|---|---|---|---|---|---|
| Submitted for review | the lister | no | no | yes, `listing.submitted` | Receipt email | Done (they are on the screen that says it was filed) |
| Passed review, live, not approved, needs changes | the lister | yes | yes | yes (four builders) | "Listing is live", "Listing not approved" with the note | Done |
| Closed because the flat was let; paused for reconfirmation; owner asked if still free | lister and followers | yes | yes | no | "Your listing was closed because the flat has been let", "Listing paused: please reconfirm it" | Done |
| Account stopped or reinstated | the lister | yes | yes | no | "Your account has been stopped" | Done in app. Email: **Gap** (a stop is serious and deserves a letter; it is in `suspend_agent`, a function the track does not own) |
| Price drop, gone, back (saved) | savers | yes | yes | saved price drop yes | "Price down on a place you saved" | Done |
| Mandate running out (30 and 7 days) | the lister | yes | yes | no | "Your mandate is running out" | Done |
| Mandate approved or rejected (ownership proof decided) | the lister | **new** | yes | no | "We confirmed who you are letting for"; "Your mandate was not approved: <reason>" `/agent/listings/<id>/mandate` | **Filled** (nt04) |
| Ownership seen | the lister | **new** | yes | no | "Ownership seen" / "A reviewer saw your proof of ownership for <title>. ... It is not a title search." | **Filled** (nt04) |
| Owner confirmation lapsed: confirm who you are letting for | the lister | yes | yes | no | "Confirm who you are letting for" | Done |

## 8. Social

| Event | Who | In app | Push | Email | Words | State |
|---|---|---|---|---|---|---|
| New follower | the followed | yes (`notify_social`: not self, not blocked, not muted) | yes, collapsed by kind | no | "New follower" / "@name started following you." | Done |
| Reply, mention, like, repost | the author | yes | yes | no | "New reply", "You were mentioned", "Somebody liked your post" | Done |
| Story reaction or comment | the story's author | yes | yes | no | one function, `notify_story_event` | Done |
| Post, story, comment, bio or event held, restored, removed | the author | yes | yes | no | 12 moderation notices | Done |
| Badge earned | the member | yes | yes | no | "You earned <badge>" | Done |
| Story viewed | n/a | n/a | n/a | n/a | `story_views` stores only an anonymous day bucket (`viewer_bucket`), so there is no one to name | By design |

## 9. Referrals

| Event | Who | In app | Push | Email | Words and link | State |
|---|---|---|---|---|---|---|
| Invite joined | the referrer | **new** | yes | no | "Someone joined with your invite" / "They need to finish a few steps, such as confirming a phone number, before the invite counts." `/rewards/referrals` | **Filled** (nt03) |
| Phone confirmed (or the other step) so the invite counts | the referrer | **new** | yes | no | "Your invite counts" / "NGN 1,000.00 is waiting out its review period." One neutral line, whether or not a check happened | **Filled** (nt03) |
| Reward available | the referrer | **new** | yes | no | "Your referral reward is available" `/rewards` | **Filled** (nt03) |
| Invite did not count; reward taken back | the referrer | **new** | yes | no | "An invite did not count"; "A referral reward was taken back" | **Filled** (nt03) |
| Withdrawal requested | the member | n/a | n/a | n/a | They just asked on that screen | By design |
| Payout sent, arrived, failed | the member | **new** | yes | no | see section 4 | **Filled** (nt03) |

## 10. Workspace applications (owner, agent, firm, professional, host)

| Event | Who | In app | Push | Email | Words and link | State |
|---|---|---|---|---|---|---|
| Submitted | the applicant | yes ("Your owner registration is filed") | yes | no | "Filed as VL-AGT-...", `/profile/application` | Done |
| Approved, more information, not approved | the applicant | yes | yes | yes (`agentApplicationApproved`, `...NeedsMore`, `...Rejected`) | "Your agent registration is approved" with the reviewer's note | Done |
| Verification document accepted or sent back | the agent | yes | yes | yes, `verification.rung_passed` / `rung_failed` | "A document was approved" / "A document needs redoing" | Done |
| Verification level changed | the agent | yes | yes | no | "You are now <tier> on Vallo" | Done |
| Host business decisions and transfers | the host | yes | yes | no | "Somebody wants to hand you a business" and the others | Done |

## 11. Admin facing

| Event | Who | State |
|---|---|---|
| New work in a scoped queue (agreements, listings, reports, tickets) | staff holding the scope (`announce_new_work`, `tell_scope`) | Done |
| Staff access granted, changed, ended; security key added or removed; new place sign-in | the staff member, super admins | Done |
| Suspected structuring cases | compliance staff (`str_tell_staff`) | Done |
| Review call answered | the staff member who asked | Done |
| Ticket returned from escalation | the escalator | Done |
| Failed jobs, push drain, email outbox, catalogue canary | the alert desk (`risk_alerts`) | Done (not part of this track) |

## What this track filled, and how

| Migration (pending) | What | Probe |
|---|---|---|
| `nt01_notice_helpers` | `private.notice_keys`, `private.notify_once` (one key per event), `private.notice_failed` (reports a swallowed notice failure as a log warning and one open alert) | `nt01-notice-helpers` |
| `nt02_payment_and_protected_payment_notices` | payment received (host, guest) and the host and rent receipt emails; protected payment states. A failure in either trigger is caught and reported, never raised | `nt02-...` |
| `nt03_referral_notices` | referral and reward payout notices | `nt03-referral-notices` |
| `nt04_account_agreement_and_listing_notices` | password changed, phone confirmed, both confirmed and cancelled agreements, mandate decided, ownership seen | `nt04-...` |
| `nt05_stay_reminders_and_unread_message_email` | check-in, check-out, host arrival, review requests, unread message email, folded into the existing `vallo_send_member_reminders` job | `nt05-...` |
| `nt06_booking_request_closed_email` | email when a stay request is closed by anybody but the guest | `nt06-...` |

Apply in order, before the app of this branch is deployed (the drain drops a
row whose template the running code does not know): nt01, nt02, nt03, nt04,
nt05, nt06. The order against the payment files (`pov01` to `pov07` first, then
these, then the deploy), a check and an undo for each file, and the dry run
evidence are in `docs/payments/RELEASE_RUNBOOK.md`. **The cron job count is unchanged** (`PG_CRON_JOBS` and the table in
`docs/ADMIN_CONSOLE.md` keep their counts; the existing sweep
`private.send_member_reminders` simply calls two more functions, each inside its
own exception block). The description of `vallo_send_member_reminders` in
`PG_CRON_JOBS` and in `docs/ADMIN_CONSOLE.md` should gain "stay days, review
requests and unread message email" in the commit that records nt05 as applied;
it is left as it is until then because the SQL is not live.

New outbox templates (all registered in `lib/notify/templates.ts`):
`payment.host_received`, `payment.rent_receipt`, `stay.review_request`,
`message.unread`, `booking.request_closed`.

## Settings and quiet rules, as they apply to the new notices

* Kinds: stay, agreement and booking notices use `booking` (the Bookings switch
  applies in app and on the lock screen); mandate and ownership use `listing`
  (the listings push switch); referral, account and security use `system` (no
  switch claims them, like a support reply).
* Scheduled notices (check-in, check-out, review requests, unread email) are
  not sent before 08:00 or from 21:00 Lagos, and the evening reminder starts at
  17:00. A person's own quiet hours still apply to the push on top.
* Email: `stay.review_request` answers to Bookings, `message.unread` to
  Messages, `booking.request_closed` to Bookings. Money, security and the
  receipt emails answer to nothing.

## Bugs and defects found

1. **Direct inserts skipped the person's switches.** `announce()` (listing and
   application decisions), the host's decline row, the admin reservation notice
   and the staff notices inserted into `public.notifications` directly, so the
   Bookings and Messages switches that `private.notify` applies did not apply to
   them. Fixed in the app, with no new SQL: `lib/notify/in-app.ts`
   (`writeInAppNotice`, `writeInAppNotices`) reads the same switches the same
   way (only an explicit false silences, a failed read writes the notice) and
   is now the only place in the app that inserts into the table; a source scan
   in `in-app.test.ts` keeps it so. Twelve writers in eleven files were moved: `announce`, the
   host decline, the admin reservation notice, the admin business, payment
   method, staff and verification notices, the registration filed notice, the
   two Around notices, and the saved search and new match crons. Only the two
   booking-kind writers were affected in practice, because no switch governs
   the other kinds. Two database functions also insert directly
   (`public.answer_brief`, kind `listing`, and `private.threshold_reminders_due`,
   kind `system`); neither kind is governed by a switch, so nothing is bypassed
   and they are left alone. Push still honours the per topic switch for all of
   them.
2. **Stay payment told nobody in app** (the gap behind the payment notice). A
   stay the host had already accepted, or an instant booking, is confirmed
   before the card is charged, so no status moves and the host heard nothing.
   Fixed by nt02.
3. **A declined booking request had no email.** Fixed by nt06.
4. **Stale docs.** `docs/email/WHAT_SENDS.md` still lists the retired wallet and
   escrow emails in its tables and says no payment email exists; this map and
   the note appended to that file are current.
5. **Email footers gave no way to the settings and a thin company line**
   ("Abuja, Nigeria"). Fixed by the redesign: every email now links
   notification settings and help, and carries the full legal line.

## Still open

* No email for protected payment states (the rail is not live; the notices are
  in app and push).
* No email when an agent account is stopped (`private.suspend_agent`, owned by
  the compliance work).
* The five Supabase auth fallback templates (`supabase/templates`) keep the old
  dark layout; the Send Email Hook renders the live ones from the new layout.
  They carry the new company line.
* Hausa, Yoruba and Igbo push text for the new notices is a machine draft, in
  the same state as the rest of the catalogue, until a native speaker signs it.
* Nothing here has reached a real device or inbox from this sandbox: the egress
  proxy refuses the providers, and the database was read only.
