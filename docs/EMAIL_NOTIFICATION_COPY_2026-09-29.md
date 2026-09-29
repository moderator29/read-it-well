# Emails and notifications, as they land on a phone (29 September 2026)

Reference: `docs/design/references/2026-09-29/32-notification-lockscreen.jpg`. Spec: `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 11.

A phone shows three lines: **the sender**, **the subject in bold**, then **one line of preview**. Everything below is written for that view.

- **Sender:** always `Vallo <hello@vallospaces.com>` (`DEFAULT_FROM` in `apps/web/src/lib/email/client.ts`). Every platform email goes through `sendEmail`, so none of them has another sender. The Supabase auth sender is set in the dashboard SMTP settings, and its name must also be "Vallo".
- **Subject:** 45 characters or fewer, the fact first, no full stop. A long listing title is cut at its first comma or at a word (`fitSubject` in `apps/web/src/lib/email/render.ts`).
- **Preheader:** one line, 90 characters or fewer, giving the fact the subject leaves out (who, when, how much). It never repeats the subject and never opens with a greeting. After it comes about 180 invisible padding characters (`PREHEADER_PAD`), so body text cannot fill out the preview.
- **Push and in-app:** title 40 characters or fewer, body 110 or fewer. The push drain now cuts anything longer at a word (`fitPush` in `apps/web/src/lib/push/copy.ts`).
- **Tests:** `apps/web/src/lib/email/messages.test.ts` runs every fixture in `apps/web/src/lib/email/fixtures.ts` against these limits and fails on any breach.

The numbers in brackets are character counts. The examples use deliberately awkward sample data, such as the listing "Two bedroom flat, Herbert Macaulay Way, Yaba".

## Every email


### Account and security (sent by the app)

**Vallo** · `verificationCode`  
**482 913 is your Vallo code** (26)  
It works once and expires in 10 minutes. (40)

**Vallo** · `passwordReset`  
**Set a new Vallo password** (24)  
The link works once and expires in 30 minutes. (46)

**Vallo** · `passwordChanged`  
**Your Vallo password was changed** (31)  
Changed 22 Sept 2026, 14:05. If this was not you, set a new one now. (68)

**Vallo** · `emailRecoveryOpened`  
**Your email address is changing** (30)  
Moving to a***@example.com on 26 September 2026, 14:05, unless you stop it. (75)

**Vallo** · `emailRecoveryCompleted`  
**Your Vallo email address changed** (32)  
Your account now signs in with a***@example.com. (48)

**Vallo** · `newDeviceSignIn:bare`  
**New sign-in to your Vallo account** (33)  
A device your account has not seen before signed in. (52)

**Vallo** · `newDeviceSignIn:detailed`  
**New sign-in to your Vallo account** (33)  
Chrome on Windows near Abuja, Nigeria signed in on 22 Sept 2026, 14:05. (71)


### Supabase auth templates (subject set in the dashboard)

**Vallo** · `supabase:confirmation`  
**Confirm your Vallo email** (24)  
Tap the button or enter the code, and your account is ready. (60)

**Vallo** · `supabase:magic-link`  
**Your Vallo sign-in link** (23)  
It works once and expires shortly. Nobody from Vallo will ask for it. (69)

**Vallo** · `supabase:recovery`  
**Set a new Vallo password** (24)  
The link works once. If you did not ask, ignore this. (53)

**Vallo** · `supabase:email-change`  
**Confirm your new Vallo address** (30)  
Nothing changes until you approve it from this email. (53)

**Vallo** · `supabase:invite`  
**You have been invited to Vallo** (30)  
Accept it and your account is set up in a moment. (49)


### Welcome

**Vallo** · `welcome:renter`  
**Welcome to Vallo, Ada** (21)  
Your account is ready. Here is where we would start looking for somewhere to live. (82)

**Vallo** · `welcome:buyer`  
**Welcome to Vallo, Ada** (21)  
Your account is ready. Start with search, and read the title before the price. (78)

**Vallo** · `welcome:landlord`  
**Welcome to Vallo, Ada** (21)  
Your account is ready. Here is how your property gets onto Vallo. (65)

**Vallo** · `welcome:seller`  
**Welcome to Vallo, Ada** (21)  
Your account is ready. Here is how your property gets onto Vallo, title first. (78)

**Vallo** · `welcome:agent`  
**Welcome to Vallo, Ada** (21)  
Your account is ready. Register as an agent or a firm, then list. (65)

**Vallo** · `welcome:unstated`  
**Welcome to Vallo** (16)  
Your account is ready. Two sides, one account, and three good places to begin. (78)


### Events

**Vallo** · `agreementApproved`  
**Approved, payment is open: Two bedroom flat** (43)  
₦4,500,000 agreed. You can pay in the app now. (46)

**Vallo** · `agreementRejected`  
**Agreement sent back: Two bedroom flat** (37)  
Why: The inspection photos do not show the kitchen. Add clear photos and submit again. (86)

**Vallo** · `agreementWaiting`  
**Agreement to confirm: Two bedroom flat** (38)  
₦120,000 in total. Read the terms and confirm them in the app. (62)

**Vallo** · `guaranteeClaimDecided`  
**Vallo Guarantee claim approved** (30)  
Vallo approved ₦30,000. It will be paid to your bank account. (61)

**Vallo** · `inspectionScheduled:viewer`  
**Inspection booked for 15 Aug at 11:30** (37)  
At 12 Herbert Macaulay Way, Yaba, Lagos, with Chidi. (52)

**Vallo** · `inspectionScheduled:lister`  
**Inspection booked for 15 Aug at 11:30** (37)  
Somebody is coming to see Two bedroom flat. (43)

**Vallo** · `listingApproved`  
**Your listing is live: Two bedroom flat** (38)  
It is in search now as VL-7K4MQP, and people can message you about it. (70)

**Vallo** · `listingRejected`  
**Listing not published: Two bedroom flat** (39)  
Reason: The photographs are of a different building from the one in the address. (80)

**Vallo** · `listingRejected:final`  
**Listing not published: Two bedroom flat** (39)  
Reason: This address already has a live listing from another lister. (68)

**Vallo** · `listingPassedReview`  
**Listing passed review: Two bedroom flat** (39)  
We put it live next, and there is nothing for you to do. (56)

**Vallo** · `listingChangesRequested`  
**Change needed: Two bedroom flat** (31)  
The cover photograph is of the street rather than the property. Put a room first. (81)

**Vallo** · `agentApplicationApproved`  
**Your agent application is approved** (34)  
Reference VL-AGT-10023. Your agent workspace is open and you can list now. (74)

**Vallo** · `agentApplicationRejected`  
**Your agent application was not approved** (39)  
Reason: The identity document and the name on the application are different people. (83)

**Vallo** · `agentApplicationNeedsMore`  
**Your agent application needs one more thing** (43)  
Needed: The photograph of the ID is too dark to read the number. (64)

**Vallo** · `verificationRungPassed`  
**Verified: identity document** (27)  
A person has checked your identity document against your name. (62)

**Vallo** · `verificationRungPassed:top`  
**Verified: property inspection** (29)  
Somebody from Vallo has physically stood in your property. (58)

**Vallo** · `newEnquiry`  
**Enquiry from Adaeze: Two bedroom flat** (37)  
"Good afternoon. Is the service charge yearly, and does it cover the generator?" (80)

**Vallo** · `bookingRequested`  
**Request sent: Two bedroom flat** (30)  
1 to 5 Sept, 4 nights, ₦300,000. The host is reviewing it. (58)

**Vallo** · `bookingRequestedHost`  
**Booking request: Two bedroom flat** (33)  
Ada wants 1 to 5 Sept, 4 nights, ₦300,000. (42)

**Vallo** · `bookingConfirmed`  
**Booking confirmed: Two bedroom flat** (35)  
1 to 5 Sept, 4 nights. The host confirmed your dates. (53)

**Vallo** · `stayArrivalDetails`  
**Your stay is booked: Two bedroom flat** (37)  
Ada booked it for you: 1 to 5 Sept, 4 nights. (45)

**Vallo** · `stayArrivalDetails:nogate`  
**Your stay is booked: Two bedroom flat** (37)  
Somebody booked it for you: 1 to 5 Sept, 4 nights. (50)

**Vallo** · `bookingCancelled`  
**Booking cancelled: Two bedroom flat** (35)  
Your stay for 1 to 5 Sept is cancelled and the dates are released. (66)

**Vallo** · `bookingRefunded`  
**₦150,000 refund on its way to your card** (39)  
Two bedroom flat is cancelled; ₦150,000 of ₦300,000 comes back. (63)

**Vallo** · `bookingRefunded:nothing`  
**Stay cancelled: Two bedroom flat** (32)  
You cancelled on the day of check in, so nothing comes back. (60)

**Vallo** · `inspectionProposed`  
**New viewing time offered: Two bedroom flat** (42)  
The lister offered 3 Oct 2026, 15:00 instead. Accept it in the app. (67)

**Vallo** · `inspectionDeclined`  
**Viewing declined: Two bedroom flat** (34)  
The lister said: The flat is let from Friday. (45)

**Vallo** · `inspectionWithdrawn`  
**Viewing withdrawn: Two bedroom flat** (35)  
Ada Balogun no longer needs the viewing on 2 Oct 2026, 11:30. Nothing to do. (76)

**Vallo** · `inspectionCompleted:viewer`  
**Viewing done: Two bedroom flat** (30)  
Next is the agreement, which you both confirm before anything is paid. (70)

**Vallo** · `inspectionCompleted:lister`  
**Viewing done: Two bedroom flat** (30)  
The visit by Ada is recorded as done. (37)

**Vallo** · `supportReplied`  
**Support replied: VAL-SUP-4K2P** (29)  
Somebody at Vallo answered your request. Read it in the app. (60)

**Vallo** · `agreementSubmitted`  
**Both sides confirmed: Two bedroom flat** (38)  
₦4,500,000 agreed. Vallo reviews it next, and nothing is paid yet. (66)

**Vallo** · `agreementCancelled`  
**Agreement cancelled: Two bedroom flat** (37)  
It is closed, nothing further happens on it, and nothing is charged for it. (75)

**Vallo** · `guaranteeClaimOpened`  
**Vallo Guarantee claim received** (30)  
Your claim for ₦30,000 is with Vallo, to review against the inspection report. (78)

**Vallo** · `verificationRungFailed`  
**Your identity check did not pass** (32)  
The reviewer said: The photo of the card is too blurred to read. (64)

**Vallo** · `listingSubmitted`  
**Listing sent for review: Two bedroom flat** (41)  
A person reads it before it goes live. We will tell you the outcome. (68)

**Vallo** · `reservationConfirmed`  
**Table confirmed: Terra Kulture** (30)  
Terra Kulture confirmed your table for 4 Oct 2026 at 19:30, 4 guests. (69)

**Vallo** · `reservationCancelled`  
**Table cancelled: Terra Kulture** (30)  
Your table at Terra Kulture for 4 Oct 2026 at 19:30 is cancelled. (65)

**Vallo** · `refundRequested`  
**Refund request received** (23)  
A person at Vallo answers it by 6 Oct 2026. (43)

**Vallo** · `supportTicketFiled`  
**Support request received: VAL-SUP-4K2P** (38)  
A person at Vallo will reply to this email address. (51)

**Vallo** · `paymentInstrumentChanged:card_saved`  
**A card was saved to your account** (32)  
Your Visa card ending 4081 was saved. Not you? Change your password. (68)

**Vallo** · `paymentInstrumentChanged:card_default_changed`  
**Your default card changed** (25)  
Your Visa card ending 4081 is now your default card. Not you? Change your password. (83)

**Vallo** · `paymentInstrumentChanged:card_removed`  
**A card was removed from your account** (36)  
Your Visa card ending 4081 was removed. Not you? Change your password. (70)

**Vallo** · `paymentInstrumentChanged:bank_added`  
**A bank account was added** (24)  
Your account at Guaranty Trust Bank was added. Not you? Change your password. (77)

**Vallo** · `paymentInstrumentChanged:bank_default_changed`  
**Your Vallo payout account changed** (33)  
Your account at Guaranty Trust Bank now receives your payouts. (62)

**Vallo** · `paymentInstrumentChanged:bank_removed`  
**A bank account was removed** (26)  
Your account at Guaranty Trust Bank was removed. Not you? Change your password. (79)

**Vallo** · `scamRecall`  
**An account you talked to was stopped** (36)  
It was about Two bedroom flat. If you paid them anything, tell us now. (70)

**Vallo** · `staffAccessGranted`  
**Staff access: Support Agent** (27)  
Access given: Support tickets and member lookups. Read the handbook first. (74)

**Vallo** · `staffAccessGranted:plain`  
**You have Vallo staff access** (27)  
Access given: Support tickets. Read the handbook first. (55)

**Vallo** · `deletionStarted`  
**Your account will be deleted on 29 Oct 2026** (43)  
Nothing is destroyed yet. The restore code in this email stops it. (66)

**Vallo** · `deletionCompleted`  
**Your Vallo account has been deleted** (35)  
This is the last email Vallo sends to this address. (51)

**Vallo** · `paymentInstrumentChanged:card_saved`  
**A card was saved to your account** (32)  
Your Visa card ending 4081 was saved. Not you? Change your password. (68)

**Vallo** · `scamRecall`  
**An account you talked to was stopped** (36)  
It was about Two bedroom flat. If you paid them anything, tell us now. (70)

**Vallo** · `deletionStarted`  
**Your account will be deleted on 29 Oct 2026** (43)  
Nothing is destroyed yet. The restore code in this email stops it. (66)

**Vallo** · `deletionCompleted`  
**Your Vallo account has been deleted** (35)  
This is the last email Vallo sends to this address. (51)

**Vallo** · `cryptoMessage:awaiting_payment`  
**Send your crypto payment** (24)  
Send exactly 284.81 USDT on Tron (TRC-20) to Yellow Card's address before the quote runs… (89)


### Staff

**Vallo** · `staffAccessGranted`  
**Staff access: Support Agent** (27)  
Access given: Support tickets and member lookups. Read the handbook first. (74)


The crypto payment emails (`apps/web/src/lib/crypto/messages.ts`) are in the payments lane and were not rewritten. Their preheader is the full body sentence, so the shell now cuts it at a word at 90 characters. The fix is to give each state its own short preheader (for example "284.81 USDT on Tron to Yellow Card, before the quote runs out.").

## What everyone gets (confirm panel previews)

`apps/web/src/lib/email/everyone-gets.ts` builds these from the real email builders and the database's own push copy:

| Action | Who | Channel | Push title | Push body |
| --- | --- | --- | --- | --- |
| Booking accepted | Guest | Email + app | Booking confirmed | {listing} is confirmed for 01 Sep. |
| Booking accepted | Arriving guest | Email | (none) | (none) |
| Payment received, tenancy | Tenant | App | Rent paid | {listing}: the move-in total is paid and recorded to the kobo. |
| Payment received, tenancy | Landlord | App | Rent received | {tenant} has paid the move-in total for {listing}. |
| Payment received, stay | Guest | Email + app | Booking confirmed | as booking accepted |
| Viewing confirmed | Viewer | Email + app | Inspection confirmed / Viewing booked | {listing} on Sunday 04 Oct, 15:00. The lister is expecting you. |
| Viewing confirmed | Lister | Email (+ app from a viewing window) | Viewing booked | {viewer} booked Sunday 04 Oct, 15:00 to see {listing}. |
| Agreement signed | Renter, owner | Email | (none) | (none) |

## Database notification copy: recommended changes (not made; DB functions are out of scope)

The push drain now cuts any title over 40 or body over 110 at a word, so nothing overflows. The changes below are what would make these notifications read like the reference: a short title, and one sentence naming who, what, when and how much, with no filler.

| Function (latest migration) | Today | Recommended |
| --- | --- | --- |
| `private.notify_booking_change` (guest, CONFIRMED) | "Booking confirmed" / "{title} is confirmed for 01 Sep." | Body: "{short title}, 1 to 5 Sep, 4 nights. The host is expecting you." (drop the zero pad, add the range and nights) |
| `private.notify_booking_change` (host, INSERT) | "New booking request" / "{title}: 01 Sep to 05 Sep." | Body: "{guest} wants 1 to 5 Sep, 4 nights, ₦300,000." (name the guest and the amount) |
| `private.notify_booking_change` (guest, INSERT) | "Booking request sent" / "Your request for {title} is with the host." | Title "Request sent"; body "1 to 5 Sep, 4 nights. The host is reviewing it." |
| `private.notify_booking_change` (host, CANCELLED) | "{title} for 01 Sep was cancelled." | "{guest} cancelled 1 to 5 Sep at {short title}." |
| `private.notify_booking_change` (COMPLETED) | "... Thank you for staying." | Drop "Thank you for staying" (filler): "{short title} is recorded as complete. You can leave a review." |
| `private.notify_booking_change` (rent, CONFIRMED) | "Rent paid" / "{title}: the move-in total is paid and recorded to the kobo." | "Rent paid" / "₦{amount} move-in total for {short title} is paid." (the amount is the fact; "to the kobo" is filler) |
| `private.notify_booking_change` (rent, host) | "Rent received" / "{tenant} has paid the move-in total for {title}." | "Payment received" / "{tenant} paid ₦{amount} for {short title}." |
| `private.notify_inspection_change` | "Inspection confirmed", "Inspection declined", "Inspection withdrawn", "Inspection complete", while the email now says "Viewing" | One noun on both channels: "Viewing confirmed", "Viewing declined", "Viewing withdrawn", "Viewing done"; and write "Sat 4 Oct, 15:00" (short day, no zero pad) |
| `private.notify_inspection_change` (requested) | "... Confirm, offer another time, or decline." | "{asker} wants to view {short title} on Sat 4 Oct, 15:00." (the actions are the buttons) |
| `private.agreement_tell_both` (approved) | "Agreement approved: payment is open" (35) / "{title} was approved by Vallo. Payment is now available in the app." | "Payment is open" / "₦{amount} agreed for {short title}. You can pay in the app." |
| `private.agreement_tell_both` (waiting) | "Agreement waiting for you" / "{title} has terms waiting for your confirmation." | "Agreement to confirm" / "₦{amount} for {short title}. Read and confirm the terms." |
| `private.agreement_tell_both` (sent back) | body "{title} was not approved: {reason}" | "Why: {reason}" (the title already says it was sent back) |
| `private.notify_support_reply` | "Support replied" / "Ticket {ref} has a new reply." | Body: the first 100 characters of the reply, quoted, as the email preheader does |
| `private.notify_support_ticket_filed` | "We have your question" | "Support request received" / "{ref}. A person will reply in Messages." (the same words as the email) |
| `public.decide_refund_request` | "Support answered your refund request" (36) / "Open the booking to read the answer." | "Refund request answered" / state the outcome and the amount: "₦{amount} goes back to your card." or "Not refunded: {reason}." |
| `private.notify_reservation` | "Your table is not going ahead" | "Table cancelled" / "{venue}, Sat 4 Oct, 19:30, is cancelled." |
| `private.notify_message` | "New message" | Title: the sender's name; body: the first line of the message. This is how the reference's "Promise to pay detected" card reads |
| `private.notify_new_device` | "New sign-in to Vallo" | Body: "{device} near {city}, {time}. Not you? Change your password." |
| `private.notify_review` | "New review" / "A guest rated {title} 4 out of 5." | "4 out of 5 from {guest}" / "{short title}: '{first words of the review}'" |
| `private.notify_event_change` | "An event you were going to is cancelled" (39) | "Event cancelled" / "{event}: {reason}." |
| `private.notify_wallet_entry` | wallet copy | Retired with the wallet; confirm the trigger no longer fires |

## App-side notification copy that other lanes own (recommended, not changed)

| File | Today | Recommended |
| --- | --- | --- |
| `lib/admin/staff-actions.ts` | body mentions "Ignore the staff access notice sent with this one..." (over 110) | "You keep: {desks}. Nothing else changed." |
| `lib/admin/verification-actions.ts` | "You are now {tier} on Vallo" | "Verification level: {tier}" / "{rung} passed. It shows on your listings." |
| `lib/admin/actions.ts` agent decision | "Your agent application needs more information" (46) | "Agent application: one more thing" |
| `lib/admin/payments-actions.ts` | body over 110 | "A Vallo team member removed it at your request. Not you? Reply to support." |
| `lib/agent/bookings-actions.ts` | "Your booking request was not accepted" / "The host could not take these dates. They said: {reason} ..." | "Request declined" / "The host said: {reason}. Nothing was charged." |
| `lib/social/admin-actions.ts` | "You look after {place} now" / a body with "2am" | Keep the title; body "You can hide posts while they are reviewed." |
| `lib/crypto/messages.ts` | "We can see your crypto on its way" | "Crypto on its way" / "{provider} sees your transfer. Waiting for the network." |
