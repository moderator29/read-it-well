# Success moments

Every "it worked" moment in `apps/web`, and how it confirms. Founder's references: `docs/design/references/2026-09-29/15-success-modal.png` (the first card) and, from 30 September, `54-success-pin-set.jpg`: a full screen with one big object in the middle, a title, one line and a full-width pill at the foot ("PIN set successfully! Your account is ready.").

## The pieces

- `components/ui/SuccessSheet.tsx` is the moment, in two shapes on one body:
  - `SuccessSheet`, a dialog on `Sheet`'s `card` geometry (portal, backdrop, focus trap and return, Escape, Back, scroll lock). Below 40rem it fills the screen; from 40rem up it is a centred card over the dimmed page.
  - `SuccessScreen`, the same moment as a page's own content, for a route whose whole job is to say it worked. It is not a dialog and leaves focus where a page does.
- Both open on the soft top (spec section 17) and carry one of the founder's 3D objects (`components/ui/icon-3d.ts`) at 120 to 144px, in a soft halo ring, with eight small sparks round it (five blue, three in the orange spark, section 18). Each moment names its object in `SUCCESS_OBJECT` (`lib/ui/success-moments.ts`), and `successCopy()` returns it with the words. A submission never shows the seal (`verified`): it waits on a person, so it shows the clock, the calendar with a clock, the ID card or the list. `VARIANT_OBJECT` is the fallback when a caller names none.
- Motion, transform and opacity only: the object pops in on the spring (0 to 520ms), the halo ring opens and one ring pulses out (to 700ms), the sparks burst and settle (220 to 900ms), the title, line, facts and pills rise in (340 to 900ms), then the object floats a few pixels for five slow breaths and stops. The static final state is the default and the animation is opt-in, so reduced motion and the app's Calm and Off settings get the finished picture and nothing moving; the float also stays off with ambient motion or data saver off.
- The pills are the large button (56px): the primary full-width, an optional quiet secondary under it.
- Title and body are announced through a polite live region, filled one frame after opening. Focus goes to the primary action. Haptics go through `lib/ui/feedback.ts`, which uses Capacitor Haptics in the native shell: `success` for success and approved, `confirm` for submitted.
- The CSS is `app/css/success.css`. Both themes paint the soft top over the canvas: the lavender-white wash in light, the faint brand glow at night. The ring and blue sparks take the brand blue (the brighter member at night).
- `lib/ui/success-moments.ts` is the registry. It holds every moment id, its variant, `successCopy()`, the one-shot flag helpers (`withDone`, `withoutDone`, `readDone`) and `showSuccess()`.
- Copy lives in `packages/i18n/src/locales/en.ts` under `success`, and reaches the client in two ways.
  - `ClientCopy` carries on every screen only the chrome plus the account moments, inspection requested, report, ticket and contact. This keeps the slice under its 12 KB budget.
  - Every other wired component takes `success={t.success}` from its server page, which is the house pattern.
  - `success-wiring-census.test.ts` fails if a production caller stops passing it.
- `components/ui/SuccessFromFlag.tsx` shows a moment on arrival.
  - The page checks the record first. A `?done=` flag only asks, and the record answers.
  - The flag is stripped with `router.replace`.
  - What the sheet says is latched when it opens, so stripping the flag cannot unmount it.
  - Approvals that the database writes into notifications open once per device (`lib/ui/seen-once.ts`), and only within 14 days of the decision (`lib/ui/recent-approval.ts`).
- `components/ui/SuccessFlagHost.tsx` sits in the root layout and shows the account moments: account created, email verified, password changed, and passcode set or changed. These never ride in the address, because a `?done=` link was forgeable: `/about?done=password-changed` said "Password changed" to anybody.
  - **From a server action:** the action calls `rememberSuccess(flag)` (`lib/ui/success-cookie.ts`) after it succeeded. That sets an HttpOnly, SameSite=Lax, 120s `nf_done` cookie and a readable `nf_done_hint=1`.
  - **The host checks only the hint:** on a navigation where the hint is present, it calls `consumeSuccess()`. The server answers from the HttpOnly cookie alone, checks it against the allow-list, and deletes both cookies.
  - **Forgery:** a forged hint gets nothing, and an account flag found in the address is removed on every route without opening anything.
  - **From a client screen:** the screen calls `showSuccess(flag)` instead.
  - **`withDone` refuses account flags:** it returns the address untouched for them.
- `/preview/success` is the screenshot harness: an index of every moment with its variant and object, each openable as `?moment=<id>&shape=sheet|page`, and `&still=1` for the final frame.

## Money rules

1. There is no success for a pending or unknown payment. Those keep `ResultSheet`'s "Confirming your payment", "Still checking" or "We have not heard back". The registry has no pending moment, and a test enforces that.
2. A card receipt opens only when `cardReturnVerdict` (`lib/payments/card-return.ts`) finds a settlement against the booking on screen. That means `settled`, or `already-settled` with transaction status SUCCESSFUL. A reference settled against another booking, or a refunded or refund-due charge, keeps the pending sheet. The sheet shows the amount the settlement recorded and the reference.
3. `settleCardPayment` now refuses `already-settled` with REFUNDED or REFUND_DUE, and says that the money is going back.
4. A saved-card charge carries `reference` and `settled`. `payWithSavedCard` sets `settled` from the settlement it runs, where it used to ignore it. A charge that is not settled shows "Confirming your payment" with `checkout.chargedConfirming`. That state never says "paid" and never says "not charged".
5. Every money moment shows the amount and the reference.

## Inventory

"Before" is how it confirmed until 29 September 2026. "Now" is the new behaviour. Paths are under `apps/web/src`.

| # | Moment | Route | Trigger | Before | Now |
|---|---|---|---|---|---|
| 1 | Card payment settled (stay, return from Paystack) | `/checkout/[bookingId]?paid=1&reference=` | `settleCardPayment` ok, gated by `cardReturnVerdict` | `ResultSheet` "Payment received" on any `ok`, including a refunded charge or another booking's reference; the flag replayed on every refresh | `SuccessSheet` "Stay paid" (confirmed, or recorded) with the settled amount and reference. Anything else shows the pending sheet. The flag is stripped when the sheet closes |
| 2 | Stay paid in-page (Paystack popup) | `/checkout/[bookingId]` | `PaystackCheckout` `onPaid`, after our own row reads paid | `ResultSheet` "Payment sent" | `SuccessSheet` "Stay paid" with amount and reference |
| 3 | Stay paid, saved card | `/checkout/[bookingId]` | `payWithSavedCard`, `charged` with `settled: true` | "Payment sent" even when settlement was refund-due | `SuccessSheet` when settled. Otherwise "Confirming your payment" |
| 4 | Rent and move-in paid (card return) | `/rent/pay/[inspectionId]?paid=1` | as #1 with `kind="rent"` | as #1, and it said "your stay is confirmed" for rent; the sheet was unmounted by the page's paid branch | `SuccessSheet` "Rent paid", mounted in both branches so the refresh keeps it |
| 5 | Rent paid in-page or saved card | `/rent/pay/[inspectionId]` | as #2 and #3 | `ResultSheet` "Rent paid" | `SuccessSheet` "Rent paid" with amount and reference. An unsettled charge shows the confirming sheet |
| 6 | Flatmate share paid | `/rent/share/[id]?paid=1`, `/tenancy/[id]?paid=1` | `settleShareReturn` ok with `share-settled` or `settled` | Silent: refresh, then a paid line | `SuccessSheet` "Your share is paid", or "Move-in paid in full" when this share completed it, with amount and reference. `already` (a revisit) and refusals show no sheet |
| 7 | Crypto payment settled | `/pay/crypto/[reference]`, crypto sheet | Polled row moves to `settled` during the visit | Green inline text | `SuccessSheet` "Crypto payment received" on the live transition only. Never on arrival, overpaid, underpaid or refunded |
| 8 | Inspection requested | listing, move-in | `requestInspection` ok | Sheet closed silently | `SuccessSheet` (submitted) "Inspection requested". An offline "kept" request shows none |
| 9 | Inspection (viewing slot) booked | `/listing/[id]` | `bookViewingSlot` ok (CONFIRMED) | Inline "Booked for" panel | `SuccessSheet` "Inspection booked" with the time. The panel stays underneath |
| 10 | Inspection report submitted | `/bookings`, `/inspections` | `saveInspectionReport` with `submit: true` ok | Refresh only | `SuccessSheet` "Inspection report submitted". Draft saves show none |
| 11 | Inspection closed with outcome | same | `closeInspection` COMPLETED ok | Refresh only | `SuccessSheet` "Inspection recorded" |
| 12 | Agreement drawn up | `DrawUpAgreement`, then `/agreements/[id]?done=agreement-drawn` | `openRentAgreement` ok | Plain redirect | Shown on arrival if you are a party and it awaits the parties |
| 13 | Agreement confirmed | `/agreements/[id]?done=agreement-confirmed` | `confirmAgreement` ok | Refresh only | "Your agreement is in review" (submitted) once both have confirmed, or "Terms confirmed" when only you have |
| 14 | Agreement approved by Vallo | `/agreements/[id]` | Status `approved` (decided in admin; the SQL notice links here) | Section "Payment is open" | `SuccessFromFlag` (approved) once per device. The renter's primary action is "Pay ₦…" |
| 15 | Guarantee claim filed | `/agreements/[id]?done=claim-filed` | `fileGuaranteeClaim` ok | Inline line | "Claim filed" (submitted), shown when a claim of yours is on file |
| 16 | Refund requested | `/bookings/[bookingId]` | `requestRefund` ok | Silent refresh | `SuccessSheet` (submitted) "Refund requested". The page refreshes when the sheet closes. It never says "refunded" |
| 17 | Listing submitted for review (wizard) | `/agent/list` | `submitListing` ok | Full-page `ListingSentForReview` | `SuccessSheet` (submitted) "Your listing is in review" over that page |
| 18 | Listing resubmitted (workspace) | `/agent/listings?done=listing-submitted&listing=` | `submitListing` ok | Sheet closed, refresh | Shown on arrival if that listing of yours is SUBMITTED or UNDER_REVIEW |
| 19 | Listing approved, and listing live, as the lister sees it | `/agent/listings?done=listing-approved\|listing-live&listing=` | Admin `reviewListing` approve or publish; the in-app notice link now carries the flag | Notification only | "Your listing passed review" or "Your listing is live" (approved), when that listing's status is APPROVED or PUBLISHED |
| 20 | Agent application submitted | `/profile/setup/agent` | `submitAgentApplication` ok | Green inline banner | `SuccessSheet` (submitted) "Application sent" |
| 21 | Host application submitted | `/host/apply` | `submitHostApplication` ok (status becomes SUBMITTED) | Inline status | `SuccessSheet` (submitted) on the transition only |
| 22 | Owner, agent or firm registration filed | `/profile/setup/[role]` | `submitSupplyRegistration` ok | Done screen | `SuccessSheet` (submitted) "Application sent" with the reference, over the done screen |
| 23 | Verification (KYC) submitted | `/verification` | `submitVerification` ok | "In review" screen | `SuccessSheet` (submitted) "Documents sent" over it |
| 24 | Identity matched (vNIN) | `/verification` | `verifyIdentityWithVnin` ok with `passed` | Inline text | `SuccessSheet` (approved) "Identity matched". `pending` keeps its text and shows no sheet |
| 25 | Verification approved | `/verification`, `/agent/verification` | Tier above 0 and a passed rung decided in the last 14 days (SQL and admin notices link here) | Status panel | `SuccessFromFlag` (approved) "Documents approved", once per device per tier |
| 26 | Support ticket filed | `/support/new` | `fileSupportTicket` ok | `FiledView` with the reference | `SuccessSheet` (submitted) with the reference. `FiledView` stays underneath |
| 27 | Support escalation from the assistant | Support chat | `fileSupportTicket` ok | Inline reference | Same sheet, once per reference |
| 28 | Contact form sent | `/contact` | `submitContactForm` ok | Inline panel with the reference | `SuccessSheet` "Message sent", or "Message sent to support" when signed in, with the reference |
| 29 | Report submitted | Report sheet (listing, profile) | `reportSomething` ok | "Thank you, we have it" in the sheet | `SuccessSheet` (submitted) "Report received" with the category's promise. Continue closes both |
| 30 | Stay requested or dates held | `/listing/[id]` | `reserve` ok | Inline "Booking requested" panel | `SuccessSheet` "Dates held" (instant book) or "Booking requested" (submitted), with the total and the dates. Pay stays on the panel. It never says "paid" |
| 31 | Table request sent | `/listing/[id]`, `/restaurant/[id]` | `reserveTable` ok | Inline "Request sent" | `SuccessSheet` (submitted) "Table request sent". It never says "booked" |
| 32 | Review posted (stay) | `/bookings/[bookingId]/review` | `submitReview` ok | `ResultScreen` | `SuccessSheet` "Review posted" over it |
| 33 | Tenancy review sent | `/rent/review/[paymentId]` | `submitTenancyReview` ok | Inline line | `SuccessSheet` "Review sent" |
| 34 | Bank account added | `/settings/payments` | `addBankAccount` ok (after step-up) | Silent close | `SuccessSheet` "Bank account added" |
| 35 | Payout account added | `/agent/earnings` | `addPayoutAccount` ok | Silent field reset | `SuccessSheet` "Payout account added", once per answer |
| 36 | Account created | Sign-up, then landing | `signUpWithEmail` with a session; code confirmation; a `signup` link | Redirect | One-shot cookie set by the action, "Welcome to Vallo" on the next screen |
| 37 | Email verified | Link confirmation | `completeEmailVerification` ok for `email_change` | Redirect | One-shot cookie. A magic-link sign-in and a recovery earn none |
| 38 | Password changed | `/home` | `updatePassword` ok | `redirect("/home")` with nothing | One-shot cookie, "Password changed". It does not promise other devices were signed out, because that step can fail |
| 40 | Agent application approved | `/profile/application` | Status APPROVED, decided in the last 14 days (the admin notice links here) | Status panel | `SuccessFromFlag` (approved) "Application approved", once per device per application |
| 41 | Business approved or published (host) | `/host` | The most recent business APPROVED or PUBLISHED in the last 14 days (the admin notice links here) | Status pill | "Business approved" or "Your business is live" (approved), once per device per business per step |
| 39 | Passcode set or changed | Passcode setup | `setPasscodeAction` ok | Inline message and haptic | `showSuccess("passcode-set" \| "passcode-changed")` (PASSCODE wired) |
| 42 | Card saved (the ₦100 check) | `/settings/payments` | `confirmCardSetup` answers `saved`: Paystack verify says success (or reversed), exactly ₦100 in NGN, this person's setup by our audit row and by the charge's metadata, a reusable token, and the card filed | The checkout polled `paymentState`, which knows only `rm-book-`, so it always read pending and ended on "we could not confirm" (B-6) | `SuccessSheet` "Card saved". The line says the ₦100 goes back to the same card and names no date. Pending keeps the checkout's confirming state; a refused check (wrong amount, not reusable) says what happens to the ₦100 |
| 43 | Flatmate invited to share a move-in | `/tenancy/[id]` | `addRentContributor` ok | Silent refresh | `SuccessSheet` (submitted) "Invitation sent": they can accept or decline. The page refreshes when it closes |
| 44 | Agents invited to pitch (owner's portfolio) | `/agent/portfolio?done=agents-invited&listing=` | `inviteAgents` ok with `told` above zero | Inline note | Shown on arrival when that unit of the owner's has an open invitation (`portfolioInviteArrival`). The inline note stays |
| 45 | First sign-in by email or phone code | Sign in, then landing | `verifyEmailSignInCode` or `verifyPhoneSignInCode` ok, and the code just confirmed the address or number (`isFirstCodeSignIn`, stamped in the last five minutes) | Redirect | One-shot cookie, "Welcome to Vallo". None while finish-setup is still owed, because that step sets it |

## Deliberately not celebrated

- **Pending or unknown payments, 3DS "your bank wants to check", declines, and stalls.** These stay on `ResultSheet`.
- **Booking cancelled, and caution or deduction steps.** A cancellation is not good news. A refund due is shown in the booking's money record in the words "on its way", never "refunded".
- **Safety share and "I feel unsafe"** (`SafetyShareControl`, `UnsafeSheet`). A celebration is the wrong tone for safety.
- **Profile edits, saved searches, alert toggles, phone confirmed, newsletter, briefs and price-check watches.** These are routine saves where a modal on every save interrupts. They keep their inline confirmations, and the audit's A7 and T8 fall here on purpose.
- **Social reports** (post, profile, story) keep their toasts, because they are one tap inside a feed. The full report sheet (#29) celebrates.
- **Staff console actions** (admin approvals, refunds, claim decisions). Their readers are staff, and their inline notices stay. The applicant's side of an approval is celebrated (#14, #19, #25, #40, #41).
- **An agent accepting a booking or answering a table reservation** (`BookingsWorkspace`, `ReservationsBoard`). This is a working queue an agent clears many times a day, and a modal per row would stand between them and the next row. The guest's side is where the news is, and the guest is told by notification.
- **Renewals offered or answered, tenancy reports countersigned, flatmates answered or removed** (`components/app/tenancy/*`). These are steps in a document both sides are still negotiating, and they keep their inline state. The moment the money for a move-in lands is celebrated (#6), and so is the lead's invitation to a flatmate (#43).
- **Booking confirmed** has no moment of its own: a stay is CONFIRMED only when its payment settles, and that is the "Stay paid" receipt (#1 to #3), whose line says the dates are confirmed.

## Known limits

- Approvals shown once per device rely on browser storage. If storage is blocked, the sheet does not show, which is the safe failure.
- If the page is refreshed while a card receipt is open, the settlement is re-asked. It is idempotent, so the same receipt shows again.
- An account moment's cookie lasts two minutes. A sign-up that takes longer than that to reach its next screen shows no sheet, which is the safe failure.
- A flatmate's share return is settled only against the move-in on the screen it came back to (`settleShareReturn` matches the transaction's booking to the tenancy's).
